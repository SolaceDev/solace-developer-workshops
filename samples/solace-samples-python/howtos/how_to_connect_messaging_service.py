""" Sampler for direct message publisher """
from string import Template

from solace.messaging.errors.pubsubplus_client_error import PubSubPlusClientError
from solace.messaging.messaging_service import MessagingService
from howtos.sampler_boot import SamplerBoot, SolaceConstants, SamplerUtil

boot = SamplerBoot()
constants = SolaceConstants()


class HowToConnectMessagingService:
    """
    class to show how to create a messaging service
    """

    @staticmethod
    def create_from_system_properties():
        """
            creates a new instance of message service, that is used to configure
            direct message instances from system properties

            Returns:new connection for Direct messaging
        """
        try:
            messaging_service = MessagingService.builder().from_system_properties().build()
            return messaging_service.connect()
        finally:
            messaging_service.disconnect()

    @staticmethod
    def create_from_environment_variables():
        """
            creates a new instance of message service, that is used to configure
            direct message instances from environment variables

            Returns:new connection for Direct messaging
       """
        try:
            messaging_service = MessagingService.builder().from_environment_variables().build()
            return messaging_service.connect()
        finally:
            messaging_service.disconnect()

    @staticmethod
    def create_from_file():
        """
            creates a new instance of message service, that is used to configure
            direct message instances from properties file

            Returns:new connection for Direct messaging
        """
        try:
            messaging_service = MessagingService.builder().from_file().build()
            return messaging_service.connect()
        finally:
            messaging_service.disconnect()

    @staticmethod
    def create_from_properties_async(config: dict):
        """
             creates a new instance of message service, that is used to configure
             direct message instances from config

             Returns:new connection for Direct messaging
             Raises:
                PubSubPlusClientError
         """
        try:
            messaging_service = MessagingService.builder().from_properties(config).build()
            future = messaging_service.connect_async()
            return future.result()
        except PubSubPlusClientError as exception:
            raise exception
        finally:
            messaging_service.disconnect()

    @staticmethod
    def create_from_properties(config: dict):
        """
             creates a new instance of message service, that is used to configure
             direct message instances from config

             Returns: new connection for Direct messaging
             Raises:
                PubSubPlusClientError
         """
        try:
            messaging_service = MessagingService.builder().from_properties(config).build()
            return messaging_service.connect()
        except PubSubPlusClientError as exception:
            raise exception
        finally:
            messaging_service.disconnect()

    @staticmethod
    def create_from_properties_async_application_id(config: dict, application_id: str):
        """
             creates a new instance of message service, that is used to configure
             direct message instances from config

             Returns:new connection for Direct messaging
             Raises:
                PubSubPlusClientError: if we didn't receive future
         """
        try:
            messaging_service = MessagingService.builder().from_properties(config).build(application_id)
            future = messaging_service.connect_async()
            return future.result()
        except PubSubPlusClientError as exception:
            raise exception
        finally:
            messaging_service.disconnect()

    @staticmethod
    def run():
        """this method is used to run the connect messaging service sampler"""
        broker_props = boot.broker_properties()

        result = HowToConnectMessagingService().create_from_properties(broker_props)
        SamplerUtil.print_sampler_result(Template("Message Service[SYNC] connect $status")
                                         .substitute(status="SUCCESS" if result else "FAILED"))

        result = HowToConnectMessagingService().create_from_properties_async(broker_props)
        SamplerUtil.print_sampler_result(Template("Message Service[ASYNC] connect $status")
                                         .substitute(status="SUCCESS" if isinstance(result, MessagingService) else "FAILED"))

        result = HowToConnectMessagingService() \
            .create_from_properties_async_application_id(broker_props, SamplerUtil.get_new_application_id())
        SamplerUtil.print_sampler_result(Template("Message Service[ASYNC] connect with applicationId $status")
                                         .substitute(status="SUCCESS" if isinstance(result, MessagingService) else "FAILED"))


if __name__ == '__main__':
    HowToConnectMessagingService().run()
