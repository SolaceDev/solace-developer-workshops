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
import com.solace.messaging.PubSubPlusClientException.PublisherOverflowException;
import com.solace.messaging.publisher.DirectMessagePublisher;
import com.solace.messaging.publisher.MessagePublisher;
import com.solace.messaging.publisher.PublisherHealthCheck.PublisherReadinessListener;
import com.solace.messaging.receiver.DirectMessageReceiver;
import com.solace.messaging.receiver.PersistentMessageReceiver;
import com.solace.messaging.resources.Topic;
import com.solace.messaging.resources.TopicSubscription;
import java.util.concurrent.locks.StampedLock;

public class HowToUseBackPressureFeatures {

  /**
   * Showcase for API to receive messages with back-pressure, it is possible to pause and resume
   * message passing for persistent receiver only
   *
   * @param receiver ready configured and connected receiver
   */
  public static void backPressureOnReceive(final PersistentMessageReceiver receiver) {

    final byte[] messagePayload = receiver.receiveMessage().getPayloadAsBytes();

    // API is asked to pause to call MessageHandler with any new messages,
    // client signals this way to API that it can't process any new incoming message at the moment
    receiver.pause();

    // undo pause
    receiver.resume();

    // receiver is terminated, terminated receiver can't receive any messages and it
    // can't be reversed
    // 10 sec grace period
    final long gracePeriod = 10_000L;
    receiver.terminate(gracePeriod);

  }


  /**
   * Showcase for API to publish with capacity bonded buffered back-pressure; when app keeps
   * publishing publish method will throw 'PublisherOverflowException'.
   *
   * @param service       ready configured and connected service instance
   * @param toDestination destination for message publisher
   */
  public static void noBackPressurePublishWithBruteForce(MessagingService service,
      Topic toDestination) {

    int capacity = 1000;
    // no secondary buffer, fail fast,
    final DirectMessagePublisher messagePublisher = service.createDirectMessagePublisherBuilder()
        .onBackPressureReject(1000)
        .build().start();

    // No listener for readiness/check or blocking check if ready, when app keeps publishing
    // publish method will throw 'PublisherOverflowException',
    // and it will throw this exception on each subsequent publish until overflow clears.
    // Application may decide to pause for some time with a publishing attempts
    // in this case and later try again.
    boolean someConditionIsTrue = true;
    while (someConditionIsTrue) {
      try {
        messagePublisher.publish("can't send over capacity", toDestination);
      } catch (PublisherOverflowException e) {
        // do some work, may signal down the pipe to slow down.
        // block or sleep or keep trying
      }
    }
  }

  /**
   * Showcase for API to publish with unlimited buffer on back-pressure. Usage of unlimited buffer
   * can lead to out of memory exception in some situations, and the app will crash. It is suited
   * for microservices managed by some kind of orchestration platform like kubernetes capable to
   * recreate/restart microservice instances
   *
   * @param service       ready configured and connected service instance
   * @param toDestination destination for message publisher
   */
  public static void backPressureUnlimitedBufferPublishWithOutOfMemoryRisk(
      MessagingService service, Topic toDestination) {

    // unlimited buffer, fails when out of memory only,
    // suited for microservice use cases where i.e kubernetes recreates service instance
    final DirectMessagePublisher messagePublisher = service.createDirectMessagePublisherBuilder()
        .onBackPressureElastic()
        .build().start();

    // No listener for readiness/check if ready, app can keep publishing
    // unlimited till out of memory
    boolean someConditionIsTrue = true;
    while (someConditionIsTrue) {
      messagePublisher.publish("can't send over capacity", toDestination);
    }
  }

  /**
   * Showcase for API to publish with back-pressure (fix size buffer).  Uses explicit
   * synchronization to ensure that 'ready' event is issued always after exception handling on
   * message 'publish' is processed
   * <p>Suitable for monolithic single thread publisher where publishing performance is less a
   * concern
   * <p>Usage of classic synchronization has vew limitations:
   * <p>  1) deadlock can occur when synchronization used not appropriate
   * <p>  2) calls to 'publish' and 'ready' will be executed sequentially,
   * <p>     no more concurrent publishing can be expected
   * <p>  3) threads for concurrent 'publish' or 'ready' going to be suspended/blocked for the
   * <p>     duration of the operation, caution is advised when pulled threads are used to publish
   *
   * @param service       ready configured and connected service instance
   * @param toDestination destination for message publisher
   */
  public static void backPressureFixBufferSizeBlockingClassicSynchronizedPublish(
      MessagingService service, Topic toDestination) {

    final Object[] lock = new Object[0];

    // secondary buffer size 1000, throw exception when buffer full, fail fast
    final DirectMessagePublisher messagePublisher = service.createDirectMessagePublisherBuilder()
        .onBackPressureReject(1000)
        .build().start();

    final PublisherReadinessListener canPublishListener = new PublisherReadinessListener() {
      @Override
      public void ready() {
        synchronized (lock) {
          // perform resume logic,
          // "ready" is always executes after publish + exception handling if any happened
          // due to synchronization
        }
      }


    };
    // register listener, usually set once
    messagePublisher.setPublisherReadinessListener(canPublishListener);

    boolean someConditionIsTrue = true;
    while (someConditionIsTrue) {
      // prepare/process some data prior to publish message...

      synchronized (lock) {
        try {
          // publish message
          messagePublisher.publish("can't send over capacity", toDestination);
        } catch (PublisherOverflowException e) {
          // do some work; may signal down the pipe to slow down.

        }
      }
    }
  }

