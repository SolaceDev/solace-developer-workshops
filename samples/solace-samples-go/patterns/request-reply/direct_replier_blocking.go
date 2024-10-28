package main

import (
	"fmt"
	"os"
	"os/signal"
	"time"

	"solace.dev/go/messaging"
	"solace.dev/go/messaging/pkg/solace/config"
	"solace.dev/go/messaging/pkg/solace/resource"
)

// getEnv function
func getEnv(key, def string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return def
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

	if err != nil {
		panic(err)
	}

	topicSubscription := resource.TopicSubscriptionOf("solace/samples/*/direct/request")

	//  Build a Request-Reply Message Receiver
	requestReplyReceiver, builderErr := messagingService.
		RequestReply().
		CreateRequestReplyMessageReceiverBuilder().
		Build(topicSubscription)

	if builderErr != nil {
		panic(builderErr)
	}

	// Start Request-Reply Message Receiver
	if startErr := requestReplyReceiver.Start(); startErr != nil {
		panic(startErr)
	}

	fmt.Println("Request-Reply Receiver running? ", requestReplyReceiver.IsRunning())

	fmt.Println("\n===Interrupt (CTR+C) to handle graceful terminaltion of the subscriber===")

	fmt.Println("Message Topic Subscription: ", topicSubscription.GetName())

	// have receiver push request messages to request message handler
	// Run in a seperate Go routine
	var receivedMsgCounter = 0 // counter for the received messages

	// Run forever until an interrupt signal is received
	for requestReplyReceiver.IsRunning() {
		// have receiver push request messages to request message handler
		message, replier, regErr := requestReplyReceiver.ReceiveMessage(-1)
		if regErr != nil {
			panic(regErr)
		}

		receivedMsgCounter++
		fmt.Printf("Received message: %d\n", receivedMsgCounter)

		var messageBody string

		if payload, ok := message.GetPayloadAsString(); ok {
			messageBody = payload
		} else if payload, ok := message.GetPayloadAsBytes(); ok {
			messageBody = string(payload)
		}

		fmt.Printf("Received Request Message Body %s \n", messageBody)
		// fmt.Printf("Request Message Dump %s \n", message)

		//  Prepare outbound message payload and body
		replyMessageBody := "Hello from Go Request-Reply Receiver Replier Sample"
		messageBuilder := messagingService.MessageBuilder().
			WithProperty("application", "samples").
			WithProperty("language", "go")

		if replier == nil { // the replier is only set when received message is request message that has to be replied to
			// messages received on the topic subscription without a repliable destination will return a nil replier
			fmt.Printf("Received message: %d on topic %s that was not a request message\n", receivedMsgCounter, topicSubscription.GetName())
		} else {
			// build reply message
			replyMsg, replyMsgBuildErr := messageBuilder.BuildWithStringPayload(replyMessageBody + "\nReply from: " + messageBody)
			if replyMsgBuildErr != nil {
				panic(replyMsgBuildErr)
			}
			// send reply msg
			// note replier are unique to inbound message provided on the callback with the replier
			replyErr := replier.Reply(replyMsg)
			if replyErr != nil {
				// sending a reply msg can fail if there is a network or connectivity issue
				fmt.Println("Got error on send reply, is there a network issue? Error: ", replyErr)
			}
		}
	}

	// Run forever until an interrupt signal is received
	// Handle interrupts
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)

	// Block until a signal is received.
	<-c

	// Terminate the Request-Reply Receiver
	requestReplyReceiver.Terminate(1 * time.Second)
	fmt.Println("\nRequest-Reply Receiver Terminated? ", requestReplyReceiver.IsTerminated())

	// Disconnect the Message Service
	messagingService.Disconnect()
	fmt.Println("Messaging Service Disconnected? ", !messagingService.IsConnected())
}
