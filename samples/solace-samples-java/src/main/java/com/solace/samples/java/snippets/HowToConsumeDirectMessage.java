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
import com.solace.messaging.PubSubPlusClientException;
import com.solace.messaging.receiver.DirectMessageReceiver;
import com.solace.messaging.receiver.InboundMessage;
import com.solace.messaging.receiver.MessageReceiver.InboundMessageSupplier;
import com.solace.messaging.receiver.MessageReceiver.MessageHandler;
import com.solace.messaging.resources.TopicSubscription;
import com.solace.messaging.util.CompletionListener;
import com.solace.messaging.util.Converter.BytesToObject;
import com.solace.messaging.util.InteroperabilitySupport.RestInteroperabilitySupport;
import java.io.Serializable;
import java.util.Properties;
import java.util.concurrent.CompletionStage;

/**
 * Sampler for direct message consumption
 */
public class HowToConsumeDirectMessage {

  /**
   * Example how to start direct message receiver. This call is blocking.
   *
   * @param receiverToBeStarted receiver to be started
   */
  public static void startDirectMessageReceiver(final DirectMessageReceiver receiverToBeStarted) {
    receiverToBeStarted.start();
  }

  /**
   * Example how to start direct message receiver using callback listener and asynchronously get
   * notifications when start operation is complete
   *
   * @param receiverToBeStarted receiver to be started
   */
  public static void startDirectMessageReceiverAsyncCallback(
      final DirectMessageReceiver receiverToBeStarted) {
    final CompletionListener<DirectMessageReceiver> receiverStartupListener = (directReceiver, throwable) -> {
      if (throwable == null) {
        // deal with an exception during start
      } else {
        //started successfully, i.e can receive messages
      }
    };
    receiverToBeStarted.startAsync(receiverStartupListener);
  }


  /**
   * Example how to start direct message receiver using callback listener and asynchronously get
   * notifications when start operation is complete.
   *
   * @param receiverToBeStarted receiver to be started
   * @see <a href="https://community.oracle.com/docs/DOC-995305">CompletableFuture for Asynchronous
   * Programming in Java 8</a>
   */
  public static void startDirectMessageReceiverAsyncCompletionStage(
      final DirectMessageReceiver receiverToBeStarted) {

    final CompletionStage<DirectMessageReceiver> receiverOnceStartCompleteStage = receiverToBeStarted
        .startAsync();
    // use CompletionStage API for reactive pipeline implementation
  }

  /**
   * Example how to consume raw bytes direct message
   *
   * @param service connected instance of a messaging service, ready to be used
   */
  public static void consumeDirectMessageBytePayload(MessagingService service) {

    final DirectMessageReceiver receiver = service
        .createDirectMessageReceiverBuilder()
        .withSubscriptions(TopicSubscription.of("setSubscriptionExpressionHere"))
        .build().start();

    final byte[] messagePayload = receiver.receiveMessage().getPayloadAsBytes();

  }

  /**
   * Example how to consume converted to utf 8 string direct message
   *
   * @param service connected instance of a messaging service, ready to be used
   */
  public static void consumeDirectMessageStringPayload(MessagingService service) {

    final DirectMessageReceiver receiver = service
        .createDirectMessageReceiverBuilder()
        .withSubscriptions(TopicSubscription.of("setSubscriptionExpressionHere"))
        .build().start();

    final String messagePayload = receiver.receiveMessage().getPayloadAsString();

  }

  /**
   * Example how to consume direct message and extract HTTP/REST specific content from direct
   * message if available
   *
   * @param service connected instance of a messaging service, ready to be used
   */
  public static void consumeDirectMessagePublishedFromRestClient(MessagingService service) {

    final DirectMessageReceiver receiver = service
        .createDirectMessageReceiverBuilder()
        .withSubscriptions(TopicSubscription.of("setSubscriptionExpressionHere"))
        .build().start();

    final InboundMessage message = receiver.receiveMessage();
    final RestInteroperabilitySupport restSpecificFields = message.getRestInteroperabilitySupport();
    final String contentEncoding = restSpecificFields.getHTTPContentEncoding();
    final String contentType = restSpecificFields.getHTTPContentType();
  }

  /**
   * Example how to consume full direct message
   *
   * @param service connected instance of a messaging service, ready to be used
   */
  public static void consumeDirectDetailedMessage(MessagingService service) {

    final DirectMessageReceiver receiver = service
        .createDirectMessageReceiverBuilder()
        .withSubscriptions(TopicSubscription.of("setSubscriptionExpressionHere"))
        .build().start();
    // extensive details about message, payload, header, properties,
    // message delivery information are available using InboundMessage
    final InboundMessage message = receiver.receiveMessage();

    // i.e message expiration time point (UTC)
    final long expiration = message.getExpiration();

    // in assumption that MyData business object is expected in a message,
    // a simple converter is provided
    final BytesToObject<MyData> bytesToBusinessObjectConverter = (bytes) -> {
      return new MyData(new String(bytes));
    };

    final MyData myBusinessObjectFromMessage = message
        .getAndConvertPayload(bytesToBusinessObjectConverter, MyData.class);

  }

