package main

import (
	"fmt"
	"os"
	"os/signal"
	"strconv"
	"time"

	"solace.dev/go/messaging"
	"solace.dev/go/messaging/pkg/solace"
	"solace.dev/go/messaging/pkg/solace/config"
	"solace.dev/go/messaging/pkg/solace/resource"
)

func getEnv(key, def string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return def
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

	fmt.Println("\n===Interrupt (CTR+C) to stop publishing===\n")

	msgSeqNum := 0

	//  Prepare outbound message payload and body
	messageBody := "Hello from Go Persistent Publisher Sample"
	messageBuilder := messagingService.MessageBuilder().
		WithProperty("application", "samples").
		WithProperty("language", "go")

	topic := resource.TopicOf(TopicPrefix + "/persistent/publisher")
	fmt.Printf("Publishing on: %s, please ensure queue has matching subscription.\n", topic.GetName())

	// Run forever until an interrupt signal is received
	go func() {
		for persistentPublisher.IsReady() {
			message, err := messageBuilder.BuildWithStringPayload(messageBody + " --> " + strconv.Itoa(msgSeqNum))
			if err != nil {
				panic(err)
			}
			// Publish on dynamic topic with dynamic body
			// NOTE: publishing to topic, so make sure GuaranteedReceiver queue is subscribed to same topic,
			//       or enable "Reject Message to Sender on No Subscription Match" the client-profile
			publishErr := persistentPublisher.Publish(message, topic, nil, nil)
			// Block until message is acknowledged
			// publishErr := persistentPublisher.PublishAwaitAcknowledgement(message, topic, 2*time.Second, nil)

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

	// Terminate the Direct Receiver
	persistentPublisher.Terminate(1 * time.Second)
	fmt.Println("\nDirect Publisher Terminated? ", persistentPublisher.IsTerminated())
	// Disconnect the Message Service
	messagingService.Disconnect()
	fmt.Println("Messaging Service Disconnected? ", !messagingService.IsConnected())

}
