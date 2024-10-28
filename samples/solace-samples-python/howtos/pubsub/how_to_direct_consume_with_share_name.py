""" Run this file to consume messages using multiple receiver instances and with share name/group name"""
import time
from concurrent.futures.thread import ThreadPoolExecutor
from typing import TypeVar

from solace.messaging.messaging_service import MessagingService
from solace.messaging.receiver.message_receiver import MessageHandler
from solace.messaging.resources.share_name import ShareName
from solace.messaging.resources.topic_subscription import TopicSubscription
from howtos.pubsub.how_to_direct_publish_message import HowToDirectPublishMessage
from howtos.sampler_boot import SamplerBoot, SolaceConstants

X = TypeVar('X')
constants = SolaceConstants
boot = SamplerBoot()
MAX_SLEEP = 10


class MessageHandlerImpl(MessageHandler):
    """this method is an call back handler to receive message"""

    def on_message(self, message: 'InboundMessage'):
        """ Message receive callback """
        topic = message.get_destination_name()
        payload_as_bytes = message.get_payload_as_bytes()
        payload_as_string = message.get_payload_as_string()
        correlation_id = message.get_correlation_id()
        print("\n" + f"Receiver A \n"
                     f"CALLBACK: Message Received on Topic: {topic}.\n"
                     f"Message Bytes: {payload_as_bytes} \n"
                     f"Message String: {payload_as_string} \n"
                     f"Correlation id: {correlation_id}")


class MessageHandlerImpl2(MessageHandler):
    """this method is an call back handler to receive message"""

    def on_message(self, message: 'InboundMessage'):
        """ Message receive callback """
        topic = message.get_destination_name()
        payload_as_bytes = message.get_payload_as_bytes()
        payload_as_string = message.get_payload_as_string()
        correlation_id = message.get_correlation_id()
        print("\n" + f"Receiver B \n"
                     f"CALLBACK: Message Received on Topic: {topic}.\n"
                     f"Message Bytes: {payload_as_bytes} \n"
                     f"Message String: {payload_as_string} \n"
                     f"Correlation id: {correlation_id}")


class HowToDirectConsumeShareNameSampler:
    """ class to show how to create a messaging service """

    @staticmethod
    def direct_message_consume(messaging_service: MessagingService, consumer_subscription: str):
        """This method will create an receiver instance to receive str or byte array type message"""
        try:
            global MAX_SLEEP
            topics = [TopicSubscription.of(consumer_subscription)]
            group_name = ShareName.of('test')
            direct_receive_service = messaging_service.create_direct_message_receiver_builder()
            direct_receive_service = direct_receive_service.with_subscriptions(topics).build(
                shared_subscription_group=group_name)
            direct_receive_service.start()
            direct_receive_service.receive_async(MessageHandlerImpl())
            print(f"Subscribed to: {consumer_subscription}")
            time.sleep(MAX_SLEEP)
        finally:
            direct_receive_service.terminate()
            messaging_service.disconnect()

    @staticmethod
    def direct_message_consume2(messaging_service: MessagingService, consumer_subscription: str):
        """This method will create an receiver instance to receive str or byte array type message"""
        try:
            global MAX_SLEEP
            topics = [TopicSubscription.of(consumer_subscription)]
            group_name = ShareName.of('test')
            direct_receive_service = messaging_service.create_direct_message_receiver_builder()
            direct_receive_service = direct_receive_service.with_subscriptions(topics).build(
                shared_subscription_group=group_name)
            direct_receive_service.start()
            direct_receive_service.receive_async(MessageHandlerImpl2())
            print(f"Subscribed to: {consumer_subscription}")
            time.sleep(MAX_SLEEP)
        finally:
            direct_receive_service.terminate()
            messaging_service.disconnect()

    @staticmethod
    def run():
        """
        :return:
        """
        service = MessagingService.builder().from_properties(boot.broker_properties()).build()
        service.connect()
        consumer_subscription = constants.TOPIC_ENDPOINT_DEFAULT

        print("Execute Direct Consume - String")
        with ThreadPoolExecutor(max_workers=2) as e:
            e.submit(HowToDirectConsumeShareNameSampler.direct_message_consume, service,
                     consumer_subscription)
            e.submit(HowToDirectConsumeShareNameSampler.direct_message_consume2, service,
                     consumer_subscription)
        conn.disconnect()
    @staticmethod
    def publish_and_subscribe():
        """"""
        with ThreadPoolExecutor(max_workers=2) as e:
            e.submit(HowToDirectConsumeShareNameSampler.run)
            e.submit(HowToDirectPublishMessage.run)


if __name__ == '__main__':
    HowToDirectConsumeShareNameSampler().publish_and_subscribe()
