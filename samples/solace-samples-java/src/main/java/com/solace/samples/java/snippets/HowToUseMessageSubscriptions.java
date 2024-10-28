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
import com.solace.messaging.resources.TopicSubscription;

/**
 * Sampler for adding/removing subscriptions
 */
public class HowToUseMessageSubscriptions {

  /**
   * Example how to add topic subscriptions to direct message receiver at build time and/or later at
   * when it is already created
   *
   * @param service              connected instance of a messaging service, ready to be used
   * @param initialSubscription  topic subscription to be added at build time
   * @param anotherMessageSource topic subscription to be added after receiver is already created
   * @throws java.lang.InterruptedException when thread is interrupted
   */
  public static void addAnotherSubscription(MessagingService service,
      TopicSubscription initialSubscription,
      TopicSubscription anotherMessageSource) throws InterruptedException {

    final DirectMessageReceiver receiver = service
        .createDirectMessageReceiverBuilder().withSubscriptions(initialSubscription).build()
        .start();

    // any time later can subscribe to messages from a new message source
    receiver.addSubscription(anotherMessageSource);
  }

  /**
   * Example how to remove topic subscriptions
   *
   * @param service             connected instance of a messaging service, ready to be used
   * @param initialSubscription topic subscription to be removed
   * @throws java.lang.InterruptedException when thread is interrupted
   */
  public static void removeSubscription(MessagingService service,
      TopicSubscription initialSubscription) throws InterruptedException {

    final DirectMessageReceiver receiver = service
        .createDirectMessageReceiverBuilder().withSubscriptions(initialSubscription).build()
        .start();

    // any time later can un- subscribe from a message source
    receiver.removeSubscription(initialSubscription);
    // no more subscriptions
  }

  /**
   * Example how asynchronously to add topic subscriptions to direct message receiver at build time
   * and/or later at when it is already created
   *
   * @param service              connected instance of a messaging service, ready to be used
   * @param initialSubscription  topic subscription to be added at build time
   * @param anotherMessageSource topic subscription to be added asynchronously after receiver is
   *                             already created
   */
  public static void addSubscriptionAsynchronous(MessagingService service,
      TopicSubscription initialSubscription,
      TopicSubscription anotherMessageSource) {

    final DirectMessageReceiver receiver = service
        .createDirectMessageReceiverBuilder().withSubscriptions(initialSubscription).build();

    receiver.start();
    // 2. argument SubscriptionChangeListener us used to notify user about success of the operation
    receiver.addSubscriptionAsync(anotherMessageSource, ((topicSubscription, operation,
        exception) -> {
      // operation failed
      if (exception != null) {
        // do something about failed add/remove subscription operation:
        //  switch (operation){
        //    case ADDED: doWhenAddSubscriptionFailed(topicSubscription);
        //   case REMOVED:doWhenRemoveSubscriptionFailed(topicSubscription);
      }

      // operation finished successfully
      else {
        // do something:
        //  switch (operation){
        //    case ADDED: doWhenSubscriptionAdded(topicSubscription);
        //   case REMOVED:doWhenSubscriptionRemoved(topicSubscription);
      }
    }
    ));

  }

}
