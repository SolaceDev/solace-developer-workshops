package com.solace.samples.java.patterns;

import com.solace.messaging.MessagingService;
import com.solace.messaging.PubSubPlusClientException;
import com.solace.messaging.config.SolaceProperties;
import com.solace.messaging.config.profile.ConfigurationProfile;
import com.solace.messaging.publisher.OutboundMessage;
import com.solace.messaging.publisher.OutboundMessageBuilder;
import com.solace.messaging.publisher.RequestReplyMessagePublisher;
import com.solace.messaging.resources.Topic;

import java.io.IOException;
import java.util.Properties;

/**
 * This class demonstrates the usage of the Solace Java API to create a Requester class.
 * This implementation focuses on the non-blocking behaviour of the API.
 * The mechanism of the Request-Reply pattern is defined in more detail over here : <a href="https://tutorials.solace.dev/jcsmp/request-reply/">Solace Request/Reply pattern</a>
 * <p>
 * Refer to the DirectReplierNonBlocking class for the reply component of the flow.
 */
public class DirectRequestorNonBlocking {

    private static final String SAMPLE_NAME = DirectRequestorNonBlocking.class.getSimpleName();
    private static final String TOPIC_PREFIX = "solace/samples/";  // used as the topic "root"
    private static final String API = "Java";
    private static final long REQUEST_TIMEOUT_MS = 3000;
    private static final long TERMINATION_GRACE_PERIOD_MS = 500;
    private static volatile int loopCounter = 0;
    private static volatile boolean isShutdown = false;

    public static void main(String... args) throws IOException {

        //1. Make sure that you have all the connection parameters.
        if (args.length < 3) {  // Check command line arguments
            System.out.printf("Usage: %s <host:port> <message-vpn> <client-username> [password]%n%n", SAMPLE_NAME);
            System.exit(-1);
        }

        System.out.println(API + " " + SAMPLE_NAME + " initializing...");

        //2. Set up the properties including username, password, vpnHostUrl and other control parameters.
        final Properties properties = setupPropertiesForConnection(args);

        //3. Create the MessagingService object and establishes the connection with the Solace event broker
        final MessagingService messagingService = MessagingService.builder(ConfigurationProfile.V1).fromProperties(properties).build();
        messagingService.connect();  // blocking connect

        //4. Register event handlers and callbacks for connection error handling.
        setupConnectivityHandlingInMessagingService(messagingService);

        //5. Build and start the publisher object
        final RequestReplyMessagePublisher requestReplyMessagePublisher = messagingService.requestReply().createRequestReplyMessagePublisherBuilder().build();
        requestReplyMessagePublisher.start();

        System.out.println(API + " " + SAMPLE_NAME + " connected, and running.");
        String payloadInString;

        //6. Create the builder for the OutboundMessage
        final OutboundMessageBuilder messageBuilder = messagingService.messageBuilder();

        while (System.in.available() == 0 && !isShutdown) {
            try {
                //7. Create the payload for each run of the loop
                payloadInString = createMessagePayload(loopCounter);

                //8. Create the OutboundMessage message with new payload, messageId and application-message-id.
                final OutboundMessage outboundMessage = createOutboundMessageForPublishing(messageBuilder, payloadInString);

                //9. Define the topic name where the message will be posted.
                // This example defines a dynamic topic for each message to showcase Solace capability of wildcard based topics
                // In cases where dynamic topics names are not required, a simple topic string can be used
                final String topicString = new StringBuilder(TOPIC_PREFIX).append(API.toLowerCase()).append("/direct/request").toString();  // StringBuilder faster than +

                System.out.println("The outbound message being published is : " + outboundMessage.getPayloadAsString());

                //10. Publishes the message in a non-blocking manner.
                requestReplyMessagePublisher.publish(outboundMessage,
                        //Define an implementation for the RequestReplyMessagePublisher.ReplyMessageHandler, this should also include basic error and exception handling
                        (inboundMessage, userContext, pubSubPlusClientException) -> {
                            if (pubSubPlusClientException == null) { //Good, an ACK was received
                                // System.out.println("The reply inboundMessage being logged is : " + inboundMessage.dump());   // Enable this for learning purposes as it logs a String representation of the whole Message
                                System.out.println("The reply inboundMessage payload being logged is : " + inboundMessage.getPayloadAsString());
                            } else { // not good, a NACK
                                if (userContext != null) {
                                    System.out.println(String.format("NACK for Message %s - %s", userContext, pubSubPlusClientException));
                                }
                                if (pubSubPlusClientException instanceof PubSubPlusClientException.TimeoutException) {
                                    // This handles the situation that the requester application did not receive a reply for the published message within the specified timeout.
                                    // This would be a good location for implementing resiliency or retry mechanisms.
                                    System.out.printf("Publishing action timed out without any reply. Error : : %s%n", pubSubPlusClientException);
                                    System.out.println("Publish timed-out for message with payload :" + outboundMessage.getPayloadAsString());

                                } else {
                                    throw new RuntimeException(pubSubPlusClientException);
                                }
                            }
                        }
                        , Topic.of(topicString), REQUEST_TIMEOUT_MS);
                loopCounter++;     // increment by one

            } catch (final RuntimeException runtimeException) {
                System.out.printf("### Caught while trying to publisher.publish(): %s%n", runtimeException);
                isShutdown = true;  // or try to handle the specific exception more gracefully
            } finally {
                try {
                    Thread.sleep(1000);  // do Thread.sleep(0) for max speed
                    // Note: STANDARD Edition Solace PubSub+ broker is limited to 10k msg/s max ingress
                } catch (InterruptedException e) {
                    isShutdown = true;
                }
            }
        }
        isShutdown = true;
        requestReplyMessagePublisher.terminate(REQUEST_TIMEOUT_MS + TERMINATION_GRACE_PERIOD_MS);
        messagingService.disconnect();
        System.out.println("Main thread quitting.");
    }

