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
import com.solace.messaging.receiver.InboundMessage;
import com.solace.messaging.receiver.MessageReceiver.MessageHandler;
import com.solace.messaging.receiver.PersistentMessageReceiver;
import com.solace.messaging.resources.Queue;

public class HowToConsumePersistentMessageWithAutoAcknowledgement {


  public static void consumeFullMessageAndDoAck(MessagingService service,
      Queue queueToConsumeFrom) {
    final PersistentMessageReceiver receiver = service
        .createPersistentMessageReceiverBuilder()
        .withMessageAutoAcknowledgement().build(queueToConsumeFrom).start();

    final InboundMessage message = receiver.receiveMessage();
    //auto- acked by now...
  }


  public static void consumeFullMessageUsingCallbackAndDoAck(final MessagingService service,
      final Queue queueToConsumeFrom) {

    final MessageHandler messageHandler = (message) -> {
      // Auto-ack: when the method MessageHandler#onMessage(message) exits with NO exceptions
      // NO Auto-ack: when the method MessageHandler#onMessage(message)
      // exits with an exceptions or error
    };

    final PersistentMessageReceiver receiver = service
        .createPersistentMessageReceiverBuilder()
        .withMessageAutoAcknowledgement().build(queueToConsumeFrom).start();

    receiver.receiveAsync(messageHandler);

  }


}
