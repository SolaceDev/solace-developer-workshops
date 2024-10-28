"""sampler to consume persistent message with auto acknowledgement"""

import threading
from typing import TypeVar

from solace.messaging.messaging_service import MessagingService
from solace.messaging.receiver.inbound_message import InboundMessage
from solace.messaging.receiver.persistent_message_receiver import PersistentMessageReceiver
from solace.messaging.resources.queue import Queue
from solace.messaging.resources.topic import Topic
from solace.messaging.resources.topic_subscription import TopicSubscription
from howtos.pubsub.how_to_consume_persistent_message import HowToConsumeMessageExclusiveVsSharedMode
from howtos.pubsub.how_to_publish_persistent_message import HowToPublishPersistentMessage
from howtos.sampler_boot import SolaceConstants, SamplerBoot, BasicTestMessageHandler
from howtos.sampler_master import SamplerMaster

X = TypeVar('X')
constants = SolaceConstants
boot = SamplerBoot()
lock = threading.Lock()

topic_name = constants.TOPIC_ENDPOINT_DEFAULT
topic = Topic.of(topic_name)


class HowToConsumePersistentMessageWithAutoAcknowledgement:
    """class contains methods to consume message with auto acknowledgement"""

    @staticmethod
    def consume_full_message_and_do_ack(service: MessagingService, queue_to_consume: Queue, publisher, message):
        receiver: PersistentMessageReceiver = service.create_persistent_message_receiver_builder() \
            .with_message_auto_acknowledgement().build(queue_to_consume)
        receiver.start()
        print(f'PERSISTENT receiver started... Listening to Queue [{queue_to_consume.get_name()}]')
        receiver.add_subscription(TopicSubscription.of(topic_name))

        HowToPublishPersistentMessage.publish_string_message_non_blocking(publisher, topic, message)

        message: InboundMessage = receiver.receive_message()
        print(f"the message payload is {message.get_payload_as_string()}")

    @staticmethod
    def consume_full_message_using_callback_and_do_ack(service: MessagingService, queue_to_consume: Queue,
                                                       publisher, message):
        try:
            receiver: PersistentMessageReceiver = service.create_persistent_message_receiver_builder() \
                .with_message_auto_acknowledgement().build(queue_to_consume)
            receiver.start()
            print(f'PERSISTENT receiver started... Listening to Queue [{queue_to_consume.get_name()}]')
            receiver.add_subscription(TopicSubscription.of(topic_name))
            message_handler = BasicTestMessageHandler()
            receiver.receive_async(message_handler)

            HowToPublishPersistentMessage.publish_string_message_non_blocking(publisher, topic, message)
        finally:
            receiver.terminate()
            HowToConsumeMessageExclusiveVsSharedMode.delete_queue(queue_to_consume.get_name())

    @staticmethod
    def run():
        try:
            message = constants.MESSAGE_TO_SEND
            messaging_service = SamplerMaster.connect_messaging_service()

            publisher = HowToPublishPersistentMessage.create_persistent_message_publisher(messaging_service)

            queue_name = constants.QUEUE_NAME_FORMAT.substitute(iteration=topic_name)
            HowToConsumeMessageExclusiveVsSharedMode.create_queue_and_add_topic(queue_name)
            durable_exclusive_queue = Queue.durable_exclusive_queue(queue_name)

            HowToConsumePersistentMessageWithAutoAcknowledgement \
                .consume_full_message_and_do_ack(service=messaging_service, queue_to_consume=durable_exclusive_queue,
                                                 publisher=publisher, message=message)

            HowToConsumePersistentMessageWithAutoAcknowledgement \
                .consume_full_message_using_callback_and_do_ack(service=messaging_service,
                                                                queue_to_consume=durable_exclusive_queue,
                                                                publisher=publisher, message=message)
        finally:
            messaging_service.disconnect()


if __name__ == '__main__':
    HowToConsumePersistentMessageWithAutoAcknowledgement.run()
