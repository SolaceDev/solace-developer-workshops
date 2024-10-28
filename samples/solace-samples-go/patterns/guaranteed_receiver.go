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
	var messageBody string

	if payload, ok := message.GetPayloadAsString(); ok {
		messageBody = payload
	} else if payload, ok := message.GetPayloadAsBytes(); ok {
		messageBody = string(payload)
	}

	fmt.Printf("Received Message Body %s \n", messageBody)
	// fmt.Printf("Message Dump %s \n", message)
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

	// Connect to the messaging serice
	if err := messagingService.Connect(); err != nil {
		panic(err)
	}

	fmt.Println("Connected to the broker? ", messagingService.IsConnected())

	if err != nil {
		panic(err)
	}

	// queueName := "durable-queue"
	// durableExclusiveQueue := resource.QueueDurableExclusive("durable-queue")
	queueName := "nondurable-queue"
	nonDurableExclusiveQueue := resource.QueueNonDurableExclusive("nondurable-queue")
	topicString := TopicPrefix + "/nondurable"
	topic := resource.TopicSubscriptionOf(topicString)

	// Build a Gauranteed message receiver and bind to the given queue
	strategy := config.MissingResourcesCreationStrategy("CREATE_ON_START")
	// Durable Queue
	persistentReceiver, err := messagingService.CreatePersistentMessageReceiverBuilder().WithMessageAutoAcknowledgement().WithMissingResourcesCreationStrategy(strategy).WithSubscriptions(topic).Build(durableExclusiveQueue)

	// Non-durable Queue
	// persistentReceiver, err := messagingService.CreatePersistentMessageReceiverBuilder().WithMissingResourcesCreationStrategy(strategy).WithSubscriptions(topic).Build(nonDurableExclusiveQueue)

	// Handling a panic from a non existing queue
	defer func() {
		if err := recover(); err != nil {
			fmt.Printf("Make sure queue name '%s' exists on the broker.\nThe following error occurred when attempting to connect to create a Persistent Message Receiver:\n%s", queueName, err)
		}
	}()

	// Start Persistent Message Receiver
	if err := persistentReceiver.Start(); err != nil {
		panic(err)
	}

	fmt.Println("Persistent Receiver running? ", persistentReceiver.IsRunning())

	// Register Message callback handler to the Message Receiver
	if regErr := persistentReceiver.ReceiveAsync(MessageHandler); regErr != nil {
		panic(regErr)
	}
	fmt.Printf("\n Bound to queue: %s\n", queueName)
	fmt.Println("\n===Interrupt (CTR+C) to handle graceful termination of the receiver===\n")

	// Run forever until an interrupt signal is received
	// Handle interrupts

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)

	// Block until a signal is received.
	<-c

	// Terminate the Persistent Receiver
	persistentReceiver.Terminate(1 * time.Second)
	fmt.Println("\nPersistent Receiver Terminated? ", persistentReceiver.IsTerminated())
	// Disconnect the Message Service
	messagingService.Disconnect()
	fmt.Println("Messaging Service Disconnected? ", !messagingService.IsConnected())

}
