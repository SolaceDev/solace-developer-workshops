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
import com.solace.messaging.receiver.DirectMessageReceiver;
import com.solace.messaging.receiver.MessageReceiver.MessageHandler;
import com.solace.messaging.resources.TopicSubscription;
import java.util.concurrent.CompletionStage;

/**
 * Sampler for fluent promise pattern/reactive API for message consumption
 */
public class HowToCreateAsyncMessageConsumerPipeline {

  /**
   * Example how to connect to a broker, starting direct message receiver and finally subscribe for
   * messages asynchronously. Includes exception handling.
   * <p>NOTE: This method is nonblocking.
   * <p>For example when this method is executed on a main application thread it wont prevent
   * thread from exit, developer will have to keep main thread running otherwise application will
   * exit
   *
   * @param notConnectedService not connected instance of {@link MessagingService} returned from
   *                            builder
   * @param topicSubscription   topic subscription
   */
  public static void allAsyncConnectAndThenStartAndThenReceive(
      final MessagingService notConnectedService,
      final TopicSubscription topicSubscription) {

    final DirectMessageReceiver notStartedReceiver = notConnectedService
        .createDirectMessageReceiverBuilder()
        .withSubscriptions(topicSubscription)
        .build();

    // the message handler to be used once everything connects and starts
    final MessageHandler messageHandler = (message) -> {
      // do something with a message, i.e access raw payload:
    };

    // connect to the message service, start receiver after and finally receive messages
    // asynchronously using promise pattern
    final CompletionStage<Void> entireChain = notConnectedService.connectAsync()
        .whenComplete((messagingService, throwable) -> {
          if (throwable != null) {
            // This method can't prevent exception propagation.
            // Exception logging can be performed here,
            // or code can be placed here that releases some external resources.
            // IMPORTANT: when exception is occurred during connection creation, then
            // this exception is propagated over entire call chain, preventing  ALL another  calls
            // from execution  (receiver won't attempt to start, message listener won't be registered)
            // IMPORTANT: 'throwable' is of type java.util.concurrent.CompletionException, to get out nested exception use:
            final Throwable wrappedException = throwable.getCause();
            // wrappedException is very likely of type PubSubPlusClientException, use cast/type check for processing
          }
        }).thenCompose(messagingService -> {
          return notStartedReceiver.<DirectMessageReceiver>startAsync().whenComplete(
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
        }).thenAccept(messageReceiver -> {
          // and finally once connected to a messaging service after message receiver was started
          // start receiving messages asynchronously with a callback handler
          messageReceiver.receiveAsync(messageHandler);
        }).whenComplete((aVoid, throwable) -> {
          // This method can't prevent exception propagation.
          // It is possible that messageReceiver.receiveAsync(messageHandler) throws an exception,
          // so that it is important to process it.
          // unless some more calls on CompletionStage are chained, consider this one be the last stage
          // IMPORTANT: 'throwable' is of type java.util.concurrent.CompletionException, to get out the nested exception use:
          final Throwable wrappedException = throwable.getCause();
          // wrappedException is very likely of type PubSubPlusClientException, use cast/type check for processing
        });

  }

}
