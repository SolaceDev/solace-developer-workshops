"""module to handle service interruption and failures"""

from solace.messaging.messaging_service import MessagingService, ServiceInterruptionListener, ServiceEvent
from solace.messaging.publisher.direct_message_publisher import PublishFailureListener
from solace.messaging.receiver.inbound_message import InboundMessage
from solace.messaging.receiver.persistent_message_receiver import PersistentMessageReceiver
from solace.messaging.resources.queue import Queue
from solace.messaging.resources.topic import Topic
from solace.messaging.utils.life_cycle_control import TerminationNotificationListener
from howtos.sampler_boot import SamplerBoot, SolaceConstants

constants = SolaceConstants
boot = SamplerBoot()


class PublishFailureListenerImpl(PublishFailureListener):
    def on_failed_publish(self, failed_publish_event: 'FailedPublishEvent'):
        print(f"fail_destination name:{failed_publish_event.get_destination()}\n"
              f"fail_message:{failed_publish_event.get_message()}\n"
              f"fail_timestamp:{failed_publish_event.get_timestamp()}\n"
              f"fail_exception:{failed_publish_event.get_exception()}\n")


class ServiceInterruptionListenerImpl(ServiceInterruptionListener):
    """implementation class for the service interruption listener"""

    def on_service_interrupted(self, event: ServiceEvent):
        print("Service Interruption Listener Callback")
        print(f"Timestamp: {event.get_time_stamp()}")
        print(f"Uri: {event.get_broker_uri()}")
        print(f"Error cause: {event.get_cause()}")
        print(f"Message: {event.get_message()}")


class TerminationNotificationListenerImpl(TerminationNotificationListener):
    """implementation class for the termination notification listener"""

    def on_termination(self, termination_notification_event: 'TerminationNotificationEvent'):
        print("Termination Notification Listener Callback")
        print(f"Timestamp: {termination_notification_event.timestamp()}")
        print(f"Error cause: {termination_notification_event.cause()}")
        print(f"Message: {termination_notification_event.message()}")


class HowToHandleServiceInterruptionAndFailures:

    @staticmethod
    def notify_about_service_access_unrecoverable_interruption(messaging_service, destination_name, message):
        """example how to configure service access to receive notifications about unrecoverable interruption

        Returns:
            configured instance of messaging service
        """
        try:
            service_interruption_listener = ServiceInterruptionListenerImpl()
            messaging_service.add_service_interruption_listener(service_interruption_listener)

            direct_publish_service = messaging_service.create_direct_message_publisher_builder() \
                .build()
            direct_publish_service.start()
            direct_publish_service.publish(destination=destination_name, message=message)

            return messaging_service
        finally:
            messaging_service.remove_service_interruption_listener(service_interruption_listener)

    @staticmethod
    def notify_on_direct_publisher_failures(messaging_service: MessagingService, destination_name, message,
                                            buffer_capacity, message_count):
        """
        configure direct message publisher to receive notifications about publish
        failures if any occurred
        """
        try:
            direct_publish_service = messaging_service.create_direct_message_publisher_builder() \
                .on_back_pressure_reject(buffer_capacity=buffer_capacity) \
                .build()
            direct_publish_service.start()
            publish_failure_listener = PublishFailureListenerImpl()
            direct_publish_service.set_publish_failure_listener(publish_failure_listener)
            outbound_msg = messaging_service.message_builder() \
                .with_application_message_id(constants.APPLICATION_MESSAGE_ID) \
                .build(message)
            direct_publish_service.publish(destination=destination_name, message=outbound_msg)

        finally:
            direct_publish_service.terminate_async()

    @staticmethod
    def notify_about_persistent_receiver_termination(messaging_service, queue):
        """example how to configure service access to receive notifications about persistent receiver terminations
            On termination of the persistent message receiver due to session or flow events, an
            asynchronous notification event is generated which explains the cause for the failure
            and the failure timestamp at which the exception was raised.
         """
        receiver: PersistentMessageReceiver = messaging_service.create_persistent_message_receiver_builder() \
            .build(queue)
        receiver_failure_listener = TerminationNotificationListenerImpl()
        receiver.set_termination_notification_listener(receiver_failure_listener)


    @staticmethod
    def run():
        try:
            messaging_service = MessagingService.builder().from_properties(boot.broker_properties()).build()
            messaging_service.connect()
            destination_name = Topic.of(constants.TOPIC_ENDPOINT_DEFAULT)
            buffer_capacity = 20
            message_count = 50
            queue_name = 'Q/test/pub_sub'
            durable_exclusive_queue = Queue.durable_exclusive_queue(queue_name)

            HowToHandleServiceInterruptionAndFailures.notify_on_direct_publisher_failures(messaging_service,
                                                                                          destination_name,
                                                                                          constants.MESSAGE_TO_SEND,
                                                                                          buffer_capacity,
                                                                                          message_count)
            HowToHandleServiceInterruptionAndFailures. \
                notify_about_service_access_unrecoverable_interruption(messaging_service,
                                                                       destination_name, constants.MESSAGE_TO_SEND)

            HowToHandleServiceInterruptionAndFailures. \
                notify_about_persistent_receiver_termination(messaging_service, queue=durable_exclusive_queue)

        finally:
            messaging_service.disconnect()


if __name__ == '__main__':
    HowToHandleServiceInterruptionAndFailures.run()
