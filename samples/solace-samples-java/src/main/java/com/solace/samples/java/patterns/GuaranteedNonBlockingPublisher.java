/*
 * Copyright 2021-2023 Solace Corporation. All rights reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

package com.solace.samples.java.patterns;

import java.io.IOException;
import java.util.Arrays;
import java.util.Properties;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.solace.messaging.MessagingService;
import com.solace.messaging.PubSubPlusClientException;
import com.solace.messaging.config.SolaceProperties.AuthenticationProperties;
import com.solace.messaging.config.SolaceProperties.ServiceProperties;
import com.solace.messaging.config.SolaceProperties.TransportLayerProperties;
import com.solace.messaging.config.profile.ConfigurationProfile;
import com.solace.messaging.publisher.OutboundMessage;
import com.solace.messaging.publisher.OutboundMessageBuilder;
import com.solace.messaging.publisher.PersistentMessagePublisher;
import com.solace.messaging.resources.Topic;

/**
 * A more performant sample that shows non-blocking
 * Guaranteed publishing with asynchronous acknowledgments.
 * It publishes messages on topics.  Receiving applications
 * should use Queues with topic subscriptions added to them.
 */
public class GuaranteedNonBlockingPublisher {
    
    private static final String SAMPLE_NAME = GuaranteedNonBlockingPublisher.class.getSimpleName();
    static final String TOPIC_PREFIX = "solace/samples/";  // used as the topic "root"
    private static final String API = "Java";
    private static final int APPROX_MSG_RATE_PER_SEC = 100;
    private static final int PAYLOAD_SIZE = 512;
    
    private static volatile int msgSentCounter = 0;                   // num messages sent
    private static volatile boolean isShutdown = false;
    
    private static final Logger logger = LogManager.getLogger();  // log4j2, but could also use SLF4J, JCL, etc.

    /** Main method. */
    public static void main(String... args) throws IOException, InterruptedException {
        if (args.length < 3) {  // Check command line arguments
            System.out.printf("Usage: %s <host:port> <message-vpn> <client-username> [password]%n%n", SAMPLE_NAME);
            System.exit(-1);
        }
        System.out.println(API + " " + SAMPLE_NAME + " initializing...");

        final Properties properties = new Properties();
        properties.setProperty(TransportLayerProperties.HOST, args[0]);          // host:port
        properties.setProperty(ServiceProperties.VPN_NAME,  args[1]);     // message-vpn
        properties.setProperty(AuthenticationProperties.SCHEME_BASIC_USER_NAME, args[2]);      // client-username
        if (args.length > 3) {
            properties.setProperty(AuthenticationProperties.SCHEME_BASIC_PASSWORD, args[3]);  // client-password
        }
        properties.setProperty(TransportLayerProperties.RECONNECTION_ATTEMPTS, "20");  // recommended settings
        properties.setProperty(TransportLayerProperties.CONNECTION_RETRIES_PER_HOST, "5");
        // https://docs.solace.com/Solace-PubSub-Messaging-APIs/API-Developer-Guide/Configuring-Connection-T.htm
        // ready to connect now
        final MessagingService messagingService = MessagingService.builder(ConfigurationProfile.V1)
                .fromProperties(properties)
                .build();
        messagingService.connect();  // blocking connect
        messagingService.addServiceInterruptionListener(serviceEvent -> {
            logger.warn("### SERVICE INTERRUPTION: "+serviceEvent.getCause());
            //isShutdown = true;
        });
        messagingService.addReconnectionAttemptListener(serviceEvent -> {
            logger.info("### RECONNECTING ATTEMPT: "+serviceEvent);
        });
        messagingService.addReconnectionListener(serviceEvent -> {
            logger.info("### RECONNECTED: "+serviceEvent);
        });
        
        // build the publisher object
        final PersistentMessagePublisher publisher = messagingService.createPersistentMessagePublisherBuilder()
                .onBackPressureWait(1)
                .build();
        publisher.start();
        

        // publisher receipt callback, can be called for ACL violations, spool over quota, nobody subscribed to a topic, etc.
        publisher.setMessagePublishReceiptListener(publishReceipt -> {
            final PubSubPlusClientException e = publishReceipt.getException();
            if (e == null) {  // no exception, ACK, broker has confirmed receipt
                OutboundMessage outboundMessage = publishReceipt.getMessage();
                logger.debug(String.format("ACK for Message %s", outboundMessage));  // good enough, the broker has it now
            } else {// not good, a NACK
                Object userContext = publishReceipt.getUserContext();  // optionally set at publish()
                if (userContext != null) {
                    logger.warn(String.format("NACK for Message %s - %s", userContext, e));
                } else {
                    OutboundMessage outboundMessage = publishReceipt.getMessage();  // which message got NACKed?
                    logger.warn(String.format("NACK for Message %s - %s", outboundMessage, e));
                }
            }
        });
        
        ScheduledExecutorService statsPrintingThread = Executors.newSingleThreadScheduledExecutor();
        statsPrintingThread.scheduleAtFixedRate(() -> {
            System.out.printf("%s %s Published msgs/s: %,d%n",API,SAMPLE_NAME,msgSentCounter);  // simple way of calculating message rates
            msgSentCounter = 0;
        }, 1, 1, TimeUnit.SECONDS);

        System.out.println(API + " " + SAMPLE_NAME + " connected, and running. Press [ENTER] to quit.");
        System.out.println("Publishing to topic '"+ TOPIC_PREFIX + API.toLowerCase() + 
                "/pers/pub/...', please ensure queue has matching subscription."); 
        byte[] payload = new byte[PAYLOAD_SIZE];  // preallocate memory, for reuse, for performance
        // loop the main thread, waiting for a quit signal
        while (System.in.available() == 0 && !isShutdown) {
            OutboundMessageBuilder messageBuilder = messagingService.messageBuilder();
            try {
                // each loop, change the payload, less trivial
                char chosenCharacter = (char)(Math.round(msgSentCounter % 26) + 65);  // rotate through letters [A-Z]
                Arrays.fill(payload,(byte)chosenCharacter);  // fill the payload completely with that char
                OutboundMessage message = messageBuilder.build(payload);  // binary payload message
                // dynamic topics!!
                String topicString = new StringBuilder(TOPIC_PREFIX).append("java/pers/pub/").append(chosenCharacter).toString();
                publisher.publish(message,Topic.of(topicString));  // send the message asynchronously, ACK received later on callback
                msgSentCounter++;  // add one
            } catch (RuntimeException e) {  // threw from publish(), only thing that is throwing here, but keep trying (unless shutdown?)
                logger.warn("### Caught while trying to publisher.publish()",e);
                isShutdown = true;  // just example, maybe look to see if recoverable
            } finally {
                try {
                    Thread.sleep(1000 / APPROX_MSG_RATE_PER_SEC);  // do Thread.sleep(0) for max speed
                    // Note: STANDARD Edition Solace PubSub+ broker is limited to 10k msg/s max ingress
                } catch (InterruptedException e) {
                    isShutdown = true;
                }
            }
        }    
        isShutdown = true;
        statsPrintingThread.shutdown();  // stop printing stats
        publisher.terminate(1500);
        Thread.sleep(1500);  // give time for the ACKs to arrive from the broker
        messagingService.disconnect();
        System.out.println("Main thread quitting.");
    }
}
