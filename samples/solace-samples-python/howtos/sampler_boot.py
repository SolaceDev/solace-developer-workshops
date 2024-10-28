"""
this module provides methods for accessing broker properties from the environment variables and defining some constants
"""
import json
import os
import uuid
from collections import defaultdict
from os.path import dirname
from string import Template
from typing import Generic, TypeVar

from solace.messaging.config.receiver_activation_passivation_configuration import ReceiverState, \
    ReceiverStateChangeListener
from solace.messaging.config.solace_properties import transport_layer_properties, service_properties, \
    authentication_properties
from solace.messaging.receiver.message_receiver import MessageHandler
from howtos.SEMPv2.semp_client import SempClient
from howtos.SEMPv2.semp_utility import SempUtility

X = TypeVar('X')


class MyData(Generic[X]):
    """ sample  class for business object"""
    name = 'some string'

    def __init__(self, name):
        self.name = name

    def get_name(self):
        """ return the name"""
        return self.name


class ReceiverStateChangeListenerImpl(ReceiverStateChangeListener):
    def on_change(self, old_state: ReceiverState, new_state: ReceiverState, change_time_stamp: float):
        print(f"ReceiverState changed.\n\tOld state: {old_state.value}\n\tOld state: {new_state.value}")


class BasicTestMessageHandler(MessageHandler):
    """this method is an call back handler to receive message"""

    def __init__(self, receiver=None, ack=True, source_topic='', test_callback=None):
        super().__init__()
        self._receiver = receiver
        self._ack = ack
        self._source_topic = source_topic
        self._receive_count = 0
        self._exception = ''
        self._assertion_error = []
        self._test_callback = test_callback
        self._message_received_on_topics = defaultdict(int)

    @property
    def total_message_received_count(self):
        return self._receive_count

    @property
    def callback_exception(self):
        return self._exception

    @property
    def message_received_on_topics(self):
        return self._message_received_on_topics

    @property
    def assertion_error(self):
        return self._assertion_error

    def on_msg_receive(self, message: 'InboundMessage'):
        """ Extensible function for processing message received """
        # increment simple counter, extended implementation can override
        # and use more complex counters using message fields
        self._receive_count += 1

    def reset(self):
        self._receive_count = 0
        self._exception = ''
        self._assertion_error = []

    def on_message(self, message: 'InboundMessage'):
        """
        MessageHandler on_message function
        provides skeleton message handler execution
        can be overridden if needed
        """
        try:
            print('>>>>>>>>>>>>>>>>>>>>>>>>>INCOMING MESSAGE<<<<<<<<<<<<<<<<<<<')
            message_from_topic = message.get_destination_name()
            self._message_received_on_topics[message_from_topic] += 1
            self.on_msg_receive(message)
            if self._receiver and self._ack:
                self._receiver.ack(message)

            if self._source_topic != '' and self._source_topic != message_from_topic:
                self._assertion_error.append(f'Message sent in [{self._source_topic}, '
                                             f'but received from different topic [{message_from_topic}]]')
            if self._test_callback:
                self._test_callback(self, message)
        except Exception as unexpected_error:
            self._exception += str(unexpected_error)


