## Goal: Helper Publisher/Subscriber controlled by initialization arguments.
import os
import platform
import time
import sys
import threading
from lorem_text import lorem

# Import Solace Python  API modules from the solace package
from solace.messaging.messaging_service import MessagingService, ReconnectionListener, ReconnectionAttemptListener, \
                                                    ServiceInterruptionListener, RetryStrategy, ServiceEvent
from solace.messaging.resources.topic import Topic

# direct messaging artifactos
from solace.messaging.publisher.direct_message_publisher import PublishFailureListener, FailedPublishEvent
from solace.messaging.builder.direct_message_publisher_builder import DirectMessagePublisherBuilder
# persistent messaging artifacts
from solace.messaging.publisher.persistent_message_publisher import PersistentMessagePublisher, \
                                                                MessagePublishReceiptListener, PublishReceipt
from solace.messaging.resources.topic_subscription import TopicSubscription
from solace.messaging.receiver.direct_message_receiver import DirectMessageReceiver
from solace.messaging.receiver.persistent_message_receiver import PersistentMessageReceiver
from solace.messaging.resources.queue import Queue
from solace.messaging.receiver.message_receiver import MessageHandler, InboundMessage

if platform.uname().system == 'Windows': os.environ["PYTHONUNBUFFERED"] = "1" # Disable stdout buffer 

TOPIC_PREFIX = "solace/samples/python"
lock = threading.Lock() # lock object that is not owned by any thread. Used for synchronization and counting the 

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

# Publisher callback
class PublisherErrorHandling(PublishFailureListener):
    def on_failed_publish(self, e: "FailedPublishEvent"):
        print("on_failed_publish")

class MessageReceiptListener(MessagePublishReceiptListener):
    def __init__(self):
        self._receipt_count = 0

    @property
    def receipt_count(self):
        return self._receipt_count

    def on_publish_receipt(self, publish_receipt: 'PublishReceipt'):
        with lock:
            self._receipt_count += 1
            print(f"publish_receipt: {self.receipt_count}")

# Subscriber callback
class MessageHandlerImpl(MessageHandler):
    def __init__(self):
        self._receipt_count = 0

    @property
    def receipt_count(self):
        return self._receipt_count

    def on_message(self, message: InboundMessage):
        topic = message.get_destination_name()
        print("\n" + f"Received message on: {topic}")
        print("\n" + f"Message dump: {message} \n")
        self._receipt_count += 1


n = len(sys.argv)
client = None
action = None
queue_name = None
topic_name = None
message_count = 1

for i in range(0, n):
    if (sys.argv[i] == '-help' or sys.argv[i] == 'help' or len(sys.argv) == 1):
        print("Usage:\npython helper_pubsub.py")
        print("\t[-client direct|persistent]      # default 'direct'")
        print("\t[-action publish|subscribe]      # default 'publish'")
        print("\t[-queue <queue_name>]            # default 'myQueue', specify queue name in case of persistent receiver")
        print("\t[-topic <topic_name>]            # default 'solace/samples/python/helper'")
        print("\t[-count <message_count>]         # default '1', number of messages to be published or received")
        print("\t[-help|help]                     # this help message")
        exit(1)
    if sys.argv[i] == '-client':
        if (i+1 > n or not (sys.argv[i+1] == "direct" or sys.argv[i+1] == "persistent") or sys.argv[i+1].startswith('-')):
            print("Invalid or missing argument for: client")
            exit(1)
        else:
            client = sys.argv[i+1]
    if sys.argv[i] == '-action':
        if (i+1 > n or not (sys.argv[i+1] == "publish" or sys.argv[i+1] == "subscribe") or sys.argv[i+1].startswith('-')):
            print("Invalid or missing argument for: action")
            exit(1)
        else:
            action = sys.argv[i+1]
    if sys.argv[i] == '-queue':
        if (i+1 > n or sys.argv[i+1].startswith('-')):
            print("Invalid or missing argument for: queue")
            exit(1)
        else:
            queue_name = sys.argv[i+1]
    if sys.argv[i] == '-topic':
        if (i+1 > n or sys.argv[i+1].startswith('-')):
            print("Invalid or missing argument for: topic")
            exit(1)
        else:
            topic_name = sys.argv[i+1]
    if sys.argv[i] == '-count':
        if (i+1 > n or sys.argv[i+1].startswith('-')):
            print("Invalid or missing argument for: count")
            exit(1)
        else:
            message_count = int(sys.argv[i+1])

