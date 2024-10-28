from solace.messaging.messaging_service import MessagingService
from solace.messaging.config.solace_properties import service_properties
from howtos.sampler_boot import SamplerBoot

boot = SamplerBoot()

class HowToConfigurePayloadCompression:

    @staticmethod
    def run():
        """method for configuring payload compression.

           This value is configured using a dictionary with the range of 0-9.
           Default value: 0 (disabled)
        """
        try:
            # Set broker properties
            props = boot.broker_properties()

            # Set payload compression to 9 (maximum compression)
            props[service_properties.PAYLOAD_COMPRESSION_LEVEL] = 9

            messaging_service = MessagingService.builder().from_properties(props) \
                .build()
            return messaging_service.connect()

        except Exception as exception:
            print(exception)

if ('__name__' == '__main__'):
    HowToConfigurePayloadCompression.run()

"""
Now that payload compression is enabled on the session, any message
published on the session with a non-empty binary attachment will be
automatically compressed. Any receiver that supports payload compression
will automatically decompress the message if it is compressed.
"""
