from solace.messaging.resources.topic_subscription import TopicSubscription
from solace.messaging.resources.queue import Queue
from solace.messaging.receiver.message_receiver import MessageHandler
from solace.messaging.resources.topic import Topic
from solace.messaging.receiver.inbound_message import InboundMessage
from solace.messaging.messaging_service import MessagingService
from solace.messaging.receiver.persistent_message_receiver import PersistentMessageReceiver
from solace.messaging.config.solace_properties import transport_layer_properties, service_properties, \
    authentication_properties

from opentelemetry import propagate
from opentelemetry import context
from opentelemetry import trace, baggage
from opentelemetry.semconv.trace import SpanAttributes, MessagingDestinationKindValues
from opentelemetry.trace import StatusCode, Status, SpanKind
from grpc import ssl_channel_credentials
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter, SimpleSpanProcessor
from opentelemetry.sdk.trace import TracerProvider
from typing import List

from solace_otel.messaging.trace.propagation import InboundMessageCarrier, InboundMessageGetter, OutboundMessageCarrier, OutboundMessageSetter

import os

TRACER_NAME = "myAppTracer"
OTEL_MESSAGE = "This is an OTel message"
BAGGAGE_KEY_1 = "key1"
BAGGAGE_VALUE_1 = "value1"
BAGGAGE_KEY_2 = "key2"
BAGGAGE_VALUE_2 = "value2"

