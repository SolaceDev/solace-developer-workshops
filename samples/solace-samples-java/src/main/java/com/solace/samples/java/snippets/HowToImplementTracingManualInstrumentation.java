/*
 * Copyright 2021-2024 Solace Corporation. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

package com.solace.samples.java.snippets;

import com.solace.messaging.publisher.DirectMessagePublisher;
import com.solace.messaging.publisher.OutboundMessage;
import com.solace.messaging.receiver.InboundMessage;
import com.solace.messaging.resources.Topic;
import com.solace.messaging.trace.propagation.SolacePubSubPlusJavaTextMapGetter;
import com.solace.messaging.trace.propagation.SolacePubSubPlusJavaTextMapSetter;
import io.opentelemetry.api.baggage.Baggage;
import io.opentelemetry.api.baggage.propagation.BaggageUtil;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import io.opentelemetry.context.propagation.TextMapPropagator;
import io.opentelemetry.semconv.SemanticAttributes;
import io.opentelemetry.semconv.SemanticAttributes.MessagingDestinationKindValues;
import io.opentelemetry.semconv.SemanticAttributes.MessagingOperationValues;

import java.util.function.Consumer;

@SuppressWarnings("deprecation")
public class HowToImplementTracingManualInstrumentation {

    /**
     * Example how to inject a tracing context into Solace PubSub+ Java Message
     * before it is published to a queue or topic.
     *
     * @param messageToPublish A Solace PubSub+ Java Outbound message to be used for publishing.
     * @param openTelemetry    The entry point to telemetry functionality for tracing, metrics and
     *                         baggage.
     */
    void howToInjectTraceContextInSolaceMessage(OutboundMessage messageToPublish,
                                                OpenTelemetry openTelemetry) {
        final SolacePubSubPlusJavaTextMapSetter setter = new SolacePubSubPlusJavaTextMapSetter();
        // Injects current context into the message to transport it across message boundaries.
        // Transported context will be used to create parent - child relationship
        // between spans from different services and broker spans
        final Context contextToInject = Context.current();
        openTelemetry.getPropagators().getTextMapPropagator()
                .inject(contextToInject, messageToPublish, setter);
    }

    /**
     * Example how to extract a tracing context from the Solace PubSub+ Java Message upon message receipt.
     *
     * @param receivedMessage Received Solace PubSub+ Java Inbound message.
     * @param openTelemetry   The entry point to telemetry functionality for tracing, metrics and
     *                        baggage.
     */
    void howToExtractTraceContextIfAnyFromSolaceMessage(InboundMessage receivedMessage,
                                                        OpenTelemetry openTelemetry) {
        // Extracts tracing context from a message
        // The SolacePubSubPlusJavaTextMapGetter is used our custom TextMapGetter which extracts
        // tracing information from the message such as: traceparent, tracestate or baggage
        final Context extractedContext = openTelemetry.getPropagators().getTextMapPropagator()
                .extract(Context.current(), receivedMessage, new SolacePubSubPlusJavaTextMapGetter());

        // Then set the extractedContext as current context
        try (Scope scope = extractedContext.makeCurrent()) {
            //...
        }
    }

    /**
     * Example how to inject a tracing context (including span and baggage) in the Solace PubSub+ Java Message
     * and generate a SEND span for the published message.
     *
     * @param message            A Solace PubSub+ Java Message that support tracing context propagation.
     * @param messagePublisher   Solace PubSub+ Java Message publisher that can publish direct messages
     * @param messageDestination message destination
     * @param openTelemetry      The entry-point to telemetry functionality for tracing, metrics and
     *                           baggage.
     * @param tracer             Tracer is the interface for Span creation and interaction with the
     *                           in-process context.
     */
    void howToCreateSpanAndBaggageOnMessagePublish(OutboundMessage message, DirectMessagePublisher messagePublisher,
                                                    Topic messageDestination, OpenTelemetry openTelemetry,
                                                    Tracer tracer) {

        // Create a new span with a current context as parent of this span
        final Span sendSpan = tracer
                .spanBuilder("mySolacePublisherApp" + " " + MessagingOperationValues.PROCESS)
                .setSpanKind(SpanKind.CLIENT)
                // published to a topic endpoint (non-temporary)
                .setAttribute(SemanticAttributes.MESSAGING_DESTINATION_KIND, MessagingDestinationKindValues.TOPIC)
                .setAttribute(SemanticAttributes.MESSAGING_TEMP_DESTINATION, false)
                // Set more attributes as needed
                //.setAttribute(...)
                //.setAttribute(...)
                .setParent(Context.current()) // set current context as parent
                .startSpan();

        // Create baggage object
        Baggage baggage = BaggageUtil.extractBaggage("key1=val1,key2=val2");

        // set sendSpan as new current context
        try (Scope scope = sendSpan.makeCurrent()) {
            // set baggage in the current context
            try (Scope scope1 = baggage.storeInContext(Context.current()).makeCurrent()) {
                final SolacePubSubPlusJavaTextMapSetter setter = new SolacePubSubPlusJavaTextMapSetter();
                final TextMapPropagator propagator = openTelemetry.getPropagators().getTextMapPropagator();
                // then inject current context with send span and baggage into the message
                // optionally, could also add trace, span, baggage information as User Properties for interop with other protocols (MQTT, AMQP)
                propagator.inject(Context.current(), message, setter);
                // publish message to the given topic
                messagePublisher.publish(message, messageDestination);
            }
        } catch (Exception e) {
            sendSpan.recordException(e); // Span can record exception if any
            sendSpan.setStatus(StatusCode.ERROR, e.getMessage()); // Set span status as ERROR/FAILED
        } finally {
            sendSpan.end(); // End sendSpan. Span data is exported when span.end() is called.
        }
    }

    /**
     * Example how to extract a tracing context from the Solace PubSub+ Java Message and generate a RECEIVE span
     * for the received message.
     *
     * @param receivedMessage  A Solace PubSub+ Java Message.
     * @param messageProcessor A callback function that the user could use to process a message
     * @param openTelemetry    The OpenTelemetry class is the entry point to telemetry functionality
     *                         for tracing, metrics and baggage from OpenTelemetry Java SDK.
     * @param tracer           OpenTelemetry Tracer is the interface from OpenTelemetry Java SDK for
     *                         span creation and interaction with the in-process context.
     */
    void howToCreateNewSpanOnMessageReceive(InboundMessage receivedMessage,
                                            Consumer<InboundMessage> messageProcessor,
                                            OpenTelemetry openTelemetry, Tracer tracer) {

        // Extract tracing context from message
        // The SolacePubSubPlusJavaTextMapGetter is our custom TextMapGetter which extracts
        // tracing information from the message such as: traceparent, tracestate or baggage
        final Context extractedContext = openTelemetry.getPropagators().getTextMapPropagator()
                .extract(Context.current(), receivedMessage, new SolacePubSubPlusJavaTextMapGetter());

        // Set the extracted context as current context
        try (Scope scope = extractedContext.makeCurrent()) {
            // Create a child span and set extracted/current context as parent of this span
            final Span receiveSpan = tracer
                    .spanBuilder("mySolaceReceiverApp" + " " + MessagingOperationValues.RECEIVE)
                    .setSpanKind(SpanKind.CLIENT)
                    // for the case the message was received on a non-temporary topic endpoint
                    .setAttribute(SemanticAttributes.MESSAGING_DESTINATION_KIND, MessagingDestinationKindValues.TOPIC)
                    .setAttribute(SemanticAttributes.MESSAGING_TEMP_DESTINATION, false)
                    // Set more attributes as needed
                    //.setAttribute(...)
                    //.setAttribute(...)
                    // creates a parent child relationship to a message publisher's application span by calling
                    .setParent(extractedContext)
                    // starts span
                    .startSpan();
            try {
                // do something with a message in a callback
                messageProcessor.accept(receivedMessage);
            } catch (Exception e) {
                receiveSpan.recordException(e); // Span can record exception if any
                receiveSpan.setStatus(StatusCode.ERROR,
                        e.getMessage()); // and set span status as ERROR/FAILED
            } finally {
                receiveSpan.end(); // End receiveSpan. Span data is exported when span.end() is called.
            }
        }
    }
}
