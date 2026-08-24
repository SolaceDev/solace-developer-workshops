package main

import (
	"fmt"
	"math"
	"sort"
)

// ---------------------------------------------------------------------------
// Weights
//
// THIS IS THE BLOCK YOU EDIT IN THE WORKSHOP LAB.
//
// Change MarginImpact from 0.20 to 0.60, rebuild, apply, and republish the
// same event. The top substitute for ORD-10428 flips from CS-SLT-L (same
// color, one size up) to CS-STN-M (exact size, better margin, further away).
//
// Same input, different business policy, visible in one screen. Nothing else
// in the tool changes.
// ---------------------------------------------------------------------------

// Weights are the relative importance of each scoring component. They are
// echoed back in the tool's output as weights_used so a change is visible
// without reading the source.
type Weights struct {
	SizeProximity       float64 `json:"size_proximity"`
	ColorMatch          float64 `json:"color_match"`
	PriceDelta          float64 `json:"price_delta"`
	MarginImpact        float64 `json:"margin_impact"`
	FulfillmentDistance float64 `json:"fulfillment_distance"`
	InventoryDepth      float64 `json:"inventory_depth"`
}

// DefaultWeights is the shipped scoring policy.
var DefaultWeights = Weights{
	SizeProximity:       0.25,
	ColorMatch:          0.20,
	PriceDelta:          0.15,
	MarginImpact:        0.20, // <-- the lab changes this to 0.60
	FulfillmentDistance: 0.15,
	InventoryDepth:      0.05,
}

// ---------------------------------------------------------------------------
// Input and output contract
//
// The tool does no I/O. It fetches nothing, connects to nothing, and knows
// nothing about postgres or the product catalog. Everything it needs is
// passed in by the agent, which gathered it from the two connectors.
//
// That keeps it trivially unit-testable, trivially reproducible, and keeps
// the sandbox story simple.
// ---------------------------------------------------------------------------

// Product carries the attributes needed to score a substitution. The field
// names match what the retail-postgres connector and the product-catalog MCP
// server return, so the agent can pass results through without reshaping them.
type Product struct {
	SKU         string  `json:"sku"          desc:"Stock keeping unit"`
	StyleID     string  `json:"style_id"     desc:"Style the SKU belongs to"`
	Color       string  `json:"color"        desc:"Colorway name"`
	ColorFamily string  `json:"color_family" desc:"Merch color family: neutral, earth, or bright"`
	SizeOrdinal int     `json:"size_ordinal" desc:"Size as an integer, 1 (XS) through 5 (XL)"`
	ListPrice   float64 `json:"list_price"   desc:"Customer-facing price"`
	UnitCost    float64 `json:"unit_cost"    desc:"Cost of goods, used for margin"`
}

// Availability is one stocking position for a candidate SKU.
type Availability struct {
	LocationID string `json:"location_id" desc:"Stocking location"`
	Region     string `json:"region"      desc:"Region of the stocking location"`
	Available  int    `json:"available"   desc:"Units available, on hand minus reserved"`
	ShipsEcom  bool   `json:"ships_ecom"  desc:"Whether this location fulfills ecommerce orders"`
}

// Candidate is a possible substitute with its stock positions.
type Candidate struct {
	Product
	Availability []Availability `json:"availability" desc:"Stock positions for this SKU"`
}

// Rules are the merch-approved constraints from the product catalog. These
// are constraints, not preferences: a violation is an exclusion, never a
// low score the model can argue its way past.
type Rules struct {
	ForbiddenColorFamilies []string `json:"forbidden_color_families" desc:"Color families merchandising will not accept as substitutes"`
	MaxSizeDelta           int      `json:"max_size_delta"           desc:"Largest acceptable size-ordinal difference"`
}

