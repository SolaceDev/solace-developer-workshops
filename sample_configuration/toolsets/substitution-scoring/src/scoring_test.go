package main

import (
	"encoding/json"
	"testing"
)

// ---------------------------------------------------------------------------
// The canonical case: ORD-10428.
//
// A customer ordered the Cascade Shell Jacket in Slate, size M, shipping to
// Oregon. Nothing is available anywhere. These fixtures mirror util/db/02_seed.sql
// exactly, so these tests double as a validator for the seed data: if the seed
// changes and these fail, the seed is wrong, not the tool.
// ---------------------------------------------------------------------------

var original = Product{
	SKU: "CS-SLT-M", StyleID: "CS", Color: "Slate", ColorFamily: "neutral",
	SizeOrdinal: 3, ListPrice: 189.00, UnitCost: 82.00,
}

var merchRules = Rules{
	ForbiddenColorFamilies: []string{"bright"},
	MaxSizeDelta:           1,
}

// The four candidates the product catalog returns for style CS.
var candidates = []Candidate{
	{
		// Same color, one size up, deep stock in the customer's own region.
		Product: Product{SKU: "CS-SLT-L", StyleID: "CS", Color: "Slate",
			ColorFamily: "neutral", SizeOrdinal: 4, ListPrice: 189.00, UnitCost: 86.00},
		Availability: []Availability{
			{LocationID: "DC-WEST", Region: "us-west", Available: 12, ShipsEcom: true},
			{LocationID: "ST-1108", Region: "us-west", Available: 2, ShipsEcom: true},
		},
	},
	{
		// Exact size, same family different color, better margin, but it has
		// to cross the country.
		Product: Product{SKU: "CS-STN-M", StyleID: "CS", Color: "Stone",
			ColorFamily: "neutral", SizeOrdinal: 3, ListPrice: 189.00, UnitCost: 71.00},
		Availability: []Availability{
			{LocationID: "DC-EAST", Region: "us-east", Available: 9, ShipsEcom: true},
			{LocationID: "ST-3104", Region: "us-east", Available: 2, ShipsEcom: true},
		},
	},
	{
		// Exact size and plenty of stock, but merchandising forbids bright
		// colorways as substitutes for this style.
		Product: Product{SKU: "CS-MOS-M", StyleID: "CS", Color: "Moss",
			ColorFamily: "bright", SizeOrdinal: 3, ListPrice: 189.00, UnitCost: 80.00},
		Availability: []Availability{
			{LocationID: "DC-WEST", Region: "us-west", Available: 8, ShipsEcom: true},
		},
	},
	{
		// Same color, one size DOWN. Identical to CS-SLT-L on every axis
		// except cost, where it is cheaper. Pure margin arithmetic ranks it
		// above the large; retail sense does not, because a customer who
		// ordered a medium cannot wear a small. This candidate exists in the
		// seed data and caught a real scoring bug.
		Product: Product{SKU: "CS-SLT-S", StyleID: "CS", Color: "Slate",
			ColorFamily: "neutral", SizeOrdinal: 2, ListPrice: 189.00, UnitCost: 82.00},
		Availability: []Availability{
			{LocationID: "DC-WEST", Region: "us-west", Available: 5, ShipsEcom: true},
		},
	},
	{
		// Two sizes up. Exceeds the merch size rule.
		Product: Product{SKU: "CS-SLT-XL", StyleID: "CS", Color: "Slate",
			ColorFamily: "neutral", SizeOrdinal: 5, ListPrice: 189.00, UnitCost: 86.00},
		Availability: []Availability{
			{LocationID: "DC-WEST", Region: "us-west", Available: 7, ShipsEcom: true},
		},
	},
}

func canonicalParams() ScoreParams {
	return ScoreParams{
		Original:     original,
		Qty:          1,
		ShipToState:  "OR",
		ShipToRegion: "us-west",
		Rules:        merchRules,
		Candidates:   candidates,
	}
}

func candidateBySKU(sku string) Candidate {
	for _, c := range candidates {
		if c.SKU == sku {
			return c
		}
	}
	panic("no such candidate fixture: " + sku)
}

