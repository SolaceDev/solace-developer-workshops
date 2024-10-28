""" run this file to subscribe and consume all message types using direct message receiver"""
import pickle
import time
from concurrent.futures.thread import ThreadPoolExecutor
from typing import TypeVar, Generic

from solace.messaging.errors.pubsubplus_client_error import PubSubPlusClientError
from solace.messaging.messaging_service import MessagingService
from solace.messaging.receiver.direct_message_receiver import DirectMessageReceiver
from solace.messaging.receiver.inbound_message import InboundMessage
from solace.messaging.receiver.message_receiver import MessageHandler
from solace.messaging.resources.topic import Topic
from solace.messaging.resources.topic_subscription import TopicSubscription
from solace.messaging.utils.converter import BytesToObject
from solace.messaging.utils.manageable import Metric
from howtos.how_to_access_api_metrics import HowToAccessApiMetrics
from howtos.pubsub.how_to_direct_publish_message import HowToDirectPublishMessage
from howtos.sampler_boot import SamplerBoot, SolaceConstants

X = TypeVar('X')
constants = SolaceConstants
boot = SamplerBoot()
MAX_SLEEP = 10


class MessageHandlerImpl(MessageHandler):
    """this method is an call back handler to receive message"""

    def on_message(self, message: 'InboundMessage'):
        topic = message.get_destination_name()
        payload_as_bytes = message.get_payload_as_bytes()
        payload_as_string = message.get_payload_as_string()
        correlation_id = message.get_correlation_id()
        print("\n" + f"CALLBACK: Message Received on Topic: {topic}.\n"
                     f"Message Bytes: {payload_as_bytes} \n"
                     f"Message String: {payload_as_string} \n"
                     f"Correlation id: {correlation_id}")


class MyData(Generic[X]):
    """ sample  class for business object"""
    name = 'some string'

    def __init__(self, name):
        self.name = name

    def get_name(self):
        """ return the name"""
        return self.name


class ByteToObjectConverter(BytesToObject):
    """sample converter class to convert byte array to object"""

    def convert(self, src: bytearray) -> X:
        """This method converts the received byte array to an business object"""
        byte_to_object = pickle.loads(src)
        return byte_to_object