  /**
   * Example how to consume (blocking) full direct messages in a loop
   *
   * @param service connected instance of a messaging service, ready to be used
   */
  public static void blockingConsumeDirectMessagesInLoop(MessagingService service) {

    final DirectMessageReceiver receiver = service
        .createDirectMessageReceiverBuilder()
        .withSubscriptions(TopicSubscription.of("setSubscriptionExpressionHere"))
        .build()
        .start();

    int count = 0;
    //receive next 1000 messages
    while (count < 1000) {
      try {
        final InboundMessage message = receiver.receiveMessage();
        // process a message
        count++;
      } catch (PubSubPlusClientException e) {
        // deal with an exception, mostly timeout exception
      }
    }
  }


  /**
   * Example how to consume (blocking with timeout) full direct messages in a loop
   *
   * @param service        connected instance of a messaging service, ready to be used
   * @param receiveTimeout time out in milliseconds after that blocking receive exits, values &gt; 0
   *                       are expected, use {@code receiveOrElse (..)} method when immediate
   *                       response is required
   */
  public static void blockingConsumeDirectMessagesInLoop(MessagingService service,
      int receiveTimeout) {

    final DirectMessageReceiver receiver = service
        .createDirectMessageReceiverBuilder()
        .withSubscriptions(TopicSubscription.of("setSubscriptionExpressionHere"))
        .build()
        .start();

    int count = 0;
    //receive next 1000 messages
    while (count < 1000) {
      try {
        final InboundMessage message = receiver.receiveMessage(receiveTimeout);
        if (message != null)
        // process a message
        //message can be null when timeout expired and new message was received
        {
          count++;
        }
      } catch (PubSubPlusClientException e) {
        // deal with an exception, mostly timeout exception
      }
    }
  }

  /**
   * Example how to consume (non-blocking) full direct messages in a loop
   *
   * @param service        connected instance of a messaging service, ready to be used
   * @param receiveTimeout time out in milliseconds after that blocking receive exits, values &gt; 0
   *                       are expected, use {@code receiveOrElse (..)} method when immediate
   *                       response is required
   */
  public static void nonBockingConsumeDirectMessagesInLoop(MessagingService service,
      int receiveTimeout) {

    final DirectMessageReceiver receiver = service
        .createDirectMessageReceiverBuilder()
        .withSubscriptions(TopicSubscription.of("setSubscriptionExpressionHere"))
        .build()
        .start();

    int count = 0;
    // more message supplier are available
    final InboundMessageSupplier nullSupplier = InboundMessageSupplier.nullMessageSupplier();
    //receive next 1000 messages
    while (count < 1000) {
      try {
        InboundMessage message = receiver.receiveOrElse(nullSupplier);
        if (message != null)
        // process a message
        //message can be null since Null supplier is used,
        // when no message is available to receive, given InboundMessageSupplier is used to generate one
        //  in particular case null is generated
        {
          count++;
        }
      } catch (PubSubPlusClientException e) {
        // deal with an exception, mostly timeout exception
  }
    }
  }


  /**
   * Example how to consume full direct messages asynchronous using callback
   *
   * @param service connected instance of a messaging service, ready to be used
   */
  public static void consumeDirectMessageAsync(MessagingService service) {

    final DirectMessageReceiver receiver = service
        .createDirectMessageReceiverBuilder()
        .withSubscriptions(TopicSubscription.of("setSubscriptionExpressionHere"))
        .build().start();

    final MessageHandler messageHandler = (message) -> {
      // do something with a message, i.e access raw payload:
      byte[] bytes = message.getPayloadAsBytes();
    };
    receiver.receiveAsync(messageHandler);

  }

  /**
   * Example how to configure {@link DirectMessageReceiver} using {@link Properties}. See {@link
   * com.solace.messaging.DirectMessageReceiverBuilder#fromProperties(Properties)} and {@link
   * com.solace.messaging.MessageReceiverBuilder#fromProperties(Properties)} for the list available
   * properties.
   *
   * @param service               connected instance of a messaging service, ready to be used
   * @param receiverConfiguration full configuration and/or fine tuning advanced configuration
   *                              properties for {@link DirectMessageReceiver}.
   * @return started direct message receiver ready to receive messages
   */
  public static DirectMessageReceiver configureConsumerFromProperties(MessagingService service,
      Properties receiverConfiguration) {

    // Note: property based configuration can be extended/overridden using api calls
    final DirectMessageReceiver receiver = service
        .createDirectMessageReceiverBuilder().fromProperties(receiverConfiguration)
        .build().start();

    return receiver;
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
