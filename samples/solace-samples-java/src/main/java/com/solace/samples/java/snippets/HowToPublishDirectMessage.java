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
import com.solace.messaging.config.SolaceProperties.MessageProperties;
import com.solace.messaging.publisher.DirectMessagePublisher;
import com.solace.messaging.publisher.OutboundMessage;
import com.solace.messaging.publisher.OutboundMessageBuilder;
import com.solace.messaging.resources.Topic;
import com.solace.messaging.util.Converter.ObjectToBytes;
import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Sampler for direct message publisher
 */
public class HowToPublishDirectMessage {

  /**
   * Example how to start direct message publisher in a blocking mode
   *
   * @param service connected instance of a messaging service, ready to be used
   */
  public static void startDirectMessagePublisher(MessagingService service) {

    final DirectMessagePublisher messagePublisher = service.createDirectMessagePublisherBuilder()
        .build().start();
  }

  /**
   * Example how to start direct message publisher in a asynchronous mode with future interface
   *
   * @param service connected instance of a messaging service, ready to be used
   */
  public static void startAsyncDirectMessagePublisher(MessagingService service) {

    final CompletableFuture<DirectMessagePublisher> messagePublisherFuture = service
        .createDirectMessagePublisherBuilder()
        .build().startAsync();

    messagePublisherFuture.whenComplete(
        (directMessageReceiver, throwable) -> {
          if (throwable != null) {
            // This method can't prevent exception propagation.
            // Exception logging can be performed here,
            // or code can be placed here that releases some external resources or disconnect from a messaging service.
            // IMPORTANT: when exception is occurred during receiver start, then
            // this exception is propagated over entire call chain, preventing  ALL another  calls
            // from execution  (message listener won't be registered, since message receiver failed to start)
            // IMPORTANT: 'throwable' is of type java.util.concurrent.CompletionException, to get out the nested exception use:
            final Throwable wrappedException = throwable.getCause();
            // wrappedException is very likely of type PubSubPlusClientException, use cast/type check for processing
          }
        }
    );
    // methods messagePublisherFuture.thenAccept(..) or messagePublisherFuture.thenCompose(..)
    // of CompletableFuture APIs can be used to perform publishing activities
  }

  /**
   * Example how to create a topic
   *
   * @param topicName topic name/expression
   * @return topic instanch to be used for publishing purposes
   */
  public static Topic createATopic(String topicName) {
    return Topic.of(topicName);
  }

  /**
   * Example how to publish direct message with a given byte payload
   *
   * @param service       connected instance of a messaging service, ready to be used
   * @param rawMessage    byte representation of a payload
   * @param toDestination message destination
   */
  public static void publishBytesAsDirectMessage(MessagingService service, byte[] rawMessage,
      Topic toDestination) {

    final DirectMessagePublisher messagePublisher = service.createDirectMessagePublisherBuilder()
        .build().start();

    messagePublisher.publish(rawMessage, toDestination);
  }

  /**
   * Example how to publish direct message with a given string payload
   *
   * @param service       connected instance of a messaging service, ready to be used
   * @param toDestination message destination
   */
  public static void publishStringAsDirectMessage(MessagingService service,
      Topic toDestination) {

    final DirectMessagePublisher messagePublisher = service.createDirectMessagePublisherBuilder()
        .build().start();

    messagePublisher.publish("simple message to the world", toDestination);
  }

  /**
   * Example how to publish direct message with a business object/pojo(aka Plain Java Object) as a
   * payload
   *
   * @param service       connected instance of a messaging service, ready to be used
   * @param toDestination message destination
   */
  public static void publishTypedBusinessObjectAsDirectMessage(MessagingService service,
      Topic toDestination) {

    final DirectMessagePublisher messagePublisher = service
        .createDirectMessagePublisherBuilder()
        .build().start();
    // builder for creation of similarly configured messages
    final OutboundMessageBuilder messageBuilder = service.messageBuilder();

    // converter to turn business object/ pojo (plain java object) into byte []
    final ObjectToBytes<MyData> pojo2ByteConverter = (pojo) -> {
      return pojo.getName().getBytes(StandardCharsets.US_ASCII);
    };
    // business object to be published in a message
    final MyData myBusinessObject = new MyData("my message");
    messagePublisher
        .publish(messageBuilder.build(myBusinessObject, pojo2ByteConverter), toDestination);

  }

  /**
   * Example how to publish direct message with message header customization and custom properties
   *
   * @param service       connected instance of a messaging service, ready to be used
   * @param toDestination message destination
   */
  public static void publishWithFullControlDirectMessage(MessagingService service,
      Topic toDestination) {

    final DirectMessagePublisher messagePublisher = service.createDirectMessagePublisherBuilder()
        .build().start();
    // converter to turn business object/ pojo (plain java object) into byte []
    final ObjectToBytes<MyData> pojo2ByteConverter = (pojo) -> {
      return pojo.getName().getBytes(StandardCharsets.US_ASCII);
    };

    // builder for creation of similarly configured messages
    final OutboundMessageBuilder messageBuilder = service.messageBuilder();

    final MyData myBusinessObject = new MyData("my message");

    final Properties additionalProperties = new Properties();
    additionalProperties.setProperty("key", "value");

    final OutboundMessage message = messageBuilder
        .fromProperties(additionalProperties)
        // expire in 10 sec
        .withExpiration(Instant.now().toEpochMilli() + 10000L)
        .build(myBusinessObject, pojo2ByteConverter);

    messagePublisher.publish(message, toDestination);

  }

