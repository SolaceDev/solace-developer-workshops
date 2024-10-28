package main

import (
	"fmt"
	"os"
	"os/signal"
	"time"

	"solace.dev/go/messaging"
	"solace.dev/go/messaging/pkg/solace"
	"solace.dev/go/messaging/pkg/solace/config"
	"solace.dev/go/messaging/pkg/solace/message"
	"solace.dev/go/messaging/pkg/solace/resource"
)

// Message Handler
func MessageHandler(message message.InboundMessage) {
	var messageBody string

	if payload, ok := message.GetPayloadAsString(); ok {
		messageBody = payload
	} else if payload, ok := message.GetPayloadAsBytes(); ok {
		messageBody = string(payload)
	}

	fmt.Printf("Received Message Body %s \n", messageBody)
	// fmt.Printf("Message Dump %s \n", message)
}

func ReconnectionHandler(e solace.ServiceEvent) {
	e.GetTimestamp()
	e.GetBrokerURI()
	err := e.GetCause()
	if err != nil {
		fmt.Println(err)
	}
}

func getEnv(key, def string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return def
}

// Define Topic Prefix
const TopicPrefix = "solace/samples"

func main() {

	// logging.SetLogLevel(logging.LogLevelInfo)

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

	messagingService.AddReconnectionListener(ReconnectionHandler)

	// Connect to the messaging serice
	if err := messagingService.Connect(); err != nil {
		panic(err)
	}

	fmt.Println("Connected to the broker? ", messagingService.IsConnected())

	// Define Topic Subscriptions
	topics := [...]string{TopicPrefix + "/>", TopicPrefix + "/*/direct/sub"}
	topicsSub := make([]resource.Subscription, len(topics))

	// Create topic objects
	for i, topicString := range topics {
		topicsSub[i] = resource.TopicSubscriptionOf(topicString)
	}

	// Print out list of strings to subscribe to
	for _, ts := range topicsSub {
		fmt.Println("Subscribed to: ", ts.GetName())
	}

	// Build a Direct message receivers with given topics
	directReceiver, err := messagingService.CreateDirectMessageReceiverBuilder().
		WithSubscriptions(topicsSub...).
		Build()

	if err != nil {
		panic(err)
	}

	// Start Direct Message Receiver
	if err := directReceiver.Start(); err != nil {
		panic(err)
	}

	fmt.Println("Direct Receiver running? ", directReceiver.IsRunning())

	// Register Message callback handler to the Message Receiver
	if regErr := directReceiver.ReceiveAsync(MessageHandler); regErr != nil {
		panic(regErr)
	}

	fmt.Println("\n===Interrupt (CTR+C) to handle graceful termination of the receiver===\n")

	// cleanup after the main calling function has finished execution
	defer func() {
		// Terminate the Direct Receiver
		directReceiver.Terminate(1 * time.Second)
		fmt.Println("\nDirect Receiver Terminated? ", directReceiver.IsTerminated())
		// Disconnect the Message Service
		messagingService.Disconnect()
		fmt.Println("Messaging Service Disconnected? ", !messagingService.IsConnected())
	}()

	// Run forever until an interrupt signal is received
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	// Block until a interrupt signal is received.
	<-c
}
