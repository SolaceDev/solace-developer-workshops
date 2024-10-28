""" Run this file to publish messages using direct message publisher with back pressure scenarios"""
from typing import TypeVar

from solace.messaging.errors.pubsubplus_client_error import PublisherOverflowError
from solace.messaging.messaging_service import MessagingService
from solace.messaging.resources.topic import Topic
from howtos.sampler_boot import SamplerBoot, SolaceConstants, SamplerUtil

X = TypeVar('X')
constants = SolaceConstants
boot = SamplerBoot()
util = SamplerUtil()


class HowToDirectPublishWithBackPressureSampler:
    """
    class to show how to create a messaging service
    """

    @staticmethod
    def direct_message_publish_on_backpressure_reject(messaging_service: MessagingService, destination, message,
                                                      buffer_capacity, message_count):
        """ to publish str or byte array type message using back pressure"""
        try:
            direct_publish_service = messaging_service.create_direct_message_publisher_builder() \
                .on_back_pressure_reject(buffer_capacity=buffer_capacity) \
                .build()
            direct_publish_service.start()
            for e in range(message_count):
                direct_publish_service.publish(destination=destination, message=message)
        except PublisherOverflowError:
            PublisherOverflowError("Queue maximum limit is reached")
        finally:
            direct_publish_service.terminate()

    @staticmethod
    def direct_message_publish_outbound_with_all_props_on_backpressure_on_reject(messaging_service: MessagingService,
                                                                                 destination, message, buffer_capacity,
                                                                                 message_count):
        """ to publish outbound message using back pressure"""
        try:
            direct_publish_service = messaging_service.create_direct_message_publisher_builder() \
                .on_back_pressure_reject(buffer_capacity=buffer_capacity) \
                .build()
            direct_publish_service.start()
            outbound_msg = messaging_service.message_builder() \
                .with_property("custom_key", "custom_value") \
                .with_expiration(SolaceConstants.MESSAGE_EXPIRATION) \
                .with_priority(SolaceConstants.MESSAGE_PRIORITY) \
                .with_sequence_number(SolaceConstants.MESSAGE_SEQUENCE_NUMBER) \
                .with_application_message_id(constants.APPLICATION_MESSAGE_ID) \
                .with_application_message_type("app_msg_type") \
                .with_http_content_header("text/html", "utf-8") \
                .build(message)
            for e in range(message_count):
                direct_publish_service.publish(destination=destination, message=outbound_msg)
        except PublisherOverflowError:
            PublisherOverflowError("Queue maximum limit is reached")
        finally:
            direct_publish_service.terminate()

    @staticmethod
    def direct_message_publish_outbound_with_all_props_on_backpressure_elastic(messaging_service: MessagingService,
                                                                               destination, message, message_count):
        """ to publish outbound message using back pressure"""
        try:
            direct_publish_service = messaging_service.create_direct_message_publisher_builder() \
                .on_back_pressure_elastic() \
                .build()
            direct_publish_service.start()
            outbound_msg = messaging_service.message_builder() \
                .with_property("custom_key", "custom_value") \
                .with_expiration(SolaceConstants.MESSAGE_EXPIRATION) \
                .with_priority(SolaceConstants.MESSAGE_PRIORITY) \
                .with_sequence_number(SolaceConstants.MESSAGE_SEQUENCE_NUMBER) \
                .with_application_message_id(constants.APPLICATION_MESSAGE_ID) \
                .with_application_message_type("app_msg_type") \
                .with_http_content_header("text/html", "utf-8") \
                .build(message)
            for e in range(message_count):
                direct_publish_service.publish(destination=destination, message=outbound_msg)
        finally:
            direct_publish_service.terminate()

    @staticmethod
    def direct_message_publish_outbound_with_all_props_on_backpressure_wait(messaging_service: MessagingService,
                                                                            destination, message, buffer_capacity,
                                                                            message_count):
        """ to publish outbound message using back pressure"""
        try:
            direct_publish_service = messaging_service.create_direct_message_publisher_builder() \
                .on_back_pressure_wait(buffer_capacity=buffer_capacity) \
                .build()
            direct_publish_service.start()
            outbound_msg = messaging_service.message_builder() \
                .with_property("custom_key", "custom_value") \
                .with_expiration(SolaceConstants.MESSAGE_EXPIRATION) \
                .with_priority(SolaceConstants.MESSAGE_PRIORITY) \
                .with_sequence_number(SolaceConstants.MESSAGE_SEQUENCE_NUMBER) \
                .with_application_message_id(constants.APPLICATION_MESSAGE_ID) \
                .with_application_message_type("app_msg_type") \
                .with_http_content_header("text/html", "utf-8") \
                .build(message)
            for e in range(message_count):
                direct_publish_service.publish(destination=destination, message=outbound_msg)
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
            print(f"Message service connected: {service.is_connected}")
            if service.is_connected:
                destination_name = Topic.of(constants.TOPIC_ENDPOINT_DEFAULT)
                message_count = 10
                buffer_capacity = 100
                print("Execute Direct Publish - String using back pressure")
                HowToDirectPublishWithBackPressureSampler() \
                    .direct_message_publish_on_backpressure_reject(service, destination_name, constants.MESSAGE_TO_SEND,
                                                                   buffer_capacity, message_count)

                print("Execute Direct Publish - String Outbound Message with all props using back pressure")
                HowToDirectPublishWithBackPressureSampler(). \
                    direct_message_publish_outbound_with_all_props_on_backpressure_on_reject(service, destination_name,
                                                                                             constants.MESSAGE_TO_SEND
                                                                                             + "_outbound based",
                                                                                             buffer_capacity,
                                                                                             message_count)

                print("Execute Direct Publish - String Outbound Message with all props using back pressure elastic")
                HowToDirectPublishWithBackPressureSampler() \
                    .direct_message_publish_outbound_with_all_props_on_backpressure_elastic(service, destination_name,
                                                                                            constants.MESSAGE_TO_SEND +
                                                                                            "_outbound based",
                                                                                            message_count)

                print("Execute Direct Publish - String Outbound Message with all props using back pressure wait")
                HowToDirectPublishWithBackPressureSampler() \
                    .direct_message_publish_outbound_with_all_props_on_backpressure_wait(service, destination_name,
                                                                                         constants.MESSAGE_TO_SEND
                                                                                         + str("_outbound based"),
                                                                                         buffer_capacity,
                                                                                         message_count)
            else:
                print("failed to connect service with properties: {boot.broker_properties}")

        finally:
            if service:
                service.disconnect()


if __name__ == '__main__':
    HowToDirectPublishWithBackPressureSampler().run()
