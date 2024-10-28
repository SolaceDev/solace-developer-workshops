""" Run this file to publish and consume a business object using direct message publisher and receiver,
 also how to build the business object and retrieve using the MessageHandler"""
import pickle
import time
from concurrent.futures.thread import ThreadPoolExecutor
from typing import TypeVar

from solace.messaging.messaging_service import MessagingService
from solace.messaging.receiver.inbound_message import InboundMessage
from solace.messaging.receiver.message_receiver import MessageHandler
from solace.messaging.resources.topic_subscription import TopicSubscription
from solace.messaging.utils.converter import BytesToObject
from howtos.pubsub.how_to_direct_publish_business_obj import \
    HowToDirectMessagePublishBusinessObject
from howtos.sampler_boot import SamplerBoot, SolaceConstants, MyData

X = TypeVar('X')
constants = SolaceConstants
boot = SamplerBoot()
MAX_SLEEP = 10


class ByteToObjectConverter(BytesToObject):
    """sample converter class to convert byte array to object"""

    def convert(self, src: bytearray) -> X:
        """This method converts the received byte array to an business object"""
        byte_to_object = pickle.loads(src)
        return byte_to_object


class MessageHandlerImpl(MessageHandler):
    """this method is an call back handler to receive message"""

    def on_message(self, message: 'InboundMessage'):
        """ Message receive callback """
        topic = message.get_destination_name()
        payload_as_bytes = message.get_and_convert_payload(converter=ByteToObjectConverter(),
                                                           output_type=type(MyData(constants.MESSAGE_TO_SEND)))
        payload_as_string = message.get_payload_as_string()
        correlation_id = message.get_correlation_id()
        print("\n" + f"CALLBACK: Message Received on Topic: {topic}.\n"
                     f"Message Bytes: {payload_as_bytes} \n"
                     f"Message String: {payload_as_string} \n"
                     f"Correlation id: {correlation_id}")


class HowToDirectConsumeBusinessObjectSampler:
    """
    class to show how to receive an business object
    """

    @staticmethod
    def direct_message_consume_for_business_obj(messaging_service: MessagingService, consumer_subscription: str):
        """ to publish str or byte array type message"""
        try:
            global MAX_SLEEP
            topics = [TopicSubscription.of(consumer_subscription)]

            direct_receive_service = messaging_service.create_direct_message_receiver_builder()
            direct_receive_service = direct_receive_service.with_subscriptions(topics).build()
            direct_receive_service.start()
            direct_receive_service.receive_async(MessageHandlerImpl())
            print(f"Subscribed to: {consumer_subscription}")
            time.sleep(MAX_SLEEP)
        finally:
            direct_receive_service.terminate()
            messaging_service.disconnect()

    @staticmethod
    def run():
        service = MessagingService.builder().from_properties(boot.broker_properties()).build()
        service.connect()
        consumer_subscription = constants.TOPIC_ENDPOINT_DEFAULT

        print("Execute Direct Consume - String")
        HowToDirectConsumeBusinessObjectSampler(). \
            direct_message_consume_for_business_obj(service, consumer_subscription)
        service.disconnect()
    @staticmethod
    def publish_and_subscribe():
        """this method will run the subscriber instance and publisher instance in different threads"""
        with ThreadPoolExecutor(max_workers=2) as e:
            e.submit(HowToDirectConsumeBusinessObjectSampler.run)
            e.submit(HowToDirectMessagePublishBusinessObject.run)


if __name__ == '__main__':
    HowToDirectConsumeBusinessObjectSampler().publish_and_subscribe()