// ScoreParams is the tool's input.
type ScoreParams struct {
	Original     Product     `json:"original"      desc:"The SKU that cannot be fulfilled"`
	Qty          int         `json:"qty"           desc:"Units ordered"`
	ShipToState  string      `json:"ship_to_state" desc:"Two-letter destination state"`
	ShipToRegion string      `json:"ship_to_region" desc:"Destination region"`
	Rules        Rules       `json:"rules"         desc:"Merch-approved substitution constraints"`
	Candidates   []Candidate `json:"candidates"    desc:"Possible substitutes with their stock positions"`
	// Weights is optional. Omitted, the shipped policy applies.
	Weights *Weights `json:"weights,omitempty" desc:"Optional scoring weight overrides"`
}

// Breakdown exposes every component score so the agent can explain its
// recommendation with real arithmetic instead of paraphrasing.
type Breakdown struct {
	SizeProximity       float64 `json:"size_proximity"`
	ColorMatch          float64 `json:"color_match"`
	PriceDelta          float64 `json:"price_delta"`
	MarginImpact        float64 `json:"margin_impact"`
	FulfillmentDistance float64 `json:"fulfillment_distance"`
	InventoryDepth      float64 `json:"inventory_depth"`
}

// Ranked is a candidate that passed every hard constraint.
type Ranked struct {
	SKU            string    `json:"sku"`
	TotalScore     float64   `json:"total_score"`
	Breakdown      Breakdown `json:"breakdown"`
	DaysToDeliver  int       `json:"days_to_deliver"`
	MarginDeltaUSD float64   `json:"margin_delta_usd"`
	FromLocation   string    `json:"from_location"`
	HardFails      []string  `json:"hard_fails"`
}

// Rejected is a candidate excluded by a hard constraint. Kept separate from
// Ranked deliberately: hard fails are exclusions, not low scores, and
// conflating them lets an agent argue for a forbidden substitute.
type Rejected struct {
	SKU       string   `json:"sku"`
	HardFails []string `json:"hard_fails"`
}

