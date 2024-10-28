"""sampler module to show how to add and remove the subscriptions"""

import pickle
import time
from concurrent.futures.thread import ThreadPoolExecutor
from typing import TypeVar, Generic

from solace.messaging.messaging_service import MessagingService
from solace.messaging.receiver.message_receiver import MessageHandler
from solace.messaging.resources.topic_subscription import TopicSubscription
from solace.messaging.utils.converter import BytesToObject
from howtos.pubsub.how_to_direct_publish_message import HowToDirectPublishMessage
from howtos.sampler_boot import SamplerBoot, SolaceConstants

X = TypeVar('X')
constants = SolaceConstants
boot = SamplerBoot()
MAX_SLEEP = 10


class MessageHandlerImpl1(MessageHandler):
    """this method is an call back handler to receive message"""

    def on_message(self, message: 'InboundMessage'):
        """ Message receive callback """
        topic = message.get_destination_name()
        payload_as_bytes = message.get_payload_as_bytes()
        payload_as_string = message.get_payload_as_string()
        correlation_id = message.get_correlation_id()
        print("\n" + f"CALLBACK: Message Received on Topic: {topic}.\n"
                     f"Message Bytes: {payload_as_bytes} \n"
                     f"Message String: {payload_as_string} \n"
                     f"Correlation id: {correlation_id}"
              )


class MessageHandlerImpl2(MessageHandler):
    """this method is an call back handler to receive message"""

    def on_message(self, message: 'InboundMessage'):
        """ Message receive callback """
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


class HowToAddAndRemoveSubscriptionSampler:
    """
    class to show how to create a messaging service
    """

    @staticmethod
    def direct_message_consume_adding_subscriptions(messaging_service: MessagingService, consumer_subscription: str,
                                                    listener_topics: list):
        """ to publish str or byte array type message
            Args:
                messaging_service: connected messaging service
                consumer_subscription: Each topic subscribed
                listener_topics: list of topics subscribed to
        """
        try:
            global MAX_SLEEP
            topics = [TopicSubscription.of(consumer_subscription)]

            direct_receive_service = messaging_service.create_direct_message_receiver_builder()
            direct_receive_service = direct_receive_service.with_subscriptions(topics).build()
            direct_receive_service.start()
            direct_receive_service.receive_async(MessageHandlerImpl1())
            for topic in listener_topics:
                direct_receive_service.add_subscription(TopicSubscription.of(topic))

            print(f"Subscribed to: {consumer_subscription}")
            time.sleep(MAX_SLEEP)
        finally:
            direct_receive_service.terminate()

    @staticmethod
    def direct_message_consume_removing_subscriptions(messaging_service: MessagingService, consumer_subscription: str,
                                                      listener_topics: list):
        """ to publish str or byte array type message
              Args:
                messaging_service: connected messaging service
                consumer_subscription: Each topic subscribed
                listener_topics: list of topics subscribed to
        """
        try:
            global MAX_SLEEP
            topics = [TopicSubscription.of(consumer_subscription)]

            direct_receive_service = messaging_service.create_direct_message_receiver_builder()
            direct_receive_service = direct_receive_service.with_subscriptions(topics).build()
            direct_receive_service.start()
            direct_receive_service.receive_async(MessageHandlerImpl2())
            for topic in listener_topics:
                direct_receive_service.remove_subscription(TopicSubscription.of(topic))

            print(f"Subscribed to: {consumer_subscription}")
            time.sleep(MAX_SLEEP)
        finally:
            direct_receive_service.terminate()

    @staticmethod
    def run():
        service = MessagingService.builder().from_properties(boot.broker_properties()).build()
        service.connect()
        consumer_subscription = constants.TOPIC_ENDPOINT_DEFAULT
        listener_topics = ['try-me', 'try-me1',
                           'try-me2',
                           'try-me3']

        HowToAddAndRemoveSubscriptionSampler() \
            .direct_message_consume_adding_subscriptions(service, consumer_subscription, listener_topics)
        HowToAddAndRemoveSubscriptionSampler() \
            .direct_message_consume_removing_subscriptions(service, consumer_subscription, listener_topics)

    @staticmethod
    def publish_and_subscribe():
        """method for running the publisher and subscriber"""
        with ThreadPoolExecutor(max_workers=2) as e:
            e.submit(HowToAddAndRemoveSubscriptionSampler.run)
            e.submit(HowToDirectPublishMessage.run)


if __name__ == '__main__':
    HowToAddAndRemoveSubscriptionSampler.publish_and_subscribe()
