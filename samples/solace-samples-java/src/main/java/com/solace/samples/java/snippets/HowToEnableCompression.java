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
import com.solace.messaging.config.profile.ConfigurationProfile;

/**
 * Sampler for messaging service access configuration with message compression.
 * <p>Solace PubSub+ allows client applications connected to an event broker to send and receive
 * compressed message data.
 * <p>By default, the event broker listens for non-compressed connections on TCP port 55555,
 * compressed connections on TCP port 55003, and compressed and encrypted connections on TCP port
 * 55443
 */
public class HowToEnableCompression {


  /**
   * Example how to configure message compression for a service access to the broker running on a
   * localhost. To be used for testing only.
   * <p>For compressed connections on TCP port 55003 is used by default
   *
   * @param compressionFactor A compression factor in a valid range of 1-9 controls the ZLIB
   *                          compression level. The value 1 gives best speed, 9 gives best
   *                          compression.  Note: If using compression on a session, the configured
   *                          KeepAlive interval should be longer than the maximum time required to
   *                          compress the largest message likely ever to be published to prevent
   *                          service disconnections.
   * @return connected instance of a messaging service, ready to be used
   */
  public static MessagingService configureMessageCompressionOnLocalHost(int compressionFactor) {
    return MessagingService.builder(ConfigurationProfile.V1)
        .withMessageCompression(compressionFactor).local(55003)
        .build().connect();
  }

  /**
   * Example how to configure message compression for a service access to the broker running on a
   * localhost over tls/ssl. To be used for testing only.
   * <p>For compressed connections on TCP port with TLS 55443 is used by default
   *
   * @param compressionFactor A compression factor in a valid range of 1-9 controls the ZLIB
   *                          compression level. The value 1 gives best speed, 9 gives best
   *                          compression.  Note: If using compression on a session, the configured
   *                          KeepAlive interval should be longer than the maximum time required to
   *                          compress the largest message likely ever to be published to prevent
   *                          service disconnections.
   * @return connected instance of a messaging service, ready to be used
   */
  public static MessagingService configureMessageCompressionOnLocalHostWithTls(
      int compressionFactor) {
    return MessagingService.builder(ConfigurationProfile.V1)
        .withMessageCompression(compressionFactor).localTLS(55443)
        .build().connect();
  }


}