program = 'Running a'
if (client == 'direct'):
    program = program + ' direct'
else:
    program = program + ' persistent'
if (action == 'publish'):
    program = program + ' publisher'
else:
    program = program + ' receiver'
if (action == 'publish'):
    program = program + ', publishing ' + f'{message_count} message(s) on topic {topic_name}'
elif (client == 'direct'):
    program = program + ', subscribing ' + f'to topic {topic_name} and consume {message_count} message(s)'
else:
    program = program + ', consuming ' + f'{message_count} message(s) from queue {queue_name}'
print(f'\n{program}\n')

if (client == 'direct' and action == 'subscribe' and topic_name is None):
    print("Specify a topic name to run a direct receiver")
    exit(1)

if (client == 'persistent' and action == 'subscribe' and queue_name is None):
    print("Specify a queue name to run a persistent receiver")
    exit(1)
    
# Broker Config. Note: Could pass other properties Look into
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
print(f'Messaging Service connected? {messaging_service.is_connected}')

# Event Handling for the messaging service
service_handler = ServiceEventHandler()
messaging_service.add_reconnection_listener(service_handler)
messaging_service.add_reconnection_attempt_listener(service_handler)
messaging_service.add_service_interruption_listener(service_handler)

callback = MessageHandlerImpl()

# Create a message publisher and start it
if (action == 'publish'):
    if (client == 'direct'):
        publisher: DirectMessagePublisherBuilder = messaging_service.create_direct_message_publisher_builder().build()
        publisher.set_publish_failure_listener(PublisherErrorHandling())
        publisher.start()
        print(f'Direct Publisher ready? {publisher.is_ready()}')
    else:
        publisher: PersistentMessagePublisher = messaging_service.create_persistent_message_publisher_builder().build()
        publisher.start()
        print(f'Persistent Publisher ready? {publisher.is_ready()}')
        # set a message delivery listener to the publisher
        receipt_listener = MessageReceiptListener()
        publisher.set_message_publish_receipt_listener(receipt_listener)
if (action == 'subscribe'):
    if (client == 'direct'):
        print ("Action: " + action + " Client: " + client)
        topics = [ topic_name ]
        topics_sub = []
        for t in topics:
            topics_sub.append(TopicSubscription.of(t))

        receiver: DirectMessageReceiver = messaging_service.create_direct_message_receiver_builder()\
                                .with_subscriptions(topics_sub)\
                                .build()

        receiver.start()
    else:
        # Queue name. 
        # NOTE: This assumes that a persistent queue already exists on the broker with the right topic subscription 
        durable_exclusive_queue = Queue.durable_non_exclusive_queue(queue_name)
        print ("Durable queue" + queue_name)

        receiver: PersistentMessageReceiver = messaging_service.create_persistent_message_receiver_builder()\
                                                    .with_message_auto_acknowledgement()\
                                                    .build(durable_exclusive_queue)
        receiver.start()

# Prepare outbound message payload and body
message_body = lorem.sentence()
outbound_msg_builder = messaging_service.message_builder() \
                            .with_property("application", "samples") \
                            .with_property("language", "Python")
                            # .with_application_message_id("sample_id") \

count = 1
if (action == 'publish'):
    print("\nSend a KeyboardInterrupt to stop publishing\n")
else:
    print("\nSend a KeyboardInterrupt to stop subsriber\n")
try: 
    if (action == 'publish'):
        while count <= message_count:
            topic = Topic.of(topic_name)
            # Direct publish the message with dynamic headers and payload
            outbound_msg = outbound_msg_builder \
                            .with_application_message_id(f'NEW {count}')\
                            .build(f'{message_body} + {count}')
            publisher.publish(destination=topic, message=outbound_msg)

            print(f'Published message on {topic_name} [{count}]')
            count += 1
            time.sleep(0.1) 
        print('Done')
        os._exit(0)
    if (action == 'subscribe'):
        # Callback for received messages
        receiver.receive_async(callback)
        try: 
            while (callback.receipt_count < message_count):
                time.sleep(1)
        except KeyboardInterrupt:
            print('\nKeyboardInterrupt received')
        print('Done')
        os._exit(0)

except KeyboardInterrupt:
    if (action == 'publish'):
        print('\nTerminating Publisher')
        if (publisher is not None):
            publisher.terminate()
    else:
        print('\nTerminating receiver')
        if receiver is not None:
            receiver.terminate(grace_period = 0)

    print('\nDisconnecting Messaging Service')
    messaging_service.disconnect()