/*
 * Copyright 2021-2023 Solace Corporation. All rights reserved.
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

import com.solace.messaging.MessagingService;
import com.solace.messaging.publisher.OutboundMessage;
import com.solace.messaging.publisher.OutboundMessageBuilder;
import com.solace.messaging.util.Converter.ObjectToBytes;
import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.util.LinkedList;
import java.util.List;

public class HowToCreateOutboundMessages {

  /**
   * This example demonstrates a DISPOSABLE single use {@link OutboundMessageBuilder}. We recommend
   * for performance purposes to reuse builder (one or multiple) instance to produce {@link
   * OutboundMessage} instances
   *
   * @param service instance of a messaging service
   * @param payload just a random byte payload
   * @return ready to go message
   */
  public static OutboundMessage createSingleMessageWithBytePayload(MessagingService service,
      byte[] payload) {
    final OutboundMessage myCustomMessage = service.messageBuilder()
        .withPriority(255).build(payload);
    return myCustomMessage;
  }

  /**
   * This example demonstrates a DISPOSABLE single use {@link OutboundMessageBuilder}. We recommend
   * for performance purposes to reuse builder (one or multiple) instance to produce {@link
   * OutboundMessage} instances
   *
   * @param service instance of a messaging service
   * @param payload random business object payload
   * @return ready to go message
   */
  public static OutboundMessage createSingleMessageWithBusinessObjectPayload(
      MessagingService service, MyData payload) {

    final ObjectToBytes<MyData> pojo2ByteConverter = (pojo) -> {
      return pojo.getName().getBytes(StandardCharsets.US_ASCII);
    };
    final OutboundMessage myCustomMessage = service.messageBuilder().withPriority(
        255).build(payload, pojo2ByteConverter);
    return myCustomMessage;
  }

  /**
   * This example demonstrates REUSABLE {@link OutboundMessageBuilder}. We recommend  for
   * performance purposes to reuse builder (one or multiple) instance to produce {@link
   * OutboundMessage} instances
   *
   * @param service instance of a messaging service
   * @return list of outbound messages
   */
  public static List<OutboundMessage> createMessagesFromTemplateWithStringPayload(
      MessagingService service) {

    final String[] messagePayloadArray = new String[]{"message 1", "message 2", "message 3",
        "message 4",
        "message 5"};

    final List<OutboundMessage> output = new LinkedList<>();

    // pre-configured message template
    final OutboundMessageBuilder messageTemplate = service.messageBuilder()
        .withHTTPContentHeader("text/plain", "UTF-8")
        .withPriority(100);

    final int nMessages = messagePayloadArray.length;

    for (int i = 0; i < nMessages; i++) {
      final OutboundMessage nextMessage = messageTemplate
          //.withSequenceNumber(i)
          .build(messagePayloadArray[i]);
      output.add(nextMessage);
    }

    return output;
  }

  /**
   * This example demonstrates how to create an {@link OutboundMessage} with a business object as a
   * payload using {@link ObjectToBytes} converter and setting manually message properties in a
   * builder
   *
   * @param service                instance of a messaging service
   * @param payload                business object
   * @param avroSchemaUriForMyData avro schema uri
   * @param avroSchemaRegistryUrl  registry url that hosts avro schema
   * @return {@link OutboundMessage} with encoded payload and properties
   */
  public static OutboundMessage createMessageWithBusinessObjectPayloadAndCustomHeaderProperties(
      MessagingService service,
      MyData payload, final String avroSchemaUriForMyData, final String avroSchemaRegistryUrl) {

    // converter for MyData business object
    final ObjectToBytes<MyData> pojo2ByteAvroConverter = (pojo) -> {
      // use avro to serialize to bytes
      return serializeWithAvro(pojo, avroSchemaUriForMyData, avroSchemaRegistryUrl);
    };
    final OutboundMessage myCustomMessage = service.messageBuilder()
        .withPriority(255)
        .withProperty("AVRO_SHEMA_URI", avroSchemaUriForMyData)
        .withProperty("AVRO_SHEMA_REGISTRY_URL", avroSchemaRegistryUrl)
        .withProperty("MY_CUSTOM_VERY_ESPECIAL_HEADER_PROPERTY_KEY", "corresponding value")
        .build(payload, pojo2ByteAvroConverter);
    return myCustomMessage;
  }

  /**
   * This method that mocks avro serialization
   *
   * @param d                     business object to be serialized
   * @param avroSchemaUri         schema uri that points to the given type/version json avro schema
   * @param avroSchemaRegistryUrl avro registry server url
   * @return serialized byte representation of data provided by user
   */
  private static byte[] serializeWithAvro(MyData d, String avroSchemaUri,
      String avroSchemaRegistryUrl) {
    // use avroSchemaUri and avroSchemaRegistryUrl to get avro json schema definition
    // use a real avro api to perform serialization instead of mock provided in this example
    byte[] asIfProducedFromAvroSerializingMyData = d.getName().getBytes(StandardCharsets.US_ASCII);
    return asIfProducedFromAvroSerializingMyData;
  }


  /**
   * basic example for a business object to be send in a message
   */
  static class MyData implements Serializable {

    private static final long serialVersionUID = 1L;
      
    private final String name;

    MyData(String name) {
      this.name = name;
    }

    public String getName() {
      return name;
    }
  }

}
