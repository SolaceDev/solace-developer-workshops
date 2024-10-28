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
import com.solace.messaging.MessagingServiceClientBuilder;
import com.solace.messaging.config.SolaceProperties;
import com.solace.messaging.config.profile.ConfigurationProfile;

import java.util.Properties;

/** Sampler for enabling payload compression. */
public class HowToEnablePayloadCompression {
  /**
   * Example of how to configure payload compression for a service that is connected to a broker
   * running on localhost on port 55555.
   *
   * @param compressionLevel A compression level the range 0-9.
   *     <p>Value meanings:
   *     <ul>
   *       <li>0 - disable payload compression (the default)
   *       <li>1 - least amount of compression and fastest data throughput
   *       <li>9 - most compression and slowest data throughput
   *     </ul>
   *
   * @return a {@code MessagingService} instance connected to localhost:55555 with payload
   *     compression level set to the given value.
   * @see SolaceProperties.ServiceProperties#PAYLOAD_COMPRESSION_LEVEL
   * @see MessagingServiceClientBuilder#fromProperties(Properties)
   */
  public static MessagingService configurePayloadCompressionOnLocalHost(int compressionLevel) {
    Properties properties = new Properties();
    properties.setProperty(
        SolaceProperties.ServiceProperties.PAYLOAD_COMPRESSION_LEVEL,
        String.valueOf(compressionLevel));

    return MessagingService.builder(ConfigurationProfile.V1)
        .local() /* To connect to a broker located elsewhere remove this line and see HowToConfigureServiceAccessWithProperties. */
        .fromProperties(properties)
        .build()
        .connect();
  }
}
