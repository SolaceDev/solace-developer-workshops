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
import com.solace.messaging.config.ReceiverActivationPassivationConfiguration.ReceiverStateChangeListener;
import com.solace.messaging.config.ReceiverActivationPassivationConfiguration.ReceiverStateChangeListener.ReceiverState;
import com.solace.messaging.receiver.InboundMessage;
import com.solace.messaging.receiver.PersistentMessageReceiver;
import com.solace.messaging.resources.Queue;
import java.util.Properties;

public class HowToConsumePersistentMessage {

  public static void startMessageReceiver(MessagingService service, Queue queueToConsumeFrom) {
    final PersistentMessageReceiver receiver = service
        .createPersistentMessageReceiverBuilder().build(queueToConsumeFrom).start();
  }

  public static void consumeFullMessageAndDoAck(MessagingService service,
      Queue queueToConsumeFrom) {
    final PersistentMessageReceiver receiver = service
        .createPersistentMessageReceiverBuilder().build(queueToConsumeFrom).start();

    final InboundMessage message = receiver.receiveMessage();
    //any time later can do ack so long receiver did not closed
    receiver.ack(message);
  }


  public static void consumeUsingMessageSelector(MessagingService service,
      Queue queueToConsumeFrom) {
    final String filterSelectorExpression = "myMessageProperty01 = 'someValue' AND myMessageProperty02 = 'someValue'";
    final PersistentMessageReceiver receiver = service
        .createPersistentMessageReceiverBuilder().withMessageSelector(filterSelectorExpression)
        .build(queueToConsumeFrom).start();

    // ONLY messages with matching message properties from a selector expression will be received
    final InboundMessage message = receiver.receiveMessage();
    //any time later can do ack so long receiver did not closed
    receiver.ack(message);

  }

  public static void consumeFullMessageWithExclusiveConsumerAndPassivationListener(
      MessagingService service,
      Queue queueToConsumeFrom) {
    final ReceiverStateChangeListener passivationActivationListener = (oldState, newState, timestamp) -> {
      if (oldState.equals(ReceiverState.PASSIVE) && newState.equals(ReceiverState.ACTIVE)) {
        // consumer activated
      }
    };

    final PersistentMessageReceiver receiver = service
        .createPersistentMessageReceiverBuilder()
        .withActivationPassivationSupport(passivationActivationListener)
        .build(queueToConsumeFrom)
        .start();

    final InboundMessage message = receiver.receiveMessage();
    //any time later can do ack so long receiver did not closed
    receiver.ack(message);

  }

  /**
   * Example how to configure {@link PersistentMessageReceiver} using {@link Properties}. See {@link
   * com.solace.messaging.PersistentMessageReceiverBuilder#fromProperties(Properties)} and {@link
   * com.solace.messaging.MessageReceiverBuilder#fromProperties(Properties)} for the list available
   * properties.
   *
   * @param service               connected instance of a messaging service, ready to be used
   * @param receiverConfiguration full configuration and/or fine tuning advanced configuration
   *                              properties for {@link PersistentMessageReceiver}.
   * @param queueToConsumeFrom    queue to consume from messages
   * @return started persistent message receiver ready to receive messages
   */
  public static PersistentMessageReceiver configureFromPropertiesConsumer(MessagingService service,
      Queue queueToConsumeFrom, Properties receiverConfiguration) {

    final ReceiverStateChangeListener passivationActivationListener = (oldState, newState, timestamp) -> {
      if (oldState.equals(ReceiverState.PASSIVE) && newState.equals(ReceiverState.ACTIVE)) {
        // consumer activated
      }
    };
    // Note: property based configuration can be extended/overridden using api calls
    // Note: no callbacks can be configured using property based configuration
    final PersistentMessageReceiver receiver = service
        .createPersistentMessageReceiverBuilder().fromProperties(receiverConfiguration)
        .withActivationPassivationSupport(passivationActivationListener)
        .build(queueToConsumeFrom).start();

    return receiver;
  }


}
