## Goal is to demonstrate receive-process-reply (a processor) pattern. 
# Processor subscribes to a topic and upon receipt of the message, the payload is processed 
# (e.g. uppercased) and published to another designated topic

import os
import platform
import time

# Import Solace Python  API modules from the solace package
from solace.messaging.messaging_service import MessagingService, ReconnectionListener, ReconnectionAttemptListener, \
                                                ServiceInterruptionListener, RetryStrategy, ServiceEvent
from solace.messaging.resources.topic import Topic
from solace.messaging.publisher.direct_message_publisher import PublishFailureListener, FailedPublishEvent
from solace.messaging.resources.topic_subscription import TopicSubscription
from solace.messaging.receiver.message_receiver import MessageHandler, InboundMessage
from solace.messaging.errors.pubsubplus_client_error import PubSubPlusClientError

if platform.uname().system == 'Windows': os.environ["PYTHONUNBUFFERED"] = "1" # Disable stdout buffer 

TOPIC_PREFIX = "solace/samples/python"

# Inner class for connection error handling
class ServiceEventHandler(ReconnectionListener, ReconnectionAttemptListener, ServiceInterruptionListener):
    def on_reconnected(self, e: ServiceEvent):
        print("\non_reconnected")
        print(f"Error cause: {e.get_cause()}")
        print(f"Message: {e.get_message()}")
    
    def on_reconnecting(self, e: "ServiceEvent"):
        print("\non_reconnecting")
        print(f"Error cause: {e.get_cause()}")
        print(f"Message: {e.get_message()}")

    def on_service_interrupted(self, e: "ServiceEvent"):
        print("\non_service_interrupted")
        print(f"Error cause: {e.get_cause()}")
        print(f"Message: {e.get_message()}")

# Inner class for publish error handling
class PublisherErrorHandling(PublishFailureListener):
    def on_failed_publish(self, e: "FailedPublishEvent"):
        print("on_failed_publish")

# Inner class to handle received messages
class ProcessorImpl(MessageHandler):
    def __init__(self, publisher, messaging_service):
        self.publisher = publisher
        self.msg_builder = messaging_service.message_builder() \
                                .with_application_message_id("sample_id") \
                                .with_property("application", "samples") \
                                .with_property("payload", "processed") \
                                .with_property("language", "Python") \


    def on_message(self, message: InboundMessage):
        publish_topic = Topic.of(TOPIC_PREFIX + f'/direct/processor/output')
        subscribe_topic = message.get_destination_name()

        # Check if the payload is a String or Byte, decode if its the later
        payload = message.get_payload_as_string() if message.get_payload_as_string() != None else message.get_payload_as_bytes()
        if isinstance(payload, bytearray):
            print(f"Received a message of type: {type(payload)}. Decoding to string")
            payload = payload.decode()

        # Process the message. For simplicity, we will be uppercasing the payload.
        processed_payload = payload.upper()

        if message.get_application_message_id() != None:
            self.msg_builder = self.msg_builder \
                                .with_application_message_id(message.get_application_message_id())

        output_msg = self.msg_builder.build(f'{processed_payload}')
        self.publisher.publish(destination=publish_topic, message=output_msg)

        print(f'<<<<<<<<<<<<<<<<<<<<<<<<<<<<')
        print(f'Received input message on {subscribe_topic}')
        print(f'Received input message (body): {payload}')
        # print(f'Received input message dump (body):{message}')
        print(f'----------------------------')
        print(f'>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
        print(f'Published output message to: {publish_topic}')
        print(f'Published output message (body): {processed_payload}')
        # print(f'Published output message dump (body):{output_msg}')
        print(f'----------------------------')

# Broker Config. Note: Could pass other properties Look into
broker_props = {
    "solace.messaging.transport.host": os.environ.get('SOLACE_HOST') or "tcp://localhost:55555,tcp://localhost:55554",
    "solace.messaging.service.vpn-name": os.environ.get('SOLACE_VPN') or "default",
    "solace.messaging.authentication.scheme.basic.username": os.environ.get('SOLACE_USERNAME') or "default",
    "solace.messaging.authentication.scheme.basic.password": os.environ.get('SOLACE_PASSWORD') or ""
    }

# Build A messaging service with a reconnection strategy of 20 retries over an interval of 3 seconds
# Note: The reconnections strategy could also be configured using the broker properties object
messaging_service = MessagingService.builder().from_properties(broker_props)\
                        .with_reconnection_retry_strategy(RetryStrategy.parametrized_retry(20,3))\
                        .build()

# Blocking connect thread
messaging_service.connect()
print(f'\nMessaging Service connected? {messaging_service.is_connected}')

# Event Handling for the messaging service
service_handler = ServiceEventHandler()
messaging_service.add_reconnection_listener(service_handler)
messaging_service.add_reconnection_attempt_listener(service_handler)
messaging_service.add_service_interruption_listener(service_handler)
 
# Create a direct message publisher and start it
publisher = messaging_service.create_direct_message_publisher_builder().build()
publisher.set_publish_failure_listener(PublisherErrorHandling())

# Blocking Start thread
publisher.start()
print(f'Direct Publisher ready? {publisher.is_ready()}')

# Define a Topic subscriptions 
subscribe_topic_name = TOPIC_PREFIX + "/direct/processor/input"
subscribe_topic = [TopicSubscription.of(subscribe_topic_name)]
print(f'\nSubscribed to topic: {subscribe_topic_name}')

# Build a Receiver with the given topics and start it
direct_receiver = messaging_service.create_direct_message_receiver_builder()\
                        .with_subscriptions(subscribe_topic)\
                        .build()
direct_receiver.start()
print(f'Direct Receiver is running? {direct_receiver.is_running()}')

print("\nSend a KeyboardInterrupt to stop processor\n")
try:
    # Callback for received messages
    direct_receiver.receive_async(ProcessorImpl(publisher, messaging_service))
    try: 
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print('\nDisconnecting Messaging Service')
# Handle API exception 
except PubSubPlusClientError as exception:
  print(f'\nMake sure queue {queue_name} exists on broker!')

finally:
    print('\nTerminating receiver')
    direct_receiver.terminate()
    print('\nDisconnecting Messaging Service')
    messaging_service.disconnect()
