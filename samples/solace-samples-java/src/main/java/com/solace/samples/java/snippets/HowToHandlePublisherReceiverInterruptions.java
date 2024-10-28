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

import com.solace.messaging.PubSubPlusClientException;
import com.solace.messaging.publisher.DirectMessagePublisher;
import com.solace.messaging.receiver.PersistentMessageReceiver;
import com.solace.messaging.util.LifecycleControl.TerminationNotificationListener;

/**
 * Sampler for handling of receiver and publisher interruption/termination cases
 */

public class HowToHandlePublisherReceiverInterruptions {

  /**
   * Example how to configure persistent receiver with a listener for notifications about
   * unsolicited interruptions/terminations
   *
   * @param receiver message receiver (can be started or not)
   */
  public static void configureTerminationNotificationListenerOnPersistentReceiver(
      PersistentMessageReceiver receiver) {

    final TerminationNotificationListener terminationNotificationListener = (terminationEvent) -> {
      final String message = terminationEvent.getMessage();
      final long timestamp = terminationEvent.getTimestamp();
      final PubSubPlusClientException e = terminationEvent.getCause();
    };

    receiver.setTerminationNotificationListener(terminationNotificationListener);
  }


  /**
   * Example how to configure direct receiver with a listener for notifications about unsolicited
   * interruptions
   *
   * @param receiver message receiver (can be started or not)
   */
  public static void configureTerminationNotificationListenerOnDirectReceiver(
      DirectMessagePublisher receiver) {

    final TerminationNotificationListener terminationNotificationListener = (terminationEvent) -> {
      final String message = terminationEvent.getMessage();
      final long timestamp = terminationEvent.getTimestamp();
      final PubSubPlusClientException e = terminationEvent.getCause();
    };

    receiver.setTerminationNotificationListener(terminationNotificationListener);
  }

}
