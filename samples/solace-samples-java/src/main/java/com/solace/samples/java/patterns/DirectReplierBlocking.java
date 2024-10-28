package com.solace.samples.java.patterns;

import com.solace.messaging.MessagingService;
import com.solace.messaging.config.SolaceProperties;
import com.solace.messaging.config.profile.ConfigurationProfile;
import com.solace.messaging.publisher.OutboundMessage;
import com.solace.messaging.publisher.OutboundMessageBuilder;
import com.solace.messaging.receiver.RequestReplyMessageReceiver;
import com.solace.messaging.resources.TopicSubscription;

import java.io.IOException;
import java.util.Properties;

/**
 * This class demonstrates the usage of the Solace Java API to create a Replier class.
 * This implementation focuses on the blocking behaviour of the API.
 * The mechanism of the Request-Reply pattern is defined in more detail over here : <a href="https://tutorials.solace.dev/jcsmp/request-reply/">Solace Request/Reply pattern</a>
 * <p>
 * Refer to the DirectRequestorBlocking class for the request component of the flow.
 */
public class DirectReplierBlocking {

    private static final String SAMPLE_NAME = DirectReplierBlocking.class.getSimpleName();
    private static final String TOPIC_PREFIX = "solace/samples/";  // used as the topic "root"
    private static final String API = "Java";
    private static volatile boolean isShutdown = false;          // are we done yet?

    public static void main(String... args) throws IOException {

        //1. Make sure that you have all the connection parameters.
        if (args.length < 3) {  // Check command line arguments
            System.out.printf("Usage: %s <host:port> <message-vpn> <client-username> [password]%n%n", SAMPLE_NAME);
            System.exit(-1);
        }
        System.out.println(API + " " + SAMPLE_NAME + " initializing...");

        //2. Set up the properties including username, password, vpnHostUrl and other control parameters.
        final Properties properties = new Properties();
        setupPropertiesForConnection(properties, args);

        //3. Create the MessagingService object and establishes the connection with the Solace event broker
        final MessagingService messagingService = com.solace.messaging.MessagingService.builder(ConfigurationProfile.V1).fromProperties(properties).build();
        messagingService.connect();  // blocking connect to the broker

        //4. Register event handlers and callbacks for connection error handling.
        setupConnectivityHandlingInMessagingService(messagingService);

        //5. Build and start the Receiver object
        RequestReplyMessageReceiver requestReplyMessageReceiver = messagingService.requestReply().createRequestReplyMessageReceiverBuilder().build(TopicSubscription.of(TOPIC_PREFIX + "*/direct/request"));
        requestReplyMessageReceiver.start();
        //5-A. Set up an event handler for situations where the reply message could not be published.
        requestReplyMessageReceiver.setReplyFailureListener(failedReceiveEvent -> System.out.println("### FAILED RECEIVE EVENT " + failedReceiveEvent));

        //6. Create an OutboundMessageBuilder for building the outbound reply message
        final OutboundMessageBuilder outboundMessageBuilder = messagingService.messageBuilder();

        //7. Define the handler for the incoming message.
        final RequestReplyMessageReceiver.RequestMessageHandler messageHandler = (inboundMessage, replier) -> {

            //This SOP is just for demo purposes, ideally considering the slow nature of console I/O, any such action should be avoided in message processing
//          System.out.println("The inbound message is : " + inboundMessage.dump()); // Enable this for learning purposes as it logs a String representation of the whole Message
            final String stringPayload = inboundMessage.getPayloadAsString();
            System.out.println("The converted message payload is : " + stringPayload);

            //7-B. Create the outbound message payload.
            final StringBuilder outboundMessageStringPayload = new StringBuilder().append("Hello! Here is a response to your message on topic : ").append(inboundMessage.getDestinationName()).append(" with incoming payload :").append(stringPayload);

            //7-C. Create the outbound message with headers and payload.
            final OutboundMessage outboundMessage = outboundMessageBuilder.build(outboundMessageStringPayload.toString());

            //This SOP is just for demo purposes, ideally considering the slow nature of console I/O, any such action should be avoided in message processing
            System.out.println("The outbound message is : " + outboundMessage.getPayloadAsString());

            //7-D. Post the reply to the incoming message
            replier.reply(outboundMessage);
        };

        //8. Loop to identify message discards or errors and terminate if required. This should be handled in a more resilient manner
        System.out.println(API + " " + SAMPLE_NAME + " connected, and running.");
        while (System.in.available() == 0 && !isShutdown) {
            requestReplyMessageReceiver.receiveMessage(messageHandler, 1000);
        }
        isShutdown = true;
        requestReplyMessageReceiver.terminate(500);
        messagingService.disconnect();
        System.out.println("Main thread quitting.");
        System.exit(0);
    }

    private static void setupPropertiesForConnection(final Properties properties, final String... args) {
        properties.setProperty(SolaceProperties.TransportLayerProperties.HOST, args[0]);          // host:port
        properties.setProperty(SolaceProperties.ServiceProperties.VPN_NAME, args[1]);     // message-vpn
        properties.setProperty(SolaceProperties.AuthenticationProperties.SCHEME_BASIC_USER_NAME, args[2]);      // client-username
        if (args.length > 3) {
            properties.setProperty(SolaceProperties.AuthenticationProperties.SCHEME_BASIC_PASSWORD, args[3]);  // client-password
        }
        properties.setProperty(SolaceProperties.ServiceProperties.RECEIVER_DIRECT_SUBSCRIPTION_REAPPLY, "true");  // subscribe Direct subs after reconnect
        properties.setProperty(SolaceProperties.TransportLayerProperties.RECONNECTION_ATTEMPTS, "20");  // recommended settings
        properties.setProperty(SolaceProperties.TransportLayerProperties.CONNECTION_RETRIES_PER_HOST, "5");
        // https://docs.solace.com/Solace-PubSub-Messaging-APIs/API-Developer-Guide/Configuring-Connection-T.htm
    }

    private static void setupConnectivityHandlingInMessagingService(final MessagingService messagingService) {
        messagingService.addServiceInterruptionListener(serviceEvent -> {
            System.out.println("### SERVICE INTERRUPTION: " + serviceEvent.getCause());
            isShutdown = true;
        });
        messagingService.addReconnectionAttemptListener(serviceEvent -> System.out.println("### RECONNECTING ATTEMPT: " + serviceEvent));
        messagingService.addReconnectionListener(serviceEvent -> System.out.println("### RECONNECTED: " + serviceEvent));
    }
}