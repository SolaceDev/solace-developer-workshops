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
import com.solace.messaging.MessagingService.ReconnectionAttemptListener;
import com.solace.messaging.MessagingService.ReconnectionListener;
import com.solace.messaging.MessagingService.ServiceInterruptionListener;
import com.solace.messaging.PubSubPlusClientException;
import com.solace.messaging.config.ReceiverActivationPassivationConfiguration.ReceiverStateChangeListener;
import com.solace.messaging.config.ReceiverActivationPassivationConfiguration.ReceiverStateChangeListener.ReceiverState;
import com.solace.messaging.config.profile.ConfigurationProfile;
import com.solace.messaging.publisher.DirectMessagePublisher;
import com.solace.messaging.publisher.DirectMessagePublisher.PublishFailureListener;
import com.solace.messaging.receiver.DirectMessageReceiver;
import com.solace.messaging.receiver.MessageReceiver.ReceiveFailureListener;
import com.solace.messaging.receiver.PersistentMessageReceiver;
import com.solace.messaging.resources.Queue;

/**
 * Sampler for handling of service interruptions and errors
 */
public class HowToHandleServiceInterruptionsAndFailures {

  /**
   * Example how to configure service access to receive TCP reconnection notifications
   *
   * @return configured instance of a messaging service
   */
  public static MessagingService notifyAboutTcpReconnection() {

    // listens for TCP level reconnection
    final ReconnectionListener onReconnection = (e) -> {
      // each successful reconnection can be intercepted
      final long whenItHappened = e.getTimestamp();
      final String uri = e.getBrokerURI();
      final PubSubPlusClientException causeIfAny = e.getCause();
    };
    final MessagingService messagingService = MessagingService.builder(ConfigurationProfile.V1)
        .local().build();
    messagingService.addReconnectionListener(onReconnection);

    final ReconnectionAttemptListener onReconnectionAttempt = (e) -> {
      // each reconnection attempt can be intercepted
      final long whenItHappened = e.getTimestamp();
      final String uri = e.getBrokerURI();
      final PubSubPlusClientException causeIfAny = e.getCause();
    };
    messagingService.addReconnectionAttemptListener(onReconnectionAttempt);

    return messagingService;

  }

  /**
   * Example how to configure service access to receive notifications about unrecoverable
   * interruption
   *
   * @return configured instance of a messaging service
   */
  public static MessagingService notifyAboutServiceAccessUnrecoverableInterruption() {
    final MessagingService messagingService = MessagingService.builder(ConfigurationProfile.V1)
        .local().build();

    final ServiceInterruptionListener serviceInterruptionListener = (serviceInterruptionEvent) -> {
      // process service interruption notification using error information and broker url
    };

    messagingService.addServiceInterruptionListener(serviceInterruptionListener);

    return messagingService;
  }


  /**
   * Example how to configure service access to receive notifications about passivation or
   * activation of a exclusive persistent receiver instance
   *
   * @param queueToConsumeFrom queue for exclusive access for message consumption
   */
  public static void notifyWhenExclusivePersistentReceiverActivatedPassivated(
      Queue queueToConsumeFrom) {
    // Only exclusive receiver can be activated or passivated
    // When passivated NO more messages for unpredictable amount of time are
    // expected to flow to a given receiver. Usually when one receiver instance (microservice)
    // is passivated another is activated and starts to receive messages
    // Passivated instance may decide to close some expensive connection for example

    final MessagingService service = MessagingService.builder(ConfigurationProfile.V1)
        .local().build("myApp").connect();
    // when application is consuming in exclusive mode ReceiverStateChangeListener is be provided
    final ReceiverStateChangeListener passivationActivationListener = (oldState, newState, time) -> {
      if (ReceiverState.ACTIVE.equals(newState)) {
        // consumer instance just activated
        // expect messages to flow again
      } else {
        // consumer instance just passivated
        // do not expect any messages until activated back
      }
    };

    final PersistentMessageReceiver receiver = service
        .createPersistentMessageReceiverBuilder()
        // activation passivation is enabled, but listener can also be omitted/it is optional
        .withActivationPassivationSupport(passivationActivationListener)
        .build(queueToConsumeFrom)
        .start();

  }


  /**
   * Example how to configure direct message publisher to receive notifications about publish
   * failures
   *
   * @param service connected instance of a messaging service, ready to be used
   */
  public static void notifyOnDirectPublisherFailures(MessagingService service) {

    final DirectMessagePublisher messagePublisher = service.createDirectMessagePublisherBuilder()
        .build().start();
    final PublishFailureListener publishFailureListener = (failedPublishEvent) -> {
      // process failed publish notification using message, message destination, exception and timestamp ...
    };
    messagePublisher.setPublishFailureListener(publishFailureListener);
  }

  /**
   * Example how to configure direct message receiver to receive notifications about receipt
   * failures
   *
   * @param service connected instance of a messaging service, ready to be used
   */
  public static void notifyOnDirectReceiverFailures(MessagingService service) {

    final DirectMessageReceiver messageReceiver = service.createDirectMessageReceiverBuilder()
        .build().start();
    final ReceiveFailureListener publishFailureListener = (failedPublishEvent) -> {
      // process failures on receive using exception and timestamp ...
    };
    messageReceiver.setReceiveFailureListener(publishFailureListener);
  }

}
