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
import com.solace.messaging.PubSubPlusClientException;
import com.solace.messaging.config.SolaceProperties.AuthenticationProperties;
import com.solace.messaging.config.SolaceProperties.ServiceProperties;
import com.solace.messaging.config.SolaceProperties.TransportLayerProperties;
import com.solace.messaging.config.profile.ConfigurationProfile;
import com.solace.messaging.publisher.OutboundMessage;
import com.solace.messaging.publisher.OutboundMessageBuilder;
import com.solace.messaging.publisher.PersistentMessagePublisher;
import com.solace.messaging.publisher.PersistentMessagePublisher.MessagePublishReceiptListener;
import com.solace.messaging.publisher.PersistentMessagePublisher.PublishReceipt;
import com.solace.messaging.receiver.InboundMessage;
import com.solace.messaging.receiver.PersistentMessageReceiver;
import com.solace.messaging.resources.Queue;
import com.solace.messaging.resources.Topic;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.io.IOException;
import java.util.Properties;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * A sample application that publishes a message for every one that it receives.
 * Uses a synchronous receiver to block waiting for messages from the broker, and a
 * non-blocking publisher to send. It uses a simple helper class to correlate
 * successfully published outbound messages before it ACKs the received message.
 * This application assumes a queue named <code>q_java_proc</code> has already been
 * created for it, and the topic subscription <code>solace/samples/&ast;/pers/pub/></code>
 */
public class GuaranteedProcessor {

    private static final String SAMPLE_NAME = GuaranteedProcessor.class.getSimpleName();
    private static final String QUEUE_NAME = "q_java_proc";
    static final String TOPIC_PREFIX = "solace/samples/";  // used as the topic "root"
    private static final String API = "Java";

//    private static PersistentMessageReceiver receiver;

    private static volatile int msgSentCounter = 0;                 // num messages sent
    private static volatile int msgRecvCounter = 0;                 // num messages received
    private static volatile boolean isShutdown = false;             // are we done?

    // remember to add log4j2.xml to your classpath
    private static final Logger logger = LogManager.getLogger();  // log4j2, but could also use SLF4J, JCL, etc.

