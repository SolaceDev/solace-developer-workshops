// This file contains an example of how to use the UpdateProperty method to update the OAuth tokens of a MessagingService.
package main

import (
        "solace.dev/go/messaging"
        "solace.dev/go/messaging/pkg/solace"
        "solace.dev/go/messaging/pkg/solace/config"
)

func UpdateOAuth2Tokens(messagingService solace.MessagingService, newAccessToken string, newIDToken string) (err error) {
        // The new access token is going to be used for authentication to the broker after broker disconnects a client (i.e due to old token expiration).
        // this token update happens during the next service reconnection attempt.
        // There will be no way to signal to the user if new token is valid. When the new token is not valid,
        // then reconnection will be retried for the remaining number of times or forever if configured so.
        // Usage of ServiceInterruptionListener and accompanied exceptions if any can be used to determine if token update during next reconnection was successful.
        //
        // - solace/errors.*IllegalArgumentError: If the specified property cannot
        //         be modified.
        // - solace/errors.*IllegalStateError: If the specified property cannot be modified in the
        //     current service state.
        // - solace/errors.*PubSubPlusClientError: If other transport or communication related errors occur.
 
        err = messagingService.UpdateProperty(config.AuthenticationPropertySchemeOAuth2AccessToken, newAccessToken)
        if err != nil {
                return err
        }
 
        err = messagingService.UpdateProperty(config.AuthenticationPropertySchemeOAuth2OIDCIDToken, newIDToken)
        if err != nil {
                return err
        }
        return nil
}

func Run () {

        // Create a messaging service with invalid OAuth2 authentication tokens. These tokens will be updated later with valid values.

        var err error
        var messagingService solace.MessagingService

        brokerConfig := config.ServicePropertyMap{
                config.TransportLayerPropertyHost:                getEnv("SOLACE_HOST", "tcp://localhost:55555,tcp://localhost:55554"),
                config.ServicePropertyVPNName:                    getEnv("SOLACE_VPN", "default"),
                config.AuthenticationPropertySchemeBasicPassword: getEnv("SOLACE_PASSWORD", "default"),
                config.AuthenticationPropertySchemeBasicUserName: getEnv("SOLACE_USERNAME", "default"),
        }

        // Initialize the messaging service with invalid tokens
        messagingService, err = messaging.NewMessagingServiceBuilder().FromConfigurationProvider(brokerConfig).WithAuthenticationStrategy(config.OAuth2Authentication(
                        "invalid access token",
                        "invalid id token",
                        "",
                )).Build()

        // There should not be any errors when building the service in this way
        if err != nil {
                panic(err)
        }

        accessToken := "valid access token"
        idToken := "valid OIDC ID token"

        err = UpdateOAuth2Tokens(messagingService, accessToken, idToken)

        // If there is an error when updating the oauth token, panic with that error
        if err != nil {
                panic(err)
        }
}
