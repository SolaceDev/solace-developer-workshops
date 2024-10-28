"""Sampler to describe the use of Solace SDT Maps and Streams in Python"""
import os
import time
from concurrent.futures.thread import ThreadPoolExecutor
from solace.messaging.receiver.direct_message_receiver import DirectMessageReceiver
from solace.messaging.utils.manageable import Metric
from howtos.how_to_access_api_metrics import HowToAccessApiMetrics
from solace.messaging.messaging_service import MessagingService, ReconnectionListener, ReconnectionAttemptListener, \
    ServiceInterruptionListener, ServiceEvent
from solace.messaging.publisher.direct_message_publisher import PublishFailureListener, FailedPublishEvent
from solace.messaging.resources.topic_subscription import TopicSubscription
from solace.messaging.receiver.message_receiver import MessageHandler
from solace.messaging.resources.topic import Topic
from typing import TypeVar, Generic
from howtos.sampler_boot import SamplerBoot, SolaceConstants

TOPIC_PREFIX = "samples/hello"
SHUTDOWN = False

X = TypeVar('X')
constants = SolaceConstants
boot = SamplerBoot()


class MyData(Generic[X]):
    """ sample  class for business object"""
    name = 'some string'

    def __init__(self, name):
        self.name = name

    def get_name(self):
        """ return the name"""
        return self.name


# Handle received messages
class MessageHandlerImpl(MessageHandler):
    def on_message(self, message: 'InboundMessage'):
        print("\n..................................................")
        print("\nReceiving message....")
        print(f"Message received as dictionary: {message.get_payload_as_dictionary()}")
        print(f"Message received as list: {message.get_payload_as_list()}")
        print(f"Message received as string: {message.get_payload_as_string()}")
        print("..................................................\n")


# classes for error handling
class ServiceEventHandler(ReconnectionListener, ReconnectionAttemptListener, ServiceInterruptionListener):
    def on_reconnected(self, e: ServiceEvent):
        print("\non_reconnected")
        print(f"Error cause: {e.get_cause()}")
        print(f"Message: {e.get_message()}")

    def on_reconnecting(self, e: "ServiceEvent"):
        print("\non_reconnecting")
        print(f"Error cause: {e.get_cause()}")
        print(f"Message: {e.get_message()}")

    def on_service_interrupted(self, e: "ServiceEvent"):
        print("\non_service_interrupted")
        print(f"Error cause: {e.get_cause()}")
        print(f"Message: {e.get_message()}")


class PublisherErrorHandling(PublishFailureListener):
    def on_failed_publish(self, e: "FailedPublishEvent"):
        print("on_failed_publish")


class HowToWorkWithSolaceSDTTypesAndMessages:
    """
    class to show how to create a messaging service
    """

    @staticmethod
    def publish_SDTMap(messaging_service: MessagingService, destination, message):
        """ to publish message"""
        # Create a direct message publisher and start it
        try:
            direct_publisher = messaging_service.create_direct_message_publisher_builder().build()
            direct_publisher.set_publish_failure_listener(PublisherErrorHandling())
            # direct_publisher.set_publisher_readiness_listener()

            # Blocking Start thread
            direct_publisher.start()
            print(f'Direct Publisher ready?  {direct_publisher.is_ready()}')
            print("Publishing message... : ", message)
            direct_publisher.publish(destination=destination, message=message)
            print("Message published!")
        finally:
            direct_publisher.terminate(500000)
            print("Publisher disconnected!")

    @staticmethod
    def consume_just_SDTMapStream_payload(messaging_service, consumer_subscription):
        """ to consume message"""
        print("consume here testing")
        try:
            # Create a direct message publisher and start it
            direct_publisher = messaging_service.create_direct_message_publisher_builder().build()
            # Blocking Start thread
            direct_publisher.start()
            print("messaging_service in consumer : ", messaging_service)
            topics = [TopicSubscription.of(consumer_subscription)]
            receiver: DirectMessageReceiver = messaging_service.create_direct_message_receiver_builder() \
                .with_subscriptions(topics).build()
            print("Receiver started...")
            receiver.start()

            # Callback for received messages
            receiver.receive_async(MessageHandlerImpl())
            MESSAGE_TO_SEND = [[1, 'c', None, bytearray(b'1'), {'a': 2}, True, 5.5],
                               ({"key1": 1, "key2": 2}, {"key1": 'value1', "key2": 2},
                                {"key1": tuple(["John", "Doe", "Alice"])}),
                               {"key1": 'value1',
                                "key2": True,
                                "key3": {"key31": None, "key32": {"5": 6, "7": {"8": 9}}},
                                "key4": [1.1, None, 3, {"key42": [1, 2, 3]}],
                                "key5": bytearray([0x13, 0x11, 0x10, 0x09, 0x08, 0x01]),
                                "key6": '',
                                "key7": (1, 2, 3)},
                               {"1": 2, "3": {"5": 6, "7": {"8": 9}, "11": {"a": "b", "c": [1, 2, 3]}}},
                               'hello everyone']
            tasks = []
            with ThreadPoolExecutor() as executor:
                for message in MESSAGE_TO_SEND:
                    future = executor.submit(HowToWorkWithSolaceSDTTypesAndMessages.publish_SDTMap,
                                             messaging_service=messaging_service,
                                             destination=Topic.of(consumer_subscription), message=message)
                    tasks.append(future)
                # can wait of tasks or wait for for first task using concurrent.futures methods
            # on context exit all pending tasks in the executor must complete
        finally:
            print("Terminating receiver")
            receiver.terminate()

    @staticmethod
    def run():
        try:
            os.environ.get('SOLACE_HOST')
            messaging_service = MessagingService.builder().from_properties(boot.broker_properties()).build()
            # Blocking connect thread
            messaging_service.connect()
            service_handler = ServiceEventHandler()
            messaging_service.add_reconnection_listener(service_handler)
            messaging_service.add_reconnection_attempt_listener(service_handler)
            messaging_service.add_service_interruption_listener(service_handler)
            consumer_subscription = constants.TOPIC_ENDPOINT_DEFAULT
            print("messaging_service : ", messaging_service)
            HowToWorkWithSolaceSDTTypesAndMessages() \
                .consume_just_SDTMapStream_payload(messaging_service, consumer_subscription)
        finally:
            print("Disconnecting Messaging Service...")
            api_metrics = HowToAccessApiMetrics()
            api_metrics.access_individual_api_metrics(messaging_service, Metric.TOTAL_MESSAGES_SENT)
            api_metrics.to_string_api_metrics(messaging_service)
            messaging_service.disconnect()


if __name__ == '__main__':
    HowToWorkWithSolaceSDTTypesAndMessages().run()