    /**
     * This is the main app.  Use this type of app for receiving Guaranteed messages (e.g. via a queue endpoint).
     */
    public static void main(String... args) throws InterruptedException, IOException {
        if (args.length < 3) {  // Check command line arguments
            System.out.printf("Usage: %s <host:port> <message-vpn> <client-username> [password]%n%n", SAMPLE_NAME);
            System.exit(-1);
        }
        System.out.println(API + " " + SAMPLE_NAME + " initializing...");

        final Properties properties = new Properties();
        properties.setProperty(TransportLayerProperties.HOST, args[0]);          // host:port
        properties.setProperty(ServiceProperties.VPN_NAME, args[1]);     // message-vpn
        properties.setProperty(AuthenticationProperties.SCHEME_BASIC_USER_NAME, args[2]);      // client-username
        if (args.length > 3) {
            properties.setProperty(AuthenticationProperties.SCHEME_BASIC_PASSWORD, args[3]);  // client-password
        }
        //properties.setProperty(JCSMPProperties.GENERATE_SEQUENCE_NUMBERS, true);  // not required, but interesting

        properties.setProperty(TransportLayerProperties.RECONNECTION_ATTEMPTS, "20");  // recommended settings
        properties.setProperty(TransportLayerProperties.CONNECTION_RETRIES_PER_HOST, "5");
        // https://docs.solace.com/Solace-PubSub-Messaging-APIs/API-Developer-Guide/Configuring-Connection-T.htm
        // ready to connect now
        final MessagingService messagingService = MessagingService.builder(ConfigurationProfile.V1)
                .fromProperties(properties)
                .build();
        messagingService.connect();  // blocking connect
        messagingService.addServiceInterruptionListener(serviceEvent -> {
            logger.warn("### SERVICE INTERRUPTION: " + serviceEvent.getCause());
            //isShutdown = true;
        });
        messagingService.addReconnectionAttemptListener(serviceEvent -> {
            logger.info("### RECONNECTING ATTEMPT: " + serviceEvent);
        });
        messagingService.addReconnectionListener(serviceEvent -> {
            logger.info("### RECONNECTED: " + serviceEvent);
        });


        // build the publisher object
        final PersistentMessagePublisher publisher = messagingService.createPersistentMessagePublisherBuilder()
                .onBackPressureWait(1)
                .build();
        publisher.start();
        publisher.setMessagePublishReceiptListener(new PublishCallbackHandler());

        // this receiver assumes the queue already exists and has a topic subscription mapped to it
        // if not, first create queue with PubSub+Manager, or SEMP management API
        final PersistentMessageReceiver receiver = messagingService
                .createPersistentMessageReceiverBuilder()
                .build(Queue.durableExclusiveQueue(QUEUE_NAME));
        try {
            receiver.start();
        } catch (RuntimeException e) {
            logger.error(e);
            System.err.printf("%n*** Could not establish a connection to queue '%s': %s%n", QUEUE_NAME, e.getMessage());
            System.err.println("Create queue using PubSub+ Manager WebGUI, and add subscription " +
                    TOPIC_PREFIX + "*/pers/pub/>");
            System.err.println("  or see the SEMP CURL scripts inside the 'semp-rest-api' directory.");
            // could also try to retry, loop and retry until successfully able to connect to the queue
            System.err.println("NOTE: see HowToEnableAutoCreationOfMissingResourcesOnBroker.java sample for how to construct queue with consumer app.");
            System.err.println("Exiting.");
            return;
        }

        // make a thread for printing message rate stats
        ScheduledExecutorService statsPrintingThread = Executors.newSingleThreadScheduledExecutor();
        statsPrintingThread.scheduleAtFixedRate(() -> {
            System.out.printf("%s %s Received -> Published msgs/s: %,d -> %,d%n",
                    API, SAMPLE_NAME, msgRecvCounter, msgSentCounter);  // simple way of calculating message rates
            msgRecvCounter = 0;
            msgSentCounter = 0;
        }, 1, 1, TimeUnit.SECONDS);


        while (System.in.available() == 0 && !isShutdown) {
            InboundMessage inboundMsg = receiver.receiveMessage(1000);  // blocking receive a message
            if (inboundMsg == null) {  // receive() either got interrupted, or timed out
                continue;
            }
            msgRecvCounter++;
            String inboundTopic = inboundMsg.getDestinationName();
            if (inboundTopic.contains("/pers/pub/")) {  // simple validation of topic
                // how to "process" the incoming message? maybe do a DB lookup? add some additional properties? or change the payload?
                OutboundMessageBuilder messageBuilder = messagingService.messageBuilder();
                final String upperCaseTopic = inboundTopic.toUpperCase();  // as a silly example of "processing"
                OutboundMessage outboundMsg = messageBuilder.build(upperCaseTopic);
                try {
                    String[] inboundTopicLevels = inboundTopic.split("/", 6);
                    String onwardsTopic = new StringBuilder(TOPIC_PREFIX).append(API.toLowerCase())
                            .append("/pers/upper/").append(inboundTopicLevels[5]).toString();
                    ProcessorCorrelationKey ck = new ProcessorCorrelationKey(inboundMsg, outboundMsg, receiver);
                    publisher.publish(outboundMsg, Topic.of(onwardsTopic), ck);
                    msgSentCounter++;
                } catch (ArrayIndexOutOfBoundsException arrayIndexOutOfBoundsException) {
                    logger.warn("### Caught while trying to publisher.publish()", arrayIndexOutOfBoundsException);
                } catch (
                        RuntimeException e) {  // threw from publish(), only thing that is throwing here, but keep trying (unless shutdown?)
                    logger.warn("### Caught while trying to publisher.publish()", e);
                    isShutdown = true;  // just example, maybe look to see if recoverable
                }
            } else {  // unexpected message. either log or something
                logger.info("Received an unexpected message with topic " + inboundTopic + ".  Ignoring");
                receiver.ack(inboundMsg);
            }
        }


        // async queue receive working now, so time to wait until done...
        System.out.println(SAMPLE_NAME + " connected, and running. Press [ENTER] to quit.");
        while (System.in.available() == 0 && !isShutdown) {
            Thread.sleep(1000);  // wait 1 second
            System.out.printf("%s %s Received msgs/s: %,d%n", API, SAMPLE_NAME, msgRecvCounter);  // simple way of calculating message rates
            msgRecvCounter = 0;
        }
        isShutdown = true;
        receiver.terminate(1500L);
        statsPrintingThread.shutdown();  // stop printing stats
        Thread.sleep(1000);
        messagingService.disconnect();
        System.out.println("Main thread quitting.");
    }


    ////////////////////////////////////////////////////////////////////////////

    /**
     * Hold onto both messages, wait for outbound ACK to come back, and then ACK inbound message
     */
    private static class ProcessorCorrelationKey {

        private final InboundMessage inboundMsg;
        private final OutboundMessage outboundMsg;
        private final PersistentMessageReceiver receiver;

        private ProcessorCorrelationKey(InboundMessage inboundMsg, OutboundMessage outboundMsg, PersistentMessageReceiver receiver) {
            this.inboundMsg = inboundMsg;
            this.outboundMsg = outboundMsg;
            this.receiver = receiver;
        }
    }

    //////////////////////////////////

    /**
     * Very simple static inner class, used for handling publish ACKs/NACKs from broker.
     **/
    private static class PublishCallbackHandler implements MessagePublishReceiptListener {

        @Override
        public void onPublishReceipt(PublishReceipt publishReceipt) {
            Object userContext = publishReceipt.getUserContext();  // optionally set at publish()
            assert userContext instanceof ProcessorCorrelationKey;
            ProcessorCorrelationKey ck = (ProcessorCorrelationKey) userContext;
            if (publishReceipt.getException() != null) {  // NACK, something went wrong
                final PubSubPlusClientException e = publishReceipt.getException();
                logger.warn(String.format("NACK for Message %s - %s", ck.outboundMsg, e));
                // probably want to do something here.  some error handling possibilities:
                //  - send the message again
                //  - send it somewhere else (error handling queue?)
                //  - log and continue
                //  - pause and retry (backoff) - maybe set a flag to slow down the publisher
            } else {  // regular ACK of message, successful publish
                ck.receiver.ack(ck.inboundMsg);  // ONLY ACK inbound msg off my queue once outbound msg is Guaranteed delivered
                logger.debug(String.format("ACK for Message %s", ck));  // good enough, the broker has it now
            }
        }
    }

}