class SamplerBoot:
    """this class is created for instantiating the broker properties from environment"""

    properties_from_external_file_name = 'solbroker_properties.json'
    external_file_full_path = os.path.join(dirname(dirname(__file__)), "howtos",
                                           properties_from_external_file_name)

    solbroker_properties_key = 'solbrokerProperties'
    host_secured = 'solace.messaging.transport.host.secured'
    host_compressed = 'solace.messaging.transport.host.compressed'
    semp_key = 'semp'
    semp_hostname_key = 'semp.hostname'
    semp_username_key = 'semp.username'
    semp_password_key = 'semp.password'
    semp_port_to_connect = '1943'
    valid_certificate_authority = 'public_root_ca'

    @staticmethod
    def read_config():
        try:
            with open(SamplerBoot.external_file_full_path, 'r') as content_file:
                props_from_file = content_file.read()

            return json.loads(props_from_file)
        except Exception as exception:
            raise Exception(f"Unable to read JSON in file: {SamplerBoot.external_file_full_path}. "
                            f"Exception: {exception}")

    @staticmethod
    def read_solbroker_props(external_kvps: dict):
        """Read Solbroker properties from external source"""
        if SamplerBoot.solbroker_properties_key not in external_kvps:
            print(f'Solbroker details in '
                  f'[{SamplerBoot.properties_from_external_file_name}] is unavailable, '
                  f'unable to find KEY: [{SamplerBoot.solbroker_properties_key}]. Refer README...')

        broker_properties = external_kvps[SamplerBoot.solbroker_properties_key]

        if not all(key in broker_properties for key in (transport_layer_properties.HOST,
                                                        SamplerBoot.host_secured,
                                                        service_properties.VPN_NAME,
                                                        authentication_properties.SCHEME_BASIC_USER_NAME,
                                                        authentication_properties.SCHEME_BASIC_PASSWORD)):
            print(f'Solbroker details in '
                  f'[{SamplerBoot.properties_from_external_file_name}] '
                  f'is unavailable, unable to find anyone of following KEYs: '
                  f'[{transport_layer_properties.HOST}/{service_properties.VPN_NAME}/'
                  f'{authentication_properties.SCHEME_BASIC_USER_NAME}/'
                  f'{authentication_properties.SCHEME_BASIC_PASSWORD}]. Refer README...')
        print(
            f"\n\n********************************BROKER PROPERTIES**********************************************"
            f"\nFrom external file: '{SamplerBoot.properties_from_external_file_name}': "
            f"\nHost: {broker_properties[transport_layer_properties.HOST]}"
            f"\nSecured Host: {broker_properties[SamplerBoot.host_secured]}"
            f"\nCompressed Host: {broker_properties[SamplerBoot.host_compressed]}"
            f"\nVPN:{broker_properties[service_properties.VPN_NAME]}"
            f"\nUsername: {broker_properties[authentication_properties.SCHEME_BASIC_USER_NAME]}\nPassword: <hidden>"
            f"\n***********************************************************************************************\n")
        return broker_properties

    @staticmethod
    def broker_properties():
        """method to read the properties from external file
        Returns:
            broker properties
        """
        try:
            props_from_file = SamplerBoot.read_config()
            props = SamplerBoot.read_solbroker_props(props_from_file)
            props.pop(SamplerBoot.host_secured, None)
            return props
        except Exception as exception:
            raise Exception(f"Unable to read JSON in file: {SamplerBoot.external_file_full_path}. "
                            f"Exception: {exception}")

    @staticmethod
    def secured_broker_properties():
        """method to read the properties from external file
        Returns:
            secured broker properties
        """
        try:
            props_from_file = SamplerBoot.read_config()
            props = SamplerBoot.read_solbroker_props(props_from_file)
            props.pop(transport_layer_properties.HOST, None)
            props[transport_layer_properties.HOST] = props.pop(SamplerBoot.host_secured)
            return props
        except Exception as exception:
            raise Exception(f"Unable to read JSON in file: {SamplerBoot.external_file_full_path}. "
                            f"Exception: {exception}")

    @staticmethod
    def compressed_broker_properties():
        """method to read the properties from external file
        Returns:
            compressed secured broker properties
        """
        try:
            props_from_file = SamplerBoot.read_config()
            props = SamplerBoot.read_solbroker_props(props_from_file)
            props.pop(transport_layer_properties.HOST, None)
            props.pop(SamplerBoot.host_secured, None)
            props[transport_layer_properties.HOST] = props.pop(SamplerBoot.host_compressed)
            return props
        except Exception as exception:
            raise Exception(f"Unable to read JSON in file: {SamplerBoot.external_file_full_path}. "
                            f"Exception: {exception}")

    @staticmethod
    def read_semp_configuration():
        """ Read SEMP details from external source"""
        props_from_file = SamplerBoot.read_config()
        if SamplerBoot.semp_key not in props_from_file:
            raise Exception(f'SEMP details in '
                            f'[{SamplerBoot.properties_from_external_file_name}] '
                            f'is unavailable, unable to find KEY: [{SamplerBoot.semp_key}]. Refer README...')

        semp_props = props_from_file[SamplerBoot.semp_key]

        if not all(key in semp_props for key in (SamplerBoot.semp_hostname_key, SamplerBoot.semp_username_key,
                                                 SamplerBoot.semp_password_key)):
            raise Exception(f'SEMP details in '
                            f'[{SamplerBoot.properties_from_external_file_name}] '
                            f'is unavailable, unable to find anyone of following KEYs: '
                            f'[{SamplerBoot.semp_hostname_key}/{SamplerBoot.semp_username_key}/'
                            f'{SamplerBoot.semp_password_key}]. Refer README...')

        return semp_props


