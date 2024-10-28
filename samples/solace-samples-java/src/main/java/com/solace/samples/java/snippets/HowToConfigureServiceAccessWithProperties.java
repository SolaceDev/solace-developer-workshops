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
import com.solace.messaging.config.SolaceConstants.AuthenticationConstants;
import com.solace.messaging.config.SolaceProperties.AuthenticationProperties;
import com.solace.messaging.config.SolaceProperties.TransportLayerProperties;
import com.solace.messaging.config.profile.ConfigurationProfile;
import java.util.Properties;

/**
 * Sampler for messaging service access to a broker using properties
 */
public class HowToConfigureServiceAccessWithProperties {

  /**
   * Example how to configure service access using properties
   *
   * @return connected instance of a messaging service, ready to be used
   */
  public static MessagingService configureAndConnectUsingProperties() {

    final Properties serviceConfiguration = new Properties();

    //connect to IP address 192.168.160.28 and port 77777 over TCP
    serviceConfiguration.setProperty(TransportLayerProperties.HOST,
        "tcp:192.168.160.28:77777");
    // use basic auth
    serviceConfiguration.setProperty(AuthenticationProperties.SCHEME,
        AuthenticationConstants.AUTHENTICATION_SCHEME_BASIC);

    serviceConfiguration.setProperty(AuthenticationProperties.SCHEME_BASIC_USER_NAME,
        "aUser");

    serviceConfiguration.setProperty(AuthenticationProperties.SCHEME_BASIC_PASSWORD,
        "hadDtOGuESsPaSsW0rD");

    return MessagingService.builder(ConfigurationProfile.V1).fromProperties(serviceConfiguration)
        .build().connect();
  }


}