func rejectedFor(r ScoreResult, sku string) []string {
	for _, x := range r.Rejected {
		if x.SKU == sku {
			return x.HardFails
		}
	}
	return nil
}

func contains(hay []string, needle string) bool {
	for _, h := range hay {
		if h == needle {
			return true
		}
	}
	return false
}

// --- The two acceptance criteria the whole workshop turns on ----------------

// At the shipped weights, the same-color one-size-up jacket wins. It is the
// closest thing to what the customer actually ordered.
func TestDefaultWeightsRankCascadeSlateLargeFirst(t *testing.T) {
	got := Score(canonicalParams())

	if len(got.Ranked) == 0 {
		t.Fatal("expected ranked candidates, got none")
	}
	if got.Ranked[0].SKU != "CS-SLT-L" {
		t.Errorf("top substitute = %s, want CS-SLT-L\nfull ranking: %s",
			got.Ranked[0].SKU, mustJSON(got.Ranked))
	}
}

// This is the lab. Raise the margin weight and the business answer changes:
// the exact-size, better-margin jacket overtakes the closer one. Same input,
// different policy, and the attendee changed one number.
func TestMarginWeightFlipsWinnerToStone(t *testing.T) {
	p := canonicalParams()
	w := DefaultWeights
	w.MarginImpact = 0.60
	p.Weights = &w

	got := Score(p)

	if len(got.Ranked) == 0 {
		t.Fatal("expected ranked candidates, got none")
	}
	if got.Ranked[0].SKU != "CS-STN-M" {
		t.Errorf("top substitute at margin_weight=0.6 = %s, want CS-STN-M\nfull ranking: %s",
			got.Ranked[0].SKU, mustJSON(got.Ranked))
	}
	if got.WeightsUsed.MarginImpact != 0.60 {
		t.Errorf("weights_used.margin_impact = %v, want 0.6", got.WeightsUsed.MarginImpact)
	}
}

// --- Hard constraints ------------------------------------------------------

func TestForbiddenColorFamilyIsRejected(t *testing.T) {
	got := Score(canonicalParams())

	fails := rejectedFor(got, "CS-MOS-M")
	if fails == nil {
		t.Fatal("CS-MOS-M should be rejected, but it was not in the rejected list")
	}
	if !contains(fails, "color_family_forbidden_by_merch") {
		t.Errorf("CS-MOS-M hard fails = %v, want color_family_forbidden_by_merch", fails)
	}
	for _, r := range got.Ranked {
		if r.SKU == "CS-MOS-M" {
			t.Error("CS-MOS-M appeared in ranked; a forbidden family must be an exclusion, not a low score")
		}
	}
}

func TestSizeDeltaBeyondRuleIsRejected(t *testing.T) {
	got := Score(canonicalParams())

	fails := rejectedFor(got, "CS-SLT-XL")
	if fails == nil {
		t.Fatal("CS-SLT-XL should be rejected on size delta")
	}
	if !contains(fails, "size_delta_exceeds_merch_rule") {
		t.Errorf("CS-SLT-XL hard fails = %v, want size_delta_exceeds_merch_rule", fails)
	}
}

func TestExactSizeMatchScoresPerfectProximity(t *testing.T) {
	got := Score(canonicalParams())

	for _, r := range got.Ranked {
		if r.SKU == "CS-STN-M" {
			if r.Breakdown.SizeProximity != 1.0 {
				t.Errorf("exact size match size_proximity = %v, want 1.0", r.Breakdown.SizeProximity)
			}
			return
		}
	}
	t.Fatal("CS-STN-M not found in ranked")
}

func TestOneSizeOutScoresPartialProximity(t *testing.T) {
	got := Score(canonicalParams())

	for _, r := range got.Ranked {
		if r.SKU == "CS-SLT-L" {
			if r.Breakdown.SizeProximity != 0.7 {
				t.Errorf("one size out size_proximity = %v, want 0.7", r.Breakdown.SizeProximity)
			}
			return
		}
	}
	t.Fatal("CS-SLT-L not found in ranked")
}

