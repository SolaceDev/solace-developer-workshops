"""sampler module on how to set the core api log level"""

from solace.messaging.messaging_service import MessagingService


class HowToSetCoreApiLogLevel:
    """class to set the core api log level"""

    @staticmethod
    def set_core_log_level_by_user(level):
        """method to set the core api log level by the user

        Args:
            level: user defined log level
        """
        MessagingService.set_core_messaging_log_level(level)

    @staticmethod
    def run():
        """method to run the sampler"""
        HowToSetCoreApiLogLevel.set_core_log_level_by_user(level="DEBUG")


if __name__ == '__main__':
    HowToSetCoreApiLogLevel.run()
