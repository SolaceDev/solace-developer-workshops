"""sampler for configuring the transport layer security"""
import configparser
import os
from os.path import dirname
from solace.messaging.config.transport_security_strategy import TLS
from solace.messaging.errors.pubsubplus_client_error import PubSubPlusClientError
from solace.messaging.messaging_service import MessagingService
from howtos.sampler_boot import SamplerUtil, SamplerBoot

broker_properties_value = SamplerBoot.secured_broker_properties()


class HowToConnectWithTls:
    """sampler class for validating transport layer security configuration"""

    @staticmethod
    def tls_with_certificate_validation_and_trusted_store_settings(props, ignore_expiration: bool,
                                                                   trust_store_path: str):
        """method for validating tls certificate along with trusted store by providing the file path
        Args:
            props: broker properties
            trust_store_path (str): trust store file path
            ignore_expiration (bool): holds a boolean flag whether to ignore expiration or not

        Returns:
            a new connection to messaging service
        """
        try:
            transport_security = TLS.create() \
                .with_certificate_validation(ignore_expiration=ignore_expiration,
                                             trust_store_file_path=trust_store_path)
            messaging_service = MessagingService.builder().from_properties(props)\
                .with_transport_security_strategy(transport_security).build()
            messaging_service.connect()

        finally:
            messaging_service.disconnect()

    @staticmethod
    def tls_downgradable_to_plain_text(props, trust_store_path: str):
        """method for validating the tls downgradable to plain text
        Args:
            props: broker properties

        Returns:
            a new connection to messaging service
        """
        try:
            transport_security = TLS.create().downgradable() \
                .with_certificate_validation(ignore_expiration=True,
                                             trust_store_file_path=trust_store_path)
            print(props)
            messaging_service = MessagingService.builder().from_properties(props) \
                .with_transport_security_strategy(transport_security).build()
            messaging_service.connect()
        finally:
            messaging_service.disconnect()

    @staticmethod
    def tls_with_excluded_protocols(props, excluded_protocol: TLS.SecureProtocols, trust_store_path: str):
        """method for validating excluding tls protocols
        Args:
            props: broker properties
            excluded_protocol (SecuredProtocols): contains a value or a list of values of protocols to be excluded

        Returns:
            a new connection to messaging service
        """
        try:
            transport_security = TLS.create().with_excluded_protocols(excluded_protocol) \
                .with_certificate_validation(ignore_expiration=True,
                                             trust_store_file_path=trust_store_path)

            messaging_service = MessagingService.builder().from_properties(props) \
                .with_transport_security_strategy(transport_security).build()
            messaging_service.connect()
        finally:
            messaging_service.disconnect()

    @staticmethod
    def tls_with_cipher_suites(props, cipher_suite: str, trust_store_path: str):
        """method for validating the cipher suited with tls
        Args:
            props: broker properties
            cipher_suite (str): cipher suite list

        Returns:
            a new connection to messaging service
        """
        try:
            transport_security = TLS.create().with_cipher_suites(cipher_suite) \
                .with_certificate_validation(ignore_expiration=True,
                                             trust_store_file_path=trust_store_path)

            messaging_service = MessagingService.builder().from_properties(props) \
                .with_transport_security_strategy(transport_security).build()
            messaging_service.connect()
        finally:
            messaging_service.disconnect()

    @staticmethod
    def run():
        """method to run all the methods related to tls configuration """
        props = broker_properties_value
        trust_store_path_name = SamplerUtil.get_trusted_store_dir()
        cipher_suite = "ECDHE-RSA-AES256-GCM-SHA384"

        HowToConnectWithTls.\
            tls_with_certificate_validation_and_trusted_store_settings(props, ignore_expiration=True,
                                                                       trust_store_path=trust_store_path_name)
        try:
            HowToConnectWithTls.tls_downgradable_to_plain_text(props, trust_store_path=trust_store_path_name)
        except PubSubPlusClientError as err:
            # tls downgrade must be enabled on the connected broker:
            #  - message vpn must have the TLS downgrade option enabled see, https://docs.solace.com/Configuring-and-Managing/Enabling-TLS-Downgrade.htm 
            #  - the client username provided must have profile with this enabled see, https://docs.solace.com/Configuring-and-Managing/Configuring-Client-Profiles.htm#Configur3 
            print(f'Failed to connect with tls downgrade to plain text, is this enabled on the broker? Error: {err}')
        HowToConnectWithTls.tls_with_excluded_protocols(props,
                                                        excluded_protocol=TLS.SecureProtocols.SSLv3,
                                                        trust_store_path=trust_store_path_name)

        HowToConnectWithTls.tls_with_cipher_suites(props, cipher_suite=cipher_suite,
                                                    trust_store_path=trust_store_path_name)


if __name__ == '__main__':
    HowToConnectWithTls.run()
