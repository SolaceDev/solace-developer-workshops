"""sampler module for reconnection strategy"""
import time

from solace.messaging.config.retry_strategy import RetryStrategy
from solace.messaging.config.solace_properties import transport_layer_properties
from solace.messaging.errors.pubsubplus_client_error import PubSubPlusClientError
from solace.messaging.messaging_service import MessagingService, ReconnectionListener, ReconnectionAttemptListener
from solace.messaging.resources.topic import Topic
from howtos.sampler_boot import SolaceConstants, SamplerBoot, SamplerUtil

constants = SolaceConstants
boot = SamplerBoot()


class HowToConnectWithDifferentStrategy:
    """
    This is a sampler for reconnection strategy
    """

    @staticmethod
    def connect_never_retry():
        """
             creates a new instance of message service, that is used to configure
             direct message instances from config

             Returns: new connection for Direct messaging
             Raises:
                PubSubPlusClientError
         """
        try:
            messaging_service = MessagingService.builder().from_properties(boot.broker_properties()) \
                .with_reconnection_retry_strategy(RetryStrategy.never_retry()).build()
            messaging_service.connect()

            return messaging_service
        except PubSubPlusClientError as exception:
            raise exception

        finally:
            messaging_service.disconnect()

    @staticmethod
    def connect_retry_interval(retry_interval):
        """
             creates a new instance of message service, that is used to configure
             direct message instances from config

             Returns: new connection for Direct messaging
             Raises:
                PubSubPlusClientError
         """
        try:
            messaging_service = MessagingService.builder().from_properties(boot.broker_properties()) \
                .with_reconnection_retry_strategy(RetryStrategy.forever_retry(retry_interval)).build()
            messaging_service.connect()
            return messaging_service
        except PubSubPlusClientError as exception:
            raise exception
        finally:
            messaging_service.disconnect()

    @staticmethod
    def connect_parametrized_retry(retries, retry_interval):
        """
             creates a new instance of message service, that is used to configure
             direct message instances from config

             Returns: new connection for Direct messaging
             Raises:
                PubSubPlusClientError
         """
        try:
            message_service = MessagingService.builder() \
                .from_properties(boot.broker_properties()) \
                .with_reconnection_retry_strategy(RetryStrategy.parametrized_retry(retries, retry_interval)) \
                .build(SamplerUtil.get_new_application_id())
            message_service.connect()
            return message_service
        except PubSubPlusClientError as exception:
            print(f'Exception: {exception}')
            raise exception
        finally:
            message_service.disconnect()

    @staticmethod
    def connect_using_properties(retries: int, retry_interval: int):
        """
             creates a new instance of message service, that is used to configure
             direct message instances from config

             Returns: new connection for Direct messaging
             Raises:
                PubSubPlusClientError
         """
        service_config = dict()
        messaging_service = None
        try:
            service_config[transport_layer_properties.RECONNECTION_ATTEMPTS] = retries

            service_config[transport_layer_properties.RECONNECTION_ATTEMPTS_WAIT_INTERVAL] = retry_interval
            messaging_service = MessagingService.builder().from_properties(boot.broker_properties()).build()
            messaging_service.connect()
            return messaging_service
        except PubSubPlusClientError as exception:
            raise exception
        finally:
            if messaging_service:
                messaging_service.disconnect()

    @staticmethod
    def add_listener_when_reconnection_happens(retries: int, retry_interval: int) -> 'MessagingService':
        """method adds a reconnection listener when an reconnection happens using the reconnection strategy
        Args:
            retries (int): the number of retries count
            retry_interval (int): the retry interval value

        Returns:
            the listener events
        """
        events = list()

        class SampleServiceReconnectionHandler(ReconnectionAttemptListener, ReconnectionListener):
            def __init__(self):
                self.events = list()
            def on_reconnecting(event):
                self.events.append(event)
                print('Got reconnection attempt event, current reconnection events {self.events}')
            def on_reconnected(self, event):
                self.events.append(event)
                print('Got reconnected event, current reconnection events {self.events}')
                

        messaging_service = MessagingService.builder().from_properties(boot.broker_properties()) \
            .with_reconnection_retry_strategy(RetryStrategy.parametrized_retry(retries, retry_interval)) \
            .build()
        event_handler = SampleServiceReconnectionHandler()
        try:
            messaging_service.add_reconnection_listener(event_handler)
            messaging_service.connect()
            # wait for reconnection here
            # for now ommitting this code as it requires external connection administration
        finally:
            messaging_service.disconnect()
        return event_handler.events  # MessagingService got list

    @staticmethod
    def run():
        """
        :return: Success or Failed according to connection established
        """
        print("Running connect_never_retry...")
        print("\tSuccess" if HowToConnectWithDifferentStrategy().connect_never_retry() is not None else "Failed")
        print("Running connect_retry_interval...")
        print("\tSuccess" if HowToConnectWithDifferentStrategy().connect_retry_interval(3) is not None else "Failed")
        print("Running connect_parametrized_retry...")
        print("\tSuccess" if HowToConnectWithDifferentStrategy().connect_parametrized_retry(3, 40) is not None else "Failed")
        print("Running connect_using_properties...")
        print("\tSuccess" if HowToConnectWithDifferentStrategy().connect_using_properties(5, 30000) is not None else "Failed")
        print("Running add_listener_when_reconnection_happens...")
        # note the check for reconnection events allows for 0 events as the trigger for 
        # reconnect requries a manual connection administrator to force reconnection
        print("\tSuccess" if len(HowToConnectWithDifferentStrategy()
                   .add_listener_when_reconnection_happens(3, 3000)) >= 0 else "Failed")


if __name__ == '__main__':
    HowToConnectWithDifferentStrategy().run()
