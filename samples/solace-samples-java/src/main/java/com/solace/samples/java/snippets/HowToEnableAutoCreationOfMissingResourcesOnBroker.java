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
import com.solace.messaging.config.MissingResourcesCreationConfiguration.MissingResourcesCreationStrategy;
import com.solace.messaging.receiver.InboundMessage;
import com.solace.messaging.receiver.PersistentMessageReceiver;
import com.solace.messaging.resources.Queue;

/**
 * This example demonstrates a feature for enabling of automatic missing resources (queue) creation
 * on a broker. When this feature is enabled it does not warranties resource creation; it enables an
 * attempt to create missing resource. This feature is NOT recommended for production, where ALL
 * broker resources are created from an administrator. Default value is {@link
 * MissingResourcesCreationStrategy#DO_NOT_CREATE}.
 */
public class HowToEnableAutoCreationOfMissingResourcesOnBroker {


  public static void enableAutoCreationOfMissingResources(MessagingService service,
      Queue queueToConsumeFromThatNotSetupYet) {

    final PersistentMessageReceiver receiver = service
        .createPersistentMessageReceiverBuilder()
        .withMissingResourcesCreationStrategy(
            MissingResourcesCreationStrategy.CREATE_ON_START)
        .build(queueToConsumeFromThatNotSetupYet)
        // when receiver is being started,
        // API will attempt to create queue when missing.
        // When attempt fails (i.e due to lack of permissions for example)
        // PubSubPlusClientException is thrown
        .start();

    // receive as usual, blocking waiting on a next message routed to the newly created queue
    final InboundMessage message = receiver.receiveMessage();

    //any time later can do ack so long receiver did not closed
    receiver.ack(message);

  }

}

