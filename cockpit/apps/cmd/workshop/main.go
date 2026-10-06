// Command workshop is the single binary behind every cockpit scenario app.
//
// One binary rather than one per role: the Solace Go API links the native
// client library through cgo, so each extra binary costs another copy of it
// and another link step. Attendees wait for one build, once, and every
// scenario's actions are served by the same artifact.
//
// Usage: workshop <scenario> <role> [flags]
package main

import (
	"fmt"
	"os"
	"sort"

	"solace-workshop/apps/scenarios/arrival"
	"solace-workshop/apps/scenarios/cqrs"
	"solace-workshop/apps/scenarios/fanout"
	"solace-workshop/apps/scenarios/hello"
	"solace-workshop/apps/scenarios/processor"
	"solace-workshop/apps/scenarios/pubsub"
	"solace-workshop/apps/scenarios/shock"
	"solace-workshop/apps/scenarios/smartshelf"
	"solace-workshop/apps/scenarios/sonepar"
	"solace-workshop/apps/scenarios/streaming"
)

// roles maps "<scenario> <role>" to the function that runs it. Adding a
// scenario means adding entries here and a package under scenarios/.
var roles = map[string]func([]string){
	"hello greet":        hello.Greet,
	"hello listen":       hello.Listen,
	"pubsub publish":     pubsub.Publish,
	"pubsub subscribe":   pubsub.Subscribe,
	"fanout publish":     fanout.Publish,
	"fanout consume":     fanout.Consume,
	"shock scan":         shock.Scan,
	"shock work":         shock.Work,
	"processor line":     processor.Line,
	"processor enrich":   processor.Enrich,
	"processor route":    processor.Route,
	"processor sink":     processor.Sink,
	"cqrs command":       cqrs.Command,
	"cqrs device":        cqrs.Device,
	"cqrs twin":          cqrs.Twin,
	"streaming gateway":  streaming.Gateway,
	"streaming fraud":    streaming.Fraud,
	"streaming watch":    streaming.Watch,
	"arrival scanner":    arrival.Scanner,
	"arrival routing":    arrival.Routing,
	"arrival passenger":  arrival.Passenger,
	"smartshelf sensors": smartshelf.Sensors,
	"smartshelf pricing": smartshelf.Pricing,
	"smartshelf labels":  smartshelf.Labels,
	"sonepar publish":    sonepar.Publish,
	"sonepar consume":    sonepar.Consume,
}

func main() {
	if len(os.Args) < 3 {
		usage()
		os.Exit(2)
	}
	key := os.Args[1] + " " + os.Args[2]
	run, ok := roles[key]
	if !ok {
		fmt.Fprintf(os.Stderr, "unknown scenario role: %s\n\n", key)
		usage()
		os.Exit(2)
	}
	run(os.Args[3:])
}

func usage() {
	fmt.Fprintln(os.Stderr, "usage: workshop <scenario> <role> [flags]")
	fmt.Fprintln(os.Stderr, "\nknown roles:")
	keys := make([]string, 0, len(roles))
	for k := range roles {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		fmt.Fprintf(os.Stderr, "  %s\n", k)
	}
}
