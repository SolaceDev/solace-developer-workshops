"""Run this file to subscribe and receive persistent or guaranteed messages using persistent message receiver"""

import threading
import time
from concurrent.futures.thread import ThreadPoolExecutor
from typing import TypeVar

from compose.const import DEFAULT_TIMEOUT
from solace.messaging.messaging_service import MessagingService

from solace.messaging.config.solace_properties import service_properties
from solace.messaging.config.solace_properties.message_properties import CORRELATION_ID, PRIORITY
from solace.messaging.receiver.inbound_message import InboundMessage
from solace.messaging.resources.queue import Queue
from solace.messaging.resources.topic import Topic
from solace.messaging.resources.topic_subscription import TopicSubscription
from howtos.SEMPv2.semp_client import SempClient
from howtos.SEMPv2.semp_utility import SempUtility
from howtos.pubsub.how_to_publish_persistent_message import HowToPublishPersistentMessage
from howtos.sampler_boot import SolaceConstants, SamplerBoot, BasicTestMessageHandler, \
    ReceiverStateChangeListenerImpl
from howtos.sampler_master import SamplerMaster

X = TypeVar('X')
constants = SolaceConstants
boot = SamplerBoot()
lock = threading.Lock()

topic_name = constants.TOPIC_ENDPOINT_DEFAULT
topic = Topic.of(topic_name)

boot = SamplerBoot()
broker_props = boot.broker_properties()
semp_config = boot.read_semp_configuration()

semp_obj = SempClient(semp_base_url=semp_config[SamplerBoot.semp_hostname_key],
                      user_name=semp_config[SamplerBoot.semp_username_key],
                      password=semp_config[SamplerBoot.semp_password_key])

semp = SempUtility(semp_obj)


