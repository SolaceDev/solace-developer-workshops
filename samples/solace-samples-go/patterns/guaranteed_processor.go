package main

import (
	"fmt"
	"os"
	"os/signal"
	"strings"
	"time"

	"solace.dev/go/messaging"
	"solace.dev/go/messaging/pkg/solace"
	"solace.dev/go/messaging/pkg/solace/config"
	"solace.dev/go/messaging/pkg/solace/message"
	"solace.dev/go/messaging/pkg/solace/resource"
)

func ReconnectionHandler(e solace.ServiceEvent) {
	e.GetTimestamp()
	e.GetBrokerURI()
	err := e.GetCause()
	if err != nil {
		fmt.Println(err)
	}
}

// Receipt Handler
func PublishReceiptListener(receipt solace.PublishReceipt) {
	fmt.Println("Received a Publish Receipt from the broker\n")
	// fmt.Println("IsPersisted: ", receipt.IsPersisted())
	// fmt.Println("Message : ", receipt.GetMessage())
	if receipt.GetError() != nil {
		fmt.Println("Gauranteed Message is NOT persisted on the broker! Received NAK")
		fmt.Println("Error is: ", receipt.GetError())
		// probably want to do something here.  some error handling possibilities:
		//  - send the message again
		//  - send it somewhere else (error handling queue?)
		//  - log and continue
		//  - pause and retry (backoff) - maybe set a flag to slow down the publisher
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

	// Define Queue Topic Subscriptions
	// Note: assuming client has authorization to add subscriptions to queues
	queueSubscription := resource.TopicSubscriptionOf(TopicPrefix + "/guaranteed/processor/input")

	// queueName := "durable-queue"
	// durableExclusiveQueue := resource.QueueDurableExclusive(queueName)
	queueName := "nondurable-queue.go.sample"
	nonDurableExclusiveQueue := resource.QueueNonDurableExclusive(queueName)

	// 1. Build a Gauranteed message receiver
	// 2. Bind to the given queue, create if doesnt exist
	// 3. Add subscription to queue, assuming client has authorization to add subscriptions to queues
	strategy := config.MissingResourcesCreationStrategy("CREATE_ON_START")
	persistentReceiver, err := messagingService.CreatePersistentMessageReceiverBuilder().WithMissingResourcesCreationStrategy(strategy).WithSubscriptions(queueSubscription).Build(nonDurableExclusiveQueue)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Bound to queue: %s, and added subscription: %s\n", queueName, queueSubscription.GetName())

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

	//  Build a Persistent Message Publisher
	persistentPublisher, builderErr := messagingService.CreatePersistentMessagePublisherBuilder().Build()
	if builderErr != nil {
		panic(builderErr)
	}

	// Set the message publisher receipt listener
	persistentPublisher.SetMessagePublishReceiptListener(PublishReceiptListener)

	startErr := persistentPublisher.Start()
	if startErr != nil {
		panic(startErr)
	}

	fmt.Println("Persistent Publisher running? ", persistentPublisher.IsRunning())

	messageBuilder := messagingService.MessageBuilder()

	// Message Handler
	var messageHandler solace.MessageHandler = func(message message.InboundMessage) {
		var messageBody string
		if payload, ok := message.GetPayloadAsString(); ok {
			messageBody = payload
		} else if payload, ok := message.GetPayloadAsBytes(); ok {
			messageBody = string(payload)
		}

		receivedTopic := message.GetDestinationName()
		// Generate processed topic
		slice := strings.Split(receivedTopic, "/")
		processedTopic := strings.Join(slice[:len(slice)-1][:], "/") + "/output"

		// Process the message
		// For example, change the body of the message to uppercased
		processedMsg := strings.ToUpper(messageBody)
		fmt.Printf("Received a message: %s on topic %s\n", messageBody, receivedTopic)
		fmt.Printf("Uppercasing to %s and publishing on %s\n", processedMsg, processedTopic)

		outMessage, err := messageBuilder.BuildWithStringPayload(processedMsg)
		if err != nil {
			panic(err)
		}

		// Publish on process topic with processed body
		publishErr := persistentPublisher.Publish(outMessage, resource.TopicOf(processedTopic), nil, nil)
		// Block until message is acknowledged
		// publishErr := persistentPublisher.PublishAwaitAcknowledgement(message, topic, 2*time.Second, nil)

		if publishErr != nil {
			panic(publishErr)
		}
	}

	// Register Message callback handler to the Message Receiver
	if regErr := persistentReceiver.ReceiveAsync(messageHandler); regErr != nil {
		panic(regErr)
	}

	fmt.Println("\n===Interrupt (CTR+C) to handle graceful termination of the receiver===\n")

	// cleanup after the main calling function has finished execution
	defer func() {
		// Terminate the Persistent Receiver
		persistentReceiver.Terminate(1 * time.Second)
		fmt.Println("\nPersistent Receiver Terminated? ", persistentReceiver.IsTerminated())
		// Terminate the Persistent Publisher
		persistentPublisher.Terminate(1 * time.Second)
		fmt.Println("Persistent Publisher Terminated? ", persistentPublisher.IsTerminated())
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
