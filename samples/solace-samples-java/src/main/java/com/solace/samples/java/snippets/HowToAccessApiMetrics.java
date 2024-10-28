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
import com.solace.messaging.util.Manageable.ApiMetrics;
import com.solace.messaging.util.Manageable.ApiMetrics.Metric;

/**
 * Sampler for usage of API metrics
 */
public class HowToAccessApiMetrics {

  /**
   * Example how to access individual API metrics using messaging service instance
   *
   * @param service connected instance of a messaging service, ready to be used
   */
  public static void accessIndividualApiMetrics(MessagingService service) {

    final ApiMetrics metrics = service.metrics();
    // Metric enum gives access to variety of metrics
    metrics.getValue(Metric.DIRECT_MESSAGES_SENT);
  }


  /**
   * Example how to reset API metrics using messaging service instance
   *
   * @param service connected instance of a messaging service, ready to be used
   */
  public static void resetApiMetrics(MessagingService service) {

    final ApiMetrics metrics = service.metrics();
    // resets all collected metrics since last reset/start
    metrics.reset();
  }

  /**
   * Example how to get String representation of all current API metrics using messaging service
   * instance
   *
   * @param service connected instance of a messaging service, ready to be used
   */
  public static void toStringApiMetrics(MessagingService service) {

    final ApiMetrics metrics = service.metrics();
    // line separated view on all metrics
    String s = metrics.toString();
  }

}