class HowToConsumeMessageExclusiveVsSharedMode:
    @staticmethod
    def create_persistent_message_receiver(messaging_service, queue):
        """method to create, build and start the persistent message receiver
              Args:
                messaging_service: connected messaging service
                queue: Persistent message queue
              Returns:
                receiver: Persistent receiver object
        """
        receiver = messaging_service.create_persistent_message_receiver_builder().build(queue)
        receiver.start()
        print(f'PERSISTENT receiver started... Listening to Queue [{queue.get_name()}]')
        receiver.add_subscription(TopicSubscription.of(topic_name))
        return receiver

    @staticmethod
    def create_persistent_message_receiver_with_activation_passivation_support(messaging_service, queue,
                                                                               passivation_activation_listener):
        """method to create persistent message receiver with the activation and passivation support
              Args:
                messaging_service: connected messaging service
                passivation_activation_listener: Active and Passive Listener
              Returns:
                receiver: Persistent receiver object
        """
        receiver = messaging_service.create_persistent_message_receiver_builder() \
            .with_activation_passivation_support(receiver_state_change_listener=passivation_activation_listener) \
            .build(queue)
        receiver.start()
        print(f'PERSISTENT receiver started with activation passivation support... '
              f'Listening to Queue [{queue.get_name()}]')
        receiver.add_subscription(TopicSubscription.of(topic_name))
        return receiver

    @staticmethod
    def create_queue_and_add_topic(queue_name: str, access_type="exclusive", egress_enabled=True):
        """method to create queue via SEMP"""
        semp.create_queue(name=queue_name, msg_vpn_name=broker_props[service_properties.VPN_NAME],
                          access_type=access_type, egress_enabled=egress_enabled)

    @staticmethod
    def delete_queue(queue_name: str):
        """method to delete the queue via SEMP"""
        semp.delete_queue(name=queue_name, msg_vpn_name=broker_props[service_properties.VPN_NAME])

    class PersistentMessageReceiverQueueAccessTypes:
        """class contains methods for receiving messages using exclusive queues"""
        @staticmethod
        def receive_from_durable_exclusive_queue(messaging_service, topic, publisher, message):
            """method to receive messages from durable exclusive queue
              Args:
                messaging_service: connected messaging service
                topic: Topic subscribed to
                publisher: Publisher object
                message: Message to be sent
            """
            try:
                queue_name = constants.QUEUE_NAME_FORMAT.substitute(iteration=topic_name)
                HowToConsumeMessageExclusiveVsSharedMode.create_queue_and_add_topic(queue_name)
                durable_exclusive_queue = Queue.durable_exclusive_queue(queue_name)

                receiver = HowToConsumeMessageExclusiveVsSharedMode \
                    .create_persistent_message_receiver(messaging_service, durable_exclusive_queue)

                message_receiver = BasicTestMessageHandler()
                receiver.receive_async(message_receiver)

                HowToPublishPersistentMessage.publish_string_message_non_blocking(publisher, topic, message)
                time.sleep(1)
                print(f'Message received count: {message_receiver.total_message_received_count}')
            finally:
                receiver.terminate()
                HowToConsumeMessageExclusiveVsSharedMode.delete_queue(queue_name)

        @staticmethod
        def receive_from_non_durable_exclusive_queue(messaging_service, topic, publisher, message):
            """method to receive messages from non durable exclusive queue"""
            try:
                queue_name = constants.QUEUE_NAME_FORMAT.substitute(iteration=topic_name)
                non_durable_exclusive_queue = Queue.non_durable_exclusive_queue(queue_name)

                receiver = HowToConsumeMessageExclusiveVsSharedMode \
                    .create_persistent_message_receiver(messaging_service, non_durable_exclusive_queue)

                message_receiver = BasicTestMessageHandler()
                receiver.receive_async(message_receiver)

                HowToPublishPersistentMessage.publish_string_message_non_blocking(publisher, topic, message)
                time.sleep(1)
                print(f'Message received count: {message_receiver.total_message_received_count}')
            finally:
                receiver.terminate()

        @staticmethod
        def receive_from_durable_non_exclusive_queue(messaging_service, topic, publisher, message):
            """method to receive messages from durable non exclusive queue"""
            try:
                queue_name = constants.QUEUE_NAME_FORMAT.substitute(iteration=topic_name)
                HowToConsumeMessageExclusiveVsSharedMode.create_queue_and_add_topic(queue_name,
                                                                                    access_type="non-exclusive")
                durable_non_exclusive_queue = Queue.durable_non_exclusive_queue(queue_name)

                receiver = HowToConsumeMessageExclusiveVsSharedMode \
                    .create_persistent_message_receiver(messaging_service, durable_non_exclusive_queue)

                message_receiver = BasicTestMessageHandler()
                receiver.receive_async(message_receiver)

                HowToPublishPersistentMessage.publish_string_message_non_blocking(publisher, topic, message)
                time.sleep(1)
                print(f'Message received count: {message_receiver.total_message_received_count}')
            finally:
                receiver.terminate()
                HowToConsumeMessageExclusiveVsSharedMode.delete_queue(queue_name)

        @staticmethod
        def receive_with_state_change_listener(messaging_service, topic, publisher, message):
            """method to build and receive messages using receiver state change listener"""
            try:
                queue_name = constants.QUEUE_NAME_FORMAT.substitute(iteration=topic_name)
                HowToConsumeMessageExclusiveVsSharedMode.create_queue_and_add_topic(queue_name)
                durable_non_exclusive_queue = Queue.durable_non_exclusive_queue(queue_name)

                passivation_activation_listener = ReceiverStateChangeListenerImpl()
                receiver = HowToConsumeMessageExclusiveVsSharedMode \
                    .create_persistent_message_receiver_with_activation_passivation_support \
                    (messaging_service, durable_non_exclusive_queue, passivation_activation_listener)

                message_receiver = BasicTestMessageHandler()
                receiver.receive_async(message_receiver)

                semp.shutdown_queue(queue_name=queue_name, msg_vpn_name=broker_props[service_properties.VPN_NAME])
                semp.re_enable_queue(queue_name=queue_name, msg_vpn_name=broker_props[service_properties.VPN_NAME])

                HowToPublishPersistentMessage.publish_string_message_non_blocking(publisher, topic, message)
                time.sleep(1)
                print(f'Message received count: {message_receiver.total_message_received_count}')
            finally:
                receiver.terminate()
                HowToConsumeMessageExclusiveVsSharedMode.delete_queue(queue_name)

    @staticmethod
    def consume_full_message_and_do_ack_using_receive_message(messaging_service, topic, publisher, message):
        """method to consume persistent message and do ack at later time using receive_message"""
        queue_name = constants.QUEUE_NAME_FORMAT.substitute(iteration=topic_name)
        try:
            HowToConsumeMessageExclusiveVsSharedMode.create_queue_and_add_topic(queue_name)
            queue = Queue.durable_exclusive_queue(queue_name)

            receiver = messaging_service.create_persistent_message_receiver_builder() \
                .build(queue)
            receiver.start()
            receiver.add_subscription(TopicSubscription.of(topic_name))
            with ThreadPoolExecutor(max_workers=1) as e:
                time.sleep(2)
                e.submit(HowToPublishPersistentMessage.publish_string_message_non_blocking, publisher, topic, message)
            message_received: 'InboundMessage' = receiver.receive_message(timeout=DEFAULT_TIMEOUT)

            receiver.ack(message_received)
            print(f"received message: {message_received.get_payload_as_string()}")
        finally:
            receiver.terminate()
            HowToConsumeMessageExclusiveVsSharedMode.delete_queue(queue_name=queue_name)

    @staticmethod
    def consume_using_message_selector(messaging_service, topic, publisher, message):
        """method to consume persistent message and do ack at later time using receive_message"""
        try:
            queue_name = constants.QUEUE_NAME_FORMAT.substitute(iteration=topic_name)
            HowToConsumeMessageExclusiveVsSharedMode.create_queue_and_add_topic(queue_name)
            durable_non_exclusive_queue = Queue.durable_non_exclusive_queue(queue_name)

            msg_selector_expression = "JMSCorrelationID = '1' and JMSPriority = 1"

            receiver = messaging_service.create_persistent_message_receiver_builder() \
                .with_message_selector(msg_selector_expression) \
                .build(durable_non_exclusive_queue)

            receiver.start()
            receiver.add_subscription(TopicSubscription.of(topic_name))
            outbound_msg = messaging_service.message_builder() \
                .with_application_message_id(constants.APPLICATION_MESSAGE_ID) \
                .with_priority(constants.MESSAGE_PRIORITY) \
                .with_expiration(constants.MESSAGE_EXPIRATION)

            additional_message_properties = {CORRELATION_ID: '1',
                                             PRIORITY: 1}
            with ThreadPoolExecutor(max_workers=1) as e:
                time.sleep(3)
                e.submit(HowToPublishPersistentMessage.publish_typed_message_with_extended_message_props_non_blocking,
                         outbound_msg, publisher, topic, message, additional_message_properties)

            message_received: 'InboundMessage' = receiver.receive_message(timeout=DEFAULT_TIMEOUT)

            receiver.ack(message_received)
            print(f"received message: {message_received.get_payload_as_string()}")
        finally:
            receiver.terminate()
            HowToConsumeMessageExclusiveVsSharedMode.delete_queue(queue_name=queue_name)

    @staticmethod
    def run():
        try:
            message = constants.MESSAGE_TO_SEND
            messaging_service = MessagingService.builder().from_properties(boot.broker_properties()).build()
            messaging_service.connect()

            publisher = HowToPublishPersistentMessage.create_persistent_message_publisher(messaging_service)

            HowToConsumeMessageExclusiveVsSharedMode\
                .PersistentMessageReceiverQueueAccessTypes\
                .receive_from_durable_exclusive_queue(messaging_service, topic, publisher, message)

            HowToConsumeMessageExclusiveVsSharedMode \
                .PersistentMessageReceiverQueueAccessTypes \
                .receive_from_non_durable_exclusive_queue(messaging_service, topic, publisher, message)

            HowToConsumeMessageExclusiveVsSharedMode \
                .PersistentMessageReceiverQueueAccessTypes \
                .receive_from_durable_non_exclusive_queue(messaging_service, topic, publisher, message)

            HowToConsumeMessageExclusiveVsSharedMode \
                .PersistentMessageReceiverQueueAccessTypes \
                .receive_with_state_change_listener(messaging_service, topic, publisher, message)

            HowToConsumeMessageExclusiveVsSharedMode \
                .consume_full_message_and_do_ack_using_receive_message(messaging_service, topic, publisher, message)

            HowToConsumeMessageExclusiveVsSharedMode \
                .consume_using_message_selector(messaging_service, topic, publisher, message)

        finally:
            publisher.terminate()
            messaging_service.disconnect()


if __name__ == '__main__':
    HowToConsumeMessageExclusiveVsSharedMode().run()
