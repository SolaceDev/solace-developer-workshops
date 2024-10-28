//This module describes some of the ways a partition key property can be set on outbound messages
package main

import (
    "solace.dev/go/messaging"
    "solace.dev/go/messaging/pkg/solace/config"
    "solace.dev/go/messaging/pkg/solace"
    "solace.dev/go/messaging/pkg/solace/message"
)


//Set partition key propery using WithProperty()
func SetQueuePartitionKeyUsingWithProperty(queuePartitionKeyValue string, messagingService solace.MessagingService, payload string) message.OutboundMessage {

    outboundMessage, _ := messagingService.MessageBuilder().WithProperty(config.MessageProperty(config.QueuePartitionKey), queuePartitionKeyValue).BuildWithStringPayload(payload)    
    return outboundMessage
}

//Set partition key property using configuraion map that is then supplied to outbound message builder
func SetQueuePartitionKeyUsingFromConfigurationProvider(queuePartitionKeyValue string, messagingService solace.MessagingService, payload string) message.OutboundMessage {

    messageConfig := config.MessagePropertyMap{
        config.MessageProperty(config.QueuePartitionKey): queuePartitionKeyValue,
    }

    outboundMessage, _ := messagingService.MessageBuilder().FromConfigurationProvider(messageConfig).BuildWithStringPayload(payload)    

    return outboundMessage
}

func Run() {
    payload := "Hello Solace"
    var service solace.MessagingService
    var err error

    brokerConfig := config.ServicePropertyMap{
        config.TransportLayerPropertyHost:  getEnv("SOLACE_HOST", "tcp://localhost:55555,tcp://localhost:55554"),
        config.ServicePropertyVPNName:  getEnv("SOLACE_VPN", "default"),
        config.AuthenticationPropertySchemeBasicPassword:   getEnv("SOLACE_PASSWORD", "default"),
        config.AuthenticationPropertySchemeBasicUserName:   getEnv("SOLACE_USERNAME", "default"),
        }

    service, err = messaging.NewMessagingServiceBuilder().FromConfigurationProvider(brokerConfig).Build()

    if err != nil {
        panic(err)
    }

    defer service.Disconnect()
    
    partitionKeyValue := "key"

    messageWithPropertyPartitionKey := SetQueuePartitionKeyUsingWithProperty(partitionKeyValue, service, payload)

    messageWithFromConfigPartitionKey := SetQueuePartitionKeyUsingFromConfigurationProvider(partitionKeyValue, service, payload)
}
