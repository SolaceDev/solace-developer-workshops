"""sampler to consume persistent message using message replay(with_message_replay)"""
# Note to run this file replay feature needs to be enabled in broker

import threading
from datetime import datetime
from typing import TypeVar

from solace.messaging.config.replay_strategy import ReplayStrategy
from solace.messaging.messaging_service import MessagingService
from solace.messaging.receiver.inbound_message import InboundMessage
from solace.messaging.receiver.persistent_message_receiver import PersistentMessageReceiver
from solace.messaging.resources.queue import Queue
from solace.messaging.resources.topic import Topic
from howtos.sampler_boot import SolaceConstants, SamplerBoot
from howtos.sampler_master import SamplerMaster

X = TypeVar('X')
constants = SolaceConstants
boot = SamplerBoot()
lock = threading.Lock()
topic_name = constants.TOPIC_ENDPOINT_DEFAULT
topic = Topic.of(topic_name)


class HowToTriggerReplayPersistentMessage:
    """class contains methods to trigger All and Time Based message replays"""

    @staticmethod
    def all_messages_replay(service: MessagingService, queue_to_consume: Queue):
        receiver = None
        try:
            reply_strategy = ReplayStrategy.all_messages()
            receiver: PersistentMessageReceiver = service.create_persistent_message_receiver_builder() \
                .with_message_replay(reply_strategy).build(queue_to_consume)
            receiver.start()
            message: InboundMessage = receiver.receive_message(timeout=5000)
            if message:
                print(f"the message payload is {message.get_payload_as_string()}")
                receiver.ack()
        finally:
            if receiver:
                receiver.terminate()

    @staticmethod
    def time_based_replay(service: MessagingService, queue_to_consume: Queue):
        receiver = None
        try:
            reply_strategy = ReplayStrategy.time_based(datetime.now())  # replay_date can be earlier/equal to the date of the message publish was done

            receiver: PersistentMessageReceiver = service.create_persistent_message_receiver_builder() \
                .with_message_replay(reply_strategy).build(queue_to_consume)
            receiver.start()
            message: InboundMessage = receiver.receive_message(timeout=5000)
            if message:
                print(f"the message payload is {message.get_payload_as_string()}")
                receiver.ack()
        finally:
            if receiver:
                receiver.terminate()

    @staticmethod
    def id_based_replay(service: MessagingService, queue_to_consume: Queue,
                        restored_replication_group_message_id: 'ReplicationGroupMessageId'):
        """Showcase for API to trigger message replay using string representation of a replication group message Id"""
        receiver = None
        try:
            reply_strategy = ReplayStrategy.replication_group_message_id_based(restored_replication_group_message_id)

            receiver: PersistentMessageReceiver = service.create_persistent_message_receiver_builder() \
                .with_message_replay(reply_strategy).build(queue_to_consume)
            receiver.start()
            message: InboundMessage = receiver.receive_message(timeout=5000)
            if message:
                print(f"the message payload is {message.get_payload_as_string()}")
                receiver.ack()
        finally:
            if receiver:
                receiver.terminate()

    @staticmethod
    def get_replication_group_message_id_string_from_inbound_message(previously_received_message: InboundMessage):
        """ Showcase for API to retrieve ReplicationGroupMessageId in a string format. This string can be
            stored in between to be restored to the ReplicationGroupMessageId object later and used in the
            api to trigger message replay or it can also be used for administratively triggered message
            replay via SEMP or CLI interface"""
        original_replication_group_message_id = previously_received_message.get_replication_group_message_id()
        return str(original_replication_group_message_id)

    @staticmethod
    def compare(restored_replication_group_message_id: 'ReplicationGroupMessageId', second_message: InboundMessage):
        """ Attempts to compare a given instance of ReplicationGroupMessageId with an another
        instance for order."""
        restored_replication_group_message_id.compare(second_message.get_replication_group_message_id())

    @staticmethod
    def run():
        messaging_service = None
        try:
            # we're assuming replay_log is already created and pub/sub is already done in the queue/topic
            queue_name = 'Q/test/replay/pub_sub'
            messaging_service = SamplerMaster.connect_messaging_service()
            durable_exclusive_queue = Queue.durable_exclusive_queue(queue_name)
            HowToTriggerReplayPersistentMessage \
                .all_messages_replay(service=messaging_service, queue_to_consume=durable_exclusive_queue)
            HowToTriggerReplayPersistentMessage \
                .time_based_replay(service=messaging_service, queue_to_consume=durable_exclusive_queue)
        finally:
            if messaging_service:
                messaging_service.disconnect()


if __name__ == '__main__':
    HowToTriggerReplayPersistentMessage.run()
