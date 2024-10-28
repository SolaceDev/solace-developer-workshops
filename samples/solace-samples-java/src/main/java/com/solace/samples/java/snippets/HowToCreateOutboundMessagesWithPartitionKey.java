package com.solace.samples.java.snippets;

import com.solace.messaging.MessagingService;
import com.solace.messaging.config.SolaceConstants.MessageUserPropertyConstants;
import com.solace.messaging.publisher.OutboundMessage;
import com.solace.messaging.publisher.OutboundMessageBuilder;
import java.util.Properties;

public class HowToCreateOutboundMessagesWithPartitionKey {


  /**
   * This example demonstrates how to set partition key using {@link OutboundMessageBuilder#withProperty(String,
   * String)}. This example demonstrates a DISPOSABLE single use {@link OutboundMessageBuilder}. We
   * recommend for performance purposes to reuse builder (one or multiple) instance to produce
   * {@link OutboundMessage} instances
   *
   * @param service instance of a messaging service
   * @param payload just a random byte payload
   * @return ready to go message
   */
  public static OutboundMessage createMessageWithPartitionKeyUsingWithProperty(
      MessagingService service, byte[] payload) {
    final String samplePartitionKey = "Group_0";
    final OutboundMessage myCustomMessage = service.messageBuilder()
        .withProperty(MessageUserPropertyConstants.QUEUE_PARTITION_KEY, samplePartitionKey)
        .build(payload);
    return myCustomMessage;
  }

  /**
   * This example demonstrates how to set partition key using {@link OutboundMessageBuilder#build(byte[],
   * Properties)}. This example demonstrates a DISPOSABLE single use {@link OutboundMessageBuilder}.
   * We recommend for performance purposes to reuse builder (one or multiple) instance to produce
   * {@link OutboundMessage} instances
   *
   * @param service instance of a messaging service
   * @param payload just a random byte payload
   * @return ready to go message
   */
  public static OutboundMessage createMessageWithPartitionKeyUsingBuildMethodProperties(
      MessagingService service, byte[] payload) {
    final Properties properties = new Properties();
    final String samplePartitionKey = "Group_0";
    properties.setProperty(MessageUserPropertyConstants.QUEUE_PARTITION_KEY, samplePartitionKey);
    final OutboundMessage myCustomMessage = service.messageBuilder()
        .build(payload, properties);
    return myCustomMessage;
  }

  /**
   * This example demonstrates how to set partition key using {@link OutboundMessageBuilder#fromProperties(Properties)}.
   * This example demonstrates a DISPOSABLE single use {@link OutboundMessageBuilder}. We recommend
   * for performance purposes to reuse builder (one or multiple) instance to produce {@link
   * OutboundMessage} instances
   *
   * @param service instance of a messaging service
   * @param payload just a random byte payload
   * @return ready to go message
   */
  public static OutboundMessage createMessageWithPartitionKeyUsingFromProperties(
      MessagingService service, byte[] payload) {
    final Properties properties = new Properties();
    final String samplePartitionKey = "Group_0";
    properties.setProperty(MessageUserPropertyConstants.QUEUE_PARTITION_KEY, samplePartitionKey);
    final OutboundMessage myCustomMessage = service.messageBuilder()
        .fromProperties(properties)
        .build(payload);
    return myCustomMessage;
  }
}