class HowToPublishAndReceiveMessagesWithOTel:
    def function_that_might_raise_exception(raise_exception: bool=False):
        """
        This function simulates application-specific message processing which might raise an exception.
        """
        if raise_exception:
            raise Exception("Something went wrong while processing the message.")

    class OTelMessageHandler(MessageHandler):
        def __init__(self, receiver=None, ack=True):
            super().__init__()
            self._receive_count = 0
            self._exception_list = []
            self._receiver = receiver
            self._ack = ack
            self._baggage = None

        def on_message(self, message: 'InboundMessage'):
            try:
                tracer = trace.get_tracer(TRACER_NAME)
                PROPAGATOR = propagate.get_global_textmap()
                 
                carrier = InboundMessageCarrier(message)

                # inject current context into message using a carrier, the context selection is implicit
                extracted_ctx = PROPAGATOR.extract(carrier=carrier, getter=InboundMessageGetter())
                self._baggage = baggage.get_all(extracted_ctx)
                

                # The returned token lets you restore the previous context.
                token = context.attach(extracted_ctx)
                try:
                    # create a new span for every message
                    with tracer.start_as_current_span("{topic_name}_process".format(topic_name=message.get_destination_name()), kind=SpanKind.CONSUMER) as span:
                        # set attributes for the span
                        span.set_attribute(SpanAttributes.MESSAGING_SYSTEM, "PubSub+")
                        span.set_attribute(SpanAttributes.MESSAGING_DESTINATION_KIND, MessagingDestinationKindValues.QUEUE.value)
                        span.set_attribute(SpanAttributes.MESSAGING_DESTINATION, message.get_destination_name())
                        span.set_attribute(SpanAttributes.MESSAGING_OPERATION, "process")
                        try:
                            print(f"Received message {message}")
                            HowToPublishAndReceiveMessagesWithOTel.function_that_might_raise_exception(False)
                            span.set_status(Status(StatusCode.OK))
                        except Exception as ex:
                            span.set_status(Status(StatusCode.ERROR))
                            span.record_exception(ex)
                finally:
                    # restore the context
                    context.detach(token)

            except Exception as error:
                self._exception_list.append(error)
            finally:
                if self._receiver \
                    and isinstance(self._receiver, PersistentMessageReceiver) \
                    and self._ack:
                    self._receiver.ack(message)
                # The _receive_count metric is used to signal watching waiters that they can proceed,
                # so we need to increment this count only after all operations have completed to avoid
                # race conditions in testing.
                self._receive_count += 1

        @property
        def exception_list(self) -> List[Exception]:
            return self._exception_list

        @property
        def exception_count(self) -> int:
            return len(self._exception_list)

        @property
        def total_message_received_count(self) -> int:
            return self._receive_count

        @property
        def baggage(self) -> dict:
            return self._baggage

    def how_to_publish_with_otel(messaging_service: MessagingService, topic_name: str):
        """
        This howto assumes:
            * that the messaging service has already been created and connected
            * that a durable exclusive queue has been created and configured to process messages with the given topic
            * that a telemetry profile has been configured on the broker
            * that a filter with a subscription to the given topic has been created for that telemetry profile
            * that a collector is running and has already been configured correctly
            * that these resources are independently cleaned up after this function executes
        """
        queue_name = f"Q/{topic_name}"
        durable_exclusive_queue = Queue.durable_exclusive_queue(queue_name)

        persistent_message_publisher = messaging_service.create_persistent_message_publisher_builder().build()
        persistent_message_receiver = messaging_service.create_persistent_message_receiver_builder().build(durable_exclusive_queue)
        persistent_message_publisher.start()
        persistent_message_receiver.start()
        persistent_message_receiver.add_subscription(TopicSubscription.of(topic_name))
        message_handler = HowToPublishAndReceiveMessagesWithOTel.OTelMessageHandler(receiver=persistent_message_receiver)
        persistent_message_receiver.receive_async(message_handler)

        tracer = trace.get_tracer(TRACER_NAME)
        PROPAGATOR = propagate.get_global_textmap()
        outbound_message = messaging_service.message_builder().build(OTEL_MESSAGE)
        with tracer.start_as_current_span(f"{topic_name}_publish", kind=SpanKind.PRODUCER) as span:
            # set attributes for the span
            span.set_attribute(SpanAttributes.MESSAGING_SYSTEM, "PubSub+")
            span.set_attribute(SpanAttributes.MESSAGING_DESTINATION_KIND, MessagingDestinationKindValues.QUEUE.value)
            span.set_attribute(SpanAttributes.MESSAGING_DESTINATION, topic_name)
            span.set_attribute(SpanAttributes.MESSAGING_OPERATION, "publish")
            span.set_attribute(SpanAttributes.MESSAGING_PROTOCOL, "SMF")

            carrier = OutboundMessageCarrier(outbound_message)
            context.attach(baggage.set_baggage(BAGGAGE_KEY_1, BAGGAGE_VALUE_1))
            context.attach(baggage.set_baggage(BAGGAGE_KEY_2, BAGGAGE_VALUE_2))

            # inject context form a into the message using a carrier, context is implicit
            PROPAGATOR.inject(carrier=carrier, setter=OutboundMessageSetter())

            try:
                persistent_message_publisher.publish(destination=Topic.of(topic_name), message=outbound_message)
            except Exception as ex:
                span.set_status(Status(StatusCode.ERROR))
                span.record_exception(ex)

        input("\n\nPress Enter to continue..\n\n") # wait for message to be published and received by message handler        

        persistent_message_publisher.terminate()
        persistent_message_receiver.terminate()
        messaging_service.disconnect()

    def init_tracing():
        # configure global tracer, with service name that can be used later for correlation
        trace.set_tracer_provider(TracerProvider(resource=Resource(attributes={SERVICE_NAME: TRACER_NAME})))
        # this enables the tracer to print to stdout
        trace.get_tracer_provider().add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
        # The following default value is not usable, it's only supposed to provide a template of what
        # is expected as the configured url value.
        url = os.environ.get("OTEL_COLLECTOR_URL", "http://otelcollector:12345")
        # Adding the timeout argument to the otlp_exporter could be useful
        otlp_exporter = OTLPSpanExporter(
            endpoint=url,
            credentials=ssl_channel_credentials()
        )
        # this enables the tracer to send to the OTel collector through the configured OTLP exporter
        trace.get_tracer_provider().add_span_processor(BatchSpanProcessor(otlp_exporter))
        return

    @staticmethod
    def run():
        broker_props = {transport_layer_properties.HOST: os.environ.get("SOLACE_BROKER_HOST", "solbroker"),
                        service_properties.VPN_NAME: os.environ.get("SOLACE_BROKER_VPN", "default"),
                        authentication_properties.SCHEME_BASIC_USER_NAME: os.environ.get("SOLACE_BROKER_USER_NAME", "default"),
                        authentication_properties.SCHEME_BASIC_PASSWORD: os.environ.get("SOLACE_BROKER_PASSWORD", "default")}
        messaging_service = MessagingService.builder().from_properties(broker_props).build()
        messaging_service.connect()
        HowToPublishAndReceiveMessagesWithOTel.init_tracing()
        topic_name = os.environ.get("SOLACE_TOPIC_NAME", "solace/samples/otel-tracing")
        HowToPublishAndReceiveMessagesWithOTel.how_to_publish_with_otel(messaging_service, topic_name)
        messaging_service.disconnect()