// ScoreResult is the tool's output.
type ScoreResult struct {
	Ranked      []Ranked `json:"ranked"`
	Rejected    []Rejected `json:"rejected"`
	WeightsUsed Weights  `json:"weights_used"`
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

// regionDays maps how far stock has to travel to how long it takes. Region
// match is next-day-ish, an adjacent region is a few days, cross-country is
// the better part of a week.
var adjacentRegions = map[string]map[string]bool{
	"us-west":    {"us-central": true},
	"us-central": {"us-west": true, "us-east": true, "us-south": true},
	"us-east":    {"us-central": true, "us-south": true},
	"us-south":   {"us-central": true, "us-east": true},
}

// fulfillmentScore rates one stocking position by distance to the destination,
// and returns the delivery estimate that goes with it.
func fulfillmentScore(fromRegion, toRegion string) (score float64, days int) {
	switch {
	case fromRegion == toRegion:
		return 1.0, 2
	case adjacentRegions[toRegion][fromRegion]:
		return 0.6, 4
	default:
		return 0.3, 6
	}
}

// sizeProximityScore decays with the size-ordinal gap, and is asymmetric:
// sizing UP is a usable substitute, sizing DOWN usually is not. A customer who
// ordered a medium can wear a large over a base layer. A small does not fit at
// all, and it comes back as a return.
//
// signedDelta is candidate minus original, so a positive value means larger.
func sizeProximityScore(signedDelta int) float64 {
	switch signedDelta {
	case 0:
		return 1.0
	case 1:
		return 0.7 // one size up: roomy, still wearable
	case -1:
		return 0.35 // one size down: often unwearable, high return risk
	case 2:
		return 0.3
	case -2:
		return 0.1
	default:
		return 0.0
	}
}

// colorMatchScore rewards an exact colorway, accepts the same family, and
// gives nothing to an unrelated family.
func colorMatchScore(orig, cand Product) float64 {
	switch {
	case orig.Color == cand.Color:
		return 1.0
	case orig.ColorFamily == cand.ColorFamily:
		return 0.6
	default:
		return 0.0
	}
}

// priceDeltaScore penalises a substitute that costs the customer more. Costing
// the customer the same or less is a clean 1.0; asking them to pay more is
// already a hard fail, so the scaled penalty only covers the boundary.
func priceDeltaScore(orig, cand Product) float64 {
	if cand.ListPrice <= orig.ListPrice {
		return 1.0
	}
	over := (cand.ListPrice - orig.ListPrice) / math.Max(orig.ListPrice, 0.01)
	return math.Max(0.0, 1.0-over*4.0)
}

// marginImpactScore compares the substitute's margin to the original's. Equal
// or better margin scores high; giving margin away scores low. This is the
// component the lab re-weights, and the reason the whole tool exists: an LLM
// asked to rank substitutes produces a plausible ordering that quietly gives
// away margin, and nobody notices for a quarter.
func marginImpactScore(orig, cand Product) (score, deltaUSD float64) {
	origMargin := orig.ListPrice - orig.UnitCost
	candMargin := cand.ListPrice - cand.UnitCost
	deltaUSD = round2(candMargin - origMargin)

	if origMargin <= 0 {
		return 0.5, deltaUSD
	}
	// Ratio of 1.0 means margin held. Map [0.8, 1.2] onto [0, 1] so ordinary
	// swings move the score meaningfully rather than clustering near 0.5.
	ratio := candMargin / origMargin
	return clamp01((ratio - 0.8) / 0.4), deltaUSD
}

// inventoryDepthScore penalises taking the last units of a size. Ten or more
// on hand is unremarkable; clearing out a location is not.
func inventoryDepthScore(available, qty int) float64 {
	if available < qty {
		return 0.0
	}
	surplus := available - qty
	switch {
	case surplus >= 9:
		return 1.0
	case surplus >= 4:
		return 0.8
	case surplus >= 1:
		return 0.5
	default:
		return 0.2 // exactly enough, and nothing left after
	}
}

// Score ranks every candidate against the original, applying hard constraints
// first. It is pure arithmetic: same input, same output, every time.
func Score(p ScoreParams) ScoreResult {
	w := DefaultWeights
	if p.Weights != nil {
		w = *p.Weights
	}

	forbidden := map[string]bool{}
	for _, f := range p.Rules.ForbiddenColorFamilies {
		forbidden[f] = true
	}

	maxDelta := p.Rules.MaxSizeDelta
	if maxDelta <= 0 {
		maxDelta = 1
	}

	qty := p.Qty
	if qty <= 0 {
		qty = 1
	}

	result := ScoreResult{
		Ranked:      []Ranked{},
		Rejected:    []Rejected{},
		WeightsUsed: w,
	}

	for _, c := range p.Candidates {
		// --- Hard constraints. Every reason is collected, not just the
		// first, so the agent can explain the full picture. ---
		var fails []string

		// Signed for scoring (up and down are not equivalent), absolute for
		// the merch rule (which caps distance in either direction).
		signedDelta := c.SizeOrdinal - p.Original.SizeOrdinal
		if absInt(signedDelta) > maxDelta {
			fails = append(fails, "size_delta_exceeds_merch_rule")
		}
		if forbidden[c.ColorFamily] {
			fails = append(fails, "color_family_forbidden_by_merch")
		}
		if c.ListPrice > p.Original.ListPrice {
			fails = append(fails, "costs_customer_more_than_original")
		}
		if c.ListPrice-c.UnitCost <= 0 {
			fails = append(fails, "negative_margin")
		}

		// Pick the best shippable position: closest to the customer, and
		// among equals, the deepest stock.
		best, hasStock := bestPosition(c, p.ShipToRegion, qty)
		if !hasStock {
			fails = append(fails, "no_shippable_location_with_sufficient_stock")
		}

		if len(fails) > 0 {
			// Hard fails short-circuit. A rejected candidate is never scored,
			// because a score invites an argument and a constraint is not
			// negotiable.
			result.Rejected = append(result.Rejected, Rejected{SKU: c.SKU, HardFails: fails})
			continue
		}

		// --- Component scores ---
		distScore, days := fulfillmentScore(best.Region, p.ShipToRegion)
		marginScore, marginDelta := marginImpactScore(p.Original, c.Product)

		b := Breakdown{
			SizeProximity:       round2(sizeProximityScore(signedDelta)),
			ColorMatch:          round2(colorMatchScore(p.Original, c.Product)),
			PriceDelta:          round2(priceDeltaScore(p.Original, c.Product)),
			MarginImpact:        round2(marginScore),
			FulfillmentDistance: round2(distScore),
			InventoryDepth:      round2(inventoryDepthScore(best.Available, qty)),
		}

		// Normalise by the weight total so the score stays on 0.0 to 1.0 even
		// after an attendee raises one weight. Without this, changing a weight
		// moves every score at once and the ranking is harder to read.
		weightSum := w.SizeProximity + w.ColorMatch + w.PriceDelta +
			w.MarginImpact + w.FulfillmentDistance + w.InventoryDepth
		if weightSum <= 0 {
			weightSum = 1
		}

		total := (b.SizeProximity*w.SizeProximity +
			b.ColorMatch*w.ColorMatch +
			b.PriceDelta*w.PriceDelta +
			b.MarginImpact*w.MarginImpact +
			b.FulfillmentDistance*w.FulfillmentDistance +
			b.InventoryDepth*w.InventoryDepth) / weightSum

		result.Ranked = append(result.Ranked, Ranked{
			SKU:            c.SKU,
			TotalScore:     round2(total),
			Breakdown:      b,
			DaysToDeliver:  days,
			MarginDeltaUSD: marginDelta,
			FromLocation:   best.LocationID,
			HardFails:      []string{},
		})
	}

	// Deterministic ordering. Score descending, then SKU ascending, so a tie
	// resolves the same way on every run. A tie that resolves differently
	// between runs breaks both the acceptance test and the evaluation set.
	sort.Slice(result.Ranked, func(i, j int) bool {
		if result.Ranked[i].TotalScore != result.Ranked[j].TotalScore {
			return result.Ranked[i].TotalScore > result.Ranked[j].TotalScore
		}
		return result.Ranked[i].SKU < result.Ranked[j].SKU
	})
	sort.Slice(result.Rejected, func(i, j int) bool {
		return result.Rejected[i].SKU < result.Rejected[j].SKU
	})

	return result
}

// bestPosition picks the stocking position a substitute would actually ship
// from: nearest region first, deepest stock as the tiebreak. Locations that
// do not fulfill ecom, or cannot cover the quantity, are not candidates.
func bestPosition(c Candidate, toRegion string, qty int) (Availability, bool) {
	var best Availability
	var bestScore float64 = -1

	for _, a := range c.Availability {
		if !a.ShipsEcom || a.Available < qty {
			continue
		}
		s, _ := fulfillmentScore(a.Region, toRegion)
		if s > bestScore || (s == bestScore && a.Available > best.Available) {
			best, bestScore = a, s
		}
	}
	return best, bestScore >= 0
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func absInt(n int) int {
	if n < 0 {
		return -n
	}
	return n
}

func clamp01(f float64) float64 {
	return math.Max(0.0, math.Min(1.0, f))
}

// round2 keeps output stable to two decimals. Without it, floating-point
// noise makes byte-identical output across runs impossible to guarantee.
func round2(f float64) float64 {
	return math.Round(f*100) / 100
}

// Summary renders a one-line human-readable recommendation for the agent to
// build its explanation on.
func Summary(r ScoreResult) string {
	if len(r.Ranked) == 0 {
		return fmt.Sprintf("No acceptable substitute. %d candidate(s) rejected on hard constraints. Recommend cancel and refund.", len(r.Rejected))
	}
	top := r.Ranked[0]
	return fmt.Sprintf("Recommend %s (score %.2f, ships from %s in %d days, margin delta $%.2f). %d ranked, %d rejected.",
		top.SKU, top.TotalScore, top.FromLocation, top.DaysToDeliver, top.MarginDeltaUSD,
		len(r.Ranked), len(r.Rejected))
}
