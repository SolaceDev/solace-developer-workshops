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
	"solace.dev/go/messaging/pkg/solace/message"
	"solace.dev/go/messaging/pkg/solace/resource"
)

// getEnv function
func getEnv(key, def string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return def
}

// requester reply handler function for reply message, this should also include basic error handling
func ReplyMessageHandler(message message.InboundMessage, userContext interface{}, err error) {
	if err == nil { // Good, a reply was received
		payload, _ := message.GetPayloadAsString()
		fmt.Printf("The reply inbound payload: %s\n", payload)
	} else if terr, ok := err.(*solace.TimeoutError); ok { // Not good, a timeout occurred and no reply was received
		// message should be nil
		// This handles the situation that the requester application did not receive a reply for the published message within the specified timeout.
		// This would be a good location for implementing resiliency or retry mechanisms.
		fmt.Printf("The reply timed out. Error: \"%s\"\n", terr)
	} else { // async error occurred.
		panic(err)
	}
}

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

	// Build a Request-Reply Message Publisher
	requestReplyPublisher, builderErr := messagingService.RequestReply().CreateRequestReplyMessagePublisherBuilder().Build()
	if builderErr != nil {
		panic(builderErr)
	}

	// Start Request-Reply Message Publisher
	if startErr := requestReplyPublisher.Start(); startErr != nil {
		panic(startErr)
	}

	fmt.Println("Request-Reply Publisher running? ", requestReplyPublisher.IsRunning())

	fmt.Println("\n===Interrupt (CTR+C) to stop publishing===")

	msgSeqNum := 0 // start message sequence number at zero

	//  Prepare outbound message payload and body
	messageConfig := config.MessagePropertyMap{
		config.MessagePropertyClassOfService:       2,        // Optional property
		config.MessagePropertyApplicationMessageID: "59",     // Optional property
		config.MessageProperty("Developer"):        "Solace", // Optional property
	}

	messageBody := "Hello from Go Request-Reply Publisher Sample"
	messageBuilder := messagingService.MessageBuilder().
		FromConfigurationProvider(messageConfig).
		WithProperty("application", "samples").
		WithProperty("language", "go")

	topic := resource.TopicOf("solace/samples/go/direct/request")
	fmt.Printf("Publishing on: %s, please ensure queue has matching subscription.\n", topic.GetName())

	// Run forever until an interrupt signal is received
	for requestReplyPublisher.IsReady() {
		msgSeqNum++
		message, err := messageBuilder.BuildWithStringPayload(messageBody + " --> " + strconv.Itoa(msgSeqNum))
		if err != nil {
			panic(err)
		}

		replyTimeout := 5 * time.Second

		// Publish to the given topic
		publishErr := requestReplyPublisher.Publish(message, ReplyMessageHandler, topic, replyTimeout, config.MessagePropertyMap{
			config.MessagePropertyCorrelationID: fmt.Sprint(msgSeqNum),
		}, nil /* usercontext */)
		// // Publish string message to topic
		// stringMessage := messageBody + " --> " + strconv.Itoa(msgSeqNum)
		// publishErr := requestReplyPublisher.PublishString(stringMessage, ReplyMessageHandler, topic, replyTimeout, nil /* usercontext */)
		// // Publish large Byte message to topic
		// largeByteArray := make([]byte, 16384)
		// publishErr := requestReplyPublisher.PublishBytes(largeByteArray, ReplyMessageHandler, topic, replyTimeout, nil /* usercontext */)

		if publishErr != nil {
			panic(publishErr)
		}

		fmt.Printf("Published message with sequence number: %d on topic: %s\n", msgSeqNum, topic.GetName())
		// fmt.Printf("Published message: %s\n", message)
		time.Sleep(1 * time.Second) // wait for a second between published message
	}

	// Handle OS interrupts
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)

	// Block until an OS interrupt signal is received.
	<-c

	// Terminate the Request-Reply Receiver
	requestReplyPublisher.Terminate(1 * time.Second)
	fmt.Println("\nRequest-Reply Publisher Terminated? ", requestReplyPublisher.IsTerminated())

	// Disconnect the Message Service
	messagingService.Disconnect()
	fmt.Println("Messaging Service Disconnected? ", !messagingService.IsConnected())
}
