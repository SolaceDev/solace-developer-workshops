package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"strconv"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/baggage"
	"go.opentelemetry.io/otel/propagation"
	semconv "go.opentelemetry.io/otel/semconv/v1.17.0"

	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"

	"go.opentelemetry.io/otel/trace"
	"solace.dev/go/messaging"
	"solace.dev/go/messaging/pkg/solace/config"
	"solace.dev/go/messaging/pkg/solace/message"
	"solace.dev/go/messaging/pkg/solace/resource"

	// Dependency below is for Solace PubSub+ OTel integration:
	solpropagation "solace.dev/go/messaging-trace/opentelemetry"
	"solace.dev/go/messaging-trace/opentelemetry/carrier"
	sol_otel_logging "solace.dev/go/messaging-trace/opentelemetry/logging"
)

func getEnv(key, def string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return def
}

// init function for propagator setup
func InitTracing() {
	// common init
	tcPropagation := propagation.TraceContext{}
	bagPropagation := propagation.Baggage{}
	// Register the TraceContext propagator globally; Solace supports only this format
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(tcPropagation, bagPropagation))
	// otel.SetTextMapPropagator(propagation.TraceContext{}) // - optional if you only need to propagate trace context and not Baggage

	// You can use any other valid exporter here
	exporter, _ := stdouttrace.New(stdouttrace.WithPrettyPrint()) // use a stdOut trace exporter

	batchspanProcessor := sdktrace.NewSimpleSpanProcessor(exporter) // You should use batch span processor in production environment
	traceProvider := sdktrace.NewTracerProvider(
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
		sdktrace.WithSpanProcessor(batchspanProcessor),
	)

	// Register the TraceProvider globally;
	otel.SetTracerProvider(traceProvider)

	// enable logging on the solace PubSub+ OTel integration component
	sol_otel_logging.SetLogLevel(sol_otel_logging.LogLevelInfo)

	// more otel api globals can be configured
	// ...

}

// GetInitialContext - get the initial context from the background context and optionally add baggage information
func GetInitialContext(withBaggage bool) context.Context {
	if withBaggage {
		// create example baggage with single key-value entries
		baggageMember1, _ := baggage.NewMember("myPublisherKey1", "myPublisherValue1")
		baggageMember2, _ := baggage.NewMember("myPublisherKey2", "myPublisherValue2")
		baggageMembers, _ := baggage.New(baggageMember1, baggageMember2)
		return baggage.ContextWithBaggage(context.Background(), baggageMembers)
	}
	return context.Background()
}

// HowToInjectTraceContextInSolaceMessage - example of how to inject trace context into a Solace message
func HowToInjectTraceContextInSolaceMessage(startingContext context.Context, outMessage message.OutboundMessage, msgSeqNum int, publishToTopic string) {
	var outboundMessageCarrier carrier.OutboundMessageCarrier = solpropagation.NewOutboundMessageCarrier(outMessage)

	// Create a span.
	attrsForPublishSpan := []attribute.KeyValue{
		semconv.MessagingSystem("PubSub+"),
		semconv.MessagingDestinationKindTopic,
		semconv.MessagingDestinationName(publishToTopic),
		semconv.MessagingOperationPublish,
		semconv.MessagingMessageID(fmt.Sprintf("%d", msgSeqNum)),
	}

	optsForPublishSpan := []trace.SpanStartOption{
		trace.WithAttributes(attrsForPublishSpan...),
		trace.WithSpanKind(trace.SpanKindProducer),
	}
	publisherTracer := otel.GetTracerProvider().Tracer("myAppTracer", trace.WithInstrumentationVersion(solpropagation.Version()))

	publishCtx, publishSpan := publisherTracer.Start(
		startingContext,
		fmt.Sprintf("%s publish", publishToTopic),
		optsForPublishSpan...)

	defer func() {
		publishSpan.End() // then finish span
		fmt.Println("<<<<<<<<<< End of Tracing Information Output from StdOutTrace Exporter >>>>>>>>>>", "\n\n", "")
	}()

	otel.GetTextMapPropagator().Inject(publishCtx, outboundMessageCarrier)
	otel.GetTextMapPropagator().Inject(publishCtx, outboundMessageCarrier) // second call to Inject() addes the transport context

	// Label for the stdouttrace export on the console
	fmt.Println("\n\n<<<<<<<<<< Start of Tracing Information Output from StdOutTrace Exporter here: >>>>>>>>>>")
}

