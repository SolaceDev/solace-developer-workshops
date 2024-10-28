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
import com.solace.messaging.PubSubPlusClientException;
import com.solace.messaging.config.AuthenticationStrategy.BasicUserNamePassword;
import com.solace.messaging.config.AuthenticationStrategy.ClientCertificateAuthentication;
import com.solace.messaging.config.AuthenticationStrategy.Kerberos;
import com.solace.messaging.config.AuthenticationStrategy.OAuth2;
import com.solace.messaging.config.SolaceProperties.AuthenticationProperties;
import com.solace.messaging.config.TransportSecurityStrategy.TLS;
import com.solace.messaging.config.profile.ConfigurationProfile;
import com.solace.messaging.util.SecureStoreFormat;
import java.util.Properties;

/**
 * Sampler for authentication configuration
 */
public class HowToConfigureAuthentication {

  /**
   * Example how to configure service access to use a basic authentication with user name and
   * password
   *
   * @param userName user name
   * @param password password
   * @return configured and connected instance of {@code MessagingService} ready to be used for
   * messaging tasks
   */
  public static MessagingService configureBasicAuthCredentials(String userName,
      String password) {
    return MessagingService.builder(ConfigurationProfile.V1).local()
        // can configure or override credentials manually
        .withAuthenticationStrategy(
            BasicUserNamePassword.of(userName, password))
        .build().connect();
  }

  /**
  * Example how to configure service access using Kerberos with Jaas login context name
   * <p>Prerequisite for this example to work on a client side is existence of jaas login
   * configuration file 'jaas.conf' similar to one in 'src/main/resources/' and valid kerberos
   * configuration file 'krb5.conf'
   *
   * @param serviceConfiguration service configuration properties
   * @return configured and connected instance of {@code MessagingService} ready to be used for
   * messaging tasks
   * @see <a href="https://docs.solace.com/Configuring-and-Managing/Configuring-Client-Authentication.htm#Config-Kerberos">How
   * to configure Kerberos</a>
   */
  public static MessagingService configureKerberosWithJaasLoginContextName(
      Properties serviceConfiguration) {

    final String jaasLoginContextName = "SolaceGSS";

    return MessagingService.builder(ConfigurationProfile.V1).fromProperties(serviceConfiguration)
        // can configure or override authentication manually
        .withAuthenticationStrategy(
            // jaasLoginContextName correlates to the entry in resources/jaas.conf file
            // uses default value 'solace' for kerberos principal instance name,
            // no mutual authentication is enabled
            Kerberos.of(jaasLoginContextName))
        .build().connect();
  }

  /**
   * Prerequisite for this example to work to work on a client is existence of jaas login
   * configuration file 'jaas.conf' similar to one in 'src/main/resources/' and valid kerberos
   * configuration file 'krb5.conf'
   *
   * @param serviceConfiguration service configuration properties
   * @return configured and connected instance of {@code MessagingService} ready to be used for
   * messaging tasks
   * @see <a href="https://docs.solace.com/Configuring-and-Managing/Configuring-Client-Authentication.htm#Config-Kerberos">How
   * to configure Kerberos</a>
   */
  public static MessagingService configureKerberosCustomizeAllSettings(
      Properties serviceConfiguration) {
    final String kerberosPrincipalInstanceName = "solace01";
    final String jaasLoginContextName = "SolaceGSS";
    final String myUserNameOnBroker = "myUserNameOnBroker";

    return MessagingService.builder(ConfigurationProfile.V1).fromProperties(serviceConfiguration)
        // can configure or override authentication manually
        .withAuthenticationStrategy(
            // jaasLoginContextName correlates to the entry in resources/jaas.conf file
            // myUserNameOnBroker should be setup on a broker,
            // enable mutual authentication and JAAS config file reloading
            Kerberos
                .of(kerberosPrincipalInstanceName, jaasLoginContextName)
                .withUserName(myUserNameOnBroker).withMutualAuthentication()
                .withReloadableJaasConfiguration())
        .build().connect();
  }


  /**
   * For a client to use a client certificate authentication scheme, the host event broker must be
   * properly configured for TLS/SSL connections, and Client Certificate Verification must be
   * enabled for the particular Message VPN that the client is connecting to. On client side client
   * certificate needs to be present in a keystore file.
   *
   * @param myKeystorePassword password for the keystore
   * @param myKeystoreUrl      url to the keystore file
   * @return configured and connected instance of {@code MessagingService} ready to be used for
   * messaging tasks
   */
  public static MessagingService configureClientCertificateAuthenticationCustomizeAllSettings(
      String myKeystorePassword, String myKeystoreUrl) {

    return MessagingService.builder(ConfigurationProfile.V1).localTLS(55443)
        // transport security TLS is REQUIRED
        .withTransportSecurityStrategy(TLS.create())
        // can configure or override authentication manually
        .withAuthenticationStrategy(
            // jaasLoginContextName correlates to the entry in resources/jaas.conf file
            // myUserNameOnBroker should be setup on a broker, or just use null
            ClientCertificateAuthentication
                .of(myKeystoreUrl, myKeystorePassword)
        )
        .build().connect();
  }

