"""
This module describes only some of the ways that the queue partition key can be set.
It can also be set using the key - value pattern used for other properties
elsewhere in the API.
"""

from solace.messaging.messaging_service import MessagingService
from solace.messaging.config.solace_constants import message_user_property_constants
from howtos.sampler_boot import SamplerBoot

boot = SamplerBoot()

class HowToSetPartitionKey:
    """Class containing methods for setting partition keys on outbound messages"""

    @staticmethod
    def set_queue_partition_key_using_with_property(queue_partition_key_value: str, messaging_service: "MessagingService"):
        """
        Set the queue partition key on the outbound message using the `with_property()` builder method.
        """

        payload = "my_payload"
        outbound_message = messaging_service \
                         .message_builder() \
                         .with_property(message_user_property_constants.QUEUE_PARTITION_KEY, queue_partition_key_value) \
                         .build(payload)
        return outbound_message
        # This message can later be published

    @staticmethod
    def set_queue_partition_key_using_from_properties(queue_partition_key_value: str, messaging_service: "MessagingService"):
        """
        Set the queue partition key on the outbound message using the `from_properties()` builder method.
        """

        payload = "my_payload"
        additional_properties = {message_user_property_constants.QUEUE_PARTITION_KEY, queue_partition_key_value}
        outbound_message = messaging_service \
                            .message_builder() \
                            .from_properties(additional_properties) \
                            .build(payload)
        return outbound_message
        # This message can later be published

    @staticmethod
    def run():
        """Method to run the sampler"""
        try:
            service = MessagingService.builder().from_properties(boot.broker_properties()).build()
            service.connect()
            partition_key = "key"

            with_property_message_partition_key = HowToSetPartitionKey().set_queue_partition_key_using_with_property(partition_key, service)
            from_properties_message_partition_key = HowToSetPartitionKey().set_queue_partition_key_using_from_properties(partition_key, service)
        finally:
            service.disconnect()


if __name__ == '__main__':
    HowToSetPartitionKey().run()
