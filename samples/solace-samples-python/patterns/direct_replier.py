## Goal is to demonstrate a replier (a request-reply  pattern) that receives a request asynchornously and responds with a reply

import os
import platform
import time

# Import Solace Python  API modules from the solace package
from solace.messaging.messaging_service import MessagingService, ReconnectionListener, ReconnectionAttemptListener, \
            ServiceInterruptionListener, RetryStrategy, ServiceEvent
from solace.messaging.resources.topic import Topic
from solace.messaging.resources.topic_subscription import TopicSubscription
from solace.messaging.receiver.request_reply_message_receiver import RequestMessageHandler, InboundMessage, \
            RequestReplyMessageReceiver, Replier

if platform.uname().system == 'Windows': os.environ["PYTHONUNBUFFERED"] = "1" # Disable stdout buffer 

TOPIC_PREFIX = "solace/samples/python"

# Handle received messages
class RequestMessageHandlerImpl(RequestMessageHandler):
    def __init__(self, message_builder):
        self.message_builder = message_builder

    def on_message(self, request: InboundMessage, replier: Replier):

        # Check if the payload is a String or Byte, decode if its the later
        payload = request.get_payload_as_string() if request.get_payload_as_string() != None else request.get_payload_as_bytes()
        if isinstance(payload, bytearray):
            print(f"Received a message of type: {type(payload)}. Decoding to string")
            payload = payload.decode()

        print(f'<<<<<<<<<<<<<<<<<<<<<<<<<<<<')
        print(f'Received request payload:' + payload)
        print(f'----------------------------')

        # Prepare response payload
        response = f'Greetings {payload.split("This is request message from ")[1]}!' if "This is request message from " in payload else 'Response body'

        message_id = request.get_application_message_id()
        if replier is not None:
            outbound_msg = outbound_msg_builder \
                            .with_application_message_id(f'{message_id}')\
                            .build(response)
            replier.reply(outbound_msg)
            print(f'>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
            print(f'Replied with response payload: {outbound_msg.get_payload_as_string()}')
            print(f'----------------------------')
        else:
            print(f'Invalid request, reply_to not set')    

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


# Broker Config. Note: Could pass other properties Look into
broker_props = {
    "solace.messaging.transport.host": os.environ.get('SOLACE_HOST') or "tcp://localhost:55555,tcp://localhost:55554",
    "solace.messaging.service.vpn-name": os.environ.get('SOLACE_VPN') or "default",
    "solace.messaging.authentication.scheme.basic.username": os.environ.get('SOLACE_USERNAME') or "default",
    "solace.messaging.authentication.scheme.basic.password": os.environ.get('SOLACE_PASSWORD') or ""
    }

request_topic = TOPIC_PREFIX + '/direct/request/>'
print(f'\nSubscribing to topic {request_topic}')

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

# Create a direct message replier
direct_replier: RequestReplyMessageReceiver = messaging_service.request_reply() \
                                                .create_request_reply_message_receiver_builder() \
                                                .build(TopicSubscription.of(request_topic))

# Blocking Start thread
direct_replier.start()

# Prepare outbound message payload and body
message_body = "this is the reply body of the msg with count: "
outbound_msg_builder = messaging_service.message_builder() \
                .with_property("application", "samples") \
                .with_property("language", "Python")

print("\nSend a KeyboardInterrupt to stop receiving\n")

try:
    # Callback for received messages
    direct_replier.receive_async(RequestMessageHandlerImpl(outbound_msg_builder))
    try: 
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print('\nDisconnecting Messaging Service')
finally:
    print('\nTerminating receiver')
    direct_replier.terminate()
    print('\nDisconnecting Messaging Service')
    messaging_service.disconnect()