module SolaceSamples.com/PubSub+Go

go 1.17

require solace.dev/go/messaging v1.6.1

require solace.dev/go/messaging-trace/opentelemetry v1.0.0

require (
	go.opentelemetry.io/otel v1.22.0
	go.opentelemetry.io/otel/exporters/stdout/stdouttrace v1.22.0
	go.opentelemetry.io/otel/sdk v1.22.0
	go.opentelemetry.io/otel/trace v1.22.0
)

require (
	github.com/go-logr/logr v1.4.1 // indirect
	github.com/go-logr/stdr v1.2.2 // indirect
	go.opentelemetry.io/otel/metric v1.22.0 // indirect
	golang.org/x/sys v0.16.0 // indirect
)
