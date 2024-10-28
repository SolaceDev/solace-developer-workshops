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


import com.solace.messaging.MessagingService;
import com.solace.messaging.config.SolaceProperties.AuthenticationProperties;
import com.solace.messaging.config.SolaceProperties.ServiceProperties;
import com.solace.messaging.config.SolaceProperties.TransportLayerProperties;
import com.solace.messaging.config.profile.ConfigurationProfile;
import com.solace.messaging.publisher.DirectMessagePublisher;
import com.solace.messaging.publisher.OutboundMessage;
import com.solace.messaging.publisher.OutboundMessageBuilder;
import com.solace.messaging.receiver.DirectMessageReceiver;
import com.solace.messaging.receiver.MessageReceiver.MessageHandler;
import com.solace.messaging.resources.Topic;
import com.solace.messaging.resources.TopicSubscription;

import java.io.IOException;
import java.util.Properties;

/**
 * A Processor is a microservice or application that receives a message, does something with the info,
 * and then sends it on..!  It is both a publisher and a subscriber, but (mainly) publishes data once
 * it has received an input message.
 * This class is meant to be used with DirectPub and DirectSub, intercepting the published messages and
 * sending them on to a different topic.
 */
public class DirectProcessor {

    private static final String SAMPLE_NAME = DirectProcessor.class.getSimpleName();
    private static final String TOPIC_PREFIX = "solace/samples/";  // used as the topic "root"
    private static final String API = "Java";
    
    private static volatile int msgRecvCounter = 0;              // num messages received
    private static volatile int msgSentCounter = 0;                   // num messages sent
    private static volatile boolean isShutdown = false;  // are we done yet?

    /** Main method. */
    public static void main(String... args) throws IOException {
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
        //properties.setProperty(JCSMPProperties.GENERATE_SEQUENCE_NUMBERS, true);  // not required, but interesting
        properties.setProperty(ServiceProperties.RECEIVER_DIRECT_SUBSCRIPTION_REAPPLY, "true");  // subscribe Direct subs after reconnect
        properties.setProperty(TransportLayerProperties.RECONNECTION_ATTEMPTS, "20");  // recommended settings
        properties.setProperty(TransportLayerProperties.CONNECTION_RETRIES_PER_HOST, "5");
        // https://docs.solace.com/Solace-PubSub-Messaging-APIs/API-Developer-Guide/Configuring-Connection-T.htm
        
        final MessagingService messagingService = MessagingService.builder(ConfigurationProfile.V1)
                .fromProperties(properties)
                .build();
        messagingService.connect();  // blocking connect
        messagingService.addServiceInterruptionListener(serviceEvent -> {
            System.out.println("### SERVICE INTERRUPTION: "+serviceEvent.getCause());
            //isShutdown = true;
        });
        messagingService.addReconnectionAttemptListener(serviceEvent -> {
            System.out.println("### RECONNECTING ATTEMPT: "+serviceEvent);
        });
        messagingService.addReconnectionListener(serviceEvent -> {
            System.out.println("### RECONNECTED: "+serviceEvent);
        });

        // build the publisher object
        final DirectMessagePublisher publisher = messagingService.createDirectMessagePublisherBuilder()
                .onBackPressureWait(1)
                .build();
        publisher.start();
        
        // build the Direct receiver object
        final DirectMessageReceiver receiver = messagingService.createDirectMessageReceiverBuilder()
                .withSubscriptions(TopicSubscription.of(TOPIC_PREFIX+"*/TAMIMI/YOLO/>"))
                // add more subscriptions here if you want
                .build();
        receiver.start();
        
        OutboundMessageBuilder messageBuilder = messagingService.messageBuilder();

        final MessageHandler messageHandler = (inboundMsg) -> {  // async message callback handler
            String inboundTopic = inboundMsg.getDestinationName();
            if (inboundTopic.contains("/direct/pub/")) {  // simple validation of topic
                // how to "process" the incoming message? maybe do a DB lookup? add some additional properties? or change the payload?
                final String upperCaseMessage = inboundTopic.toUpperCase();  // as a silly example of "processing"
                
                OutboundMessage outboundMsg = messageBuilder.build(upperCaseMessage);  // build TextMessage to send
                String [] inboundTopicLevels = inboundTopic.split("/",6);
                String outboundTopic = new StringBuilder(TOPIC_PREFIX).append(API.toLowerCase())
                		.append("/direct/upper/").append(inboundTopicLevels[5]).toString();  // to "upper" topic
                try {
                    publisher.publish(outboundMsg, Topic.of(outboundTopic));
                } catch (RuntimeException e) {  // threw from send(), only thing that is throwing here
                    System.out.printf("### Caught while trying to publisher.publish(): %s%n",e);
                    isShutdown = true;
                }
            } else {
            	// received a message that I wasn't expecting... handle it here somehow
            }
        };
        receiver.receiveAsync(messageHandler);  // non-blocking receiver (vs. blocking receive() method)

        System.out.println(API + " " + SAMPLE_NAME + " connected, and running. Press [ENTER] to quit.");
        while (System.in.available() == 0 && !isShutdown) {  // time to loop!
            try {
                System.out.printf("%s %s Received -> Published msgs/s: %,d -> %,d%n",
                        API, SAMPLE_NAME, msgRecvCounter, msgSentCounter);  // simple way of calculating message rates
                msgRecvCounter = 0;
                msgSentCounter = 0;
                Thread.sleep(1000);  // take a pause
            } catch (InterruptedException e) {
                // Thread.sleep() interrupted... probably getting shut down
            }
        }
        isShutdown = true;
        publisher.terminate(500);
        receiver.terminate(500);
        messagingService.disconnect();
        System.out.println("Main thread quitting.");
    }
}
