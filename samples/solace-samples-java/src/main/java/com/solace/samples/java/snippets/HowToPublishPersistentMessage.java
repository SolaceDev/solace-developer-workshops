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
import com.solace.messaging.publisher.OutboundMessage;
import com.solace.messaging.publisher.OutboundMessageBuilder;
import com.solace.messaging.publisher.PersistentMessagePublisher;
import com.solace.messaging.publisher.PersistentMessagePublisher.MessagePublishReceiptListener;
import com.solace.messaging.resources.Topic;
import com.solace.messaging.util.Converter.ObjectToBytes;
import java.io.Serializable;
import java.nio.charset.StandardCharsets;

public class HowToPublishPersistentMessage {

  public static PersistentMessagePublisher createPersistentMessagePublisher(
      MessagingService service, Topic toDestination) {

    final PersistentMessagePublisher messagePublisher = service
        .createPersistentMessagePublisherBuilder()
        .build().start();
    // ready to go publisher
    return messagePublisher;
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

  public static void publishByteMessageNonBlocking(
      final PersistentMessagePublisher messagePublisher, Topic toDestination) {

    // listener that processes all delivery confirmations/timeouts for all messages all
    // messages being send using given instance of messagePublisher
    final MessagePublishReceiptListener deliveryConfirmationListener = (publishReceipt) -> {
      // process delivery confirmation for some message ...
    };

    // listen to all delivery confirmations for all messages being send
    messagePublisher.setMessagePublishReceiptListener(deliveryConfirmationListener);

    // publishing a message (raw byte [] payload in this case)
    messagePublisher
        .publish("converted to bytes".getBytes(StandardCharsets.US_ASCII), toDestination);

  }

  public static void publishStringMessageNonBlocking(
      final PersistentMessagePublisher messagePublisher, Topic toDestination) {

    // listener that processes all delivery confirmations/timeouts for all messages all
    // messages being send using given instance of messagePublisher
    final MessagePublishReceiptListener deliveryConfirmationListener = (publishReceipt) -> {
      // process delivery confirmation for some message ...
    };

    // listen to all delivery confirmations for all messages being send
    messagePublisher.setMessagePublishReceiptListener(deliveryConfirmationListener);

    // publishing a message (String payload in this case)
    messagePublisher
        .publish("Hello world", toDestination);

  }


  public static void publishTypedMessageNonBlocking(OutboundMessageBuilder messageBuilder,
      final PersistentMessagePublisher messagePublisher, Topic toDestination) {

    // listener that processes all delivery confirmations/timeouts for all messages all
    // messages being send using given instance of messagePublisher
    final MessagePublishReceiptListener deliveryConfirmationListener = (publishReceipt) -> {
      // process delivery confirmation for some message ...
      // there are different ways to correlate with a published message:
      //   - using message itself: publishReceipt.getMessage()
      //   - having access to user provided context: publishReceipt.getUserContext()
      // ..

    };

    // listen to all delivery confirmations for all messages being send
    messagePublisher.setMessagePublishReceiptListener(deliveryConfirmationListener);

    final MyData data = new MyData("my message");

    final ObjectToBytes<MyData> dto2ByteConverter = (pojo) -> {
      return pojo.getName().getBytes(StandardCharsets.US_ASCII);
    };

    // publishing a message (typed business object payload in this case)
    messagePublisher
        .publish(messageBuilder.build(data, dto2ByteConverter), toDestination);

  }


  public static void publishTypedMessageWithExtendedMessagePropertiesNonBlocking(
      OutboundMessageBuilder messageBuilder,
      final PersistentMessagePublisher messagePublisher, Topic toDestination) {

    // listener that processes all delivery confirmations/timeouts for all messages all
    // messages being send using given instance of messagePublisher
    final MessagePublishReceiptListener deliveryConfirmationListener = (publishReceipt) -> {
      // process delivery confirmation for some message ...
      // there are different ways to correlate with a published message:
      //   - using message itself: publishReceipt.getMessage()
      //   - having access to user provided context: publishReceipt.getUserContext()
      // ..
    };

    // listen to all delivery confirmations for all messages being send
    messagePublisher.setMessagePublishReceiptListener(deliveryConfirmationListener);

    final MyData data = new MyData("my message");

    final ObjectToBytes<MyData> dto2ByteConverter = (pojo) -> {
      return pojo.getName().getBytes(StandardCharsets.US_ASCII);
    };

    final OutboundMessage message = messageBuilder
        .withPriority(255).build(data, dto2ByteConverter);

    // publishing a message (typed business object payload in this case)
    messagePublisher
        .publish(message, toDestination);

  }


  public static void correlateMessageOnBrokerAcknowledgementWithUserContextNonBlocking(
      OutboundMessageBuilder messageBuilder,
      final PersistentMessagePublisher messagePublisher, Topic toDestination) {

    // listener that processes all delivery confirmations/timeouts for all messages all
    // messages being send using given instance of messagePublisher
    final MessagePublishReceiptListener publishConfirmationListener = (publishReceipt) -> {

      final OutboundMessage acknowledgedMessage = publishReceipt.getMessage();
      // corresponding context can be retrieved this way from a publish receipt
      final Object processingContext = publishReceipt.getUserContext();
      // when provided during message publishing
      if (null != processingContext && processingContext instanceof MyContext) {
        final MyContext myContext = (MyContext) processingContext;
        // use 'myContext' and 'acknowledgedMessage' for processing/ failure check etc ...
      }
    };

    // listen to all delivery confirmations for all messages being send
    messagePublisher.setMessagePublishReceiptListener(publishConfirmationListener);

    final ObjectToBytes<MyData> dto2ByteConverter = (pojo) -> {
      return pojo.getName().getBytes(StandardCharsets.US_ASCII);
    };

    // message payload
    final MyData dataABC = new MyData("message ABC");
    // corresponding context
    final MyContext contextForDataABC = new MyContext("Context for message ABC");

    // publishing a message, providing context,
    messagePublisher
        .publish(messageBuilder.build(dataABC, dto2ByteConverter), toDestination,
            contextForDataABC);

  }

  public static void checkForMessageAcknowledgementFailuresNonBlocking(
      final PersistentMessagePublisher messagePublisher, Topic toDestination) {

    // Listener that processes all publish confirmations/timeouts for all messages.
    // Callback expected to be executed on a different thread then message was published on
    final MessagePublishReceiptListener publishReceiptListener = (publishReceipt) -> {
      final PubSubPlusClientException exceptionIfAnyOrNull = publishReceipt.getException();

      if (null != exceptionIfAnyOrNull) {

        // deal with a not acknowledged message ...
        // there are different ways to correlate with a published message:
        //   - using message itself: publishReceipt.getMessage()
        //   - having access to user provided context: publishReceipt.getUserContext()
        // ..

      } else {
        // process delivery confirmation for some message ...
      }

    };

    // listen to all delivery confirmations for all messages being send
    messagePublisher.setMessagePublishReceiptListener(publishReceiptListener);

    // publish message...
    // publishing a message (String payload in this case),
    messagePublisher.publish("Hello world", toDestination);

  }


  public static void publishTypedMessageBlockingWaitingForDeliveryConfirmation(
      OutboundMessageBuilder messageBuilder,
      final PersistentMessagePublisher messagePublisher, Topic toDestination) {

    final MyData data = new MyData("my blocking message");

    final ObjectToBytes<MyData> dto2ByteConverter = (pojo) -> {
      return pojo.getName().getBytes(StandardCharsets.US_ASCII);
    };

    // wait at the most for 20 seconds before considering that message is not delivered to the broker
    final long deliveryConfirmationTimeOutInMilliseconds = 20000L;
    // publishing a message (typed business object payload in this case), blocking
    try {
      messagePublisher
          .publishAwaitAcknowledgement(messageBuilder.build(data, dto2ByteConverter),
              toDestination, deliveryConfirmationTimeOutInMilliseconds);
    } catch (InterruptedException e) {
      // process InterruptedException
    }

  }


  /**
   * Basic example of a business object, for message payload
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

  /**
   * Basic example of some context related to message post-processing (on acknowledgement)
   */
  static class MyContext {

    private final String name;

    MyContext(String name) {
      this.name = name;
    }

    public String getName() {
      return name;
    }
  }


}
