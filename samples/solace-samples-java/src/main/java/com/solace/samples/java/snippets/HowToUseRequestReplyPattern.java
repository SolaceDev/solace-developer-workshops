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
import com.solace.messaging.PubSubPlusClientException.TimeoutException;
import com.solace.messaging.publisher.OutboundMessage;
import com.solace.messaging.publisher.RequestReplyMessagePublisher;
import com.solace.messaging.publisher.RequestReplyMessagePublisher.ReplyMessageHandler;
import com.solace.messaging.receiver.RequestReplyMessageReceiver;
import com.solace.messaging.receiver.RequestReplyMessageReceiver.RequestMessageHandler;
import com.solace.messaging.resources.Topic;
import com.solace.messaging.resources.TopicSubscription;
import java.util.Objects;

public class HowToUseRequestReplyPattern {


  /**
   * Show case to demonstrate how request response pattern can be implemented (async request)
   *
   * @param serviceForRequestingParty messaging service for requesting party (usually in a different
   *                                  application is reason for separation)
   * @param serviceForRespondingParty messaging service for responding party (usually in a different
   *                                  application is reason for separation)
   * @param destinationForRequester   topic for request messages
   * @param sourceForResponder        topic subscription for the request messages topic on a
   *                                  responder time
   */
  public static void asyncRequestAndResponseExample(
      final MessagingService serviceForRequestingParty,
      final MessagingService serviceForRespondingParty,
      final Topic destinationForRequester,
      final TopicSubscription sourceForResponder) {
    // needs to run in an own thread, because as if it is running in a different microservice
    // usually requesting and responding parties are running in different microservices
    Runnable publishingJob = () -> {
      // do request part and process response (nonblocking)
      publishRequestAndProcessResponseMessageAsync$(serviceForRequestingParty,
          destinationForRequester);
    };
    // Publish is blocking, and need to run in it's own thread,
    // so that receiver part can be executed
    new Thread(publishingJob).start();

    // needs to run in an own thread, because it is as if it is running in a different microservice
    Runnable receivingJob = () -> {
      // receive request and send a response
      receiveRequestAndSendResponseMessage$(serviceForRespondingParty,
          sourceForResponder);
    };

    new Thread(receivingJob).start();
  }


  public static void blockingRequestAndResponseExample(
      final MessagingService serviceForRequestingParty,
      final MessagingService serviceForRespondingParty,
      final Topic destinationForRequester,
      final TopicSubscription sourceForResponder) {

    // needs to run in an own thread, because as if it is running in a different microservice
    // usually requesting and responding parties are running in different microservices
    Runnable publishingJob = () -> {
      // do request part and process response (blocking)
      publishRequestAndProcessResponseMessageBlocking$(serviceForRequestingParty,
          destinationForRequester);
    };
    // Publish is blocking, and need to run in it's own thread,
    // so that receiver part can be executed
    new Thread(publishingJob).start();

    // needs to run in an own thread, because it is as if it is running in a different microservice
    Runnable receivingJob = () -> {
      // receive request and send a response
      receiveRequestAndSendResponseMessage$(serviceForRespondingParty,
          sourceForResponder);
    };

    new Thread(receivingJob).start();

  }


  /**
   * Mimics microservice that performs a async request
   *
   * @param service             for vpn connection
   * @param requestDestination where to send a request (it is same for requests and responses)
   */
  private static void publishRequestAndProcessResponseMessageAsync$(MessagingService service,
      Topic requestDestination) {
    // 30 seconds
    final long replyTimeout = 30_000L;
    // 1) use an especial publisher/builder
    final RequestReplyMessagePublisher requester = service.requestReply()
        .createRequestReplyMessagePublisherBuilder().build().start();
    // 2) create a request message
    final OutboundMessage pingMessage = service.messageBuilder().build("Ping");
    // 3) prepare a reactive (that will handle response in a future) response handler
    //    it  defines how to process response for your request when/if it arrives
    final ReplyMessageHandler replyMessageHandler = (message, userContext, exception) -> {

      if (exception == null && Objects.nonNull(message)) {
        // reply received and can be processed
        // 'userContext' might be available if set when request message was published
        // 'userContext' should not be used for any kind of correlation but preferably for reply processing
        // i.e user context instance SomeUserContextPlaceholder( "important for response processing")
        // will be available at reply time point.
        // Request-reply correlation is transparent for developer
      } else {
        // got an exception
        if (exception != null && exception instanceof TimeoutException) {
          // response did not came, timed out, deal with it
        }

      }
    };

    final SomeUserContextPlaceholder someUserContextAtPublishTime = new SomeUserContextPlaceholder(
        "important for response processing");
    // 4) finally publish a nonblocking request, uses  callback listener 'replyMessageHandler'
    // 'requestDestination' topic and optionally provided user context 'someUserContextAtPublishTime'
    requester.publish(pingMessage, replyMessageHandler, someUserContextAtPublishTime,
        requestDestination, replyTimeout);

  }

  /**
   * Mimics microservice that performs a blocking request
   *
   * @param service             for vpn connection
   * @param requestDestination where to send a request (it is same for requests and responses)
   */
  private static void publishRequestAndProcessResponseMessageBlocking$(MessagingService service,
      Topic requestDestination) {
    // 10 seconds
    final long replyTimeout = 10_000L;
    // 1) use an especial publisher/builder
    final RequestReplyMessagePublisher requester = service.requestReply()
        .createRequestReplyMessagePublisherBuilder().build().start();
    // 2) create a request message
    final OutboundMessage pingMessage = service.messageBuilder().build("Ping");
    // 3) finally publish a request, uses  'requestDestination' topic, method call is blocking
    try {
      requester.publishAwaitResponse(pingMessage, requestDestination, replyTimeout);
      // 4) done; full context of the call is available after publishAwaitResponse returns or exception is thrown...
    } catch (InterruptedException e) {
      // process properly InterruptedException
    } catch (TimeoutException toe) {
      // process TimeoutException
    } catch (PubSubPlusClientException oe) {
      // process some other exceptions
    }

  }

  /**
   * Mimics microservice that performs a response
   *
   * @param service     for vpn connection
   * @param forRequests where to expect requests
   */
  private static void receiveRequestAndSendResponseMessage$(MessagingService service,
      TopicSubscription forRequests) {

    // 1) use an especial receiver/builder
    final RequestReplyMessageReceiver requestReceiver = service.requestReply()
        .createRequestReplyMessageReceiverBuilder().build(forRequests).start();

    //  listen to and handle reply failures
    requestReceiver.setReplyFailureListener((failedReplyEvent) -> {
      // on a failed failedReplyEvent details to the failed reply are available like:
      // failedReplyEvent.getDestination()
      // failedReplyEvent.getReplyMessage()
      // failedReplyEvent.getRequestMessage()
      // failedReplyEvent.getException()
      // failedReplyEvent.getTimeStamp()
    });

    // 2) prepare a request message handler (how to process request message and how to make a response message)
    final RequestMessageHandler messageHandler = (message, replier) -> {
      // 3)creates a response message
      OutboundMessage responseMessage = service.messageBuilder().build("Pong");
      // 4) and sends it back using provided replier
      replier.reply(responseMessage);

    };
    // 5) receiving request message and processing it in a callback
    requestReceiver.receiveMessage(messageHandler);

  }


  private static class SomeUserContextPlaceholder {

    final String someData;

    SomeUserContextPlaceholder(String someData) {
      this.someData = someData;
    }

    public String getSomeData() {
      return someData;
    }
  }

}