  /**
   * Example how to publish direct message with REUSABLE {@link OutboundMessageBuilder}. We
   * recommend  for performance purposes to REUSE builder (one or multiple) instance, to produce
   * {@link OutboundMessage} instances. In this particular example one builder creates High priority
   * another low priority messages.
   *
   * @param service              connected instance of a messaging service, ready to be used
   * @param highPriorityMessages list with high priority string messages
   * @param lowPriorityMessages  list with low priority string messages
   * @param publisher            direct publisher to publish messages on
   */
  public static void publishCustomMessagesUsingBuilderTemplate(MessagingService service,
      List<String> highPriorityMessages,
      List<String> lowPriorityMessages, DirectMessagePublisher publisher) {

    // pre-configured message template for HIGH PRIORITY MESSAGES
    final OutboundMessageBuilder messageTemplateHighPriority = service.messageBuilder()
        // for Rest compatibility
        .withHTTPContentHeader("text/plain", "UTF-8")
        .withPriority(255);

    final Topic topic = Topic.of("example/myTopic");

    final OutboundMessageBuilder messageTemplateLowPriority = service.messageBuilder()
        // for Rest compatibility
        .withHTTPContentHeader("text/plain", "UTF-8")
        .withPriority(1);

    final AtomicInteger atomicCounter1 = new AtomicInteger(0);

    highPriorityMessages.forEach(stringMessage -> {
      final OutboundMessage myMessage = messageTemplateHighPriority
          .build(stringMessage);
      // publish a high priority message, that can be redelivered max 3 times
      publisher.publish(myMessage, topic);
    });

    final AtomicInteger atomicCounter2 = new AtomicInteger(0);

    lowPriorityMessages.forEach(stringMessage -> {
      final OutboundMessage myMessage = messageTemplateLowPriority
          .build(stringMessage);
      // publish a low priority message, that can be redelivered max 1 time
      publisher.publish(myMessage, topic);
    });

  }

  /**
   * Example how to publish direct messages using same instance of a publisher from different
   * threads. This example is simplified, interruption for the publishing loop and exception
   * handling are not provided
   *
   * @param service                   connected instance of a messaging service, ready to be used
   * @param toDestination             message destination
   * @param blockingQueueWithMessages source of the messages
   * @param executorService           executor that provides threads used form message publishing
   */

  public static void publishDirectMessagesAsynchronously(MessagingService service,
      Topic toDestination,
      final BlockingQueue<? extends OutboundMessage> blockingQueueWithMessages,
      ExecutorService executorService) {

    final DirectMessagePublisher messagePublisher = service
        .createDirectMessagePublisherBuilder()
        .build().start();

    // converter to turn business object/ pojo (plain java object) into byte []
    final ObjectToBytes<MyData> pojo2ByteConverter = (pojo) -> {
      return pojo.getName().getBytes(StandardCharsets.US_ASCII);
    };
    boolean interrupted = false;
    try {
      // in this simplified example publishing forever
      while (true) {
        try {
          final OutboundMessage nextMessage = blockingQueueWithMessages
              .poll(100L, TimeUnit.MILLISECONDS);
          if (nextMessage != null) {
            // Publisher supports publishing from different threads once it is fully configured.
            // Each message is published here on another thread provided from the given
            // executor service
            executorService.submit(() -> messagePublisher.publish(nextMessage, toDestination));
          }
        } catch (InterruptedException e) {
          interrupted = true;
          // fall through and retry
        }
      }

    } finally {
      if (interrupted) {
        Thread.currentThread().interrupt();
      }
    }

  }

  /**
   * Example how to publish direct messages using message builder and custom set of parameter per
   * publish action
   *
   * @param service       connected instance of a messaging service, ready to be used
   * @param rawMessage    byte representation of a payload
   * @param toDestination message destination
   */
  public static void publishDirectMessageWithAdditionalProperties(MessagingService service,
      byte[] rawMessage, Topic toDestination) {

    final DirectMessagePublisher messagePublisher = service.createDirectMessagePublisherBuilder()
        .build().start();

    // builder for creation of similarly configured messages
    final OutboundMessageBuilder messageBuilder = service.messageBuilder();

    // i.e configure highest priority
    messageBuilder.withPriority(255);

    // create individual message
    final OutboundMessage myMessage = messageBuilder.build(rawMessage);

    final String correlationId = Long
        .toHexString(Double.doubleToLongBits(new SecureRandom().nextDouble()));

    // properties per message publishing attempt
    final Properties additionalMessageProperties = new Properties();
    // add some custom key-value pair
    additionalMessageProperties.setProperty("myKey", "myValue");
    // add correlation id (which is one of well known message properties)
    additionalMessageProperties.setProperty(MessageProperties.CORRELATION_ID, correlationId);

    // publish message with additional properties that applied for the particular publishing attempt.
    // Same message can be published multiple times but each time it can be customized individually with
    // properties
    messagePublisher.publish(myMessage, toDestination, additionalMessageProperties);
  }

  /**
   * basic example for a business object to be send in a message
   */
  static class MyData implements Serializable {

    private static final long serialVersionUID = 1L;
      
    private final String name;

    MyData(String name) {
      this.name = name;
    }

    public String getName() {
      return name;
    }
  }


}
