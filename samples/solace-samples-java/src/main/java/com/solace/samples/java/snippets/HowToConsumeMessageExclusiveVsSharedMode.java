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

package com.solace.samples.java.snippets;

import com.solace.messaging.MessagingService;
import com.solace.messaging.config.MissingResourcesCreationConfiguration.MissingResourcesCreationStrategy;
import com.solace.messaging.config.ReceiverActivationPassivationConfiguration.ReceiverStateChangeListener;
import com.solace.messaging.config.ReceiverActivationPassivationConfiguration.ReceiverStateChangeListener.ReceiverState;
import com.solace.messaging.receiver.DirectMessageReceiver;
import com.solace.messaging.receiver.PersistentMessageReceiver;
import com.solace.messaging.resources.Queue;
import com.solace.messaging.resources.ShareName;
import com.solace.messaging.resources.TopicSubscription;

/**
 * Collection with samples for exclusive and shared persistent and direct message receiver use
 * cases
 */
public class HowToConsumeMessageExclusiveVsSharedMode {

  /**
   * Collection with samples using exclusive persistent messages receiver (at the same time a single
   * instance of c consumer is actively connected and receives messages)
   */
  static class ExclusivePersistentMessagesReceiverUseCases {

    /**
     * Example how to receive messages from an exclusive durable queue. In case queue does not
     * exists, creation is attempted. Exclusive queue can serve a single client at time, when more
     * clients
     *
     * @param connectedService connected instance of a messaging service, ready to be used
     * @param queueName        name of the exclusive durable queue
     */
    public static void receiveFromDurableExclusiveQueue(
        MessagingService connectedService, String queueName) {

      final PersistentMessageReceiver receiver = connectedService
          .createPersistentMessageReceiverBuilder()
          .withSubscriptions(TopicSubscription.of("setSubscriptionExpressionHere"))
          // try to create one if does not exists
          .withMissingResourcesCreationStrategy(MissingResourcesCreationStrategy.CREATE_ON_START)
          // use convenience static factory Queues to create durable exclusive queue
          .build(Queue.durableExclusiveQueue(queueName)).start();

      final byte[] messagePayload = receiver.receiveMessage().getPayloadAsBytes();

    }


    /**
     * Example how to receive messages from an exclusive NON durable queue.
     *
     * @param connectedService connected instance of a messaging service, ready to be used
     * @param queueName        name of the exclusive NON durable queue
     */
    public static void receiveFromNonDurableExclusiveQueue(
        MessagingService connectedService, String queueName) {

      final PersistentMessageReceiver receiver = connectedService
          .createPersistentMessageReceiverBuilder()
          .withSubscriptions(TopicSubscription.of("setSubscriptionExpressionHere"))
          .withMissingResourcesCreationStrategy(MissingResourcesCreationStrategy.CREATE_ON_START)
          // use convenience static factory Queues to create NON durable exclusive queue
          .build(Queue.nonDurableExclusiveQueue(queueName)).start();

      final byte[] messagePayload = receiver.receiveMessage().getPayloadAsBytes();

    }

    /**
     * Example how to receive messages from an exclusive NON durable anonymous queue.
     *
     * @param connectedService connected instance of a messaging service, ready to be used
     */
    public static void receiveFromNonDurableAnonymousExclusiveQueue(
        MessagingService connectedService) {

      final PersistentMessageReceiver receiver = connectedService
          .createPersistentMessageReceiverBuilder()
          .withSubscriptions(TopicSubscription.of("setSubscriptionExpressionHere"))
          .withMissingResourcesCreationStrategy(MissingResourcesCreationStrategy.CREATE_ON_START)
          // use convenience static factory Queues to create NON durable anonymous exclusive queue
          .build(Queue.nonDurableExclusiveQueue()).start();

      final byte[] messagePayload = receiver.receiveMessage().getPayloadAsBytes();

    }

    /**
     * Example how to receive messages and listen to client passivation/activation notifications
     *
     * @param connectedService connected instance of a messaging service, ready to be used
     * @param exclusiveQueue   exclusive queue
     */
    public static void receiveWithStateChangeListener(
        MessagingService connectedService,
        Queue exclusiveQueue) {

      // when application is consuming in an exclusive mode ReceiverStateChangeListener
      // can be provided to listen to activation passivation events
      final ReceiverStateChangeListener stateChangeListener = (oldState, newState, time) -> {
        if (ReceiverState.ACTIVE.equals(newState)) {
          // consumer instance was just activated
        }
      };

      final PersistentMessageReceiver receiver = connectedService
          .createPersistentMessageReceiverBuilder()
          .withSubscriptions(TopicSubscription.of("setSubscriptionExpressionHere"))
          // pass state change listener
          .withActivationPassivationSupport(stateChangeListener)
          .build(exclusiveQueue).start();

      final byte[] messagePayload = receiver.receiveMessage().getPayloadAsBytes();

    }

  }


  /**
   * Collection with samples from shared (horizontally scaled) persistent messages receiver [broker
   * distributes messages according i.e to round-robin algorithm among all identically configured
   * receiver configured to be a part of a group]
   */
  static class SharedPersistentMessagesReceiverUseCases {

    /**
     * Example how to receive messages from a non exclusive (shared) durable queue.
     *
     * @param connectedService connected instance of a messaging service, ready to be used
     * @param queueName        name of the durable non exclusive (shared) queue
     */
    public static void receiveMessagesUsingDurableSharedQueue(
        MessagingService connectedService, String queueName) {

      final PersistentMessageReceiver receiver = connectedService
          .createPersistentMessageReceiverBuilder()
          .withSubscriptions(TopicSubscription.of("setSubscriptionExpressionHere"))
          // durable queue is less likely created by developer on the fly but provisioned from an  administrator
          // it is still possible to create it using API if it does nto already exists
          .withMissingResourcesCreationStrategy(MissingResourcesCreationStrategy.CREATE_ON_START)
          // use convenience static factory Queues to bind durable shared queue
          .build(Queue.durableNonExclusiveQueue(queueName)).start();

      // incoming messages will be distributed evenly among all instances of the application
      final byte[] messagePayload = receiver.receiveMessage().getPayloadAsBytes();

    }

  }


  /**
   * Collection with samples for exclusive direct messages receiver use case
   */
  static class ExclusiveDirectMessagesReceiverUseCases {
    // N/A, API does not provide a feature for exclusive direct message consumption.
    // Subscriptions provided for a particular receiver are meaningful for receiver instance only
  }


  /**
   * Collection with samples for direct messaging with horizontal scaling support.
   */
  static class SharedDirectMessagesReceiverUseCases {

    /**
     * Example how to receive direct messages using shared subscriptions.
     * <p> A shared subscription has the form: #share/{@literal <}ShareName{@literal >}/{@literal
     * <}topicSubscription{@literal >}
     *
     * @param connectedService connected instance of a messaging service, ready to be used
     * @param shareName        is the identifier associated with the shared subscription
     * @param mySubscriptions  one or more topic filter aka. topic subscriptions
     */
    public static void receiveMessagesWithSharedSubscriptions(MessagingService connectedService,
        ShareName shareName, TopicSubscription... mySubscriptions) {

      final DirectMessageReceiver receiver = connectedService
          .createDirectMessageReceiverBuilder()
          .withSubscriptions(mySubscriptions)
          .build(shareName)
          .start();
      // All messages are round robin among all instances of clients
      // that are using same shared subscription configuration
      final byte[] messagePayload = receiver.receiveMessage().getPayloadAsBytes();

    }

  }


}
