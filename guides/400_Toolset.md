# The Thing an LLM Should Not Guess

Which jacket is an acceptable substitute for the one Meridian cannot ship?

Size proximity. Colorway. Whether merchandising approves the swap. What it costs the customer. What it costs Meridian in margin. How far the stock is from Oregon. Whether taking it clears out the last units at a store.

That is arithmetic, and it has money attached. This section takes it out of the prompt.

---

## Table of Contents

- [Three reasons this is not a prompt](#three-reasons-this-is-not-a-prompt)
- [What the tool does](#what-the-tool-does)
- [Hands-on: build and apply the toolset](#hands-on-build-and-apply-the-toolset)
- [Hands-on: change the business policy](#hands-on-change-the-business-policy)
- [Hands-on: policy that is not yours to own](#hands-on-policy-that-is-not-yours-to-own)
- [What happened?](#what-happened)

---

## Three reasons this is not a prompt

In the order a retailer cares about.

**1. It is weighted arithmetic over money.** An LLM asked to rank substitutes returns a plausible-looking ordering. The mistakes do not look like mistakes. It quietly gives away margin, and nobody notices for a quarter.

**2. It is not reproducible.** Same input, different ranking, run to run. Everything downstream of that inherits the problem: you cannot screenshot it, cannot regression-test it, and cannot evaluate it. The take-home evaluation lab in section 800 is meaningless without reproducibility, which makes this toolset a prerequisite for evaluation rather than a feature beside it.

**3. The merch rules are constraints, not preferences.** "Merchandising does not approve bright colorways as substitutes for this style" is not a position to be talked out of. A tool returns nothing. A prompt returns a hedge, and a hedge in front of a customer is a bad substitution with a caveat attached.

---

## What the tool does

One tool, `score_substitutes`. It takes the failed SKU, the candidates, their availability, and the merch rules, and returns a ranking with the arithmetic exposed.

It performs **no I/O**. It opens no socket, reads no database, and calls no model. Everything it needs is passed in by the agent, which gathered it from the two connectors you built in section 200. That is what makes it trivially testable and trivially reproducible, and the runtime enforces it: the tool is declared with a `restrictive` sandbox profile, which isolates the network entirely.

Six components, each normalized to 0.0 through 1.0 and combined as a weighted sum:

| Component | Default weight | Hard fail |
|---|---|---|
| `size_proximity` | 0.25 | delta exceeds the merch rule |
| `color_match` | 0.20 | family forbidden by merch |
| `price_delta` | 0.15 | candidate costs the customer more |
| `margin_impact` | 0.20 | margin at or below zero |
| `fulfillment_distance` | 0.15 | no ecom-capable location can cover the quantity |
| `inventory_depth` | 0.05 | available below quantity everywhere |

A hard fail is an exclusion, not a low score. Failing candidates go into a separate `rejected` list with every reason they failed, never into the ranking with a bad number attached. Conflating the two is how a forbidden substitute ends up being argued for.

The source ships written. Authoring a Go tool from scratch does not fit in this section and is not the lesson. What you are going to do is change one number and watch the business answer change.

---

## Hands-on: build and apply the toolset

1. Look at the toolset layout:

    ```
    sample_configuration/toolsets/
      substitution-scoring.yaml          the resource declaration
      substitution-scoring/
        src/
          scoring.go                     the scoring logic
          scoring_test.go                the tests
          main.go                        the SDK entry point
          manifest.yaml                  runtime registration
          build.sh                       the build
    ```

1. Run the tests. They are also what validates the seeded Meridian data.

    ```
    cd sample_configuration/toolsets/substitution-scoring/src
    go test -tags nosdk ./...
    ```

    > Note: You should see `ok  substitution-scoring`. Sixteen tests cover exact and near size matches, every hard-fail condition, tie-breaking, and byte-identical output across twenty consecutive runs.

1. Go back to the repository root and add the toolset to the manifest:

    ```
    cd /workspaces/solace-developer-workshops
    ```

    ```
      toolsets:
        - substitution-scoring
    ```

1. Reattach it to the agent. In [`sample_configuration/agents/order-triage.yaml`](../sample_configuration/agents/order-triage.yaml), restore the reference you emptied in the last section:

    ```
      toolsets:
        - substitution-scoring
    ```

1. Plan. The toolset builds as part of planning.

    ```
    export RETAIL_DB_PASSWORD=postgres
    sam config plan --manifest sample_configuration/manifests/local.yaml
    ```

    > Note: Observe the build line in the plan output. Solace Agent Mesh compiles the Go source, caches the result per target platform, and shows you which happened.

    ```
        toolsets/
    + substitution-scoring      create   [BUILD: built linux/amd64]
    ```

1. Apply it.

    ```
    sam config apply --manifest sample_configuration/manifests/local.yaml
    ```

1. Start a chat with `order-triage` and ask it to do the whole job:

    ```
    Order ORD-10428 cannot ship. Find substitutes, score them, and tell me which one to send and why.
    ```

1. Read the answer carefully. The agent should recommend **CS-SLT-L**, the same jacket one size up, and it should report the component scores rather than describing them in general terms. It should also tell you that two candidates were rejected outright: the Moss colorway on merch rules, and the XL on size delta.

---

## Hands-on: change the business policy

Right now the scoring favors what is closest to what the customer ordered. Meridian's finance team would like it to favor margin. That is a policy decision, not an engineering one, and it should take one edit.

1. Open `sample_configuration/toolsets/substitution-scoring/src/scoring.go` and find `DefaultWeights`:

    ```
    var DefaultWeights = Weights{
        SizeProximity:       0.25,
        ColorMatch:          0.20,
        PriceDelta:          0.15,
        MarginImpact:        0.20, // <-- the lab changes this to 0.60
        FulfillmentDistance: 0.15,
        InventoryDepth:      0.05,
    }
    ```

1. Change `MarginImpact` from `0.20` to `0.60`. Change nothing else.

1. Rebuild and apply:

    ```
    sam config apply --manifest sample_configuration/manifests/local.yaml
    ```

1. Ask the **same question** again in a new chat:

    ```
    Order ORD-10428 cannot ship. Find substitutes, score them, and tell me which one to send and why.
    ```

The recommendation flips. It is now **CS-STN-M**: the exact size the customer ordered, in a different colorway from the same family, $11 better on margin, but six days away on the east coast instead of two days from the west.

| Weights | Winner | Score | Why |
|---|---|---|---|
| shipped | `CS-SLT-L` | 0.81 | same color, one size up, two days away |
| `margin_impact: 0.60` | `CS-STN-M` | 0.76 | exact size, $11 better margin, six days away |

Same order. Same inventory. Same candidates. Same code path. One number, and the business answer changed.

Now notice what you can do that you could not do with a prompt: you can explain exactly **why** it changed, point at the line that changed it, put that line in a pull request, and get the same answer tomorrow. Ask the same model to "weigh margin more heavily" and you have none of that.

> Note: Change `MarginImpact` back to `0.20` and apply again before continuing, so the rest of the workshop matches the guides.

---

## Hands-on: policy that is not yours to own

One more part, and it is a short one.

Meridian has brand voice rules and a goodwill credit policy. Every agent that talks to a customer needs both. Neither belongs to whoever wrote the agent: Brand owns the voice, Legal owns the credit ceiling, and both change on their own schedule.

Putting that in `order-triage`'s system prompt works exactly until the second customer-facing agent exists. Then it is copy-pasted, and the two drift within a month. When Legal drops the ceiling from $50 to $25, one of them keeps issuing $50 credits.

A `kind: skill` resource is a bundle of instructions and assets any agent can load by name.

1. Look at the bundle:

    ```
    sample_configuration/skills/meridian-customer-comms/
      SKILL.md                  brand voice, credit policy, prohibitions
      assets/templates.md       four message templates
    ```

    > Note: A skill is directory-shaped, not a single YAML file. The metadata lives in the frontmatter at the top of `SKILL.md`, and the `name` there must match the directory name and the manifest entry.

1. Open `SKILL.md` and read the credit policy table and the prohibitions. Note that the $50 ceiling appears once, here, and that `order-triage`'s prompt refers to it rather than restating it.

1. Add the skill to the manifest and reattach it to the agent:

    ```
      skills:
        - meridian-customer-comms
    ```

    In `order-triage.yaml`:

    ```
      skillRefs:
        - meridian-customer-comms
    ```

1. Plan and apply:

    ```
    sam config plan --manifest sample_configuration/manifests/local.yaml
    sam config apply --manifest sample_configuration/manifests/local.yaml
    ```

1. Ask for the customer-facing half:

    ```
    Draft the message to the customer for ORD-10428, offering the recommended substitute.
    ```

The message leads with what happened rather than an apology, never uses the word "unfortunately," states no restock date, and offers a credit only if the customer's loyalty tier authorizes one. None of that is in the agent's prompt. It came from the skill.

Any other customer-facing agent gets the same behavior by adding the same one line.

---

And that's it! What happened?

You added the two ways to extend an agent, and they solve different problems:

1. **A toolset** (`substitution-scoring`) for the decision that must be exactly right every time. Deterministic Go, no network, no model, full arithmetic in the output. You changed one weight and the recommendation flipped, which is the argument for the whole component: business policy became a reviewable line of code instead of a hopeful sentence in a prompt.

2. **A skill** (`meridian-customer-comms`) for policy owned by someone else. Brand voice and the credit ceiling live in one bundle, loaded by name, versioned on Brand and Legal's schedule rather than the agent author's.

The dividing line is worth stating plainly. A **toolset** is for things that must be computed. A **skill** is for things that must be *said the same way everywhere*. Both attach to an agent with one line, and neither requires touching the agent's system prompt.

Your `order-triage.yaml` now has every reference list populated. Compare it to where it started in section 300: the prompt has not changed at all. The agent got substantially more capable by accumulating names.

---
Section complete! Close this file and return to the Workshop Tracker to continue.