class HowToDirectConsumeSampler:
    """
    class to show how to create a messaging service
    """

    @staticmethod
    def direct_message_consume(messaging_service: MessagingService, consumer_subscription: str):
        """ to publish str or byte array type message"""
        try:
            global MAX_SLEEP
            topics = [TopicSubscription.of(consumer_subscription)]

            direct_receive_service = messaging_service.create_direct_message_receiver_builder()
            direct_receive_service = direct_receive_service.with_subscriptions(topics).build()
            direct_receive_service.start()
            direct_receive_service.receive_async(MessageHandlerImpl())
            remaining_time = MAX_SLEEP
            print(f"Subscribed to: {consumer_subscription}")
            time.sleep(MAX_SLEEP)
        finally:
            api_metrics = HowToAccessApiMetrics()
            api_metrics.access_individual_api_metrics(messaging_service, Metric.TOTAL_MESSAGES_RECEIVED)
            api_metrics.to_string_api_metrics(messaging_service)

            api_metrics.reset_api_metrics(messaging_service)

            direct_receive_service.terminate()

    @staticmethod
    def consume_direct_message_byte_payload(service: MessagingService, consumer_subscription: str):
        """To consume direct message payload in bytes using receive_message()"""
        try:
            topics = [TopicSubscription.of(consumer_subscription)]
            receiver: DirectMessageReceiver = service.create_direct_message_receiver_builder()\
                .with_subscriptions(topics).build()
            receiver.start()
            with ThreadPoolExecutor(max_workers=1) as e:
                e.submit(HowToDirectPublishMessage.direct_message_publish, messaging_service=service,
                         destination=Topic.of(consumer_subscription), message=constants.MESSAGE_TO_SEND)
            message_payload = receiver.receive_message().get_payload_as_bytes()
            print(f"received message payload in bytes is : {message_payload}")
        finally:
            receiver.terminate()

    @staticmethod
    def consume_direct_message_string_payload(service: MessagingService, consumer_subscription: str):
        """To consume direct message payload as string using receive_message()"""
        try:
            topics = [TopicSubscription.of(consumer_subscription)]
            receiver: DirectMessageReceiver = service.create_direct_message_receiver_builder()\
                .with_subscriptions(topics).build()
            receiver.start()

            with ThreadPoolExecutor(max_workers=1) as e:
                e.submit(HowToDirectPublishMessage.direct_message_publish, messaging_service=service,
                         destination=Topic.of(consumer_subscription), message=constants.MESSAGE_TO_SEND)

            message_payload = receiver.receive_message().get_payload_as_string()
            print(f"received message payload in bytes is : {message_payload}")
        finally:
            term = receiver.terminate_async()
            term.result()

    @staticmethod
    def consume_direct_message_published_from_rest_client(service: MessagingService, consumer_subscription: str):
        """To consume direct message payload with content type and content encoding using receive_message()"""
        try:
            topics = [TopicSubscription.of(consumer_subscription)]
            receiver: DirectMessageReceiver = service.create_direct_message_receiver_builder()\
                .with_subscriptions(topics).build()
            receiver.start()

            with ThreadPoolExecutor(max_workers=1) as e:
                e.submit(HowToDirectPublishMessage.direct_message_publish_outbound_with_all_props,
                         messaging_service=service, destination=Topic.of(consumer_subscription),
                         message=constants.MESSAGE_TO_SEND)

            message_payload: 'InboundMessage' = receiver.receive_message()

            rest_specific_fields = message_payload.get_rest_interoperability_support()
            content_type = rest_specific_fields.get_http_content_type()
            content_encoding = rest_specific_fields.get_http_content_encoding()
            print(f"received message content type is :{content_type} \n content encoding is : {content_encoding}")
        finally:
            receiver.terminate()

    @staticmethod
    def consume_direct_detailed_message(service: MessagingService, consumer_subscription: str):
        try:
            topics = [TopicSubscription.of(consumer_subscription)]
            receiver: DirectMessageReceiver = service.create_direct_message_receiver_builder()\
                .with_subscriptions(topics).build()
            receiver.start()

            with ThreadPoolExecutor(max_workers=1) as e:
                e.submit(HowToDirectPublishMessage.direct_message_publish_outbound_with_all_props,
                         messaging_service=service, destination=Topic.of(consumer_subscription),
                         message=constants.MESSAGE_TO_SEND)

            message_payload: 'InboundMessage' = receiver.receive_message()
            expiration = message_payload.get_expiration()
            print(f"received message payload is :{message_payload.get_payload_as_string()} "
                  f"\n expiration is : {expiration}")
        finally:
            receiver.terminate()

    @staticmethod
    def blocking_consume_direct_messages_in_loop(service: MessagingService, consumer_subscription: str):
        try:
            topics = [TopicSubscription.of(consumer_subscription)]
            receiver: DirectMessageReceiver = service.create_direct_message_receiver_builder()\
                .with_subscriptions(topics).build()
            receiver.start()
            count = 0
            for count in range(100):
                try:
                    with ThreadPoolExecutor(max_workers=1) as e:
                        e.submit(HowToDirectPublishMessage.direct_message_publish,
                                 messaging_service=service, destination=Topic.of(consumer_subscription),
                                 message=constants.MESSAGE_TO_SEND)
                    message_payload: 'InboundMessage' = receiver.receive_message()
                    print(f"message_payload in string: {message_payload.get_payload_as_string()}, msg_count: {count}")
                except PubSubPlusClientError as exception:
                    raise exception
        finally:
            receiver.terminate()

    @staticmethod
    def blocking_consume_direct_messages_in_loop_with_time_out(service: MessagingService, consumer_subscription: str,
                                                               receive_timeout):
        try:
            topics = [TopicSubscription.of(consumer_subscription)]
            receiver: DirectMessageReceiver = service.create_direct_message_receiver_builder()\
                .with_subscriptions(topics).build()
            receiver.start()
            count = 0
            for count in range(100):
                try:
                    with ThreadPoolExecutor(max_workers=1) as e:
                        e.submit(HowToDirectPublishMessage.direct_message_publish,
                                 messaging_service=service, destination=Topic.of(consumer_subscription),
                                 message=constants.MESSAGE_TO_SEND)
                    message_payload: 'InboundMessage' = receiver.receive_message(receive_timeout)
                    print(f"message_payload in string: {message_payload.get_payload_as_string()}, msg_count: {count}")
                except PubSubPlusClientError as exception:
                    raise exception
        finally:
            receiver.terminate()

    @staticmethod
    def run():
        """
        :return:
        """
        service = MessagingService.builder().from_properties(boot.broker_properties()).build()
        service.connect()
        consumer_subscription = constants.TOPIC_ENDPOINT_DEFAULT
        print("\nConsume direct message")
        # HowToDirectConsumeSampler().direct_message_consume(service, consumer_subscription)
        HowToDirectConsumeSampler().publish_and_subscribe(messaging_service=service,
                                                          consumer_subscription=consumer_subscription)

        print("\nConsume direct message in Bytes")
        HowToDirectConsumeSampler().consume_direct_message_byte_payload(service, consumer_subscription)

        print("\nConsume direct message in string")
        HowToDirectConsumeSampler().consume_direct_message_string_payload(service, consumer_subscription)

        print("\nConsume direct message to receive http content type and encoding from the added properties")
        HowToDirectConsumeSampler().consume_direct_message_published_from_rest_client(service, consumer_subscription)

        print("\nConsume direct message to receive expiration value from the added properties")
        HowToDirectConsumeSampler().consume_direct_detailed_message(service, consumer_subscription)

        print("\nConsume direct message using receive_message in a loop")
        HowToDirectConsumeSampler().blocking_consume_direct_messages_in_loop(service, consumer_subscription)

        print("\nConsume direct message using receive_message with timeout in a loop")
        HowToDirectConsumeSampler().blocking_consume_direct_messages_in_loop_with_time_out(service,
                                                                                           consumer_subscription,
                                                                                           receive_timeout=2000)

    @staticmethod
    def publish_and_subscribe(messaging_service: MessagingService, consumer_subscription: str):
        """method to publish and subscribe simultaneously"""
        with ThreadPoolExecutor(max_workers=2) as e:
            e.submit(HowToDirectConsumeSampler.direct_message_consume, messaging_service=messaging_service,
                     consumer_subscription=consumer_subscription)
            e.submit(HowToDirectPublishMessage.run)


if __name__ == '__main__':
    HowToDirectConsumeSampler.run()
