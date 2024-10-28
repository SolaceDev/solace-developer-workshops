"""module on how to update service properties on a messaging service"""

from solace.messaging.config.solace_properties import authentication_properties
from solace.messaging.config.authentication_strategy import OAuth2
from solace.messaging.config.transport_security_strategy import TLS
from solace.messaging.messaging_service import MessagingService

from howtos.sampler_boot import SamplerBoot

MY_TRUST_STORE = "<path to your trust store directory>"

MY_FIRST_OIDC_ID_TOKEN = "<first OIDC ID token>"
MY_FIRST_ACCESS_TOKEN = "<first access token>"

MY_NEW_OIDC_ID_TOKEN = "<new OIDC ID token>"
MY_NEW_ACCESS_TOKEN = "<new access token>"

class HowToUpdateServiceProperties:
    """
    This class contains methods used to update service properties, particularly for updating the
    OAuth2 tokens used for authentication.
    """
    @staticmethod
    def update_oauth2_tokens(messaging_service: MessagingService, new_access_token: str, new_id_token: str):
        """
        The new access token is going to be used for authentication to the broker after broker disconnects
        a client (i.e due to old token expiration).
        This token update happens during the next service reconnection attempt.
        There will be no way to signal to the user if new token is valid. When the new token is not valid,
        then reconnection will be retried for the remaining number of times or forever if configured so.
        Usage of ServiceInterruptionListener and accompanied exceptions if any can be used to determine
        if token update during next reconnection was successful.

        Raises:
            IllegalArgumentError: If the specified property cannot be modified.
            IllegalStateError: If the specified property cannot
                be modified in the current service state.
            PubSubPlusClientError: If other transport or communication related errors occur.
        """
        messaging_service.update_property(authentication_properties.SCHEME_OAUTH2_ACCESS_TOKEN, new_access_token)
        messaging_service.update_property(authentication_properties.SCHEME_OAUTH2_OIDC_ID_TOKEN, new_id_token)

    @staticmethod
    def create_messaging_service_with_oauth_authentication() -> 'MessagingService':
        """
        Create a messaging service configured for OAuth2 authentication
        """
        tls = TLS.create() \
            .with_certificate_validation(True, validate_server_name=False, trust_store_file_path=MY_TRUST_STORE)

        messaging_service = MessagingService \
            .builder() \
            .from_properties(SamplerBoot.secured_broker_properties()) \
            .with_authentication_strategy(OAuth2.of(oidc_id_token=MY_FIRST_OIDC_ID_TOKEN,
                                                    access_token=MY_FIRST_ACCESS_TOKEN)) \
            .with_transport_security_strategy(tls) \
            .build()

        return messaging_service

    @staticmethod
    def run():
        """
        Create a messaging service, connect that service using OAuth2 authentication,
        update the OAuth tokens, and disconnect the service.
        """
        # Create the service with OAuth2 authentication, and establish the inital connection
        messaging_service = HowToUpdateServiceProperties.create_messaging_service_with_oauth_authentication()
        messaging_service.connect()

        # Update the service with the new OAuth tokens
        HowToUpdateServiceProperties.update_oauth2_tokens(messaging_service, MY_NEW_ACCESS_TOKEN, MY_NEW_OIDC_ID_TOKEN)

        # Once the original tokens expire, the broker will trigger a reconnection on the service, and the new
        # tokens will be used to re-authenticate the connection.

        # Once the application has finished, disconnect the messaging service
        messaging_service.disconnect()
