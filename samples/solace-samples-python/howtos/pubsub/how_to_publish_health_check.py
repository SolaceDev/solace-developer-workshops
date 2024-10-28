"""sampler for publish health check"""
from typing import TypeVar

from solace.messaging.errors.pubsubplus_client_error import PublisherOverflowError
from solace.messaging.messaging_service import MessagingService
from solace.messaging.publisher.publisher_health_check import PublisherReadinessListener
from solace.messaging.resources.topic import Topic
from howtos.sampler_boot import SamplerBoot, SolaceConstants, SamplerUtil

X = TypeVar('X')
constants = SolaceConstants
boot = SamplerBoot()


class PublisherReadinessListenerImpl(PublisherReadinessListener):
    def __init__(self):
        self._invocation_counter = 0

    def ready(self):
        HowToDirectMessagingHealthCheckSampler.PUBLISHER_READINESS_RECEIVED_COUNTER += 1
        print(f"\nNOTIFIED. "
              f"counter #{HowToDirectMessagingHealthCheckSampler.PUBLISHER_READINESS_RECEIVED_COUNTER}")
        HowToDirectMessagingHealthCheckSampler.CAN_SEND_MESSAGE = True


class HowToDirectMessagingHealthCheckSampler:
    """
    class to show how to create a messaging service
    """
    PUBLISHER_READINESS_SET_COUNTER = 0
    PUBLISHER_READINESS_RECEIVED_COUNTER = 0
    CAN_SEND_MESSAGE = True
    WOULD_BLOCK_RECEIVED = False

    @staticmethod
    def direct_message_publish_on_backpressure_reject(messaging_service: MessagingService, destination, message,
                                                      buffer_capacity, message_count):
        """ to publish str or byte array type message using back pressure"""
        try:
            direct_publish_service = messaging_service.create_direct_message_publisher_builder() \
                .on_back_pressure_reject(buffer_capacity=buffer_capacity) \
                .build()
            direct_publish_service.start_async()

            HowToDirectMessagingHealthCheckSampler.PUBLISHER_READINESS_SET_COUNTER += 1
            direct_publish_service.set_publisher_readiness_listener(listener=PublisherReadinessListenerImpl())

            for e in range(message_count):
                direct_publish_service.publish(destination=destination, message=message)
                print(f"{e} message(s) sent")
        except PublisherOverflowError:
            PublisherOverflowError("Queue maximum limit is reached")
        finally:
            direct_publish_service.terminate()

    @staticmethod
    def direct_message_publish_without_backpressure(messaging_service: MessagingService, destination, message,
                                                    message_count):
        """ to publish str or byte array type message using back pressure"""
        try:
            direct_publish_service = messaging_service.create_direct_message_publisher_builder() \
                .build()
            direct_publish_service.start_async()

            HowToDirectMessagingHealthCheckSampler.PUBLISHER_READINESS_SET_COUNTER += 1
            direct_publish_service.set_publisher_readiness_listener(listener=PublisherReadinessListenerImpl())

            for e in range(message_count):
                direct_publish_service.publish(destination=destination, message=message)
                print(f"{e} message(s) sent")
        except PublisherOverflowError:
            PublisherOverflowError("Queue maximum limit is reached")
        finally:
            direct_publish_service.terminate()

    @staticmethod
    def run():
        """
        :return:
        """
        service = None
        try:
            service = MessagingService.builder().from_properties(boot.broker_properties()).build()
            service.connect()
            print(f"Message service: {service.is_connected}")
            if service.is_connected:
                destination_name = Topic.of(constants.TOPIC_ENDPOINT_DEFAULT)
                message_count = 10

                print("Execute Direct Publish - String without using back pressure")
                HowToDirectMessagingHealthCheckSampler() \
                    .direct_message_publish_without_backpressure(service, destination_name,
                                                                 constants.MESSAGE_TO_SEND,
                                                                 message_count)

                buffer_capacity = 100
                print("Execute Direct Publish - String using back pressure")
                HowToDirectMessagingHealthCheckSampler() \
                    .direct_message_publish_on_backpressure_reject(service, destination_name,
                                                                   constants.MESSAGE_TO_SEND,
                                                                   buffer_capacity, message_count)
            else:
                print(f'Failed to connect service with properties: {boot.broker_properties()}')
        finally:
            if service:
                service.disconnect()


if __name__ == '__main__':
    HowToDirectMessagingHealthCheckSampler().run()
