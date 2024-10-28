"""sampler for publishing persistent message"""
import pickle
import threading
import time
from typing import TypeVar, Generic

from solace.messaging.config import _sol_constants
from solace.messaging.messaging_service import MessagingService
from solace.messaging.publisher.outbound_message import OutboundMessageBuilder
from solace.messaging.publisher.persistent_message_publisher import PersistentMessagePublisher, \
    MessagePublishReceiptListener
from solace.messaging.resources.topic import Topic
from solace.messaging.utils.converter import ObjectToBytes
from solace.messaging.utils.manageable import Metric
from howtos.sampler_boot import SolaceConstants, SamplerBoot

X = TypeVar('X')
constants = SolaceConstants
boot = SamplerBoot()
lock = threading.Lock()


class MyData(Generic[X]):
    """ sample  class for business object"""
    name = 'some string'

    def __init__(self, name):
        self.name = name

    def get_name(self):
        """ return the name"""
        return self.name


class MessagePublishReceiptListenerImpl(MessagePublishReceiptListener):
    def __init__(self):
        self._publish_count = 0

    @property
    def get_publish_count(self):
        return self._publish_count

    def on_publish_receipt(self, publish_receipt: 'PublishReceipt'):
        with lock:
            self._publish_count += 1
            print(f"\tMessage: {publish_receipt.message}\n"
                  f"\tIs persisted: {publish_receipt.is_persisted}\n"
                  f"\tTimestamp: {publish_receipt.time_stamp}\n"
                  f"\tException: {publish_receipt.exception}\n")
            if publish_receipt.user_context:
                print(f'\tUsercontext received: {publish_receipt.user_context.get_custom_message}')


class PopoConverter(ObjectToBytes):  # plain old python object - POPO
    """sample converter class"""

    def to_bytes(self, src) -> bytes:
        """This Method converts the given business object to bytes"""

        object_to_byte = pickle.dumps(src)
        return object_to_byte


class BasicUserContext:
    def __init__(self, custom_message):
        self._custom_message = custom_message

    @property
    def get_custom_message(self):
        return self._custom_message


