# substitution-scoring

One tool, `score_substitutes`, that ranks substitution candidates for an order
line that cannot be fulfilled.

## Why this is a tool and not a prompt

Ranking substitutes is weighted arithmetic over money. Three things follow:

1. **It gives away margin invisibly.** An LLM asked to rank substitutes returns
   a plausible-looking ordering. The mistakes do not look like mistakes, and
   nobody notices for a quarter.
2. **It is not reproducible.** Same input, different ranking, run to run. The
   evaluation lab in guide 800 is meaningless without reproducibility, which
   makes this toolset a prerequisite for the eval rather than a parallel feature.
3. **The merch rules are constraints, not preferences.** "Merchandising forbids
   this color family" is not something to be persuaded about. A tool returns
   nothing. A prompt returns a hedge.

The tool performs no I/O. It calls no model, opens no socket, and reads no
database. Everything it needs is passed in by the agent, which gathered it from
the `retail-postgres` and `product-catalog` connectors. The STR sandbox profile
is set to `restrictive`, so the runtime enforces what the code already promises.

## The workshop lab

Open `src/scoring.go` and find `DefaultWeights`. Change `MarginImpact` from
`0.20` to `0.60`, rebuild, apply, and republish the same event.

The top substitute for `ORD-10428` flips:

| Weights | Winner | Score | Why |
|---|---|---|---|
| shipped | `CS-SLT-L` | 0.81 | same color, one size up, two-day delivery from the customer's own region |
| `margin_impact: 0.60` | `CS-STN-M` | 0.76 | exact size, $11 better margin, but six days from the east coast |

Same input, different business policy, one number changed.

Against the full seeded candidate set, four candidates rank and five are
rejected. Rejection is separate from a low score, because a hard constraint is
an exclusion rather than an argument:

| Rejected | Reason |
|---|---|
| `CS-MOS-M`, `CS-MOS-L` | `color_family_forbidden_by_merch` |
| `CS-SLT-XL`, `CS-SLT-XS` | `size_delta_exceeds_merch_rule` |
| `CS-STN-XL` | size delta, and its only stock sits at a store that does not ship ecommerce |

## Sizing is asymmetric

`CS-SLT-S` is identical to `CS-SLT-L` on every axis except cost, where it is
cheaper. Margin arithmetic alone would rank the small above the large. It does
not, because a customer who ordered a medium can wear a large over a base layer
and cannot wear a small at all. One size up scores 0.7; one size down scores
0.35.

This is the kind of rule that is obvious to a merchandiser, invisible in a
prompt, and permanent once it is in a tool.

## Running the tests

The scoring logic and its tests run without the SAM tool SDK vendored:

```
go test -tags nosdk ./...
```

These tests also validate the seed data in `util/db/02_seed.sql`. The fixtures
mirror the seeded Cascade Shell inventory exactly, so if the seed changes and
the tests fail, the seed is wrong rather than the tool.

The full build, including the SDK entry point in `main.go`, runs in the
workshop container where `sam toolset init` has vendored the SDK into `_sdk/`:

```
./build.sh
```

## Scoring components

Six components, each normalised to 0.0 through 1.0 and combined as a weighted
sum, then divided by the weight total so the score stays on 0.0 to 1.0 even
after a weight is changed.

| Component | Default weight | Hard fail |
|---|---|---|
| `size_proximity` | 0.25 | delta exceeds the merch rule |
| `color_match` | 0.20 | family forbidden by merch |
| `price_delta` | 0.15 | candidate costs the customer more |
| `margin_impact` | 0.20 | margin at or below zero |
| `fulfillment_distance` | 0.15 | no ecom-capable location can cover the quantity |
| `inventory_depth` | 0.05 | available below quantity everywhere |

Hard fails short-circuit: a rejected candidate is never scored, and every
failure reason is reported rather than only the first. Ties break by score
descending, then SKU ascending, so a ranking never reorders between runs.
