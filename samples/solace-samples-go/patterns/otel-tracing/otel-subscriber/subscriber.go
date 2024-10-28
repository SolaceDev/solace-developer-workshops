package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/baggage"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/propagation"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
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

// GetReceivedContext - retrieve the current context from the inbound message carrier
func GetReceivedContext(inboundMessageCarrier carrier.InboundMessageCarrier) context.Context {
	// retrieve the current context
	return otel.GetTextMapPropagator().Extract(context.Background(), inboundMessageCarrier)
}

// AddBaggageToContext - add sample bagge information to the passed in context
func AddBaggageToContext(ctx context.Context) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	// get any baggage information in the received context
	baggageInReceivedMessage := baggage.FromContext(ctx)

	// create example baggage with single key-value entries
	baggageMember1, _ := baggage.NewMember("myConsumerKey1", "myConsumerValue1")
	baggageMember2, _ := baggage.NewMember("myConsumerKey2", "myConsumerValue2")
	var newBaggage, _ = baggageInReceivedMessage.SetMember(baggageMember1)
	newBaggage, _ = newBaggage.SetMember(baggageMember2)
	return baggage.ContextWithBaggage(ctx, newBaggage)
}

// HowToInjectTraceContextInSolaceMessage - example of how to inject trace context into a Solace message
func HowToInjectTraceContextInSolaceMessage(inboundMessage message.InboundMessage, withBaggage bool) {
	var inboundMessageCarrier carrier.InboundMessageCarrier = solpropagation.NewInboundMessageCarrier(inboundMessage)

	// Extract the context from the Inbound message via its carrier instance
	parentSpanContext := GetReceivedContext(inboundMessageCarrier)

	// Should we add a sample baggage from this receiver (consumer) ?
	if withBaggage {
		parentSpanContext = AddBaggageToContext(parentSpanContext)
	}

	attrs := []attribute.KeyValue{
		semconv.MessagingSystem("PubSub+"),
		semconv.MessagingDestinationKindTopic,
		semconv.MessagingDestinationName(inboundMessage.GetDestinationName()),
		semconv.MessagingOperationReceive,
		// add more span attributes as needed...
	}
	opts := []trace.SpanStartOption{
		trace.WithAttributes(attrs...),
		trace.WithSpanKind(trace.SpanKindConsumer),
	}

	receiverTracer := otel.GetTracerProvider().Tracer("myAppTracer", trace.WithInstrumentationVersion(solpropagation.Version()))

	receiveCtx, receiveSpan := receiverTracer.Start(parentSpanContext, fmt.Sprintf("%s receive", inboundMessage.GetDestinationName()), opts...)
	defer func() {
		receiveSpan.End() // then finish span
		fmt.Println("<<<<<<<<<< End of Tracing Information Output from StdOutTrace Exporter >>>>>>>>>>", "\n\n", "")
	}()

	otel.GetTextMapPropagator().Inject(receiveCtx, inboundMessageCarrier)

	// Label for the stdouttrace export on the console
	fmt.Println("\n\n<<<<<<<<<< Start of Tracing Information Output from StdOutTrace Exporter here: >>>>>>>>>>")
}

// MessageHandler - Message Handler
func MessageHandler(message message.InboundMessage) {
	// retrieve the current context from the received message carrier
	// inject receiver trace context into Solace message via the InboundMessageCarrier
	HowToInjectTraceContextInSolaceMessage(message, true)

	var messageBody string

	if payload, ok := message.GetPayloadAsString(); ok {
		messageBody = payload
	} else if payload, ok := message.GetPayloadAsBytes(); ok {
		messageBody = string(payload)
	}

	// dump the context of the received message with Tracing information here
	fmt.Printf("Received Message Body: %s \n", messageBody)
	fmt.Printf("Message Dump:\n================\n%s \n", message)
}

// TopicPrefix - Define Topic Prefix
const TopicPrefix = "solace/samples/otel-tracing"

func main() {
	// setting up defaults
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

	if err != nil {
		panic(err)
	}

	//  Build a Direct Message Receiver
	directReceiver, err := messagingService.CreateDirectMessageReceiverBuilder().
		WithSubscriptions(resource.TopicSubscriptionOf(TopicPrefix)).
		Build()

	if err != nil {
		panic(err)
	}

	// Start Direct Message Receiver
	if err := directReceiver.Start(); err != nil {
		panic(err)
	}

	fmt.Println("Direct Receiver running? ", directReceiver.IsRunning())

	if regErr := directReceiver.ReceiveAsync(MessageHandler); regErr != nil {
		panic(regErr)
	}

	fmt.Println("\n===Interrupt (CTR+C) to handle graceful termination of the receiver===")

	// Run forever until an interrupt signal is received
	// Handle interrupts
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)

	// Block until a signal is received.
	<-c

	// Terminate the Persistent Receiver
	directReceiver.Terminate(1 * time.Second)
	fmt.Println("\nDirect Receiver Terminated? ", directReceiver.IsTerminated())

	// Disconnect the Message Service
	messagingService.Disconnect()
	fmt.Println("Messaging Service Disconnected? ", !messagingService.IsConnected())

}
