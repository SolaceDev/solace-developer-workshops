""" Run this file to publish a business object using direct message publisher"""
import pickle

from solace.messaging.messaging_service import MessagingService
from solace.messaging.resources.topic import Topic
from solace.messaging.utils.converter import ObjectToBytes
from howtos.sampler_boot import SamplerBoot, SolaceConstants, MyData

constants = SolaceConstants
boot = SamplerBoot()


class PopoConverter(ObjectToBytes):  # plain old python object - popo
    """sample converter class"""

    def to_bytes(self, src) -> bytes:
        """This Method converts the given business object to bytes"""

        object_to_byte = pickle.dumps(src)
        return object_to_byte


class HowToDirectMessagePublishBusinessObject:
    """this class contains methods to publish a business object"""

    @staticmethod
    def direct_message_publish_outbound_business_obj(messaging_service: MessagingService, destination, message_obj,
                                                     converter):
        """ to publish outbound message from a custom object supplied with its own converter"""
        try:
            direct_publish_service = messaging_service.create_direct_message_publisher_builder().\
                on_back_pressure_reject(buffer_capacity=0).build()
            publish_start = direct_publish_service.start_async()
            publish_start.result()
            outbound_msg = messaging_service.message_builder() \
                .with_application_message_id(constants.APPLICATION_MESSAGE_ID) \
                .build(message_obj, converter=converter)
            direct_publish_service.publish(destination=destination, message=outbound_msg)
        finally:
            direct_publish_service.terminate()

    @staticmethod
    def run():
        """
            this method creates a messaging service connection and publishes the message
         """
        service = MessagingService.builder().from_properties(boot.broker_properties()).build()
        try:
            service.connect()
            destination_name = Topic.of(constants.TOPIC_ENDPOINT_DEFAULT)
        
            print("Execute Direct Publish - Generics Outbound Message")
            HowToDirectMessagePublishBusinessObject() \
                .direct_message_publish_outbound_business_obj(service, destination_name,
                                                              message_obj=MyData('some value'),
                                                              converter=PopoConverter())
        finally:
            service.disconnect()


if __name__ == '__main__':
    HowToDirectMessagePublishBusinessObject().run()