  /**
   * For a client to use a client certificate authentication scheme, the host event broker must be
   * properly configured for TLS/SSL connections, and Client Certificate Verification must be
   * enabled for the particular Message VPN that the client is connecting to. On client side client
   * certificate needs to be present in a keystore file.
   *
   * @param myKeystorePassword           password for the keystore
   * @param myEspecialPrivateKeyPassword password for the private key stored in a keystore if a
   *                                     different from a {@code myKeystorePassword} password is
   *                                     used
   * @param myKeystoreUrl                url to the keystore file
   * @return configured and connected instance of {@code MessagingService} ready to be used for
   * messaging tasks
   */
  public static MessagingService configureClientCertificateAuthenticationCustomizeAllSettings(
      String myKeystorePassword, String myEspecialPrivateKeyPassword, String myKeystoreUrl) {

    return MessagingService.builder(ConfigurationProfile.V1).localTLS(55443)
        // transport security TLS is REQUIRED
        .withTransportSecurityStrategy(TLS.create())
        // can configure or override authentication manually
        .withAuthenticationStrategy(
            // jaasLoginContextName correlates to the entry in resources/jaas.conf file
            // myUserNameOnBroker should be setup on a broker
            ClientCertificateAuthentication
                .of(myKeystoreUrl, myKeystorePassword, SecureStoreFormat.PKCS12)
                .withPrivateKeyPassword(myEspecialPrivateKeyPassword)
        )
        .build().connect();
  }


  /**
   * Example how to configure service access to use OAuth 2 authentication with an access token and
   * an optional issuer identifier
   *
   * @param accessToken      access token
   * @param issuerIdentifier Issuer identifier URI
   * @return configured and connected instance of {@code MessagingService} ready to be used for
   * messaging tasks
   */
  public static MessagingService configureOauth2WithAccessTokenAuthentication(String accessToken,
      String issuerIdentifier) {
    return MessagingService.builder(ConfigurationProfile.V1).local()
        .withAuthenticationStrategy(OAuth2.of(accessToken).withIssuerIdentifier(issuerIdentifier))
        .build().connect();
  }

  /**
   * Example how to configure service access to use OIDC authentication with an ID token and
   * optional access token
   *
   * @param idToken     ID token
   * @param accessToken access token
   * @return configured and connected instance of {@code MessagingService} ready to be used for
   * messaging tasks
   */
  public static MessagingService configureOIDCAwithIdTokenuthentication(String idToken,
      String accessToken) {
    return MessagingService.builder(ConfigurationProfile.V1).local()
        .withAuthenticationStrategy(OAuth2.of(accessToken, idToken))
        .build().connect();
  }

  /**
   * Example how to update an expiring OAUTH2 (access or/and ID) tokens.
   * <p>User is in charge to obtain a new valid token in order to use this API
   * <p>Update won't take in effect instantly but upper next reconnection
   *
   * @param service        connected or disconnected service with at least one outstanding
   *                       reconnection attempt
   * @param newAccessToken new access token
   * @param newOidcIdToken new ID token
   * @throws IllegalArgumentException  when new token is null
   * @throws PubSubPlusClientException If other transport or communication related errors occur
   */
  public void updateOauth2Token(MessagingService service, String newAccessToken,
      String newOidcIdToken)
      throws IllegalArgumentException, PubSubPlusClientException {
// The new access token is going to be used for authentication to the broker after broker disconnects a client (i.e due to old token expiration).
// this token update happens during the next service reconnection attempt.
// There will be no way to signal to the user if new token is valid. When the new token is not valid,
// then reconnection will be retried for the remaining number of times or forever if configured so.
// Usage of ServiceInterruptionListener and accompanied exceptions if any can be used to determine if token update during next reconnection was successful.
    service.updateProperty(AuthenticationProperties.SCHEME_OAUTH2_ACCESS_TOKEN, newAccessToken);
    service.updateProperty(AuthenticationProperties.SCHEME_OAUTH2_OIDC_ID_TOKEN, newOidcIdToken);
  }

}
