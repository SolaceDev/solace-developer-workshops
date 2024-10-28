"""sampler module for accessing the api metrics"""

from solace.messaging.messaging_service import MessagingService
from solace.messaging.utils.manageable import ApiMetrics, Metric
from howtos.sampler_boot import SamplerBoot

boot = SamplerBoot()


class HowToAccessApiMetrics:
    """class containing the methods for accessing the Api metrics"""

    @staticmethod
    def access_individual_api_metrics(service: "MessagingService", metric_of: Metric):
        """method implies on how to access individual API metrics using messaging service instance
        Args:
            metric_of:
            service: service connected instance of a messaging service, ready to be used

        """
        metrics: "ApiMetrics" = service.metrics()
        metrics_result = metrics.get_value(metric_of)
        print(f'API metric [{metric_of}]: {metrics_result}\n')

    @staticmethod
    def reset_api_metrics(service: "MessagingService"):
        """
        method to reset API metrics using messaging service instance

        Args:
            service: service connected instance of a messaging service, ready to be used

        """
        metrics: "ApiMetrics" = service.metrics()
        metrics.reset()
        print('Reset API METRICS - Done')

    @staticmethod
    def to_string_api_metrics(service: "MessagingService"):
        """method implies on how to get String representation of all current API metrics using
        messaging service instance

        Args:
            service: service connected instance of a messaging service, ready to be used

        """
        metrics: "ApiMetrics" = service.metrics()
        print(f'API metrics[ALL]: {metrics}\n')

    @staticmethod
    def run():
        try:
            """method to run the sampler"""
            service = MessagingService.builder().from_properties(boot.broker_properties()).build()
            service.connect()
        finally:
            service.disconnect()


if __name__ == '__main__':
    HowToAccessApiMetrics().run()
