## Goal is to demonstrate receive-process-reply (a processor) pattern. 
# Processor subscribes to a topic and upon receipt of the message, the payload is processed 
# (e.g. uppercased) and published to another designated topic

import os
import platform
import time
import threading

# Import Solace Python API modules from the solace package
from solace.messaging.messaging_service import MessagingService, ReconnectionListener, ReconnectionAttemptListener, \
                                                ServiceInterruptionListener, RetryStrategy, ServiceEvent
from solace.messaging.resources.topic import Topic
from solace.messaging.publisher.persistent_message_publisher import PersistentMessagePublisher, MessagePublishReceiptListener
from solace.messaging.receiver.persistent_message_receiver import PersistentMessageReceiver
from solace.messaging.resources.queue import Queue
from solace.messaging.resources.topic_subscription import TopicSubscription
from solace.messaging.receiver.message_receiver import MessageHandler, InboundMessage
from solace.messaging.errors.pubsubplus_client_error import PubSubPlusClientError

if platform.uname().system == 'Windows': os.environ["PYTHONUNBUFFERED"] = "1" # Disable stdout buffer 

lock = threading.Lock() # lock object that is not owned by any thread. Used for synchronization and counting the 

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

# Inner class to handle received messages
class ProcessorImpl(MessageHandler):
    def __init__(self, publisher, messaging_service):
        self.publisher = publisher
        self.msg_builder = messaging_service.message_builder() \
                                .with_application_message_id("sample_id") \
                                .with_property("application", "samples") \
                                .with_property("payload", "processed") \
                                .with_property("language", "Python")

    def on_message(self, message: InboundMessage):
        publish_topic = Topic.of(TOPIC_PREFIX + f'/persistent/processor/output')
        destination_name = message.get_destination_name()

        # Check if the payload is a String or Byte, decode if its the later
        payload = message.get_payload_as_string() if message.get_payload_as_string() != None else message.get_payload_as_bytes()
        if isinstance(payload, bytearray):
            print(f"Received a message of type: {type(payload)}. Decoding to string")
            payload = payload.decode()

        print(f'Received input message payload: {payload}')   

        # Process the message. For simplicity, we will be uppercasing the payload.
        processed_payload = payload.upper()

        if message.get_application_message_id() != None:
            self.msg_builder = self.msg_builder \
                                .with_application_message_id(message.get_application_message_id())

        output_msg = self.msg_builder.build(f'{processed_payload}')
        self.publisher.publish(destination=publish_topic, message=output_msg)

        print(f'<<<<<<<<<<<<<<<<<<<<<<<<<<<<')
        print(f'Received input message on {destination_name}')
        print(f'Received input message (body): {payload}')
        # print(f'Received input message dump (body):{message}')
        print(f'----------------------------')
        print(f'>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
        print(f'Published output message to: {publish_topic}')
        print(f'Published output message (body): {processed_payload}')
        # print(f'Published output message dump (body):{output_msg}')
        print(f'----------------------------')

class MessageReceiptListener(MessagePublishReceiptListener):
    def __init__(self):
        self._receipt_count = 0

    @property
    def receipt_count(self):
        return self._receipt_count

    def on_publish_receipt(self, publish_receipt: 'PublishReceipt'):
        with lock:
            self._receipt_count += 1
            print(f"\npublish_receipt:\n {self.receipt_count}\n")

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
 
# Create a persistent message publisher and start it
publisher: PersistentMessagePublisher = messaging_service.create_persistent_message_publisher_builder().build()

# Blocking Start thread
publisher.start()
print(f'Persistent Publisher ready? {publisher.is_ready()}')

# set a message delivery listener to the publisher
receipt_listener = MessageReceiptListener()
publisher.set_message_publish_receipt_listener(receipt_listener)

# NOTE: This assumes that a persistent queue already exists on the broker with the same name 
# and a subscription for topic `solace/samples/python/persistent/processor/output``
queue_name = 'Q/test/input'
durable_exclusive_queue = Queue.durable_exclusive_queue(queue_name)

# Build a Receiver with the given topics and start it
persistent_receiver: PersistentMessageReceiver = messaging_service.create_persistent_message_receiver_builder() \
                                                                        .with_message_auto_acknowledgement() \
                                                                        .build(durable_exclusive_queue)
persistent_receiver.start()
print(f'Persistent Receiver is running? {persistent_receiver.is_running()}')

print("\nSend a KeyboardInterrupt to stop processor\n")
try:
    # Callback for received messages
    persistent_receiver.receive_async(ProcessorImpl(publisher, messaging_service))
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
    persistent_receiver.terminate()
    print('\nDisconnecting Messaging Service')
    messaging_service.disconnect()