class HowToPublishPersistentMessage:
    """class contains methods on different ways to publish a persistent message"""

    @staticmethod
    def create_persistent_message_publisher(service: MessagingService) -> 'PersistentMessagePublisher':
        """method to create, build and start persistent publisher"""
        publisher: PersistentMessagePublisher = service.create_persistent_message_publisher_builder().build()
        publisher.start()
        print('PERSISTENT publisher started')
        return publisher

    @staticmethod
    def publish_byte_message_non_blocking(message_publisher: PersistentMessagePublisher, destination: Topic, message):
        """method to publish byte message using persistent message publisher, non-blocking"""
        publish_receipt_listener = MessagePublishReceiptListenerImpl()
        message_publisher.set_message_publish_receipt_listener(publish_receipt_listener)
        message_publisher.publish(message, destination)
        time.sleep(2)
        print(f'Publish receipt count: {publish_receipt_listener.get_publish_count}\n')

    @staticmethod
    def publish_string_message_non_blocking(message_publisher: PersistentMessagePublisher, destination: Topic, message):
        """method to publish string message using persistent message publisher, non-blocking"""
        publish_receipt_listener = MessagePublishReceiptListenerImpl()
        message_publisher.set_message_publish_receipt_listener(publish_receipt_listener)
        message_publisher.publish(message, destination)
        print(f'PERSISTENT publish message is successful... Topic: [{destination.get_name()}]')
        time.sleep(2)
        print(f'Publish receipt count: {publish_receipt_listener.get_publish_count}\n')

    @staticmethod
    def publish_typed_message_non_blocking(message_builder: OutboundMessageBuilder,
                                           message_publisher: PersistentMessagePublisher,
                                           destination: Topic, message):
        """method to publish typed message using persistent message publisher, non-blocking"""
        publish_receipt_listener = MessagePublishReceiptListenerImpl()
        message_publisher.set_message_publish_receipt_listener(publish_receipt_listener)
        message = message_builder.build(payload=message, converter=PopoConverter())
        message_publisher.publish(message, destination)
        time.sleep(2)
        print(f'Publish receipt count: {publish_receipt_listener.get_publish_count}\n')

    @staticmethod
    def publish_typed_message_with_extended_message_props_non_blocking(message_builder: OutboundMessageBuilder,
                                                                       message_publisher: PersistentMessagePublisher,
                                                                       destination: Topic,
                                                                       message, additional_message_properties=None):
        """method to publish typed message with extended properties using persistent message publisher,
        non-blocking"""
        publish_receipt_listener = MessagePublishReceiptListenerImpl()
        message_publisher.set_message_publish_receipt_listener(publish_receipt_listener)
        message = message_builder.with_priority(255).build(payload=message, converter=PopoConverter())
        if additional_message_properties:
            message_publisher.publish(message, destination, additional_message_properties=additional_message_properties)
        else:
            message_publisher.publish(message, destination)
        time.sleep(2)
        print(f'Persistent Message Sent: Publish receipt count: {publish_receipt_listener.get_publish_count}\n')

    @staticmethod
    def correlate_message_on_broker_ack_with_user_context_non_blocking \
                    (message_builder: OutboundMessageBuilder, message_publisher: PersistentMessagePublisher,
                     destination: Topic, message):
        """method to publish message using persistent message publisher and ack with user context, non-blocking"""
        publish_receipt_listener = MessagePublishReceiptListenerImpl()

        message_publisher.set_message_publish_receipt_listener(publish_receipt_listener)
        message = message_builder.with_priority(255).build(payload=message, converter=PopoConverter())
        message_publisher.publish(message=message, destination=destination,
                                  user_context=BasicUserContext('hello'))
        time.sleep(2)
        print(f'Publish receipt count: {publish_receipt_listener.get_publish_count}\n')

    @staticmethod
    def publish_byte_message_blocking_waiting_for_publisher_confirmation(messaging_service: MessagingService,
                                                                        message_publisher: PersistentMessagePublisher,
                                                                        destination: Topic, message, time_out):
        """method to publish message using persistent message publisher using blocking publish, i.e
        publish_await_acknowledgement and wait for the publisher confirmation"""
        publish_receipt_listener = MessagePublishReceiptListenerImpl()
        message_publisher.set_message_publish_receipt_listener(publish_receipt_listener)
        message_publisher.publish_await_acknowledgement(message, destination, time_out)
        time.sleep(2)
        metrics = messaging_service.metrics()
        print(f'Published message count: {metrics.get_value(Metric.PERSISTENT_MESSAGES_SENT)}\n')

    @staticmethod
    def run():
        try:
            message = constants.MESSAGE_TO_SEND
            messaging_service = MessagingService.builder().from_properties(boot.broker_properties()).build()
            messaging_service.connect()
            print(f'Message service is connected? {messaging_service.is_connected}')
            topic_name = constants.TOPIC_ENDPOINT_DEFAULT
            topic = Topic.of(topic_name)

            outbound_msg = messaging_service.message_builder() \
                .with_application_message_id(constants.APPLICATION_MESSAGE_ID)

            publisher = HowToPublishPersistentMessage.create_persistent_message_publisher(messaging_service)

            HowToPublishPersistentMessage.publish_byte_message_non_blocking(publisher, topic,
                                                                            bytearray(message,
                                                                                      _sol_constants.ENCODING_TYPE))

            HowToPublishPersistentMessage.publish_string_message_non_blocking(publisher, topic, message)

            HowToPublishPersistentMessage.publish_typed_message_non_blocking(message_builder=outbound_msg,
                                                                             message_publisher=publisher,
                                                                             destination=topic,
                                                                             message=message)

            HowToPublishPersistentMessage \
                .publish_typed_message_with_extended_message_props_non_blocking(message_builder=outbound_msg,
                                                                                message_publisher=publisher,
                                                                                destination=topic,
                                                                                message=message)

            HowToPublishPersistentMessage \
                .correlate_message_on_broker_ack_with_user_context_non_blocking(message_builder=outbound_msg,
                                                                                message_publisher=publisher,
                                                                                destination=topic,
                                                                                message=message)
            HowToPublishPersistentMessage \
                .publish_byte_message_blocking_waiting_for_publisher_confirmation(messaging_service=messaging_service,
                                                                                 message_publisher=publisher,
                                                                                 destination=topic,
                                                                                 message=message,
                                                                                 time_out=2000)

        finally:
            publisher.terminate()
            messaging_service.disconnect()


if __name__ == '__main__':
    HowToPublishPersistentMessage().run()