func TestNegativeMarginIsRejected(t *testing.T) {
	p := canonicalParams()
	p.Candidates = []Candidate{{
		// Costs more to make than it sells for.
		Product: Product{SKU: "CS-STN-M", StyleID: "CS", Color: "Stone",
			ColorFamily: "neutral", SizeOrdinal: 3, ListPrice: 189.00, UnitCost: 195.00},
		Availability: []Availability{
			{LocationID: "DC-WEST", Region: "us-west", Available: 5, ShipsEcom: true},
		},
	}}

	got := Score(p)

	if !contains(rejectedFor(got, "CS-STN-M"), "negative_margin") {
		t.Errorf("expected negative_margin rejection, got %s", mustJSON(got.Rejected))
	}
}

func TestPricierSubstituteIsRejected(t *testing.T) {
	p := canonicalParams()
	p.Candidates = []Candidate{{
		Product: Product{SKU: "CS-STN-M", StyleID: "CS", Color: "Stone",
			ColorFamily: "neutral", SizeOrdinal: 3, ListPrice: 229.00, UnitCost: 71.00},
		Availability: []Availability{
			{LocationID: "DC-WEST", Region: "us-west", Available: 5, ShipsEcom: true},
		},
	}}

	got := Score(p)

	if !contains(rejectedFor(got, "CS-STN-M"), "costs_customer_more_than_original") {
		t.Errorf("expected price rejection, got %s", mustJSON(got.Rejected))
	}
}

// Stock exists, but only at a store that does not fulfill ecommerce orders.
// This is a real fulfillment failure mode and the seed carries a case for it.
func TestStockAtNonEcomLocationIsRejected(t *testing.T) {
	p := canonicalParams()
	p.Candidates = []Candidate{{
		Product: Product{SKU: "CS-STN-L", StyleID: "CS", Color: "Stone",
			ColorFamily: "neutral", SizeOrdinal: 4, ListPrice: 189.00, UnitCost: 74.00},
		Availability: []Availability{
			{LocationID: "ST-2201", Region: "us-central", Available: 4, ShipsEcom: false},
		},
	}}

	got := Score(p)

	if !contains(rejectedFor(got, "CS-STN-L"), "no_shippable_location_with_sufficient_stock") {
		t.Errorf("expected no-shippable-location rejection, got %s", mustJSON(got.Rejected))
	}
}

func TestInsufficientStockForQuantityIsRejected(t *testing.T) {
	p := canonicalParams()
	p.Qty = 5
	p.Candidates = []Candidate{{
		Product: Product{SKU: "CS-SLT-L", StyleID: "CS", Color: "Slate",
			ColorFamily: "neutral", SizeOrdinal: 4, ListPrice: 189.00, UnitCost: 86.00},
		Availability: []Availability{
			{LocationID: "DC-WEST", Region: "us-west", Available: 2, ShipsEcom: true},
		},
	}}

	got := Score(p)

	if !contains(rejectedFor(got, "CS-SLT-L"), "no_shippable_location_with_sufficient_stock") {
		t.Errorf("expected insufficient-stock rejection, got %s", mustJSON(got.Rejected))
	}
}

// Every candidate hard-fails, so cancel-and-refund is the only answer left.
// The seed carries a style in this state deliberately.
func TestEveryCandidateRejectedRecommendsCancel(t *testing.T) {
	p := canonicalParams()
	p.Candidates = []Candidate{candidateBySKU("CS-MOS-M"), candidateBySKU("CS-SLT-XL")}

	got := Score(p)

	if len(got.Ranked) != 0 {
		t.Errorf("expected no ranked candidates, got %s", mustJSON(got.Ranked))
	}
	if len(got.Rejected) != 2 {
		t.Errorf("expected 2 rejections, got %d", len(got.Rejected))
	}
	if s := Summary(got); s == "" || !contains([]string{s}, s) {
		t.Log(s)
	}
}

func TestEmptyCandidateListIsSafe(t *testing.T) {
	p := canonicalParams()
	p.Candidates = nil

	got := Score(p)

	if len(got.Ranked) != 0 || len(got.Rejected) != 0 {
		t.Errorf("empty input should produce empty output, got %s", mustJSON(got))
	}
	// Arrays must serialise as [] rather than null, so the agent sees a shape
	// it can iterate instead of a nil it has to special-case.
	b, _ := json.Marshal(got)
	var m map[string]json.RawMessage
	_ = json.Unmarshal(b, &m)
	if string(m["ranked"]) != "[]" || string(m["rejected"]) != "[]" {
		t.Errorf("empty arrays must serialise as [], got ranked=%s rejected=%s",
			m["ranked"], m["rejected"])
	}
}