// TopicPrefix - Define Topic Prefix
const PublishTopicName = "solace/samples/otel-tracing"

func main() {
	// setting up Otel defaults
	InitTracing()

	// Configuration parameters
	brokerConfig := config.ServicePropertyMap{
		config.TransportLayerPropertyHost:                getEnv("SOLACE_HOST", "tcp://localhost:55555,tcp://localhost:55554"),
		config.ServicePropertyVPNName:                    getEnv("SOLACE_VPN", "default"),
		config.AuthenticationPropertySchemeBasicPassword: getEnv("SOLACE_PASSWORD", "default"),
		config.AuthenticationPropertySchemeBasicUserName: getEnv("SOLACE_USERNAME", "default"),
	}

	messagingService, err := messaging.NewMessagingServiceBuilder().FromConfigurationProvider(brokerConfig).Build()

	if err != nil {
		panic(err)
	}

	// Connect to the messaging serice
	if err := messagingService.Connect(); err != nil {
		panic(err)
	}

	fmt.Println("Connected to the broker? ", messagingService.IsConnected())

	// Build a Persistent Message Publisher
	// persistentPublisher, err := messagingService.CreatePersistentMessagePublisherBuilder().Build()

	//  Build a Direct Message Publisher
	directPublisher, err := messagingService.CreateDirectMessagePublisherBuilder().Build()
	if err != nil {
		panic(err)
	}

	// Start Direct Message Publisher
	if err := directPublisher.Start(); err != nil {
		panic(err)
	}

	fmt.Println("Direct Publisher running? ", directPublisher.IsRunning())

	fmt.Println("\n===Interrupt (CTR+C) to stop publishing===")

	msgSeqNum := 0 // set to zero

	//  Prepare outbound message payload and body
	messageConfig := config.MessagePropertyMap{
		config.MessagePropertyClassOfService: 2,
		config.MessageProperty("others"):     "Otel Sample",
	}
	messageBody := "Hello from Go Otel Tracing Publisher Sample"
	messageBuilder := messagingService.MessageBuilder().
		FromConfigurationProvider(messageConfig).
		WithProperty("application", "samples").
		WithProperty("language", "go")

	topic := resource.TopicOf(PublishTopicName)
	fmt.Printf("Publishing on: %s, please ensure queue has matching subscription.\n", topic.GetName())

	// Run forever until an interrupt signal is received
	go func() {
		// uncomment this line; if using the persistentPublisher
		// for persistentPublisher.IsReady() && msgSeqNum <= 0 {

		// comment out this line; if using the persistentPublisher
		for directPublisher.IsReady() && msgSeqNum <= 0 {
			msgSeqNum++
			outMessage, err := messageBuilder.BuildWithStringPayload(messageBody + " --> " + strconv.Itoa(msgSeqNum))
			if err != nil {
				panic(err)
			}

			// get the initial context
			startingContext := GetInitialContext(true) // pass true to include baggage in context

			// inject trace context into Solace message via the OutboundMessageCarrier
			HowToInjectTraceContextInSolaceMessage(startingContext, outMessage, msgSeqNum, PublishTopicName)

			// Publish to the given topic
			// comment out this line; if using the persistentPublisher
			publishErr := directPublisher.Publish(outMessage, resource.TopicOf(PublishTopicName))

			// uncomment this line; if using the persistentPublisher
			// publishErr := persistentPublisher.Publish(outMessage, resource.TopicOf(PublishTopicName), nil, nil)

			if publishErr != nil {
				panic(publishErr)
			}

			time.Sleep(1 * time.Second)
			msgSeqNum++
		}
	}()

	// Handle OS interrupts
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)

	// Block until an OS interrupt signal is received.
	<-c

	// uncomment this block; if using the persistentPublisher
	// Terminate the Persistent Publisher
	// persistentPublisher.Terminate(1 * time.Second)
	// fmt.Println("\nPersistent Publisher Terminated? ", persistentPublisher.IsTerminated())

	// comment out this block; if using the persistentPublisher
	// Terminate the Direct Publisher
	directPublisher.Terminate(1 * time.Second)
	fmt.Println("\nDirect Publisher Terminated? ", directPublisher.IsTerminated())

	// Disconnect the Message Service
	messagingService.Disconnect()
	fmt.Println("Messaging Service Disconnected? ", !messagingService.IsConnected())
}