    private static Properties setupPropertiesForConnection(final String... args) {
        final Properties properties = new Properties();
        properties.setProperty(SolaceProperties.TransportLayerProperties.HOST, args[0]);          // host:port
        properties.setProperty(SolaceProperties.ServiceProperties.VPN_NAME, args[1]);     // message-vpn
        properties.setProperty(SolaceProperties.AuthenticationProperties.SCHEME_BASIC_USER_NAME, args[2]);      // client-username
        if (args.length > 3) {
            properties.setProperty(SolaceProperties.AuthenticationProperties.SCHEME_BASIC_PASSWORD, args[3]);  // client-password
        }
        properties.setProperty(SolaceProperties.TransportLayerProperties.RECONNECTION_ATTEMPTS, "20");  // recommended settings
        properties.setProperty(SolaceProperties.TransportLayerProperties.CONNECTION_RETRIES_PER_HOST, "5");
        properties.setProperty(SolaceProperties.ServiceProperties.RECEIVER_DIRECT_SUBSCRIPTION_REAPPLY, String.valueOf(true)); // re-subscribe after reconnect
        return properties;
    }

    private static void setupConnectivityHandlingInMessagingService(final MessagingService messagingService) {
        messagingService.addServiceInterruptionListener(serviceEvent -> System.out.println("### SERVICE INTERRUPTION: " + serviceEvent.getCause()));
        messagingService.addReconnectionAttemptListener(serviceEvent -> System.out.println("### RECONNECTING ATTEMPT: " + serviceEvent));
        messagingService.addReconnectionListener(serviceEvent -> System.out.println("### RECONNECTED: " + serviceEvent));
    }

    private static String createMessagePayload(final int loopCounter) {
        // each loop, change the payload, less trivial
        return String.format("Hello, this is the request number:  #%d", loopCounter);
    }

    private static OutboundMessage createOutboundMessageForPublishing(final OutboundMessageBuilder messageBuilder, final String payloadString) {
        // It's possible to add in application properties on the message as required.
        return messageBuilder.build(payloadString);  // binary payload message
    }
}
