# Solace Node.js API advanced samples

This directory contains code showing how to make use of advanced features of the Solace PubSub+ Event Broker.

The code requires Node.js API version 10 or later.

For quick start instructions, refer to the [Getting Started README](https://github.com/SolaceSamples/solace-samples-nodejs/blob/master/README.md)

For an introduction to the Node.js API and associated tutorials, check out the [tutorials home page](https://solacesamples.github.io/solace-samples-nodejs/).

To learn more about specific features and details, refer to the [Solace developer guide]( https://docs.solace.com/Solace-Messaging-APIs/Developer-Guide/Developer-Guide-Home.htm)

## Description and instructions

* __SecureSession__: This sample will show the use of secure connection to the server using server and client certificate authentication.

    *Prerequisites*:
    
    Following certificates and key must be locally available in the `certs` folder under `advanced-samples`. It is assumed that you know how TLS/SSL certificates and Certificate Authorities ("CAs") work and you have generated the required private/public keys and certificates using ssl tools.
    
    * root_ca-rsa.crt - root certificate of the Certificate Authority which signed the message router's certificate
    * client1-rsa-1.crt - client certificate
    * client1-rsa-1.key - client private key
    
    On the message router:
    
    * server trusted root is configured - root certificate of the Certificate Authority which signed the client certificate
    * server certificate including private key is configured

* __ActiveConsumerIndication__: This sample will show how multiple message consumers can bind to an exclusive queue, but only one client at a time can actively receive messages. If the Active Indication message consumer property is enabled, a Consumer active/inactive event is returned to the client when its bound consumer becomes/stops being the active consumer. Start this app, then the `basic-samples/ConfirmedPublish` app can be used to send 10 messages to trigger it. The sample is using only one session for demonstration purposes and in a real-world implementation the consumers would be on separate sessions, likely in separate processes.

    *Prerequisite*: this sample requires that the queue "tutorial/queue" exists on the message router and configured to be "exclusive".  Ensure the queue is enabled for both Incoming and Outgoing messages and set the Permission to at least 'Consume'.

* __DTEConsumer__: This sample shows how to consume messages from a Durable Topic Endpoint (DTE). The sample will associate the DTE with the topic "tutorial/topic", so the `basic-samples/TopicPublisher` app can be used to send messages to this topic.

    *Prerequisite*: the DTE with the name "tutorial/dte" must have been provisioned on the message router vpn.  Ensure the DTE is enabled for both Incoming and Outgoing messages and set the Permission to at least 'Consume'.

* __EventMonitor__: This sample demonstrates how to use the special event monitoring topic subscriptions to build an application that monitors message router generated events. Start this sample then run any other sample app and observe a client connect event reported for that sample. To learn more, refer to [Subscribing to Message Bus Events](https://docs.solace.com/System-and-Software-Maintenance/Subscribing-to-MBus-Events.htm) in the customer documentation.

    *Prerequisite*: configure the vpn on the message router to "Publish Client Event Messages".

* __GuaranteedRequestor/Replier__: This sample will show the implementation of guaranteed Request-Reply messaging, where `GuaranteedRequestor` is a message Endpoint that sends a guaranteed request message to a request topic and waits to receive a reply message on a dedicated temporary queue as a response; `GuaranteedReplier` is a message Endpoint that waits to receive a request message on a request topic - it will create a non-durable topic endpoint for that - and responds to it by sending a guaranteed reply message. Start the replier first as the non-durable topic endpoint will only be created for the duration of the replier session and any request sent before that will not be received.

* __NoLocalPubSub__: This sample will show the use of the NO_LOCAL Session and Consumer properties. With these properties enabled, messages published on a Session cannot be received on that same session or on a Consumer on that Session even when there is a matching subscription. This sample will create and use a temporary queue.

* __ConsumerWithNack__: This sample shows how to consume messages from an Endpoint and settle the consumed messages with an outcome of `ACCEPTED`, `FAILED` or `REJECTED`. The sample will consume messages from the "tutorial/queue" queue. If this queue does not exist, a temporary queue with the name will be created and used.
