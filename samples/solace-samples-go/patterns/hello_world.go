package main

import (
	"fmt"
	"os"
	"os/signal"
	"strconv"
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

	// Connect to the messaging serice
	if err := messagingService.Connect(); err != nil {
		panic(err)
	}

	fmt.Println("Connected to the broker? ", messagingService.IsConnected())

	//  Build a Direct Message Publisher
	directPublisher, builderErr := messagingService.CreateDirectMessagePublisherBuilder().Build()
	if builderErr != nil {
		panic(builderErr)
	}

	startErr := directPublisher.Start()
	if startErr != nil {
		panic(startErr)
	}

	fmt.Println("Direct Publisher running? ", directPublisher.IsRunning())

	//  Build a Direct Message Receiver
	directReceiver, err := messagingService.CreateDirectMessageReceiverBuilder().
		WithSubscriptions(resource.TopicSubscriptionOf(TopicPrefix + "/*/hello/>")).
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

	fmt.Print("\nEnter your name: ")
	var uniqueName string
	fmt.Scanln(&uniqueName)

	msgSeqNum := 0

	//  Prepare outbound message payload and body
	messageBody := "Hello from Go HelloWorld Sample"
	messageBuilder := messagingService.MessageBuilder().
		WithProperty("application", "samples").
		WithProperty("language", "go")

	go func() {
		println("Subscribe to topic ", TopicPrefix+"/>")

		for directPublisher.IsReady() {
			msgSeqNum++
			message, err := messageBuilder.BuildWithStringPayload(messageBody + " --> " + strconv.Itoa(msgSeqNum))
			if err != nil {
				panic(err)
			}
			publishErr := directPublisher.Publish(message, resource.TopicOf(TopicPrefix+"/go/hello/"+uniqueName+"/"+strconv.Itoa(msgSeqNum)))
			if publishErr != nil {
				panic(publishErr)
			}
			time.Sleep(1 * time.Second)
		}

	}()

	// Handle interrupts

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)

	// Block until a signal is received.
	<-c

	// TODO
	// Find way to shutdown the go routine
	// e.g use another channel, BOOl..etc
	// TODO

	// Terminate the Direct Receiver
	directReceiver.Terminate(2 * time.Second)
	fmt.Println("\nDirect Receiver Terminated? ", directReceiver.IsTerminated())
	// Terminate the Direct Publisher
	directPublisher.Terminate(2 * time.Second)
	fmt.Println("\nDirect Publisher Terminated? ", directPublisher.IsTerminated())

	// Disconnect the Message Service
	messagingService.Disconnect()
	fmt.Println("Messaging Service Disconnected? ", !messagingService.IsConnected())

}
