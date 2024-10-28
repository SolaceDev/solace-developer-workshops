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
import com.solace.messaging.config.RetryStrategy;
import com.solace.messaging.config.SolaceProperties.TransportLayerProperties;
import com.solace.messaging.config.profile.ConfigurationProfile;
import java.util.Properties;

/**
 * Sampler for messaging service access to a broker, connection/reconnection retries configuration
 */
public class HowToConfigureServiceConnectionReconnectionRetries {

  /**
   * Example how to configure never to retry on failed connection programmatically
   *
   * @return connected instance of a messaging service, ready to be used
   */
  public static MessagingService neverRetryOnFailedConnectionProgrammatically() {

    return MessagingService.builder(ConfigurationProfile.V1).withConnectionRetryStrategy(
        RetryStrategy.neverRetry()).build().connect();
  }

  /**
   * Example how to configure forever retries on failed connection programmatically
   *
   * @param retryInterval user defined retry interval iin milliseconds
   * @return connected instance of a messaging service, ready to be used
   */
  public static MessagingService foreverRetryOnFailedConnectionProgrammatically(int retryInterval) {

    return MessagingService.builder(ConfigurationProfile.V1).withConnectionRetryStrategy(
        RetryStrategy.foreverRetry(retryInterval)).build().connect();
  }

  /**
   * Example how to configure retries on failed connection programmatically with user defined
   * values
   *
   * @param retries       number of retries
   * @param retryInterval user defined retry interval iin milliseconds
   * @return connected instance of a messaging service, ready to be used
   */
  public static MessagingService parametrizedRetryOnFailedConnectionProgrammatically(int retries,
      int retryInterval) {

    return MessagingService.builder(ConfigurationProfile.V1).withConnectionRetryStrategy(
        RetryStrategy.parametrizedRetry(retries, retryInterval)).build().connect();
  }

  /**
   * Example how to configure newer to retry on failed reconnection programmatically
   *
   * @return connected instance of a messaging service, ready to be used
   */
  public static MessagingService newerRetryOnFailedReconnectionProgrammatically() {

    return MessagingService.builder(ConfigurationProfile.V1).withReconnectionRetryStrategy(
        RetryStrategy.neverRetry()).build().connect();
  }

  /**
   * Example how to configure forever retries on failed reconnection programmatically
   *
   * @param retryInterval user defined retry interval iin milliseconds
   * @return connected instance of a messaging service, ready to be used
   */
  public static MessagingService foreverRetryOnFailedReconnectionProgrammatically(
      int retryInterval) {

    return MessagingService.builder(ConfigurationProfile.V1).withReconnectionRetryStrategy(
        RetryStrategy.foreverRetry(retryInterval)).build().connect();
  }

  /**
   * Example how to configure retries on failed reconnection programmatically with user defined
   * values
   *
   * @param retries       number of retries
   * @param retryInterval user defined retry interval iin milliseconds
   * @return connected instance of a messaging service, ready to be used
   */
  public static MessagingService parametrizedRetryOnFailedReconnectionProgrammatically(int retries,
      int retryInterval) {

    return MessagingService.builder(ConfigurationProfile.V1).withReconnectionRetryStrategy(
        RetryStrategy.parametrizedRetry(retries, retryInterval)).build().connect();
  }

  /**
   * Example how to configure retries on failed connection using properties with user defined
   * values
   *
   * @param serviceConfiguration configuration properties
   * @return connected instance of a messaging service, ready to be used
   */
  public static MessagingService parametrizedRetryOnFailedConnectionUsingProperties(
      Properties serviceConfiguration) {

    // retry 5 times when connection attempt to a broker failed
    serviceConfiguration.setProperty(TransportLayerProperties.CONNECTION_RETRIES,
        "5");

    //30 sec interval
    serviceConfiguration.setProperty(TransportLayerProperties.RECONNECTION_ATTEMPTS_WAIT_INTERVAL,
        "30000");

    return MessagingService.builder(ConfigurationProfile.V1).fromProperties(serviceConfiguration)
        .build().connect();
  }

}
