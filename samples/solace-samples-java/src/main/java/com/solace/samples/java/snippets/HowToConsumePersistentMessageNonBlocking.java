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
import com.solace.messaging.receiver.PersistentMessageReceiver;
import com.solace.messaging.resources.Queue;
import java.time.Instant;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class HowToConsumePersistentMessageNonBlocking {


  public static void consumeMessagePauseAndResumeMessageDelivery(MessagingService service,
      Queue queueToConsumeFrom) {
    final PersistentMessageReceiver receiver = service
        .createPersistentMessageReceiverBuilder().build(queueToConsumeFrom).start();

    receiver.receiveAsync((message) -> {
      // do something with my message, i.e check if it is not expired
      if (message != null && Instant.now().toEpochMilli() > message.getExpiration() &&
          message.getPayloadAsBytes() != null) {
        //and do ack
        receiver.ack(message);
      }

    });

    ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);

    // pause message delivery in 10 sec
    scheduler.schedule(() -> receiver.pause(), 10L, TimeUnit.SECONDS);

    // resume message delivery in 20 sec
    scheduler.schedule(() -> receiver.resume(), 20L, TimeUnit.SECONDS);

  }


  public static void delayedMessageProcessingAndAcknowledgement(MessagingService service,
      Queue queueToConsumeFrom) {
    final PersistentMessageReceiver receiver = service
        .createPersistentMessageReceiverBuilder().build(queueToConsumeFrom).start();
    // queue used to implement simple producer/consumer use case with delayed acknowledgment
    final BlockingQueue<InboundMessage> iQueue = new LinkedBlockingQueue<>(
        Runtime.getRuntime().availableProcessors());

    // consumer task
    final Runnable delayedConsumerAndAcknowledger = () -> {
      while (true) {
        try {
          InboundMessage nextMessageFromQueue = iQueue.take();
          // can process a message and do the ack/nack
          receiver.ack(nextMessageFromQueue);
        } catch (InterruptedException e) {
          // deal with interrupted exception
        }

      }
    };

    // starts the consumer
    new Thread(delayedConsumerAndAcknowledger).start();

    receiver.receiveAsync((message) -> {
      // put message into the queue for later processing
      try {
        iQueue.put(message);
      } catch (InterruptedException e) {
        // deal with interrupted exception
      }
    });


  }


}
