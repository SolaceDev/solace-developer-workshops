"""sampler module for configuring the authentication"""
from string import Template

from solace.messaging.config.authentication_strategy import BasicUserNamePassword, ClientCertificateAuthentication
from solace.messaging.config.solace_properties import authentication_properties
from solace.messaging.config.transport_security_strategy import TLS
from solace.messaging.messaging_service import MessagingService
from howtos.sampler_boot import SamplerBoot, SamplerUtil, SolaceConstants

boot = SamplerBoot()


class HowToConfigureAuthentication:
    """class contains methods for configuring the authentication"""

    @staticmethod
    def configure_basic_auth_credentials(props, user_name: str, password: str):
        """setup for basic auth using user name and password

        Args:
            props:
            user_name: user name
            password: password

        Returns:
            configured and connected instance of MessagingService ready to be used for messaging tasks
        """
        try:
            messaging_service = MessagingService.builder().from_properties(props) \
                .with_authentication_strategy(BasicUserNamePassword.of(user_name, password)).build()
            return messaging_service.connect()
        except Exception as exception:
            print(exception)
        finally:
            messaging_service.disconnect()

    @staticmethod
    def configure_client_certificate_authentication_customized_settings(props, key_file,
                                                                        key_store_password, key_store_url):
        """
        For a client to use a client certificate authentication scheme, the host event broker must be
        properly configured for TLS/SSL connections, and Client Certificate Verification must be
        enabled for the particular Message VPN that the client is connecting to. On client side client
        certificate needs to be present in a keystore file.

        Args:
            props:
            key_store_password: password for the key store
            key_store_url: url to the key store file
            key_file: key file

        Returns:
            configured and connected instance of MessagingService ready to be used for messaging tasks
        """
        try:
            transport_security = TLS.create() \
                .with_certificate_validation(True, validate_server_name=False,
                                             trust_store_file_path=SamplerUtil.get_trusted_store_dir())

            messaging_service = MessagingService.builder() \
                .from_properties(props) \
                .with_transport_security_strategy(transport_security) \
                .with_authentication_strategy(ClientCertificateAuthentication.of(certificate_file=key_store_url,
                                                                                 key_file=key_file,
                                                                                 key_password=key_store_password)) \
                .build(SamplerUtil.get_new_application_id())
            return messaging_service.connect()
        except Exception as exception:
            print(exception)
        finally:
            messaging_service.disconnect()

    @staticmethod
    def basic_compression(props, compression_range):
        """method for applying compression to the messaging service

        Args:
            props: broker properties
            compression_range: int value the compression value
        """
        try:
            messaging_service = MessagingService.builder().from_properties(props) \
                .with_message_compression(compression_range).build()
            return messaging_service.connect()
        finally:
            messaging_service.disconnect()

    @staticmethod
    def run():
        """method to run all the other authentication configuration methods"""
        props_unsecured = boot.broker_properties()
        props_secured = boot.secured_broker_properties()
        props_compressed = boot.compressed_broker_properties()
        user_name = props_unsecured[authentication_properties.SCHEME_BASIC_USER_NAME]
        password = props_unsecured[authentication_properties.SCHEME_BASIC_PASSWORD]
        key_store_url = SamplerUtil.get_valid_client_certificate()
        key_store_password = SolaceConstants.KEY_STORE_PASSWORD
        key_file = SamplerUtil.get_valid_client_key()

        result = HowToConfigureAuthentication.configure_basic_auth_credentials(props_unsecured, user_name, password)
        SamplerUtil.print_sampler_result(Template("Message Service[SYNC] connect with AUTH strategy $status")
                                         .substitute(status="SUCCESS" if result else "FAILED"))

        result = HowToConfigureAuthentication \
            .configure_client_certificate_authentication_customized_settings(props_secured, key_file,
                                                                             key_store_password, key_store_url)
        SamplerUtil.print_sampler_result(Template("Message Service[SYNC] connect with TLS strategy $status")
                                         .substitute(status="SUCCESS" if result else "FAILED"))

        result = HowToConfigureAuthentication.basic_compression(props_compressed, compression_range=1)
        SamplerUtil.print_sampler_result(Template("Message Service[SYNC] connect with COMPRESSION $status")
                                         .substitute(status="SUCCESS" if result else "FAILED"))


if __name__ == '__main__':
    HowToConfigureAuthentication.run()
