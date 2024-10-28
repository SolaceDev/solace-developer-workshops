package main

import (
	"fmt"
	"os"
	"os/signal"
	"time"

	"solace.dev/go/messaging"
	"solace.dev/go/messaging/pkg/solace/config"
	"solace.dev/go/messaging/pkg/solace/message"
	"solace.dev/go/messaging/pkg/solace/resource"
)

// Message Handler
func MessageHandler(message message.InboundMessage) {
	fmt.Printf("Message Dump %s \n", message)
}

func getEnv(key, def string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return def
}

func main() {

	// Define Topic Subscriptions
	TOPIC_PREFIX := "solace/samples"

	// Configuration parameters
	brokerConfig := config.ServicePropertyMap{
		config.TransportLayerPropertyHost:                getEnv("SOLACE_HOST", "tcp://localhost:55554"),
		config.ServicePropertyVPNName:                    getEnv("SOLACE_VPN", "default"),
		config.AuthenticationPropertySchemeBasicPassword: getEnv("SOLACE_PASSWORD", "default"),
		config.AuthenticationPropertySchemeBasicUserName: getEnv("SOLACE_USERNAME", "default"),
	}

	// Skip certificate validation
	messagingService, err := messaging.NewMessagingServiceBuilder().
		FromConfigurationProvider(brokerConfig).
		WithTransportSecurityStrategy(config.NewTransportSecurityStrategy().WithoutCertificateValidation()).
		Build()

	// With Certificate Validation. Note: assuming ou have a /trust_store dir with the .pem file stored in it
	// messagingService, err := messaging.NewMessagingServiceBuilder().
	// 	FromConfigurationProvider(brokerConfig).
	// 	WithTransportSecurityStrategy(config.NewTransportSecurityStrategy().WithCertificateValidation(false, true, "./trust_store", "")).
	// 	Build()

	if err != nil {
		panic(err)
	}

	// Connect to the messaging serice
	if err := messagingService.Connect(); err != nil {
		panic(err)
	}

	fmt.Println("Connected to the broker? ", messagingService.IsConnected())

	// Define Topic Subscriptions
	topics := [...]string{TOPIC_PREFIX + "/>", TOPIC_PREFIX + "/direct/sub/*"}
	topics_sup := make([]resource.Subscription, len(topics))

	// Create topic objects
	for i, topicString := range topics {
		topics_sup[i] = resource.TopicSubscriptionOf(topicString)
	}

	// Print out list of strings to subscribe to
	for _, ts := range topics_sup {
		fmt.Println("Subscribed to: ", ts.GetName())
	}

	// Build a Direct message receivers with given topics
	directReceiver, err := messagingService.CreateDirectMessageReceiverBuilder().
		WithSubscriptions(topics_sup...).
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

	// Run forever until an interrupt signal is received
	// Handle interrupts

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)

	// Block until a signal is received.
	<-c

	// Terminate the Direct Receiver
	directReceiver.Terminate(1 * time.Second)
	fmt.Println("\nDirect Receiver Terminated? ", directReceiver.IsTerminated())
	// Disconnect the Message Service
	messagingService.Disconnect()
	fmt.Println("Messaging Service Disconnected? ", !messagingService.IsConnected())

}
