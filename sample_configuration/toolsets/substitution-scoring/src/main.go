// Build tag: this file is excluded when NOSDK is set, which is how the
// scoring logic and its tests run on a machine that has not yet vendored the
// SAM tool SDK. The container build has the SDK and compiles this normally,
// so `./build.sh` needs no flag.
//go:build !nosdk

// Command substitution-scoring is a Solace Agent Mesh remote tool that ranks
// substitution candidates for an order line that cannot be fulfilled.
//
// It exists because ranking substitutes is weighted arithmetic over money, and
// three things follow from that:
//
//  1. An LLM asked to rank substitutes produces a plausible-looking ordering
//     that quietly gives away margin. Nobody notices for a quarter.
//  2. An LLM is not reproducible. Same input, different ranking, run to run.
//     The evaluation lab is meaningless without reproducibility.
//  3. The merch rules are constraints, not preferences. A tool returns nothing
//     for a forbidden substitute. A prompt returns a hedge.
//
// The tool performs no I/O. It calls no model, opens no socket, and reads no
// database. Everything it needs is passed in by the agent, which gathered it
// from the retail-postgres and product-catalog connectors.
package main

import (
	"context"

	sdk "samtoolsdk"
)

func scoreSubstitutes(_ context.Context, p ScoreParams, tc *sdk.ToolContext) (*sdk.Result, error) {
	_ = tc.SendStatus("scoring substitution candidates…")

	result := Score(p)

	return sdk.OK(Summary(result), sdk.WithData(map[string]any{
		"ranked":       result.Ranked,
		"rejected":     result.Rejected,
		"weights_used": result.WeightsUsed,
	})), nil
}

func main() {
	sdk.Run(sdk.NewTool(
		"score_substitutes",
		"Rank substitution candidates for an unfulfillable order line by size proximity, color match, price, margin, delivery distance, and inventory depth. Returns a ranked list with the full scoring breakdown, plus candidates rejected on merchandising hard constraints.",
		scoreSubstitutes,
		sdk.WithInstructions(
			"Use this whenever an order line cannot be fulfilled and a substitute is being considered. "+
				"Never rank or choose substitutes yourself: the scoring is weighted arithmetic over margin "+
				"and delivery time and it must be reproducible. Pass every candidate the product catalog "+
				"returned, along with its live availability from the inventory database. Report the "+
				"breakdown values in your explanation rather than paraphrasing them.",
		),
	))
}
