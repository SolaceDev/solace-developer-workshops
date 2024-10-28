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
import com.solace.messaging.config.TransportSecurityStrategy;
import com.solace.messaging.config.TransportSecurityStrategy.TLS;
import com.solace.messaging.config.TransportSecurityStrategy.TLS.SecureProtocols;
import com.solace.messaging.config.profile.ConfigurationProfile;
import com.solace.messaging.util.SecureStoreFormat;

public class HowToConfigureTransportLayerSecurity {


  public static MessagingService tlsWithCertificateValidationAndTruststorePassword() {
    // enables acceptance of expired certificate
    final boolean ignoreExpiration = true;
    final TransportSecurityStrategy transportSecurity = TLS.create()
        .withCertificateValidation("myTruststorePassword", ignoreExpiration);
    return MessagingService.builder(ConfigurationProfile.V1).local()
        .withTransportSecurityStrategy(transportSecurity)
        .build().connect();
  }

  public static MessagingService tlsWithCertificateValidationAndTruststoreSettings() {
    // enables acceptance of expired certificate
    final boolean ignoreExpiration = true;
    final TransportSecurityStrategy transportSecurity = TLS.create()
        .withCertificateValidation("myTruststorePassword", ignoreExpiration, SecureStoreFormat.JKS,
            "/my/trustStore/FilePath");
    return MessagingService.builder(ConfigurationProfile.V1).local()
        .withTransportSecurityStrategy(transportSecurity)
        .build().connect();
  }

  public static MessagingService tlsDowngradableToPlainText() {
    final TransportSecurityStrategy transportSecurity = TLS.create().downgradable();
    return MessagingService.builder(ConfigurationProfile.V1).local()
        .withTransportSecurityStrategy(transportSecurity)
        .build().connect();
  }

  public static MessagingService tlsWithExcludedProtocols() {
    final TransportSecurityStrategy transportSecurity = TLS.create().withExcludedProtocols(
        SecureProtocols.SSLv3, SecureProtocols.TLSv1);
    return MessagingService.builder(ConfigurationProfile.V1).local()
        .withTransportSecurityStrategy(transportSecurity)
        .build().connect();
  }

}
