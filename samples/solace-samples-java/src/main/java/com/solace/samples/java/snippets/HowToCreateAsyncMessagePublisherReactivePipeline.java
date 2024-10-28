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
import com.solace.messaging.publisher.DirectMessagePublisher;
import com.solace.messaging.publisher.OutboundMessage;
import com.solace.messaging.resources.Topic;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Sampler for fluent promise pattern/reactive API for publishing messages.
 */
public class HowToCreateAsyncMessagePublisherReactivePipeline {

  /**
   * Example how to connect to a broker, start direct message publisher, publish messages for some
   * time by pulling them from a blocking queue, asynchronously. Later when publishing activity is
   * interrupted using so called 'poisonous message', termination of the publisher and disconnection
   * from a messaging service are performed.
   * <p>Note: The main application thread needs to continue to run for entire time, otherwise
   * application will exit before anything is complete/executed.
   *
   * @param notConnectedService                not connected instance of {@link MessagingService}
   *                                           returned from builder
   * @param messageDestination                 message destination for the publisher
   * @param blockingQueueWithMessages          a blocking queue which holds messages for future
   *                                           publishing,
   * @param poisonMessage                      message that terminates publishing loop
   * @param executorForForeverRunningPublisher Executor service for asynchronous execution of a very
   *                                           long running iterative message publishing activities.
   *                                           This activity may run literally forever, so that
   *                                           dedicated thread pool with one thread is required.
   */
  public static void allAsyncConnectStartPublishTeardownDisconnect(
      final MessagingService notConnectedService,
      final Topic messageDestination,
      final BlockingQueue<? extends OutboundMessage> blockingQueueWithMessages,
      final OutboundMessage poisonMessage,
      final ExecutorService executorForForeverRunningPublisher) {

    final DirectMessagePublisher notStartedDirectMessagePublisher = notConnectedService
        .createDirectMessagePublisherBuilder().build();

    // connect to the message service, start publisher after and finally publish messages
    // asynchronously using promise pattern
    final CompletionStage<Void> entireChain = notConnectedService.connectAsync()
        .whenComplete((messagingService, throwable) -> {
          if (throwable != null) {
            // This method can't prevent exception propagation.
            // Exception logging can be performed here,
            // or code can be placed here that releases some external resources.
            // IMPORTANT: when exception is occurred during connection creation, then
            // this exception is propagated over entire call chain, preventing  ALL another  calls
            // from execution  (publisher won't attempt to start, message listener won't be registered)
            // IMPORTANT: 'throwable' is of type java.util.concurrent.CompletionException,
            // to get out nested exception use:
            final Throwable wrappedException = throwable.getCause();
            // wrappedException is very likely of type PubSubPlusClientException,
            // use cast/type check for processing
          }
        }).thenCompose(whenConnectedMessagingService -> {
          // starts direct message publisher asynchronously
          // and executes some code in case an exception occurred
          return notStartedDirectMessagePublisher.<DirectMessagePublisher>startAsync().whenComplete(
              (directMessagePublisher, throwable) -> {
                // for exception handling
                if (throwable != null) {

                  // This method can't prevent exception propagation.
                  // Exception logging can be performed here,
                  // or code can be placed here that releases some external resources or disconnect from a messaging service.
                  // IMPORTANT: when exception is occurred during publisher start, then
                  // this exception is propagated over entire call chain, preventing  ALL another  calls
                  // from execution  (message listener won't be registered, since message publisher failed to start)
                  // IMPORTANT: 'throwable' is of type java.util.concurrent.CompletionException, to get out the nested exception use:
                  final Throwable wrappedException = throwable.getCause();
                  // wrappedException is very likely of type PubSubPlusClientException, use cast/type check for processing
                }
              }
          );
        }).thenCompose(startedPublisher -> {
          return CompletableFuture.runAsync(() -> {
            // and finally once connected to a messaging service after message publisher was started

            // start publishing messages asynchronously
            boolean interrupted = false;
            try {
              while (true) {
                try {
                  final OutboundMessage nextMessage = blockingQueueWithMessages
                      .poll(1L, TimeUnit.SECONDS);
                  if (poisonMessage == null) {
                    continue;
                  }
                  // keep publishing until so called 'poisonous message for loop interruption'
                  // is received
                  if (poisonMessage.equals(nextMessage)) {
                    break;
                  }
                  startedPublisher.publish(nextMessage, messageDestination);
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

          }, executorForForeverRunningPublisher);
        })
        .exceptionally((throwable) -> {
          // 'exceptionally' block required to process and swallow an exception from previous stage (publishing)
          // otherwise closing of publisher and messaging service will not be executed
          // IMPORTANT: 'throwable' is of type java.util.concurrent.CompletionException, to get out the nested exception use:
          final Throwable wrappedException = throwable.getCause();
          // wrappedException is very likely of type PubSubPlusClientException, use cast/type check for processing
          return null;
        })
        // Once publishing activities stage is finished (loop is is interrupted),
        // then async termination of publisher is triggered
        .thenCompose((aVoid) -> {
              final DirectMessagePublisher publisherToBeTerminated = notStartedDirectMessagePublisher;
              // 10 sec grace period
              final long gracePeriod = 10_000L;
              return publisherToBeTerminated.terminateAsync(gracePeriod);
            }
        ).exceptionally((throwable) -> {
          // 'exceptionally' block required to process and swallow an exception from previous stage (publishing)
          // otherwise stopping of messaging service will not be executed
          // IMPORTANT: 'throwable' is of type java.util.concurrent.CompletionException, to get out the nested exception use:
          final Throwable wrappedException = throwable.getCause();
          // wrappedException is very likely of type PubSubPlusClientException, use cast/type check for processing
          return null;
        })
        .thenCompose((aVoid) -> {
              // perform async disconnection from a service at the end
              final MessagingService service = notConnectedService;
              return service.disconnectAsync();
            }
        ).exceptionally((throwable) -> {
          // 'exceptionally' block can be used to process and swallow an exception from previous stage (closing publisher);
          // Alternative to 'exceptionally' here also 'whenComplete' method can be used
          // IMPORTANT: 'throwable' is of type java.util.concurrent.CompletionException, to get out the nested exception use:
          final Throwable wrappedException = throwable.getCause();
          // wrappedException is very likely of type PubSubPlusClientException, use cast/type check for processing
          return null;
        });
  }

}