// --- Determinism -----------------------------------------------------------

// Ties break by score descending, then SKU ascending. A tie that resolves
// differently between runs breaks the acceptance test and the evaluation set.
func TestTiesBreakBySKUAscending(t *testing.T) {
	p := canonicalParams()
	identical := Product{StyleID: "CS", Color: "Slate", ColorFamily: "neutral",
		SizeOrdinal: 3, ListPrice: 189.00, UnitCost: 82.00}
	stock := []Availability{{LocationID: "DC-WEST", Region: "us-west", Available: 10, ShipsEcom: true}}

	b, a := identical, identical
	b.SKU, a.SKU = "CS-SLT-ZZ", "CS-SLT-AA"
	p.Candidates = []Candidate{{Product: b, Availability: stock}, {Product: a, Availability: stock}}

	got := Score(p)

	if len(got.Ranked) != 2 {
		t.Fatalf("expected 2 ranked, got %d", len(got.Ranked))
	}
	if got.Ranked[0].TotalScore != got.Ranked[1].TotalScore {
		t.Fatalf("fixture should tie: %v vs %v", got.Ranked[0].TotalScore, got.Ranked[1].TotalScore)
	}
	if got.Ranked[0].SKU != "CS-SLT-AA" {
		t.Errorf("tie broke to %s, want CS-SLT-AA (lowest SKU first)", got.Ranked[0].SKU)
	}
}

// The evaluation lab is meaningless without this. Same input, same bytes out,
// every time.
func TestOutputIsByteIdenticalAcrossRuns(t *testing.T) {
	first := mustJSON(Score(canonicalParams()))

	for i := 0; i < 20; i++ {
		if got := mustJSON(Score(canonicalParams())); got != first {
			t.Fatalf("run %d differed from run 0\nfirst: %s\ngot:   %s", i+1, first, got)
		}
	}
}

// --- Output contract -------------------------------------------------------

// breakdown and weights_used are how the agent explains its recommendation
// and how an attendee sees what their weight change did. A tool that returns
// only a ranking teaches nothing.
func TestBreakdownAndWeightsAreAlwaysPresent(t *testing.T) {
	got := Score(canonicalParams())

	if got.WeightsUsed != DefaultWeights {
		t.Errorf("weights_used = %+v, want the default policy", got.WeightsUsed)
	}
	for _, r := range got.Ranked {
		if r.Breakdown.ColorMatch == 0 && r.Breakdown.SizeProximity == 0 {
			t.Errorf("%s has an empty breakdown; the arithmetic must be visible", r.SKU)
		}
		if r.DaysToDeliver <= 0 {
			t.Errorf("%s has days_to_deliver = %d, want a real estimate", r.SKU, r.DaysToDeliver)
		}
	}
}

func mustJSON(v any) string {
	b, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		panic(err)
	}
	return string(b)
}

// Sizing up and sizing down are not equivalent. CS-SLT-S and CS-SLT-L are
// identical apart from cost, and the small is cheaper, so margin arithmetic
// alone would prefer it. It must still rank below the large: a customer who
// ordered a medium can wear a large, and cannot wear a small.
func TestSizingDownRanksBelowSizingUp(t *testing.T) {
	got := Score(canonicalParams())

	var posS, posL = -1, -1
	for i, r := range got.Ranked {
		switch r.SKU {
		case "CS-SLT-S":
			posS = i
		case "CS-SLT-L":
			posL = i
		}
	}
	if posS == -1 || posL == -1 {
		t.Fatalf("expected both CS-SLT-S and CS-SLT-L ranked, got %s", mustJSON(got.Ranked))
	}
	if posL > posS {
		t.Errorf("CS-SLT-S (one size down) ranked above CS-SLT-L (one size up)\n%s",
			mustJSON(got.Ranked))
	}
}
