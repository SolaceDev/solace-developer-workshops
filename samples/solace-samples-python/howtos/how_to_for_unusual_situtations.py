"""sampler module for reconnection strategy"""

from solace.messaging.config.retry_strategy import RetryStrategy
from solace.messaging.messaging_service import MessagingService
from solace.messaging.messaging_service import ReconnectionListener, ServiceEvent, ReconnectionAttemptListener
from howtos.sampler_boot import SolaceConstants, SamplerBoot

constants = SolaceConstants
boot = SamplerBoot()


class ReconnectionListenerImpl(ReconnectionListener):
    """reconnection listener impl class"""

    def on_reconnected(self, e: ServiceEvent):
        """callback executed in situation after connection goes down and reconnection is attempted"""
        print("\nIn ReconnectionListenerImpl callback ")
        print(f"Timestamp: {e.get_time_stamp()}")
        print(f"Uri: {e.get_broker_uri()}")
        print(f"Error cause: {e.get_cause()}")
        print(f"Message: {e.get_message()}")


class ReconnectionAttemptListenerImpl(ReconnectionAttemptListener):
    """reconnection attempt listener impl class"""

    def on_reconnecting(self, event: ServiceEvent):
        """ callback executed in situation after connection goes down and reconnection is attempted"""
        print("\n ************************************")
        print("in ReconnectionAttemptListenerImpl callback ")

        print("time stamp : ", event.get_time_stamp())
        print("uri : ", event.get_broker_uri())
        print("error cause : ", event.get_cause())
        print("message : ", event.get_message())
        print("\n ************************************")


class HowToConnectMessagingServiceWithReConnectionStrategy:
    """class for reconnection strategy sampler"""
    @staticmethod
    def when_tcp_reconnection_happens():
        """method to test the listener service event"""
        attempt_listener = ReconnectionAttemptListenerImpl()
        listener = ReconnectionListenerImpl()
        messaging_service = MessagingService.builder().from_properties(boot.broker_properties()) \
            .with_reconnection_retry_strategy(RetryStrategy.parametrized_retry(3, 3)).build(). \
            add_reconnection_attempt_listener(attempt_listener). \
            add_reconnection_listener(listener)
        messaging_service.connect()
        # If message disconnect occurs due to any network issue, service will automatically get connects again
        # Apply some logic to simulate network issue, upon message service disconnect,
        # this listener will notify once it is automatically connect/disconnect
        messaging_service.remove_reconnection_listener(listener)

    @staticmethod
    def run():
        """
        :return: Success or Failed according to connection established
        """
        HowToConnectMessagingServiceWithReConnectionStrategy.when_tcp_reconnection_happens()


if __name__ == '__main__':
    HowToConnectMessagingServiceWithReConnectionStrategy().run()