class SamplerUtil:

    @staticmethod
    def get_new_application_id():
        """static method for generating a new message id"""
        return "app_" + str(uuid.uuid4())

    @staticmethod
    def get_trusted_store_dir() -> str:
        """method to get trusted store dir"""
        trusted_store_dir_full_path = os.path.join(dirname(dirname(__file__)), "howtos", "fixtures")
        return trusted_store_dir_full_path

    @staticmethod
    def get_valid_client_certificate() -> str:
        """method to get valid client certificate
        Returns:
            a valid file path for the client certificate
        """
        valid_client_certificate_file_full_path = os.path.join(SamplerUtil.get_trusted_store_dir(),
                                                               SolaceConstants.CLIENT_CERTIFICATE_FILE)

        return valid_client_certificate_file_full_path

    @staticmethod
    def get_valid_client_key() -> str:
        """method to get valid client certificate
        Returns:
            a valid file path for the client certificate
        """
        # note the api-client.pem file is also a key file
        valid_client_key_file_full_path = os.path.join(SamplerUtil.get_trusted_store_dir(),
                                                       SolaceConstants.CLIENT_CERTIFICATE_FILE)

        print(f"Valid Client certificate: {valid_client_key_file_full_path}")
        return valid_client_key_file_full_path

    @staticmethod
    def print_sampler_result(message):
        print(f'[SOLACE SAMPLER RESULT] {message}\n\n')

    @staticmethod
    def cert_feature(semp_props, broker_props, is_enable=True):
        semp_obj = SempClient(semp_base_url=semp_props[SamplerBoot.semp_hostname_key],
                              user_name=semp_props[SamplerBoot.semp_username_key],
                              password=semp_props[SamplerBoot.semp_password_key])

        semp = SempUtility(semp_obj)

        print(f'Client certificate: [{is_enable}]')
        semp.update_client_certificate_authentication_feature(broker_props[service_properties.VPN_NAME],
                                                              is_enable=is_enable)

        if is_enable:
            print('Add client certificate')
            valid_server_certificate_file = os.path.join(SamplerUtil.get_trusted_store_dir(), 'public_root_ca.crt')
            semp.add_certificate(cert_file_full_path=valid_server_certificate_file, override_existing=True)
        else:
            print('Delete client certificate')
            semp.delete_certificate(SamplerBoot.valid_certificate_authority)

    @staticmethod
    def publisher_terminate(publisher, raise_exception=False, grace_period_timeout:int = 10):
        try:
            publisher.terminate(grace_period_timeout)
        except Exception as exception:
            if raise_exception:
                raise exception
            else:
                print(exception)


class SolaceConstants:
    """this class contains all the constants used through out the project"""
    TOPIC_ENDPOINT_DEFAULT = "try-me"
    QUEUE_NAME_FORMAT = Template('Q/$iteration')
    TOPIC_ENDPOINT_1 = "try-me1"
    TOPIC_ENDPOINT_2 = "try-me2"
    APPLICATION_MESSAGE_ID = "Solace-App"
    MESSAGE_TO_SEND = "hello Solace..."
    ENCODING_TYPE = "utf-8"
    CUSTOM_PROPS =  {"language": "en-CA", "isEncrypted": "True"}
    TOPIC_ENDPOINT = "purchase/tickets"
    GROUP_NAME1 = "analytics"
    GROUP_NAME2 = "booking"
    MESSAGE_PRIORITY = 1
    MESSAGE_EXPIRATION = 5000
    MESSAGE_SEQUENCE_NUMBER = 12345
    CLIENT_CERTIFICATE_FILE = 'api-client.pem'
    KEY_STORE_PASSWORD = "changeme"
    DEFAULT_TIMEOUT_MS = 5000