  /**
   * Simplified showcase for API to publish with back-pressure (fix size buffer) using lightweight
   * StampedLock, semi-non blocking
   *
   * @param service       ready configured and connected service instance
   * @param toDestination destination for message publisher
   * @param stampedLock   for locking
   */
  public static void backPressureFixBufferSizeJava8StampedLockSemiNonBlockingPublish
  (MessagingService service, Topic toDestination, final StampedLock stampedLock) {

    // secondary buffer size 1000, throw exception when buffer full, fail fast
    final DirectMessagePublisher messagePublisher = service.createDirectMessagePublisherBuilder()
        .onBackPressureReject(1000)
        .build().start();

    final PublisherReadinessListener canPublishListener = new PublisherReadinessListener() {
      @Override
      public void ready() {
        final long stamp = stampedLock.readLock();
        try {
          // PERFORM RESUME LOGIC HERE,
          // "ready" is always executes after publish + exception handling if any happened
        } finally {
          stampedLock.unlockRead(stamp);
        }
      }


    };
    // register listener, usually set once
    messagePublisher.setPublisherReadinessListener(canPublishListener);

    boolean someConditionIsTrue = true;
    while (someConditionIsTrue) {
      long stamp = stampedLock.readLock();
      // prepare/process some data prior to publish message...

      try {
        // publish message
        messagePublisher.publish("can't send over capacity", toDestination);
      } catch (PublisherOverflowException e) {
        //making sure that no another thread can run after
        final long writeStamp = stampedLock.tryConvertToWriteLock(stamp);
        if (writeStamp == 0) {
          //another thread is already doing same operation and holds write lock,
          // have to give up on a read lock
          stampedLock.unlockRead(stamp);
          // requesting a new write lock, blocking if necessary until available
          // consider using tryWriteLock(timeout)
          stamp = stampedLock.writeLock();
        } else {
          stamp = writeStamp;
        }
        // DO HERE some work for exception handling; may signal down the pipe to slow down.

      } finally {
        stampedLock.unlock(stamp);
      }

    }
  }

  /**
   * Showcase for API to publish with fix size buffer on back-pressure. To ensure that 'ready' event
   * is issued always after exception handling on message 'publish' is processed API uses {@link
   * MessagePublisher#notifyWhenReady()} nonblocking hint.
   *
   * @param service       ready configured and connected service instance
   * @param toDestination destination for message publisher
   */
  public static void backPressureNonBlockingPublishWithResumeNotification(MessagingService service,
      Topic toDestination) {

    // secondary buffer size 1000, throw exception when buffer full, fail fast
    final DirectMessagePublisher messagePublisher = service.createDirectMessagePublisherBuilder()
        .onBackPressureReject(1000)
        .build().start();

    final PublisherReadinessListener canPublishListener = () -> {
      // perform resume logic,
      // "ready" method is always executes after publish + exception handling if any happened,
      // due to notifyWhenReady() call on finally
    };

    // register listener, usually set once
    messagePublisher.setPublisherReadinessListener(canPublishListener);

    boolean someConditionIsTrue = true;
    while (someConditionIsTrue) {
      boolean exitExceptionally = false;
      try {
        // and then publish message
        messagePublisher.publish("can't send over capacity", toDestination);
      } catch (PublisherOverflowException overflowException) {
        // do some work in case of overflow; may signal down the pipe to slow down ..
        exitExceptionally = true;
      } catch (PubSubPlusClientException exception) {
        // do some work based on exception
        // may also call exitExceptionally = true;
      } finally {
        if (exitExceptionally) {
          // notifies when publishing will be possible or one more time immediately if it is already the case
          messagePublisher.notifyWhenReady();
        }
      }

    }
  }

  /**
   * Showcase for API how to create {@link DirectMessageReceiver} with unlimited message buffering
   * capabilities.
   * <p> Usage of this strategy can lead to out of memory situation and application
   * could crash. This strategy can be useful for microservices which are running in a managed
   * environment that can detect crashes and perform restarts of a microservices.
   *
   * @param service ready configured and connected service instance
   * @return new instance of the message receiver
   */
  public static DirectMessageReceiver backPressureElasticBufferOnDirectMessageReceiver(
      MessagingService service) {

    final DirectMessageReceiver receiver = service
        .createDirectMessageReceiverBuilder()
        .onBackPressureElastic()
        .withSubscriptions(TopicSubscription.of("setSubscriptionExpressionHere"))
        .build();
    return receiver;
  }

  /**
   * Showcase for API how to create {@link DirectMessageReceiver} with capacity based message
   * buffering capabilities. It can be useful for slow message consumer.
   * <p>When specified capacity is exceeded then older messages will be discarded. Discard
   * indication may be enabled on a next pulled message to indicate message loss.
   *
   * @param service        ready configured and connected service instance
   * @param bufferCapacity max buffer capacity
   * @return new instance of the message receiver
   */
  public static DirectMessageReceiver backPressureBufferCapacityOnDirectMessageReceiver(
      MessagingService service, int bufferCapacity) {

    final DirectMessageReceiver receiver = service
        .createDirectMessageReceiverBuilder()
        .onBackPressureDropOldest(bufferCapacity)
        .withSubscriptions(TopicSubscription.of("setSubscriptionExpressionHere"))
        .build();
    return receiver;
  }


}

