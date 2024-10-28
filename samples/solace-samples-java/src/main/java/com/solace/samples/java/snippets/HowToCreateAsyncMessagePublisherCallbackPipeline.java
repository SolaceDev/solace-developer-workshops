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
import com.solace.messaging.util.CompletionListener;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/**
 * Sampler for callback based pipeline for publishing messages.
 */
public class HowToCreateAsyncMessagePublisherCallbackPipeline {

  /**
   * Example how to connect to a broker, start direct message publisher, publish messages for some
   * time by pulling them from a blocking queue, asynchronously using callbacks. Later when
   * publishing activity is interrupted using so called 'poisonous message', termination of the
   * publisher and disconnection from a messaging service are performed.
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
   *                                           long running iterative message publishing activities
   *                                           and stop/disconnect operations This activity may run
   *                                           literally forever, so that dedicated thread pool with
   *                                           one thread is required.
   */
  public static void allAsyncConnectStartPublishTeardownDisconnect(
      final MessagingService notConnectedService,
      final Topic messageDestination,
      final BlockingQueue<? extends OutboundMessage> blockingQueueWithMessages,
      final OutboundMessage poisonMessage,
      final ExecutorService executorForForeverRunningPublisher) {

    final DirectMessagePublisher notStartedDirectMessagePublisher = notConnectedService
        .createDirectMessagePublisherBuilder().build();

    // executed on a thread of 'executorForForeverRunningPublisher'
    final CompletionListener<Void> onFinishedStopServiceTask = (publisherToBeStopped, throwable) -> {
      // do something when task of service disconnection is finished
    };

    // executed on a thread of 'executorForForeverRunningPublisher'
    final CompletionListener<Void> stopServiceTask = (publisherToBeStopped, throwable) -> {
      final MessagingService toBeDisconnectedService = notConnectedService;
      // simplified way, just disconnect service always, exception handling omitted
      toBeDisconnectedService.disconnectAsync(onFinishedStopServiceTask);
    };

    // executed on a thread of 'executorForForeverRunningPublisher'
    final CompletionListener<DirectMessagePublisher> terminatePublisherTask = (publisherToBeStopped, throwable) -> {
      try {
        // 10 sec grace period
        final long gracePeriod = 10_000L;
        // simplified way, just terminate publisher always
        publisherToBeStopped.terminateAsync(stopServiceTask, gracePeriod);
      } catch (Exception e) {
        // just terminate publisher when exception
        stopServiceTask.onCompletion(null, e);
      }
    };

    final CompletionListener<DirectMessagePublisher> publishMessagesTask = (startedPublisher, throwable) -> {
      if (throwable == null) {
        // deal with an exception during start
      } else {
        // started successfully, can publish
        final Future<?> future = executorForForeverRunningPublisher.submit(
            () -> {

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
                // terminate publisher, all done
                terminatePublisherTask.onCompletion(startedPublisher, null);
              } catch (Exception e) {
                // terminate publisher, all done
                terminatePublisherTask.onCompletion(startedPublisher, e);
              } finally {
                if (interrupted) {
                  Thread.currentThread().interrupt();
                }
              }
            });

      }
    };

    final CompletionListener<MessagingService> startPublisherTask = (connectedService, throwable) -> {
      if (throwable == null) {
        // deal with an exception during connection
      } else {
        // begin message publishing when publisher started
        notStartedDirectMessagePublisher.startAsync(publishMessagesTask);
      }

    };

    // start publisher when connected, here is everything begins
    notConnectedService.connectAsync(startPublisherTask);

  }

}
