## Goal: Publisher + Subscriber 
import os
import time

# Import Solace Python  API modules
from solace.messaging.messaging_service import MessagingService, ReconnectionListener, ReconnectionAttemptListener, ServiceInterruptionListener, RetryStrategy, ServiceEvent
from solace.messaging.errors.pubsubplus_client_error import PubSubPlusClientError
from solace.messaging.publisher.direct_message_publisher import PublishFailureListener, FailedPublishEvent
from solace.messaging.resources.topic_subscription import TopicSubscription
from solace.messaging.receiver.message_receiver import MessageHandler
from solace.messaging.config.solace_properties.message_properties import APPLICATION_MESSAGE_ID
from solace.messaging.resources.topic import Topic
from solace.messaging.receiver.inbound_message import InboundMessage

TOPIC_PREFIX = "solace/samples"
SHUTDOWN = False

# Handle received messages
class MessageHandlerImpl(MessageHandler):
    def on_message(self, message: 'InboundMessage'):
        global SHUTDOWN
        if "quit" in message.get_destination_name():
            print("QUIT message received, shutting down.")
            SHUTDOWN = True 
            
        # Check if the payload is a String or Byte, decode if its the later
        payload = message.get_payload_as_string() if message.get_payload_as_string() != None else message.get_payload_as_bytes()
        if isinstance(payload, bytearray):
            print(f"Received a message of type: {type(payload)}. Decoding to string")
            payload = payload.decode()
        
        print("\n" + f"Message payload: {payload} \n")
        print("\n" + f"Message dump: {message} \n")

# Inner classes for error handling
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

class PublisherErrorHandling(PublishFailureListener):
    def on_failed_publish(self, e: "FailedPublishEvent"):
        print("on_failed_publish")

# Broker Config
broker_props = {
    "solace.messaging.transport.host": os.environ.get('SOLACE_HOST') or "tcp://localhost:55555,tcp://localhost:55554",
    "solace.messaging.service.vpn-name": os.environ.get('SOLACE_VPN') or "default",
    "solace.messaging.authentication.scheme.basic.username": os.environ.get('SOLACE_USERNAME') or "default",
    "solace.messaging.authentication.scheme.basic.password": os.environ.get('SOLACE_PASSWORD') or "default"
    }

# Build A messaging service with a reconnection strategy of 20 retries over an interval of 3 seconds
# Note: The reconnections strategy could also be configured using the broker properties object
messaging_service = MessagingService.builder().from_properties(broker_props)\
                    .with_reconnection_retry_strategy(RetryStrategy.parametrized_retry(20,3))\
                    .build()

# Blocking connect thread
messaging_service.connect()
# print(f'Messaging Service connected? {messaging_service.is_connected}')

# Error Handeling for the messaging service
service_handler = ServiceEventHandler()
messaging_service.add_reconnection_listener(service_handler)
messaging_service.add_reconnection_attempt_listener(service_handler)
messaging_service.add_service_interruption_listener(service_handler)

# Create a direct message publisher and start it
direct_publisher = messaging_service.create_direct_message_publisher_builder().build()
direct_publisher.set_publish_failure_listener(PublisherErrorHandling())
direct_publisher.set_publisher_readiness_listener

# Blocking Start thread
direct_publisher.start()
# print(f'Direct Publisher ready? {direct_publisher.is_ready()}')

unique_name = ""
while not unique_name:
    unique_name = input("Enter your name: ").replace(" ", "")

# Define a Topic subscriptions 
topics = [TOPIC_PREFIX + "/*/hello/>"]
topics_sub = []
for t in topics:
    topics_sub.append(TopicSubscription.of(t))

msgSeqNum = 0
# Prepare outbound message payload and body
message_body = f'Hello from Python Hello World Sample!'
message_builder = messaging_service.message_builder() \
                .with_application_message_id("sample_id") \
                .with_property("application", "samples") \
                .with_property("language", "Python") \

try:
    print(f"Subscribed to: {topics}")
    # Build a Receiver
    direct_receiver = messaging_service.create_direct_message_receiver_builder().with_subscriptions(topics_sub).build()
    direct_receiver.start()
    # Callback for received messages
    direct_receiver.receive_async(MessageHandlerImpl())
    if direct_receiver.is_running():
        print("Connected and Subscribed! Ready to publish\n")
    try:
        while not SHUTDOWN:
            msgSeqNum += 1
            # Check https://docs.solace.com/API-Developer-Online-Ref-Documentation/python/source/rst/solace.messaging.config.solace_properties.html for additional message properties
            # Note: additional properties override what is set by the message_builder
            additional_properties = {APPLICATION_MESSAGE_ID: f'sample_id {msgSeqNum}'}
            # Creating a dynamic outbound message 
            outbound_message = message_builder.build(f'{message_body} --> {msgSeqNum}', additional_message_properties=additional_properties)
            # Direct publish the message
            direct_publisher.publish(destination=Topic.of(TOPIC_PREFIX + f"/python/hello/{unique_name}/{msgSeqNum}"), message=outbound_message)
            # sleep are not necessary when dealing with the default back pressure elastic
            time.sleep(5)
    except KeyboardInterrupt:
        print('\nDisconnecting Messaging Service')
    except PubSubPlusClientError as exception:
        print(f'Received a PubSubPlusClientException: {exception}')
finally:
    print('Terminating Publisher and Receiver')
    direct_publisher.terminate()
    direct_receiver.terminate()
    print('Disconnecting Messaging Service')
    messaging_service.disconnect()
