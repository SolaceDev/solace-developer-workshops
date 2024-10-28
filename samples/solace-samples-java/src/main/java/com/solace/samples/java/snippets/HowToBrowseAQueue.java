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
import com.solace.messaging.receiver.InboundMessage;
import com.solace.messaging.receiver.MessageQueueBrowser;
import com.solace.messaging.resources.Queue;
 
public class HowToBrowseAQueue {
 
  public static void startMessageQueueBrowser(MessagingService service, Queue queueToBrowse) {
    final MessageQueueBrowser receiver = service
        .createMessageQueueBrowserBuilder().build(queueToBrowse).start();
  }
 
  public static void browseQueue(MessagingService service,
      Queue queueToBrowse, long timeout) {
    final MessageQueueBrowser browser = service
        .createMessageQueueBrowserBuilder().build(queueToBrowse).start();
 
    final InboundMessage message = browser.receiveMessage(timeout);
 
  }
 
  public static void browseAndRemoveFromQueue(MessagingService service,
      Queue queueToBrowse, long timeout) {
    final MessageQueueBrowser browser = service
        .createMessageQueueBrowserBuilder().build(queueToBrowse).start();
 
    final InboundMessage message = browser.receiveMessage(timeout);
    // message can be requested for removal from a queue
    browser.remove(message);
 
  }
 
  public static void browseQueueUsingMessageSelector(MessagingService service,
      Queue queueToBrowse, long timeout) {
    final String filterSelectorExpression = "myMessageProperty01 = 'someValue' AND myMessageProperty02 = 'someValue'";
    final MessageQueueBrowser browser = service
        .createMessageQueueBrowserBuilder().withMessageSelector(filterSelectorExpression)
        .build(queueToBrowse).start();
 
    // ONLY messages with matching message properties from a selector expression will be received
    final InboundMessage message = browser.receiveMessage(timeout);
 
  }
 
}
