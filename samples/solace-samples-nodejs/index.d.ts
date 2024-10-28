import { EventEmitter } from "events";
import { Long } from "long";
declare namespace solace {
  /**
   * <b>This class is not exposed for construction by API users. Users should obtain an instances from
   * one of the following:</b>
   * * {@link solace.SolclientFactory.createTopicDestination}
   * * {@link solace.SolclientFactory.createDurableQueueDestination}
   * * {@link solace.MessageConsumer#getDestination}
   * * {@link solace.SDTField#getValue} when {@link solace.SDTField#getType} returns
   *   {@link solace.SDTFieldType.DESTINATION}.
   *
   * Represents a message destination.
   *
   * Publishers can send messages to topics or queues, to which subscribers can subscribe or
   * bind. A Destination specifies the target of such an operation.
   */
  class Destination {
    /** @protected */
    protected constructor();
    readonly name: string;
    readonly type: solace.DestinationType;
    /**
     * @returns {string} The destination name specified at creation time.
     */
    getName(): string;
    /**
     * @returns {solace.DestinationType} The destination type
     */
    getType(): solace.DestinationType;
    /**
     * @returns {string} A generic description of the Destination.
     */
    toString(): string;
  }
  /**
   * <b>This class is not exposed for construction by API users.</b>
   * An error thrown when calling an API that has not been implemented.
   */
  class NotImplementedError extends solace.SolaceError {
    /** @protected */
    protected constructor();
    /**
     * Error Message.
     */
    message: string;
    /**
     * The name of the error.
     */
    name: string;
  }
  /**
   * <b>This class is not exposed for construction by API users.</b>
   * An error thrown by the API when an operational error is encountered.
   */
  class OperationError extends solace.SolaceError {
    /** @protected */
    protected constructor();
    /**
     * 'OperationError'
     */
    readonly name: string;
    /**
     * The subcode for the error. @see {@link solace.ErrorSubcode}
     */
    subcode: solace.ErrorSubcode;
    /**
     * The reason for the error: an embedded error object or exception.
     */
    reason: object;
    /**
     * Error Message.
     */
    message: string;
  }
  /**
   * <b>This class is not exposed for construction by API users.</b>
   *
   * Represents a request failure event; request failure events are passed to the application
   * event handling callback provided when sending the request {@link solace.Session#sendRequest}
   */
  class RequestError extends solace.OperationError {
    /** @protected */
    protected constructor();
    /**
     * 'RequestError'
     */
    readonly name: string;
    /**
     * A code that provides more information about the error event.
     */
    requestEventCode: solace.SessionEventCode;
    /**
     * The subcode for the error. @see {@link solace.ErrorSubcode}
     */
    subcode: solace.ErrorSubcode;
    /**
     * The reason for the error: an embedded error object or exception.
     */
    reason: object;
    /**
     * Error Message.
     */
    message: string;
  }
  /**
   * <b>This class is not exposed for construction by API users.</b>
   * The base class for all errors thrown by the API.
   */
  class SolaceError {
    /** @protected */
    protected constructor();
    /**
     * Error Message.
     */
    message: string;
    /**
     * The name of the error.
     */
    name: string;
  }
  /**
   * Properties used during initialization of {@link solace.SolclientFactory}.
   */
  class SolclientFactoryProperties {
    /**
* Creates an instance of SolclientFactoryProperties.
* @param {object} options The property names and values to apply to this instance
* @param {solace.LogLevel} options.logLevel logLevel (default={@link solace.LogLevel.INFO}
* @param {solace.LogImpl} options.logger log implementation (default=NULL)
* @param {solace.SolclientFactoryProfiles} options.profile Javascript profile
 (default={@link solace.SolclientFactoryProfiles.version7})
*/
    constructor(options?: {
      logLevel?: solace.LogLevel;
      logger?: solace.LogImpl;
      profile?: solace.SolclientFactoryProfiles;
    });
    /**
     * The factory profile to use. The following factory profiles are available:
     * * {@link solace.SolclientFactoryProfiles.version7}, a backwards-compatible profile
     *      for existing solClientJS 7.x applications
     * * {@link solace.SolclientFactoryProfiles.version10}, the recommended profile
     *      for new applications
     */
    profile: solace.SolclientFactoryProfiles;
    /**
     * The logging level to use for filtering log events. Messages with a level of lesser importance
     * than this will be filtered out and not logged.
     */
    logLevel: solace.LogLevel;
    /**
     * The logging implementation to use. In the debug API, the log implementation will be called
     * for every log statement not filtered out by the log level. If no implementation is supplied,
     * the default implementation will be used, which logs to the global console object.
     */
    logger: solace.LogImpl;
  }
  /**
   * A class that provides a binding to a log implementation. Applications that need to
   * control API logging must construct a LogImpl
   * instance, a log implementation that can be set in
   * {@link solace.SolclientFactoryProperties#logger}.
   * The binding will call the supplied log methods with the
   * parameters supplied to each.
   */
  class LogImpl {
    /**
     * @param {typeof solace.LogImpl.loggingCallback} trace Callback for {@link solace.LogLevel.TRACE} logs.
     * @param {typeof solace.LogImpl.loggingCallback} debug Callback for {@link solace.LogLevel.DEBUG} logs.
     * @param {typeof solace.LogImpl.loggingCallback} info Callback for {@link solace.LogLevel.INFO} logs.
     * @param {typeof solace.LogImpl.loggingCallback} warn Callback for {@link solace.LogLevel.WARN} logs.
     * @param {typeof solace.LogImpl.loggingCallback} error Callback for {@link solace.LogLevel.ERROR} logs.
     * @param {typeof solace.LogImpl.loggingCallback} fatal Callback for {@link solace.LogLevel.FATAL} logs.
     */
    constructor(
      trace: typeof solace.LogImpl.loggingCallback,
      debug: typeof solace.LogImpl.loggingCallback,
      info: typeof solace.LogImpl.loggingCallback,
      warn: typeof solace.LogImpl.loggingCallback,
      error: typeof solace.LogImpl.loggingCallback,
      fatal: typeof solace.LogImpl.loggingCallback
    );
    /**
* A logging callback. It must accept any valid number of arguments of any type. It must not throw.
* @param {any} args The arguments to log. Typically this is a mixture of strings and
 objects to be inspected. A simple implementation might call .toString() on each
 argument.
*/
    static loggingCallback(args: any): void;
  }
  /**
   * Message consumer event objects. A {@link solace.MessageConsumer} will emit
   * these events related to queue subscription management:
   * MessageConsumerEventName.SUBSCRIPTION_OK and
   * MessageConsumerEventName.SUBSCRIPTION_ERROR.
   *
   * Similar to SessionEvent.
   * Also compatible with RequestError.
   */
  class MessageConsumerEvent {
    /**
     * @param {string} messageConsumerEventName one of the MessageConsumerEventNames.
     * @param {string} infoStr Information string
     * @param {number} responseCode Any associated router response code
     * @param {solace.ErrorSubcode} errorSubcode Any associated error subcode
     * @param {object} correlationKey Any associated correlation key
     * @param {string} reason Any additional information
     */
    constructor(
      messageConsumerEventName: string,
      infoStr: string,
      responseCode?: number,
      errorSubcode?: solace.ErrorSubcode,
      correlationKey?: object,
      reason?: string
    );
    /**
     * the appropriate MessageConsumerEventName
     *
     *   MessageConsumerEventName.SUBSCRIPTION_OK or
     *   MessageConsumerEventName.SUBSCRIPTION_ERROR.
     */
    messageConsumerEventName: string;
    /**
     * the appropriate MessageConsumerEventName
     *
     *   MessageConsumerEventName.SUBSCRIPTION_OK or
     *   MessageConsumerEventName.SUBSCRIPTION_ERROR.
     */
    name: string;
    /**
     * if applicable, an information string returned by the Solace Message Router.
     */
    infoStr: string;
    /**
     * if applicable, a response code returned by the Solace Message Router.
     */
    responseCode: number;
    /**
     * if applicable, an error subcode. Defined in {@link solace.ErrorSubcode}
     * same as subcode.
     */
    errorSubcode: solace.ErrorSubcode;
    /**
     * if applicable, an error subcode. Defined in {@link solace.ErrorSubcode}
     * Same as errorSubcode.
     */
    subcode: solace.ErrorSubcode;
    /**
     * A user-specified object
     * made available in the response or confirmation event by including it as a
     * parameter in the orignal API call.  If the user did not specify a
     * correlationKey, it will be <code>null</code>.
     */
    correlationKey: object;
    /**
     * Additional information if it is applicable.
     *
     * In case of subscribe or publish events, it constains the topic.
     */
    reason: string;
    /**
     * Only here for compatibility with the RequestError exception class.
     * Always returns undefined for a MessageConsumerEvent.
     */
    requestEventCode: solace.SessionEventCode;
  }
  /**
   * Defines the properties for a {@link solace.MessageConsumer}.
   */
  class MessageConsumerProperties {
    /**
     */
    constructor();
    /**
     * Defines the queue from which to consume.
     *  * For durable queues and durable topic endpoints, this must be a
     *    {@link solace.QueueDescriptor} unless
     *    {@link solace.MessageConsumerProperties#createIfMissing} is set.
     *  * When an {@link solace.AbstractQueueDescriptor} is used, the name is generated when
     *    the {@link solace.MessageConsumer} is connected. The generated descriptor can be queried
     *    from the consumer after it has successfully connected by calling
     *    {@link solace.MessageConsumer#getProperties}.
     */
    queueDescriptor: solace.QueueDescriptor;
    /**
     * Gets the properties of the remote queue.
     *  * For temporary queues and temporary topic endpoints,
     *    or if {@link solace.MessageConsumerProperties#createIfMissing} is true,
     *    these properties define the endpoint that is created.
     *  * For durable queues, these must be unset on consumer creation
     *    unless {@link solace.MessageConsumerProperties#createIfMissing} is set.
     *    The values will be populated
     *    after the queue is connected and can be retrieved by calling
     *    {@link solace.MessageConsumer#getProperties}.
     */
    queueProperties: solace.QueueProperties;
    /**
     * The bind timeout in milliseconds when creating a connection to the Solace Message Router.
     *  * The valid range is >= 50.
     */
    connectTimeoutInMsecs?: number;
    /**
     * Gets and sets the maximum number of bind attempts when creating a connection to the
     * Solace Message Router.
     *  * The valid range is >= 1.
     */
    connectAttempts?: number;
    /**
     * This must be undefined if the type of the
     * {@link solace.MessageConsumerProperties#queueDescriptor} is not
     * {@link solace.QueueType.TOPIC_ENDPOINT}.
     *
     * If {@link solace.MessageConsumerProperties#queueDescriptor} is
     * not durable, or {@link solace.MessageConsumerProperties#createIfMissing} is true,
     * this may be left undefined to generate the topic endpoint's
     * destination. When generated, the destination can be obtained from
     * the {@link solace.MessageConsumer} after it is connected by calling
     * {@link solace.MessageConsumer#getDestination}.
     */
    topicEndpointSubscription?: solace.Destination;
    /**
     * The Application Acknowledgement mode for the Message Consumer.
     *
     * When the acknowledgement mode is {@link solace.MessageConsumerAcknowledgeMode.CLIENT},
     * a message is Application Acknowledged when the application calls
     * {@link solace.Message#acknowledge} on that message.
     *
     * When the acknowledge mode is {@link solace.MessageConsumerAcknowledgeMode.AUTO}, a message is
     * Application Acknowledged by the API after all
     * {@link solace.MessageConsumerEventName#event:MESSAGE}
     * listeners are called and none throw an exception. If a message handler throws, the message
     * can still be acknowledged by calling {@link solace.Message#acknowledge}, but this would not be
     * a recommended practice.
     *
     * When received messages are Application Acknowledged they are removed from the Guaranteed
     * Message storage on the Solace Message Router. Message Consumer Application Acknowledged,
     * <b>only</b> remove messages from the Solace Message Router.
     *
     * In particular, withholding Message Consumer Acknowledgemnts does not stop
     * message delivery. For Message Consumer flow control (aka transport acknowledgemeent) see
     * {@link solace.MessageConsumer#stop}/{@link solace.MessageConsumer#start}. Message Consumer
     * flow control may also be imlpemented by removing the
     * {@link solace.MessageConsumerEventName#event:MESSAGE} listener.
     *
     * Flow control and transport acknowledgements characteristics are defined by
     * {@link solace.MessageConsumerProperties#transportAcknowledgeThresholdPercentage} and
     * {@link solace.MessageConsumerProperties#transportAcknowledgeTimeoutInMsecs}
     */
    acknowledgeMode?: solace.MessageConsumerAcknowledgeMode;
    /**
     * The transport acknowledgement timeout for guaranteed messaging.
     * When the {@link solace.MessageConsumerProperties.transportAcknowledgeTimeoutInMsecs}
     * is not exceeded, acknowledgements will be returned to the router at intervals not less than
     * this value.
     *   * The valid range is 20 <= transportAcknowledgeTimeoutInMsecs <= 1500.
     */
    transportAcknowledgeTimeoutInMsecs?: number;
    /**
     * The threshold for sending an acknowledgement, as a percentage.
     * The API sends a transport acknowledgment every
     * N messages where N is calculated as this percentage of the transport
     * window size if the endpoint's max-delivered-unacked-msgs-per-flow
     * setting at bind time is greater than or equal to the transport
     * window size. Otherwise, N is calculated as this percentage of the
     * endpoint's max-delivered-unacked-msgs-per-flow setting at bind time.
     * * The valid range is 1 <= transportAcknowledgeThresholdPercentage <= 75.
     */
    transportAcknowledgeThresholdPercentage?: number;
    /**
     * When enabled, a Guaranteed Messaging Consumer requests Active and Inactive
     * events from the router and emits them to interested listeners.
     */
    activeIndicationEnabled?: boolean;
    /**
     * When enabled, a Guaranteed Messaging Consumer does not receive messages published
     * in the same Session, even if the endpoint contains a subscription that matches the published
     * message.
     */
    noLocal?: boolean;
    /**
     * The window size for Guaranteed Message delivery.  This is the maximum number of messages that
     * will be prefetched from the Solace Messaging Router and queued internally by the API while
     * waiting for the application to accept delivery of the messages.
     *   * The valid range is 1 <= windowSize <= 255.
     */
    windowSize?: number;
    /**
     * When a Flow is created, the application may request replay of messages from the replay log,
     * even messages that have been previously delivered and removed the from topic endpoint or queue.
     * The default is undefined, and indicates that no replay is requested.
     *
     * When defined the replay start location must be a {@link solace.ReplayStartLocation} object
     * as returned by
     * {@link solace.SolClientFactory.createReplayStartLocationBeginning} or
     * {@link solace.SolClientFactory.createReplayStartLocationDate}.
     *
     * The {@link solace.ReplayStartLocation} returned by
     * {@link solace.SolClientFactory.createReplayStartLocationBeginning}
     * indicate that all messages available should be replayed.
     *
     * The replay start location returned by
     * {@link solace.SolClientFactory.createReplayStartLocationDate}
     * indicates that all messages logged since a given date must be retrieved.
     */
    replayStartLocation?: solace.ReplayStartLocation;
    /**
     * When a connected flow receives an unsolicited unbind event with subcode
     * REPLAY_STARTED or GM_UNAVAILABLE, the SDK can reconnect the flow automatically.
     * This property controls the flow auto reconnect feature:
     * 0: Disable flow auto reconnect for this consumer flow.
     * -1: Enable flow auto reconnect for this consumer flow, infiinite retries (default)
     * <n, positive number>: Enable flow auto reconnect for this consumer flow, n retries.
     *
     * When the flow auto rebind is enabled, DOWN_ERRORs with REPLAY_STARTED and GM_UNAVAILABLE
     * are handled internally, and not (immediately) emitted to the application.
     * A RECONNECTING event (with the same subcode) is emitted instead,
     * ideally followed by a RECONNECTED event when the reconnect succeedes.
     * In case of REPLAY_STARTED, the window of message IDs and acknowledgements are reset
     * to allow replay packets to be passed to the application without marking them as duplicates.
     * In case of GM_UNAVAILABLE, flow state is preserved.
     *
     * If reconnecting fails after exhausting the number of retries, a DOWN_ERROR is emitted
     * with the details of the last retry.
     */
    reconnectAttempts?: number;
    /**
     * Time to wait between flow auto reconnect attempts, in milliseconds.
     * See {@link solace.MessageConsumerProperties.reconnectAttempts}
     * Defaults to 3 seconds (3000)
     *  * The valid range is >= 50.
     */
    reconnectIntervalInMsecs?: number;
    /**
     * If the endpoint is durable, it won't be auto-created unless this flag is set.
     * This flag has no effect for temporary endpoints, those are always created if missing.
     * This flag has no effect for existing endpoints.
     *
     * Off by default for backwards compatibility.
     */
    createIfMissing?: boolean;
  }
  interface MessageConsumer {
    on<U extends keyof solace.MessageConsumerEventNameEvents>(
      event: U,
      listener: solace.MessageConsumerEventNameEvents[U]
    ): this;
  }
  /**
   * <b>This class is not exposed for construction by API users.</b>
   * A Message Consumer is created by calling {@link solace.Session#createMessageConsumer}.
   *
   * A MessageConsumer controls Guaranteed Message delivery to this client.
   *
   * Consumer characteristics and behavior are defined by {@link solace.MessageConsumerProperties}.
   * The properties can also be supplied as a simple key-value {Object}. The queue descriptor,
   * {@link solace.MessageConsumerProperties#queueDescriptor} must be specified to identify the
   * Guaranteed Message Queue or Guaranteed Message Topic Endpoint on the Solace Message Router.
   *
   * The MessageConsumer object is an EventEmitter, and will emit events to which the
   * application may choose to subscribe, such as the connection to the Solace Message Router
   * going up or down.
   *
   * If a registered listener for an emitted event throws an exception, this is caught and emitted as
   * an 'error'.
   * @fires solace.MessageConsumerEventName#event:ACTIVE
   * @fires solace.MessageConsumerEventName#event:CONNECT_FAILED_ERROR
   * @fires solace.MessageConsumerEventName#event:DISPOSED
   * @fires solace.MessageConsumerEventName#event:DOWN
   * @fires solace.MessageConsumerEventName#event:DOWN_ERROR
   * @fires solace.MessageConsumerEventName#event:GM_DISABLED
   * @fires solace.MessageConsumerEventName#event:INACTIVE
   * @fires solace.MessageConsumerEventName#event:MESSAGE
   * @fires solace.MessageConsumerEventName#event:UP
   * @fires solace.MessageConsumerEventName#event:SUBSCRIPTION_OK
   * @fires solace.MessageConsumerEventName#event:SUBSCRIPTION_ERROR
   */
  class MessageConsumer extends EventEmitter {
    /** @protected */
    protected constructor();
    /**
     * After the MessageConsumer has connected to an endpoint
     * ({@link solace.MessageConsumerEventName#UP}), accesstype represents
     *  the access type for the endpoint to which this Message Consumer is bound.
     */
    static accessType: solace.QueueAccessType;
    /**
     * After the MessageConsumer has connected as indicated by the event
     * {@link solace.MessageConsumerEventName#event:UP}, queueDiscardBehavior represents
     * the discard behavior flags for the endpoint to which this Message Consumer is bound.
     */
    static queueDiscardBehaviour: solace.QueueDiscardBehavior;
    /**
     * After the MessageConsumer has connected as indicated by the event
     * {@link solace.MessageConsumerEventName#event:UP}
     * respectsTTL is `true` when the endpoint respects Time To Live on messages
     * and 'false' otherwise.
     */
    static respectsTTL: boolean;
    /**
     * After the MessageConsumer has connected as indicated by the event
     * {@link solace.MessageConsumerEventName#event:UP}, this property represents
     * permissions granted by the router to this user on this Message Consumer
     */
    static permissions: solace.QueuePermissions;
    /**
     * Returns true if this Guaranteed Message Consumer was disposed.
     */
    disposed: void;
    readonly session: void;
    /**
* Begins delivery of messages to this consumer. This method opens the protocol window
* to the Solace Message Router so further messages can be received.
* 
* A newly created consumer is in started state.
* 
* If the consumer was already started, this method has no effect.
* 
* A consumer is stopped by calling {@link solace.MessageConsumer.stop}
* @throws {solace.OperationError} * if the Message Consumer is disposed.
  subcode = {@link solace.ErrorSubcode.INVALID_OPERATION}
* if the Message Consumer is disconnected.
  subcode = {@link solace.ErrorSubcode.INVALID_OPERATION}
*/
    start(): void;
    /**
* Stops messages from being delivered to this consumer from the Solace Message Router.
* Messages may continue to be prefetched by the API and queued internally
* until {@link solace.MessageConsumer#start} is called.
* 
* If the consumer was already stopped, this method has no effect.
* @throws {solace.OperationError} * if the Message Consumer is disconnected.
  subcode = {@link solace.ErrorSubcode.INVALID_OPERATION}
*/
    stop(): void;
    /**
* Connects the consumer immediately. The application should add event listeners (see
* {@link solace.MessageConsumerEventName}). If there is no listener added for
* {@link solace.MessageConsumerEventName#event:MESSAGE} then up to a window
* {@link solace.MessageConsumerProperties.windowSize} of messages can be queued internally.
* to the {@link solace.MessageConsumer} before calling this method.
* @throws {solace.OperationError} * if consumer is not supported by router for this client.
 subcode = {@link solace.ErrorSubcode.INVALID_OPERATION}
*/
    connect(): void;
    /**
* Initiates an orderly disconnection of the Message Consumer. The API will send any pending
* client acknowledgements on the Message Consumer, then send an unbind request.
* Any messages subsequently
* received are discarded silently. When the unbind message is acknowledged, the application
* receives a {@link solace.MessageConsumerEventName#event:DOWN} event if it has set a listener
* for that event.
* @throws {solace.OperationError} * if the Message Consumer is disconnected.
  subcode = {@link solace.ErrorSubcode.INVALID_OPERATION}
*/
    disconnect(): void;
    /**
     * Returns the destination that should be used to publish messages that this consumer
     * will receive.
     * * For topic endpoints, this is the topic to which the topic endpoint is subscribed.
     * * For queues, this is the associated queue destination.
     *
     * The destination returned can
     * be used to set the ReplyTo field in a message, or otherwise communicated
     * to partners that need to send messages to this Message Consumer. This is especially useful
     * for temporary endpoints (Queues and Topic Endpoints), as the destination
     * is unknown before the endpoint is created.
     *
     * This method will succeed after {@link solace.MessageConsumerEventName#event:UP} for temporaries
     * with generated destinations.
     * @returns {solace.Destination} The publishing destination that delivers to this consumer.
     * @throws {solace.OperationError} * if the {@link solace.MessageConsumer} is disconnected and the destination is temporary.
     */
    getDestination(): solace.Destination;
    /**
     * Creates and returns copy of the properties for this MessageConsumer.
     *
     * If the object was constructed using an {@link solace.AbstractQueueDescriptor},
     * and the queue descriptor was subsequently connected to an endpoint, the
     * `MessageConsumerProperties` returned will include a {@link solace.QueueDescriptor}
     * that contains the resolved name.
     *
     * A new copy of the properties object is returned each time this property is accessed.
     * The returned object cannot be polled for mutations such as the one described above.
     * @returns {solace.MessageConsumerProperties} The properties associated with this object.
     */
    getProperties(): solace.MessageConsumerProperties;
    /**
* Subscribe the queue to a topic, always requesting confirmation from the router.
* 
* {@link solace.MessageConsumerEventName.SUBSCRIPTION_OK} is generated when subscription is
* added successfully; otherwise, session event
* {@link solace.MessageConsumerEventName.SUBSCRIPTION_ERROR} is generated.
* 
* When the application receives the event
* {@link solace.MessageConsumerEventName.SUBSCRIPTION_ERROR}, it
* can obtain the failed topic subscription by calling
* {@link solace.MessageConsumerEvent#reason}.
* The returned string is in the format of "Topic: <failed topic subscription>".
* @param {solace.Destination} topic The topic destination subscription to add.
* @param {object} correlationKey If specified, this value is
                               echoed in the messageConsumer event within
                               {@link MessageConsumerEvent}.
* @param {number} requestTimeout The request timeout period (in milliseconds). If specified, this
                               value overwrites readTimeoutInMsecs property in
                               {@link SessionProperties}.
* @throws {solace.OperationError} * if the session is disposed or disconnected,
  or the consumer is inactive, down, disconnected, or disposed.
  Or if the consumer is bound to a topic endpoint instead of a queue.
  Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}.
* if the parameters have an invalid type.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_INVALID_TYPE}.
* if the parameters have an invalid value.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_OUT_OF_RANGE}.
* if the topic has invalid syntax.
  Subcode: {@link solace.ErrorSubcode.INVALID_TOPIC_SYNTAX}.
* if there's no space in the transport to send the request.
  Subcode: {@link solace.ErrorSubcode.INSUFFICIENT_SPACE}.  See:
  {@link solace.SessionEventCode#event:CAN_ACCEPT_DATA}.
* if the topic is a shared subscription and the peer router does not support Shared
  Subscriptions.
  Subcode: {@link solace.ErrorSubcode.SHARED_SUBSCRIPTIONS_NOT_SUPPORTED}.
* if the topic is a shared subscription and the client does not allowed Shared
  Subscriptions.
  Subcode: {@link solace.ErrorSubcode.SHARED_SUBSCRIPTIONS_NOT_ALLOWED}.
*/
    addSubscription(
      topic: solace.Destination,
      correlationKey: object,
      requestTimeout: number
    ): void;
    /**
* Unsubscribe the queue from a topic, requesting confirmation from the router.
* 
* {@link solace.MessageConsumerEventName.SUBSCRIPTION_OK} is generated when subscription is
* removed successfully; otherwise, session event
* {@link solace.MessageConsumerEventName.SUBSCRIPTION_ERROR} is generated.
* 
* When the application receives the message consumer event
* {@link solace.MessageConsumerEventName.SUBSCRIPTION_ERROR}, it
* can obtain the failed topic subscription by calling
* {@link solace.MessageConsumerEvent#reason}. The returned
* string is in the format "Topic: <failed topic subscription>".
* @param {solace.Destination} topic The topic destination subscription to remove.
* @param {object} correlationKey If <code>null</code> or undefined, a Correlation Key is not set
                               in the confirmation session event.
* @param {number} requestTimeout The request timeout period (in milliseconds). If specified, this
                               value overwrites readTimeoutInMsecs property in
                               {@link SessionProperties}.
* @throws {solace.OperationError} * if the session is disposed or disconnected,
  or the consumer is inactive, down, disconnected, or disposed.
  Or if the consumer is bound to a topic endpoint instead of a queue.
  Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}.
* if the parameters have an invalid type.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_INVALID_TYPE}.
* if the parameters have an invalid value.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_OUT_OF_RANGE}.
* if the topic has invalid syntax.
  Subcode: {@link solace.ErrorSubcode.INVALID_TOPIC_SYNTAX}.
* if there's no space in the transport to send the request.
  Subcode: {@link solace.ErrorSubcode.INSUFFICIENT_SPACE}.  See:
  {@link solace.SessionEventCode#event:CAN_ACCEPT_DATA}.
* if the topic is a shared subscription and the peer router does not support Shared
  Subscriptions.
  Subcode: {@link solace.ErrorSubcode.SHARED_SUBSCRIPTIONS_NOT_SUPPORTED}.
* if the topic is a shared subscription and the client does not allowed Shared
  Subscriptions.
  Subcode: {@link solace.ErrorSubcode.SHARED_SUBSCRIPTIONS_NOT_ALLOWED}.
*/
    removeSubscription(
      topic: solace.Destination,
      correlationKey: object,
      requestTimeout: number
    ): void;
    /**
     * Clears all statistics for this Guaranteed Message Connection. All previous Guaranteed
     * Message Connection statistics are lost
     * when this is called.
     * @throws {solace.OperationError} * if the Message Consumer is disposed. subcode = {@link solace.ErrorSubcode.INVALID_OPERATION}
     */
    clearStats(): void;
    /**
     * Disposes the Guaranteed Message connection, removing all listeners and releasing references.
     */
    dispose(): void;
    /**
     * Returns a statistic for this Guaranteed Message connection.
     * @param {solace.StatType} statType The statistic to return.
     * @returns {number} The value for the statistic.
     */
    getStat(statType: solace.StatType): number;
    /**
     * @returns {string} A description of this Guaranteed Message Connection
     */
    toString(): string;
  }
  /**
   * Defines the properties for a {@link solace.QueueBrowser}.
   */
  class QueueBrowserProperties {
    /**
     */
    constructor();
    /**
     * Defines the queue from which to consume.
     *  * For durable queues and durable topic endpoints, this must be a
     *    {@link solace.QueueDescriptor}.
     */
    queueDescriptor: solace.QueueDescriptor;
    /**
     * The bind timeout in milliseconds when creating a connection to the Solace Message Router.
     *  * The valid range is >= 50.
     */
    connectTimeoutInMsecs?: number;
    /**
     * Gets and sets the maximum number of bind attempts when creating a connection to the
     * Solace Message Router.
     *  * The valid range is >= 1.
     */
    connectAttempts?: number;
    /**
     * The window size for Guaranteed Message delivery.  This is the maximum number of messages that
     * will be prefetched from the Solace Messaging Router and queued internally by the API while
     * waiting for the application to accept delivery of the messages.
     *   * The valid range is 1 <= windowSize <= 255.
     */
    windowSize?: number;
    /**
     * The transport acknowledgement timeout for guaranteed messaging in milliseconds.
     * When the {@link solace.QueueBrowserProperties.transportAcknowledgeTimeoutInMsecs} is not
     * exceeded, acknowledgements will be returned to the router at intervals not less than
     * this value.
     *   * The valid range is 20 <= transportAcknowledgeTimeoutInMsecs <= 1500.
     */
    transportAcknowledgeTimeoutInMsecs?: number;
    /**
     * The threshold for sending an acknowledgement, as a percentage.
     * The API sends a transport acknowledgment every
     * N messages where N is calculated as this percentage of the transport
     * window size if the endpoint's max-delivered-unacked-msgs-per-flow
     * setting at bind time is greater than or equal to the transport
     * window size. Otherwise, N is calculated as this percentage of the
     * endpoint's max-delivered-unacked-msgs-per-flow setting at bind time.
     * * The valid range is 1 <= transportAcknowledgeThresholdPercentage <= 75.
     */
    transportAcknowledgeThresholdPercentage?: number;
  }
  interface QueueBrowser {
    on<U extends keyof solace.QueueBrowserEventNameEvents>(
      event: U,
      listener: solace.QueueBrowserEventNameEvents[U]
    ): this;
  }
  /**
   * <b>This class is not exposed for construction by API users.</b>
   * A Queue Browser is created by calling {@link solace.Session#createQueueBrowser}.
   *
   * A Queue Browser allows client applications to look at messages spooled on Endpoints
   * without removing them. Messages are browsed from oldest to newest.
   * After being browsed, messages are still available for consumption over normal flows.
   * However, it is possible to selectively remove messages from the persistent store of an Endpoint.
   * In this case, these removed messages will no longer be available for consumption.
   * Note: If browsing a queue with an active consumer, no guarantee is made that the browser will
   * receive all messages published to the queue. The consumer can receive and acknowledge messages
   * before they are delivered to the browser.
   *
   * One typical application is to use Browsers to allow message bus administrators to remove “stuck”
   * Guaranteed messages from an Endpoint without having to modify or disrupt existing applications.
   * A message can get stuck if:
   *
   *  1) It has been received by an application, but for some reason, that application has failed to
   *     acknowledge it.
   *  2) All active message selectors have failed to match this particular message and therefore the
   *     message bus has not delivered it to any client yet. The current release only supports
   *     browsing Endpoints of type Queue.
   *
   * Note that the delivery restrictions imposed by the queue’s Access type
   * (exclusive or non-exclusive), do not apply when browsing messages with a Browser.
   *
   * Browser characteristics and behavior are defined by {@link solace.QueueBrowserProperties}.
   * The properties can also be supplied as a simple key-value {Object}. The queue descriptor,
   * {@link solace.QueueBrowserProperties#queueDescriptor} must be specified to identify the
   * Guaranteed Message Queue on the Solace Message Router.
   *
   * The Browser is an EventEmitter, and will emit events to which the application may choose to
   * subscribe, such as the connection to the Solace Message Router going up or down.
   *
   * If a registered listener for an emitted event throws an exception, this is caught and emitted as
   * an 'error'.
   * @fires solace.QueueBrowserEventName#event:CONNECT_FAILED_ERROR
   * @fires solace.QueueBrowserEventName#event:DISPOSED
   * @fires solace.QueueBrowserEventName#event:DOWN
   * @fires solace.QueueBrowserEventName#event:DOWN_ERROR
   * @fires solace.QueueBrowserEventName#event:GM_DISABLED
   * @fires solace.QueueBrowserEventName#event:MESSAGE
   * @fires solace.QueueBrowserEventName#event:UP
   */
  class QueueBrowser extends EventEmitter {
    /** @protected */
    protected constructor();
    /**
* Connects the queue browser immediately. The application should add event listeners (see
* {@link solace.QueueBrowserEventName}). If there is no listener added for
* {@link solace.QueueBrowserEventName#event:MESSAGE} then up to a window
* {@link solace.QueueBrowserProperties.windowSize} of messages can be queued internally.
* before calling this method.
* @throws {solace.OperationError} * if consumer is not supported by router for this client.
 subcode = {@link solace.ErrorSubcode.INVALID_OPERATION}
*/
    connect(): void;
    /**
* Initiates an orderly disconnection of the queue browser. The API will send an unbind request.
* Any messages subsequently received are discarded silently.
* When the unbind message is acknowledged, the application
* receives a {@link solace.QueueBrowserEventName#event:DOWN} event if it has set a listener
* for that event.
* @throws {solace.OperationError} * if the Message Consumer is disconnected.
  subcode = {@link solace.ErrorSubcode.INVALID_OPERATION}
*/
    disconnect(): void;
    /**
* Begins delivery of messages to this queue browser. This method opens the protocol window
* to the Solace Message Router so further messages can be received.
* 
* A newly created queue browser is in started state.
* 
* If the queue browser was already started, this method has no effect.
* 
* A consumer is stopped by calling {@link solace.QueueBrowser.stop}
* @throws {solace.OperationError} * if the Queue BrowserMessage Consumer is disposed.
  subcode = {@link solace.ErrorSubcode.INVALID_OPERATION}
* if the Message Consumer is disconnected.
  subcode = {@link solace.ErrorSubcode.INVALID_OPERATION}
*/
    start(): void;
    /**
* Stops messages from being delivered to this queue browser from the Solace Message Router.
* Messages may continue to be prefetched by the API and queued internally
* until {@link solace.QueueBrowser#start} is called.
* 
* If the queue browser was already stopped, this method has no effect.
* @throws {solace.OperationError} * if the Queue Browser is disconnected.
  subcode = {@link solace.ErrorSubcode.INVALID_OPERATION}
*/
    stop(): void;
    /**
     * Removes a message from the queue by acknowledging it.
     *
     * The {@link solace.QueueBrowser} does not automatically acknowledge messages.
     * once they have been received.
     *
     * The API does not send acknowledgments immediately. It stores the state for
     * acknowledged messages internally and acknowledges messages, in bulk, when a
     * threshold or timer is reached.
     * @param {Message} message The message to remove
     */
    removeMessageFromQueue(message: Message): void;
  }
  /**
   * Properties that define the configuration for a guaranteed message publisher.
   */
  class MessagePublisherProperties {
    /**
     * @param {object} options Properties to apply to the newly constructed object.
     */
    constructor(options: object);
    /**
     * When enabled, a Guaranteed Messaging Publisher
     * is automatically created when a session is connected.
     *
     * The default value is the same as the value provided to
     * {@link solace.SolclientFactory.init},
     * in the profile, {@link solace.SolclientFactoryProperties#profile},
     * in the field {@link solace.FactoryProfile#guaranteedMessagingEnabled}.
     */
    enabled: boolean;
    /**
     * Maximum number of messages that can be published
     * without acknowledgment.
     *  * The valid range is 1 <= value <= 255
     */
    windowSize?: number;
    /**
     * The time to wait for an acknowledgement,
     * in milliseconds, before retransmitting unacknowledged
     * messages.
     *  * The valid range is 20 <= value <= 60000.
     */
    acknowledgeTimeoutInMsecs?: number;
    /**
     * The message-router sends windowed acknowledgements
     * which the API converts to per-message acknowledgement by default. If
     * acknowledgeMode is Windowed, then the API will simply pass through
     * the message-router acknowledgements.
     */
    acknowledgeMode?: solace.MessagePublisherAcknowledgeMode;
  }
  /**
   * <b>This class is not exposed for construction by API users. Users should obtain an instance from
   * {@link solace.SolclientFactory.createMessage}</b>
   * <p>
   * A message is a container that can be used to store and send messages to and from the
   * Solace Message Router.
   *
   * Applications manage the lifecycle of a message; a message is created by calling
   * {@link solace.SolclientFactory.createMessage} and is freed by dereferencing it.
   *
   * API operations that cache or mutate messages always take a copy. A message may
   * be created, mutated by the API user, and sent multiple times.
   *
   * The Message Object provides methods to manipulate the common Solace
   * message header fields that are optionally sent in the binary metadata
   * portion of the Solace message.
   *
   * Applications can also use the structured data API {@link solace.Message#setSdtContainer}
   * to add containers (maps or streams) and their fields to the binary payload or
   * to the User Property map contained within the binary metadata.
   *
   * This does not prevent applications from ignoring these
   * methods and sending payload in the binary payload as an opaque binary field for
   * end-to-end communications
   */
  class Message {
    /** @protected */
    protected constructor();
    /**
     * Returns whether acknowledge() has been called on this message.
     */
    readonly isAcknowledged: boolean;
    /**
     * Gets the payload type ({@link solace.MessageType}) of the message. A message has a
     * structured payload if one was attached via {@link solace.Message#setSdtContainer} otherwise
     * if the payload is attached via {@link Message@setBinaryAttachment} then it
     * is unstructured ({@link solace.MessageType#BINARY})
     * @returns {solace.MessageType} The structured payload type.
     */
    getType(): solace.MessageType;
    /**
     * Sets the application-provided message ID.
     * @param {string} value The new value for the application-provided message ID.
     */
    setApplicationMessageId(value: string): void;
    /**
     * Gets the application-provided message ID.
     * @returns {string} The application provided message ID.
     */
    getApplicationMessageId(): string | null;
    /**
     * Sets the application message type. This value is used by applications
     * only, and is passed through the API and Solace Message Router untouched.
     * @param {string} value The application message type.
     */
    setApplicationMessageType(value: string): void;
    /**
     * Gets the application message type. This value is used by applications
     * only, and is passed through the API and Solace Message Router untouched.
     * @returns {string} The application message type.
     */
    getApplicationMessageType(): string | null;
    /**
     * Gets the binary attachment part of the message.
     *
     * Backward compatibility note: Using the version10 factory profile or older,
     * the binary attachment is returned as a 'latin1' String:
     * Each character has a code in the range * 0-255
     * representing the value of a single received byte at that position.
     * @returns {Uint8Array} A TypedArray view of the binary attachment.
     */
    getBinaryAttachment(): Uint8Array | null;
    /**
     * Sets the binary attachment part of the message.
     *
     * The binary attachment is conceptually an array of bytes.
     * When this method is used, the message payload type is {@link solace.MessageType#BINARY}
     * See {@link solace.Message#getType}.
     *
     * Applications may set the binary attachment to NULL or undefined to
     * remove the binary attachment and create a message with no payload.
     *
     * The following types are accepted:
     *   Buffer (the nodeJS native type or equivalent)
     *   ArrayBuffer,
     *   Any DataView or TypedArray,
     *   'latin1' String for backwards compatibility:
     *     each character has a code in the range 0-255
     *     representing exactly one byte in the attachment.
     * @param {Uint8Array} value Sets the binary attachment part of the message.
     */
    setBinaryAttachment(value: Uint8Array): void;
    /**
     * Given a Message containing a cached message, return the cache Request Id that
     * the application set in the call to {@link solace.CacheSession#sendCacheRequest}.
     * @returns {number} The request ID of the cache request associated with this message.
     */
    getCacheRequestId(): number | null;
    /**
     * Gets the correlation ID.  The message Correlation Id
     * is carried in the Solace message headers unmodified by the API and
     * the Solace Message Router. This field may be used for peer-to-peer
     * message synchronization and is commonly used for correlating
     * a request to a reply. See {@link solace.Session#sendRequest}.
     * @returns {string} The correlation ID associated with the message.
     */
    getCorrelationId(): string | null;
    /**
     * Sets the correlation ID. The message Correlation Id
     * is carried in the Solace message headers unmodified by the API and
     * the Solace Message Router. This field may be used for peer-to-peer
     * message synchronization and is commonly used for correlating
     * a request to a reply. See {@link solace.Session#sendRequest}.
     * @param {string} value The correlation ID to associate with the message.
     */
    setCorrelationId(value: string): void;
    /**
* Gets the correlation Key. A correlation key is used to correlate
* a message with its acknowledgement or rejection. The correlation key is an object that is
* passed back to the client during the router acknowledgement or rejection.
* 
* The correlation key is a local reference
* used by applications generating Guaranteed messages. Messages that are
* sent in either {@link solace.MessageDeliveryModeType.PERSISTENT} or
* {@link solace.MessageDeliveryModeType.NON_PERSISTENT} mode may set the correlation key.
* @returns {object} The correlation Key associated with the message,
or <code>null</code>, if unset.
*/
    getCorrelationKey(): object | null;
    /**
     * Sets the correlation Key. A correlation key is used to correlate
     * a message with its acknowledgement or rejection. The correlation key is an object that is
     * passed back to the client during the router acknowledgement or rejection.
     *
     * The correlation key is a local reference
     * used by applications generating Guaranteed Messages. Messages that are
     * sent in either {@link solace.MessageDeliveryModeType.PERSISTENT} or
     * {@link solace.MessageDeliveryModeType.NON_PERSISTENT} mode may set the correlation key. If this
     * method is used, the correlation information is returned
     * when the {@link solace.SessionEventCode#event:ACKNOWLEDGED_MESSAGE} event
     * is later received for an acknowledged message or when the
     * {@link solace.SessionEventCode#event:REJECTED_MESSAGE_ERROR} is received for a rejected
     * message.
     *
     * The API only maintains a reference to the passed object.  If the application requires the
     * contents are unmodified for proper correlation, then it is the application's responsibility
     * to ensure the contents of the object are not modified.
     *
     * Important: <b>The Correlation Key is not included in the
     * transmitted message and is only used with the local API</b>
     * @param {object} value The correlation Key to associate with the message.
     */
    setCorrelationKey(value: object): void;
    /**
     * Gets the delivery mode of the message.
     * @returns {solace.MessageDeliveryModeType} representing the delivery mode of the message.
     */
    getDeliveryMode(): solace.MessageDeliveryModeType;
    /**
     * Sets the delivery mode of the message.
     * @param {solace.MessageDeliveryModeType} value The message delivery mode.
     */
    setDeliveryMode(value: solace.MessageDeliveryModeType): void;
    /**
     * Gets the destination to which the message was published.
     * @returns {Destination} The destination to which a message was published.
     */
    getDestination(): Destination | null;
    /**
     * Sets the destination ({@link solace.DestinationType#Topic} or
     * {@link solace.DestinationType#Queue}) to publish the message to.
     * @param {Destination} value The destination to publish the message to.
     */
    setDestination(value: Destination): void;
    /**
* Indicates whether one or more messages have been discarded prior
* to the current message. This indicates congestion discards only and
* is not affected by message eliding.
* @returns {boolean} Returns true if one or more messages have been
discarded prior to the current message; otherwise, it returns false.
*/
    isDiscardIndication(): boolean;
    /**
     * Returns whether the message is eligible for eliding.
     * <p>
     * Message eliding enables filtering of data to avoid transmitting
     * every single update to a subscribing client.
     * <p>
     * This property does not indicate whether the message was elided.
     * @returns {boolean} indicates whether the message is eligible for eliding.
     */
    isElidingEligible(): boolean;
    /**
     * Sets whether the message is eligible for eliding.
     * <p>
     * Message eliding enables filtering of data to avoid transmitting
     * every single update to a subscribing client.
     * <p>
     * This property does not indicate whether the message was elided.
     * @param {boolean} value sets whether the message is eligible for eliding.
     */
    setElidingEligible(value: boolean): void;
    /**
     * @returns {number} The Guaranteed Message TTL, in milliseconds.
     */
    getTimeToLive(): number;
    /**
* @param {number} value The Guaranteed Message TTL to set, in milliseconds.

The time to live is the number of milliseconds the message may be stored on the
Solace Message Router before the message is discarded or moved to a Dead Message
Queue. See {@link solace.Message.setDMQEligible}.

Setting the Time To Live to zero disables TTL for the message.

This property is only valid for Guaranteed messages (Persistent and Non-Persistent).
It has no effect when used in conjunction with other message types unless the message
is promoted by the appliance to a Guaranteed message.

The maxium allowed time to live is 3.1536E11 (315360000000) which is
approximately 10 years.
*/
    setTimeToLive(value: number): void;
    /**
* @returns {number} The Guaranteed Message expiration value.
The expiration time is the UTC time
(that is, the number of milliseconds from midnight January 1, 1970 UTC) when the
message is to expire.
*/
    getGMExpiration(): number | null;
    /**
     * Set the expiration time field. The expiration time is the UTC time
     * (that is, the number of milliseconds from midnight January 1, 1970 UTC) when the
     * message is to expire. The expiration time is carried in the message when set to
     * a non-zero value. Expiration time is not included when this value is set to zero or
     * undefined
     *
     * The message expiration time is carried to clients that receive the message
     * unmodified and does not effect the life cycle of the message. Use
     * {@link solace.Message#setTimeToLive} to enforce message expiry in the network.
     * @param {number} value The new Guaranteed Message expiration value
     */
    setGMExpiration(value: number): void;
    /**
     * @returns {boolean} Whether this message is Guaranteed Message DMQ eligible
     */
    isDMQEligible(): boolean;
    /**
* @param {boolean} value The new value for Guaranteed Message DMQ (Dead Message Queue) Eligible.
When this property is set, when the message expires in the network
the message is saved on a appliance dead message queue. Otherwise the expired message is
discarded. See {@link solace.Message#setTimeToLive}.
*/
    setDMQEligible(value: boolean): void;
    /**
     * @returns {solace.MessageConsumer} The associated Message Consumer, if received by a consumer
     */
    getMessageConsumer(): solace.MessageConsumer | null;
    /**
* Returns the Replication Group Message Id
* @returns {solace.ReplicationGroupMessageId} The replication group message id
 assigned by the router.
*/
    getReplicationGroupMessageId(): solace.ReplicationGroupMessageId | null;
    /**
     * Returns the Topic Sequence Number.  If there is no topic sequence number
     * undefined is returned.
     * @returns {Long} The Topic Sequence number assigned to this message by the Message Router.
     */
    getTopicSequenceNumber(): Long | null;
    /**
     * Returns the delivery count.
     * @returns {number} The delivery count reported by the broker.
     */
    getDeliveryCount(): number | null;
    /**
* Acknowledges this message.
* 
* If the {@link solace.MessageConsumer} on which this message was received is configured to use
* {@link solace.MessageConsumerAckMode.CLIENT}, then when a message is received by an
* application, the application must call this method to explicitly acknowledge reception of the
* message. This frees local and router resources associated with an unacknowledged message.
* 
* The API does not send acknowledgments immediately. It stores the state for
* acknowledged messages internally and acknowledges messages, in bulk, when a
* threshold or timer is reached.
* @throws {@link solace.OperationError}
 * if this message was not received via Guaranteed Message;
   subcode: {@link solace.ErrorSubcode.MESSAGE_DELIVERY_MODE_MISMATCH}
 * if the associated {@link solace.Session} is not connected;
   subcode: {@link solace.ErrorSubcode.SESSION_NOT_CONNECTED}
 * if the associated {@link solace.MessageConsumer} is not connectedl
   subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}
*/
    acknowledge(): void;
    /**
     * Test if the Acknowledge Immediately message property is set or not.
     * When the Acknowledge Immediately property is set to true on an outgoing
     * Guaranteed Message,
     * it indicates that the Solace Message Router should Acknowledge this message
     * immediately upon receipt.
     *
     * This property, when set by a publisher, may or may not be removed by the
     * Solace Message Router prior to delivery to a consumer, so message consumers
     * must not expect the property value indicates how the message was
     * originally published
     * @returns {boolean} Whether this message was set to acknowledge immediately.
     */
    isAcknowledgeImmediately(): boolean;
    /**
     * Set the optional Acknoweledge Immediately message property.
     * When the Acknowledge Immediately property is set to true on an outgoing Guaranteed Message,
     * it indicates that the Solace Message Router should acknoweledge this message
     * immediately upon receipt. By default the property is set to false on newly created messages.
     *
     * This property, when set by a publisher, may or may not be removed by the appliance
     * prior to delivery to a consumer, so message consumers must not expect the property value
     * indicates how the message was originally published. Therefore if a received message
     * is forwarded by the application, the Acknowledge Immediately property should be
     * explicitly set to the desired value (true or false).
     *
     * Setting this property on an outgoing direct message has no effect.
     * @param {boolean} value Whether to acknowledge this message immediately.
     */
    setAcknowledgeImmediately(value: boolean): void;
    /**
* Gets the cache status of this message.
* @returns {solace.MessageCacheStatus} The cache status of this message. The status
will be MessageCacheStatus.LIVE unless the message was returned in a
reply to a cache request.
*/
    getCacheStatus(): solace.MessageCacheStatus | null;
    /**
     * Returns whether the message's reply field is set, indicating
     * that this message is a reply to a previous request. See {@link solace.Session#sendRequest}.
     * @returns {boolean} Indicates the state of the reply field.
     */
    isReplyMessage(): boolean;
    /**
     * Indicates whether the message has been marked as redelivered by the Solace Message Router.
     * @returns {boolean} Indicates whether the redelivered flag is set.
     */
    isRedelivered(): boolean;
    /**
     * Sets the <i>reply</i> field of the message.
     * @param {boolean} value Sets whether to flag the message as a reply.
     */
    setAsReplyMessage(value: boolean): void;
    /**
     * Gets the receive timestamp (in milliseconds, from midnight, January 1, 1970 UTC).
     * @returns {number} The receive timestamp, if set.
     */
    getReceiverTimestamp(): number | null;
    /**
     * Gets the replyTo destination
     * @returns {solace.Destination} The value of the replyTo destination, if set.
     */
    getReplyTo(): solace.Destination | null;
    /**
     * Sets the replyTo destination
     * @param {solace.Destination} value The replyTo destination.
     */
    setReplyTo(value: solace.Destination): void;
    /**
     * Returns the Sender's ID.
     * @returns {string} The Sender's ID, if set.
     */
    getSenderId(): string | null;
    /**
     * Sets the Sender ID for the message
     * @param {string} value The Sender ID for the message.
     */
    setSenderId(value: string): void;
    /**
     * Gets the send timestamp (in milliseconds, from midnight, January 1,
     * 1970 UTC).
     * @returns {number} The send timestamp, if set.
     */
    getSenderTimestamp(): number | null;
    /**
     * Sets the send timestamp (in milliseconds, from midnight, January 1,
     * 1970 UTC). This field can be generated automatically during message
     * publishing, but it will not be generated if previously set to a non-null value by this method.
     * See {@link solace.SessionProperties#generateSendTimestamps}.
     *
     * An application that publishes the same {@link solace.Messsage} multiple times and
     * also wants generted timestamps on each messages, should set the sender timestamp
     * to undefined after each call to {@link solace.Session#send}.
     * @param {number} value The value to set as the send timestamp.
     */
    setSenderTimestamp(value: number): void;
    /**
     * Gets the sequence number.
     * <p>
     * This is an application-defined field,
     * see <code>{@link solace.Message#setSequenceNumber}()</code>.
     * @returns {number} The sequence number, if set
     * @throws {@link solace.SDTUnsupportedValueError} in case the sequence number is out of range.
     */
    getSequenceNumber(): number | null;
    /**
     * Sets the application-defined sequence number. If the sequence number
     * is not set, or set to undefined, and {@link solace.SessionProperties#generateSequenceNumber}
     * is true, then a sequence number is automatically generated for each sent message.
     * @param {number} value The sequence number.
     */
    setSequenceNumber(value: number): void;
    /**
     * Gets the Class of Service (CoS) value for the message.
     * The Class of Service has different semantics for direct and guaranteed messages.
     *
     * For messages published with {@link solace.MessageDeliveryModeType.DIRECT}, the
     * class of service selects the weighted round-robin delivery queue when the
     * message is forwarded to a consumer.  {@link solace.MessageUserCosType.COS1} are the
     * lowest priority messages and will use the Solace Message Router D-1 delivery queues.
     *
     * For messages published as guaranteed messages
     * ({@link solace.MessageDeliveryModeType.PERSISTENT} or
     * {@link solace.solace.MessageDeliveryModeType.NON_PERSISTENT}), messages published
     * with {@link solace.MessageUserCosType.COS1} can be rejected by the Solace Message Router if
     * that message would cause any queue or topic-endpoint to exceed its configured
     * low-priority-max-msg-count.
     * @returns {solace.MessageUserCosType} The COS value.
     */
    getUserCos(): solace.MessageUserCosType;
    /**
     * Gets the Message Priority Parameter (JMS Priority) value for the message.
     * Numerical values between 0 and 255 are valid return values,
     * undefined means the parameter is not present.
     *
     * If destination queues and topic endpoints for this message
     * are configured to respect message priority,
     * the values 0 through 9 can be used to affect the priority
     * of delivery to consumers of those queues or topic endpoints.
     * For the purposes of prioritized message delivery,
     * values larger than 9 are treated the same as 9.
     * @returns {number} The Message Priority Parameter value.
     */
    getPriority(): number | null;
    /**
     * Sets the Class of Service (CoS) value for the message.
     *
     * The Class of Service has different semantics for direct and guaranteed messages.
     *
     * For messages published with {@link solace.MessageDeliveryModeType.DIRECT}, the
     * class of service selects the weighted round-robin delivery queue when the
     * message is forwarded to a consumer.  {@link solace.MessageUserCosType#COS1} are the
     * lowest priority messages and will use the Solace Message Router D-1 delivery queues.
     *
     * For messages published as guaranteed messages
     * ({@link solace.MessageDeliveryModeType.PERSISTENT} or
     * {@link solace.solace.MessageDeliveryModeType.NON_PERSISTENT}), messages published
     * with {@link solace.MessageUserCosType#COS1} can be rejected by the Solace Message Router if
     * that message would cause any queue or topic-endpoint to exceed its configured
     * low-priority-max-msg-count.
     * @param {solace.MessageUserCosType} value The COS value.
     */
    setUserCos(value: solace.MessageUserCosType): void;
    /**
     * Sets the Message Priority Parameter (JMS Priority) value for the message.
     * Numerical values between 0 and 255 are accepted,
     * use undefined to unset.
     *
     * If destination queues and topic endpoints for this message
     * are configured to respect message priority,
     * the values 0 through 9 can be used to affect the priority
     * of delivery to consumers of those queues or topic endpoints.
     * For the purposes of prioritized message delivery, values larger than 9
     * are treated the same as 9.
     * @param {number} value The priority value.
     */
    setPriority(value: number): void;
    /**
     * Gets the user data part of the message.
     * @returns {string} The user data part of the message, if set.
     */
    getUserData(): string;
    /**
     * Sets the user data part of the message.
     * @param {string} value The user data part of the message.
     */
    setUserData(value: string): void;
    /**
     * Gets the XML content part of the message.
     * Notice that the content is encoded as UTF-8 characters,
     * it needs to be decoded as JavaScript surrogate pair: decodeURIComponent(escape(value))
     * @returns {string} The XML content part of the message, if set.
     */
    getXmlContent(): string | null;
    /**
* Gets the XML content part of the message decoded from UTF-8 encoding of the characters.
* @returns {string} The XML content part of the message. Returns <code>null</code> if not
present.
*/
    getXmlContentDecoded(): string | null;
    /**
     * Sets the XML content part of the message.
     * The content is encoded by replacing each instance of certain characters
     * by one, two, three, or four escape sequences representing the
     * UTF-8 encoding of the character.
     * @param {string} value The XML content part of the message.
     */
    setXmlContent(value: string): void;
    /**
     * Sets the message's XML metadata section.
     * @param {string} value The XML metadata.
     */
    setXmlMetadata(value: string): void;
    /**
     * Gets the message's XML metadata section.
     * @returns {string} The XML metadata, if set.
     */
    getXmlMetadata(): string | null;
    /**
     * Gets the user property map carried in the message binary metadata.
     * @returns {solace.SDTMapContainer} The user properties map, if set.
     */
    getUserPropertyMap(): solace.SDTMapContainer | null;
    /**
     * Allows users to specify their own user properties to be carried
     * in the message binary metadata separate from the payload.
     * @param {SDTMapContainer} value The user property map.
     */
    setUserPropertyMap(value: SDTMapContainer): void;
    /**
     * Makes this message a strutured data message by assigning it a
     * structured data type (SDT) container payload (such as a
     * {@link solace.SDTMapContainer}, {@link solace.SDTStreamContainer}
     * or a {@link solace.SDTFieldType.String}, which is transported in the binary attachment field.
     *
     * Assigning a SDT container updates the message's Type property to
     * the appropriate value.
     *
     * The container argument must be a {@link solace.SDTField} with a type
     * of {@link solace.SDTFieldType.MAP}, {@link solace.SDTFieldType.STREAM},
     * or {@link solace.SDTFieldType.STRING}.
     * @param {solace.SDTField} container The SDTField container to send in this message.
     */
    setSdtContainer(container: solace.SDTField): void;
    /**
* Gets the message's structured data container, if this is a structured data message.
* @returns {SDTField | null} A field with a payload of {String}, {@link SDTMapContainer},
or {@link SDTStreamContainer} if one was set in the message; otherwise, null.
*/
    getSdtContainer(): SDTField | null;
    /**
* Produces a human-readable dump of the message's properties and
* contents. Applications must not parse the output, as its format is
* not a defined part of the API and subject to change.
* 
* <p>
* Output can be controlled by the <code>flags</code> parameter. The values are:
* <ul>
* <li>{@link MessageDumpFlag.MSGDUMP_BRIEF} Display only the length of the
*                          binary attachment, xml attachment, and user property map
* <li>{@link MessageDumpFlag.MSGDUMP_FULL} Display the entire message.
* </ul>
* </p>
* @param {number} flags Optional flags controlling the output, such as whether
                         to include verbose (binary dump) information
* @returns {string} A string representation of the message.
*/
    dump(flags?: number): string;
    /**
     * Releases all memory associated with this message. All values are reinitialized
     * to defaults. The message is no longer associated with any session or consumer.
     */
    reset(): void;
  }
  /**
   * <b>This class is not exposed for construction by API users. Users should obtain an instance from
   *  {@link solace.SolclientFactory.createReplicationGroupMessageId} or from
   *  {@link solace.Message.getReplicationGroupMessageId}</b>
   * <p>
   * ReplicationGroupMessageId specifies a Replication Group Message ID.
   * Can be used to specify a {@link solace.ReplayStartLocation} for the message after this id.
   * The ReplayStartLocation is set in the corresponding
   * MessageConsumer property {@link solace.MessageConsumerProperties#replayStartLocation}.
   */
  class ReplicationGroupMessageId extends solace.ReplayStartLocation {
    /** @protected */
    protected constructor();
    /**
* Compares with other ReplicationGroupMessageId
* @param {ReplicationGroupMessageId} otherReplicationGroupMessageId the other id to compare
* @returns {number} 0 if the ReplicationGroupMessageId is equal to the other
  ReplicationGroupMessageId.
  < 0 if the ReplicationGroupMessageId is less than the other ReplicationGroupMessageId.
  \> 0 if the ReplicationGroupMessageId is greater than the other ReplicationGroupMessageId.
* @throws {solace.OperationError} * if the otherReplicationGroupMessageId is not a ReplicationGroupMessageId type.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_INVALID_TYPE}.
* if the otherReplicationGroupMessageId is not comparable as it is from different origins
  and can not be compared.
  Subcode: {@link solace.ErrorSubcode.MESSAGE_ID_NOT_COMPARABLE}.
*/
    compare(otherReplicationGroupMessageId: ReplicationGroupMessageId): number;
    /**
     * @returns {string} A generic description of the Destination.
     */
    toString(): string;
  }
  /**
   * <b>This class is not exposed for construction by API users.</b>
   * <p>
   * This is a base class for {@link solace.QueueDescriptor}. API users should access the
   * methods described here through a {@link solace.QueueDescriptor}.
   */
  class AbstractQueueDescriptor {
    /** @protected */
    protected constructor();
    /**
     * The Queue Type.
     */
    type: solace.QueueType;
    /**
     * True if this descriptor refers to a durable queue.
     */
    durable: boolean;
    /**
     * Gets the queue type to which this descriptor refers.
     * @returns {solace.QueueType} The queue type that this object describes
     */
    getType(): solace.QueueType;
    /**
     * Gets whether this descriptor refers to a durable queue.
     * @returns {boolean} `true` if this describes a durable queue
     */
    isDurable(): boolean;
    /**
     * An informational summary of this object, subject to change.
     * @returns {string} A summary of this object.
     */
    toString(): string;
  }
  /**
   * QueueDescriptor
   */
  class QueueDescriptor {
    /**
     * Creates an instance of {@link solace.QueueDescriptor}.
     * @param {object | solace.QueueDescriptor} queueSpec A specification for this descriptor.
     * @param {string} queueSpec.name The remote name to which this specification refers.
     * @param {solace.QueueType} queueSpec.type The type of queue for this specification.
     * @param {boolean} queueSpec.durable `true` if this refers to a durable queue.
     */
    constructor(
      queueSpec:
        | { name: string; type: solace.QueueType; durable?: boolean }
        | solace.QueueDescriptor
    );
    /**
     * Gets/sets the remote name to which this descriptor refers.
     * @returns {string} The name of the queue.
     */
    getName(): string;
    /**
     * An informational summary of this object, subject to change.
     * @returns {string} A summary of this object.
     */
    toString(): string;
  }
  /**
   * Represents a queue properties object. May be passed in to
   * {@link solace.Session#createMessageConsumer} when creating a
   * {@link solace.MessageConsumer} object.  Upon creation of a queue, undefined queue
   * properties are set to default values chosen by the router.
   */
  class QueueProperties {
    /**
     */
    constructor();
    /**
     * Gets/sets permissions for this queue.
     *
     * When creating a temporary queue, these are the permissions that apply
     * to all other users; the user creating the temporary queue is always
     * granted DELETE permissions.
     */
    permissions?: solace.QueuePermissions;
    /**
     * Gets/sets the access type for this queue.
     *
     * This parameter must NOT be set when creating a temporary queue via
     * {@link solace.Session#createMessageConsumer}. Such a queue has its
     * access type determined by the remote message router.
     */
    accessType?: solace.QueueAccessType;
    /**
     * Gets/sets the quota, in megabytes, for this queue.
     *  * The allowed values are (0 <= quotaMB) || undefined.
     *  * A value of 0 configures the queue to act as a Last-Value-Queue (LVQ), where the router
     *    enforces a Queue depth of one, and only the most current message is spooled by the
     *    queue. When a new message is received, the current queued message is first
     *    automatically deleted from the queue, then the new message is spooled.
     */
    quotaMB?: number;
    /**
     * Gets/sets the maximum message size, in bytes, for any single message spooled on this queue.
     */
    maxMessageSize?: number;
    /**
     * Gets/sets whether this queue respects Time To Live on messages.
     */
    respectsTTL?: boolean;
    /**
     * Gets/sets the discard behavior for this queue.
     */
    discardBehavior?: solace.QueueDiscardBehavior;
    /**
     * Gets/sets the maximum number of times to attempt message redelivery for this queue.
     *  * The valid range is 0 <= maxMessageRedelivery <= 255
     *  * A value of 0 means retry forever.
     */
    maxMessageRedelivery?: number;
  }
  /**
   * * <b>This class is not exposed for construction by API users.
   *  Users should obtain an instances from one of the following:</b>
   * * {@link solace.SolclientFactory.createReplayStartLocationBeginning}
   * * {@link solace.SolclientFactory.createReplayStartLocationDate}
   *
   * Defines the ReplayStartLocation class.
   * The ReplayStartLocation is set in the corresponding
   * MessageConsumer property {@link solace.MessageConsumerProperties#replayStartLocation}
   * The single member variable, _replayStartTime is undefined in ReplayStartLocationBeginning and
   * contains the elapsed time in milliseconds since the epoch in ReplayStartLocationDate
   */
  class ReplayStartLocation {
    /** @protected */
    protected constructor();
    /**
     * @returns {string} A generic description of the Destination.
     */
    toString(): string;
  }
  /**
   * * <b>This class is not exposed for construction by API users.
   *  Users should obtain an instances from the following:</b>
   *  * {@link solace.SolclientFactory.createReplayStartLocationBeginning}
   *
   * Defines the ReplayStartLocation class.
   * The ReplayStartLocation is set in the corresponding
   * MessageConsumer property {@link solace.MessageConsumerProperties#replayStartLocation}
   */
  class ReplayStartLocationBeginning {
    /** @protected */
    protected constructor();
  }
  /**
   * * <b>This class is not exposed for construction by API users.
   *  Users should obtain an instances from the following:</b>
   *  * {@link solace.SolclientFactory.createReplayStartLocationDate}
   *
   * Defines the ReplayStartLocation class.
   * The ReplayStartLocation is set in the corresponding
   * MessageConsumer property {@link solace.MessageConsumerProperties#replayStartLocation}
   */
  class ReplayStartLocationDate {
    /** @protected */
    protected constructor();
  }
  /**
   * <b>This class is not exposed for construction by API users.</b>
   *
   * Represents a SDT (Structured Data Type) field. To create an instance of an <code>SDTField</code>,
   * call {@link solace.SDTField.create}.
   *
   * SDTField objects are used in Solace Containers ({@link solace.SDTMapContainer}
   * and {@link solace.SDTStreamContainer}). The <b>deprecated</b> usage of
   * {@link solace.SDTMapContainer#addField} and {@link solace.SDTStreamContainer#addField}
   * take a SDTField object as an argument. The preferred usage is to pass a
   * {@link solace.SDTFieldType} and value as arguments.
   *
   * SDTField objectts must be used as an argument to {@link solace.Message#setSdtContainer}.
   * The only valid SDTField objects for {@link solace.Message#setSdtContainer} are:
   * * {@link solace.SDTFieldType.STREAM}
   * * {@link solace.SDTFieldType.MAP}
   * * {@link solace.SDTFieldType.STRING}
   */
  class SDTField {
    /** @protected */
    protected constructor();
    /**
     * Gets the type of field represented.
     * @returns {solace.SDTFieldType} The type of field represented.
     */
    getType(): solace.SDTFieldType;
    /**
* Gets the field value.
* @returns {any} Field value (as one of the supported data types).
* @throws {solace.SDTUnsupportedValueError} if value found in the field
is not in range supported by the platform/runtime.
*/
    getValue(): any;
    /**
     * Create a new SDTField instance representing a Value of a given Type.
     * @param {solace.SDTFieldType} type The type of field represented.
     * @param {any} value The corresponding value to store in the field.
     * @returns {solace.SDTField} The new SDT field with the given type and value
     * @throws {solace.OperationError} if value does not match type
     */
    static create(type: solace.SDTFieldType, value: any): solace.SDTField;
  }
  /**
   * Defines a Structured Data Type (SDT) map container.
   */
  class SDTMapContainer {
    /**
     */
    constructor();
    /**
     * Get the list of keys in this map, in unspecified order.
     * @returns {string[]} Array of defined keys in the map.
     */
    getKeys(): string[];
    /**
     * Return the SDTField with the given key.
     * @param {string} key The key to look up.
     * @returns {solace.SDTField} The field referenced by key.
     */
    getField(key: string): solace.SDTField;
    /**
     * Delete an SDTField with the given key.
     * @param {string} key The field key to delete.
     */
    deleteField(key: string): void;
  }
  /**
   * Defines a Structured Data Type (SDT) stream container. A stream is an iterable collection of
   * {@link solace.SDTField}s.
   */
  class SDTStreamContainer {
    /**
     */
    constructor();
    /**
     * Returns true if the stream has at least one more {@link solace.SDTField}
     * at the current position.
     * @returns {boolean} true, if there is an available field at the read pointer; false, otherwise.
     */
    hasNext(): boolean;
    /**
     * Returns the next field in the stream and advances the read pointer.
     * If the end of the stream is reached, it returns undefined.
     * @returns {solace.SDTField} The next field in the stream.
     */
    getNext(): solace.SDTField;
    /**
     * Rewinds the read pointer to the beginning of the stream. Normally when {@link hasNext}
     * returns false, a client application must call rewind() to reiterate over the stream's fields.
     * @throws {@link solace.OperationError} if the stream cannot be rewound.
     */
    rewind(): void;
  }
  /**
   * <b>This class is not exposed for construction by API users.</b>
   *
   * Represents a SDT unsupported value error.  An SDT field was assigned a value that is within
   * the type range for the given SDT type, but is not supported on this platform/runtime.
   * This occurs when a received {@link solace.SDTContainerMap} or {@link solace.SDTContainerStream}
   * contains a field with a value that can not represented in the local architecture.
   * Possible causes include:
   * * receive 64 bit integer that cannot be represented accurately in a javaScript number. JavaScript
   *   numbers are floats and can only hold a 48 bit integer without loss of precission. Any integer
   *   greater than 281474976710655 or less than -281474976710655 will cause this exception.
   */
  class SDTUnsupportedValueError extends solace.SolaceError {
    /** @protected */
    protected constructor();
    /**
     * 'SDTUnsupportedValue'
     */
    readonly name: string;
    /**
     * The subcode for the error. see {@link solace.SDTValueErrorSubcode}
     */
    subcode: solace.SDTValueErrorSubcode;
    /**
     * Error Message.
     */
    message: string;
  }
  /**
   * Represents a session event; events are passed to the application-provided
   * event handling callback provided when creating the session.
   */
  class SessionEvent {
    /** @protected */
    protected constructor();
    /**
     * Further qualifies the session event.
     */
    sessionEventCode: solace.SessionEventCode;
    /**
     * if applicable, an information string returned by the Solace Message Router.
     */
    infoStr: string;
    /**
     * if applicable, a response code returned by the Solace Message Router.
     */
    responseCode: number;
    /**
     * if applicable, an error subcode. Defined in {@link solace.ErrorSubcode}
     */
    errorSubcode: solace.ErrorSubcode;
    /**
     * A user-specified object
     * made available in the response or confirmation event by including it as a
     * parameter in the orignal API call.  If the user did not specify a
     * correlationKey, it will be <code>null</code>.
     */
    correlationKey: object;
    /**
     * Additional information if it is applicable.
     * In case of subscribe or publish errors, it constains the topic.
     */
    reason: string;
  }
  /**
   * Represents a session properties object. Passed in to
   * {@link solace.SolclientFactory.createSession} when creating a {@link solace.Session} instance.
   */
  class SessionProperties {
    /**
     * @param {object} options Properties to apply to the newly constructed object.
     */
    constructor(options: object);
    /**
     * An array of TLS protocols to be excluded when negotiating which protocol
     * to use.
     *  * Allowed values are: TLSv1, TLSv1.1, TLSv1.2
     *  * Note: when a protocol version is excluded without excluding all of its
     *    previous protocol versions, the effect is to also exclude all subsequent
     *    protocol versions.
     */
    sslExcludedProtocols?: string[];
    /**
     * A comma separated list of cipher suites in order of preference used for TLS
     * connections.
     *  * Allowed values:
     *     * AES128-GCM-SHA256
     *     * AES128-SHA
     *     * AES128-SHA256
     *     * AES256-GCM-SHA384
     *     * AES256-SHA
     *     * AES256-SHA256
     *     * DES-CBC3-SHA
     *     * ECDHE-RSA-AES128-GCM-SHA256
     *     * ECDHE-RSA-AES128-SHA
     *     * ECDHE-RSA-AES128-SHA256
     *     * ECDHE-RSA-AES256-GCM-SHA384
     *     * ECDHE-RSA-AES256-SHA
     *     * ECDHE-RSA-AES256-SHA384
     *     * ECDHE-RSA-DES-CBC3-SHA
     *     * RC4-SHA
     *     * RC4-MD5
     */
    sslCipherSuites?: string;
    /**
     * Whether the server certificate shall be verified against the list of
     * certificates in the trust stores. If set to false, all certificate validation is disabled,
     * including date, hostname and common name validation.
     */
    sslValidateCertificate?: boolean;
    /**
     * An array of file names of trusted certificates in PEM format.
     * If not set, and {@link solace.SessionProperties#sslValidateCertificate} is set to true,
     * the server certificate will be validated against well known "root" CAs.
     *    * Mutually exclusive to sslPfx property when
     *      {@link solace.SessionProperties#sslValidateCertificate} is set
     */
    sslTrustStores?: string[];
    /**
     * An array of acceptable common names for matching with the server certificate.
     * If set to a non-empty array, the API will override the default hostname validation logic
     * provided by Node.js with its own implemenation; if set to empty array, no hostname
     * validation will be performed.
     *    * Only relevant when {@link solace.SessionProperties#sslValidateCertificate} is set
     *      to true
     *    * Note that leading and trailing whitespaces are considered to be part of the common
     *      names and are not ignored
     */
    sslTrustedCommonNameList?: string[];
    /**
     * The file name of a file containing private key, certificate and optional
     * CA certificates of the client in PFX or PKCS12 format.
     *    * Only relevant when
     *      {@link solace.AuthenticationScheme.CLIENT_CERTIFICATE} is used
     *    * Mutually exclusive to sslPrivateKey, sslCertificate and sslTrustStores properties
     */
    sslPfx?: string;
    /**
     * A string containing password for the client pfx file.
     *    * Only relevant when
     *      {@link solace.AuthenticationScheme.CLIENT_CERTIFICATE} is used
     */
    sslPfxPassword?: string;
    /**
     * The file name of a file containing private key of the client in PEM format.
     *    * Only relevant when
     *      {@link solace.AuthenticationScheme.CLIENT_CERTIFICATE} is used
     *    * Mutually exclusive to sslPfx property
     */
    sslPrivateKey?: string;
    /**
     * A string containg password for the client private key.
     *    * Only relevant when
     *      {@link solace.AuthenticationScheme.CLIENT_CERTIFICATE} is used
     */
    sslPrivateKeyPassword?: string;
    /**
     * The file name of a file containing certificate key of the client in PEM
     * format.
     *    * Only relevant when
     *      {@link solace.AuthenticationScheme.CLIENT_CERTIFICATE} is used
     *    * Mutually exclusive to sslPfx property
     */
    sslCertificate?: string;
    /**
     * zlib compression level (1-9) or no compression (0)
     *
     * When this property is set to a valid, non-zero value (1-9):
     *
     * * tcp:// connections are established compressed.
     * This usually requires connecting to a different tcp port on the router,
     * 55003 by default.
     *
     * * tcps:// connections are established uncompressed,
     * but then negotiate compression on login.
     * Compression before encryption allows inference of similarities between messages
     * from observing packet sizes on the network.
     * This could lead to chosen Plaintext attacks.
     * Can be combined with sslDowngradeConnectionTo for no encryption beyond authentication.
     *
     * * ws(s):// and http(s):// transports do not support compression and are considered invalid.
     */
    compressionLevel?: number;
    /**
     * Disable encryption after authentication
     *
     * When set to {@link solace.SslDowngrade.PLAINTEXT},
     * all message traffic beyond the initial login is unencrypted.
     * A TLS connection is negotiated on the regular TLS port (55443 by default),
     * TLS authentication schemes can be used, same as without this option.
     * After a successful login however, a TLS shutdown is performed,
     * and the same socket is then used for unencrypted message traffic.
     *
     * Please note this way plain text traffic passes on a port
     * usually associated with encryption (55443 by default)
     *
     * This downgrade is only supported for tcps:// connections,
     * all other URL schemes ignore this option.
     *
     * Can be combined with compressionLevel for
     * non-encrypted, compressed message transfer after login.
     */
    sslConnectionDowngradeTo?: solace.SslDowngrade;
    /**
     * The authentication scheme used when establishing the session.
     */
    authenticationScheme?: solace.AuthenticationScheme;
    /**
     * The access token required for OAUTH2 authentication.
     *    * This is only relevant if the
     *    {@link solace.AuthenticationScheme.OAUTH2}
     *    authentication scheme is being used.
     */
    accessToken?: string;
    /**
     * The ID token required for OIDC authentication.
     *    * This is only relevant if the
     *    {@link solace.AuthenticationScheme.OAUTH2}
     *    authentication scheme is being used.
     */
    idToken?: string;
    /**
     * The issuer identifier is optional for OAUTH2 authentication.
     *    * This is only relevant if the
     *    {@link solace.AuthenticationScheme.OAUTH2}
     *    authentication scheme is being used.
     */
    issuerIdentifier?: string;
    /**
     * The URL or URLs of the messaging service to connect to.  The URL is typically of the form
     * `<protocol>://<host[:port]>`, where:
     *  * `protocol` is one of `ws`, `wss`, `http`, `https`, `tcp` or `tcps`.
     *  (Note to developers who also use the browser variant of this SDK:
     *  Browsers do not support the `tcp` and `tcps` protocols.)
     *  * `host` is a hostname or IP address of the router to connect to.
     *  * `port` is the port on which the messaging service is listening. The default is the
     *    well-known port for the service associated with the given protocol, if any.
     *
     * Additionally, note:
     *  * When an Array is provided, each element is expected to be a string of the above format.
     *    The API will attempt to connect to these URLs in the specified order.
     *  * Numerical IPv6 addresses must be enclosed in square brackets, e.g. tcp://[2001:db8::1]
     */
    url?: string | string[];
    /**
     * The password required for authentication.
     */
    password?: string;
    /**
     * The client username required for authentication.
     */
    userName?: string;
    /**
     * The client name that is used during login as a unique identifier for the session
     * on the Solace Message Router.
     *  * An empty string causes a unique client name to be generated
     *     automatically.
     *  * If specified, it must be a valid Topic name, and a maximum of 160 bytes in length.
     *  * This property is also used to uniquely identify the sender in
     *    a message's senderId field if {@link solace.SessionProperties.includeSenderId}
     *    is set.
     */
    clientName?: string;
    /**
     * A string that uniquely describes the application instance.
     *  * If left blank, the API will generate a description string
     *    using the current user-agent string.
     */
    applicationDescription?: string;
    /**
     * The Message VPN name that the client is requesting for this session.
     */
    vpnName?: string;
    /**
     * A read-only session property that indicates which Message
     * VPN the session is connected to. When not connected, or when not in client mode,
     * an empty string is returned.
     */
    readonly vpnNameInUse?: string;
    /**
     * A read-only property that indicates the connected Solace Message Router's
     * virtual router name.
     */
    readonly virtualRouterName?: string;
    /**
     * The timeout period (in milliseconds) for a connect operation to a given host.
     *  If no value is provided, the default is 8000.
     *   * The valid range is > 0.
     */
    connectTimeoutInMsecs?: number;
    /**
     * The number of times to retry connecting during initial connection setup.
     *
     * When using a host list, each traversal of the list is considered a try; therefore, if
     * `connectRetries === 2`, the host list will be traversed up to three times: once
     * for the initial try, and twice more for the retries. Each retry begins with the first host
     * listed. After each unsuccessful attempt to connect to a host, the API waits for the amount
     * of time set for {@link solace.SessionProperties#reconnectRetryWaitInMsecs} before attempting
     * another connection. The next connection attempt may be to the same host,
     * see {@link solace.SessionProperties#connectRetriesPerHost}.
     *
     * If an established connection fails, the reconnection is attempted with
     * {@link solace.SessionProperties#reconnectRetries} retries instead.
     *
     *  * The valid range is connectRetries >= -1.
     *  * -1 means try to connect forever.
     *  * 0 means no automatic connection retries; the API will try once and then give up.
     *  * connectRetries >= 1 means reattempt connection n times.
     */
    connectRetries?: number;
    /**
     * When using a host list, this property defines how many times to
     * try to connect to a single host before moving to the next host in the list.
     *
     *  * The valid range is connectRetriesPerHost >= -1.
     *  * -1 means attempt an infinite number of connection retries. The API will only
     *    attempt to connect to the first host in the list.
     *  * 0 means make a single connection attempt per host, with no retries.
     */
    connectRetriesPerHost?: number;
    /**
     * How much time to wait (in ms) between each attempt to connect to
     * a host.
     * If a connect attempt is not successful, the API waits for the amount of time
     * specified, and then makes another attempt to connect.
     * {@link solace.SessionProperties#connectRetriesPerHost} sets how many connection
     * attempts will be made before moving on to the next host in the list.
     * The valid range is >= 0 and <= 60000.
     */
    reconnectRetryWaitInMsecs?: number;
    /**
     * The number of times to retry connecting after a connected session goes down.
     *
     * When using a host list, each traversal of the list is considered a try; therefore, if
     * `reconnectRetries === 2`, the host list will be traversed up to three times: once
     * for the initial try, and twice more for the retries. Each retry begins with the first host
     * listed. After each unsuccessful attempt to connect to a host, the API waits for the amount
     * of time set for {@link solace.SessionProperties#reconnectRetryWaitInMsecs} before attempting
     * another connection. The next reconnect attempt may be to the same host,
     * see {@link solace.SessionProperties#connectRetriesPerHost}.
     *
     *  * The valid range is reconnectRetries >= -1.
     *  * -1 means try to reconnect forever.
     *  * 0 means no automatic reconnect retries; the API will try once and then give up.
     *  * reconnectRetries >= 1 means reattempt reconnect n times.
     */
    reconnectRetries?: number;
    /**
     * When enabled, a send timestamp is automatically included
     * (if not already present) in the Solace-defined fields for
     * each message sent.
     */
    generateSendTimestamps?: boolean;
    /**
     * When enabled, a receive timestamp is recorded for
     * each message and passed to the session's message callback receive handler.
     */
    generateReceiveTimestamps?: boolean;
    /**
     * When enabled, a sender ID is automatically included
     * (if not already present) in the Solace-defined fields for each message
     * sent.
     */
    includeSenderId?: boolean;
    /**
     * When enabled, a sequence number is automatically
     * included (if not already present) in the Solace-defined fields
     * for each message sent.
     */
    generateSequenceNumber?: boolean;
    /**
     * The amount of time (in milliseconds) to wait between sending
     * out keep-alive messages to the Solace Message Router.
     *  * The valid range is > 0.
     */
    keepAliveIntervalInMsecs?: number;
    /**
     * The maximum number of consecutive Keep-Alive messages that
     * can be sent without receiving a response before the session is declared down
     * and the connection is closed by the API.
     *  * The valid range is >= 3.
     */
    keepAliveIntervalsLimit?: number;
    /**
     * A read-only string that indicates the default
     * reply-to destination used for any request messages sent from this session.
     * See {@link solace.Session#sendRequest}.
     * This parameter is only valid when the session is connected.
     */
    readonly p2pInboxInUse?: string;
    /**
     * A read-only string providing information
     * about the application, such as the name of operating system
     * that is running the application.
     */
    readonly userIdentification?: string;
    /**
     * Used to ignore duplicate subscription errors on subscribe.
     */
    ignoreDuplicateSubscriptionError?: boolean;
    /**
     * Used to ignore subscription not found errors on unsubscribe.
     */
    ignoreSubscriptionNotFoundError?: boolean;
    /**
     * Set to 'true' to have the API remember subscriptions and reapply them upon
     * calling {@link solace.Session#connect} on a disconnected session.
     */
    reapplySubscriptions?: boolean;
    /**
     * Sets the guaranteed messaging publisher properties for the session.
     * If the supplied value is not a {@link solace.MessagePublisherProperties},
     * one will be constructed using the supplied value as an argument.
     */
    publisherProperties: solace.MessagePublisherProperties;
    /**
     * Set to 'true' to signal the Solace Message Router that messages published on the
     * session should not be received on the same session even if the client has a subscription that
     * matches the published topic. If this restriction is requested, and the Solace Message Router
     * does not have No Local support, the session connect will fail.
     */
    noLocal?: boolean;
    /**
     * The timeout period (in milliseconds) for a reply to
     * come back from the Solace Message Router. This timeout serves as the default
     * request timeout for {@link solace.Session#subscribe},
     * {@link solace.Session#unsubscribe}, {@link solace.Session#updateProperty}.
     *  * The valid range is >= 0.
     */
    readTimeoutInMsecs?: number;
    /**
     * The maximum buffer size for the transport session. This size must be bigger
     * than the largest message an application intends to send on the session.
     *
     * The session buffer size configured using the sendBufferMaxSize
     * session property controls SolClient buffering of transmit messages. When
     * sending small messages, the session buffer size should be set to multiple times
     * the typical message size to improve the performance. Regardless of the buffer
     * size, SolClient always accepts at least one message to transmit. So even if a
     * single message exceeds sendBufferMaxSize, it is accepted and
     * transmitted as long as the current buffered data is zero. However, no more
     * messages are accepted until the amount of data buffered is reduced
     * enough to allow room below sendBufferMaxSize.
     *  * The valid range is > 0.
     */
    sendBufferMaxSize?: number;
    /**
     * The maximum payload size (in bytes) when sending data using the Web transport
     * protocol.  Large messages may fail to be sent to the Solace Message Router when the maximum web
     * payload is set to a small value. To avoid this, use a large maximum web payload.
     *  * The valid range is >= 100.
     */
    maxWebPayload?: number;
    /**
     * Returns a human-readable representation of this Session, subject to change.
     * @returns {string} A brief description of this object
     */
    toString(): string;
  }
  interface Session {
    /**
     * The Session is ready to send/receive messages and perform control operations.
     *
     * At this point the transport session is up, the Session has logged in, and the
     * P2PInbox subscription is added.
     *
     * The session is established.
     */
    on(event: solace.SessionEventCode.UP_NOTICE, listener: () => void): this;
    /**
     * The session was established and then went down.
     * @param {solace.OperationError} error The details related to the session failure.
     */
    on(
      event: solace.SessionEventCode.DOWN_ERROR,
      listener: (error: solace.OperationError) => void
    ): this;
    /**
     * The session attempted to connect but was unsuccessful.
     * @param {solace.OperationError} error The details related to the failed connection attempt.
     */
    on(
      event: solace.SessionEventCode.CONNECT_FAILED_ERROR,
      listener: (error: solace.OperationError) => void
    ): this;
    /**
     * The Solace Message Router rejected a published message.
     * @param {solace.RequestError} error The details related to the rejected message.
     */
    on(
      event: solace.SessionEventCode.REJECTED_MESSAGE_ERROR,
      listener: (error: solace.RequestError) => void
    ): this;
    /**
     * The Solace Message Router rejected a subscription (add or remove).
     * @param {solace.RequestError} error The details related to the failed subscription update.
     */
    on(
      event: solace.SessionEventCode.SUBSCRIPTION_ERROR,
      listener: (error: solace.RequestError) => void
    ): this;
    /**
     * The subscribe or unsubscribe operation succeeded.
     * @param {solace.SessionEvent} event The details related to the successful subscription update.
     */
    on(
      event: solace.SessionEventCode.SUBSCRIPTION_OK,
      listener: (event: solace.SessionEvent) => void
    ): this;
    /**
     * The Solace Message Router's Virtual Router Name changed during a reconnect operation.
     * @param {solace.SessionEvent} event Information related to the event.
     */
    on(
      event: solace.SessionEventCode.VIRTUALROUTER_NAME_CHANGED,
      listener: (event: solace.SessionEvent) => void
    ): this;
    /**
     * The event represents a successful update of a mutable session property.
     * @param {solace.SessionEvent} event Information related to the successful property update.
     */
    on(
      event: solace.SessionEventCode.PROPERTY_UPDATE_OK,
      listener: (event: solace.SessionEvent) => void
    ): this;
    /**
     * The event represents a failed update of a mutable session property.
     * @param {solace.RequestError} error The details related to the failed property update.
     */
    on(
      event: solace.SessionEventCode.PROPERTY_UPDATE_ERROR,
      listener: (error: solace.RequestError) => void
    ): this;
    /**
     * The session transport can accept data again.  This event will occur after an
     * {@link solace.OperationError} is thrown from an API call with a subcode of
     * {@link solace.ErrorSubcode.INSUFFICIENT_SPACE} to indicate the operation can be retried.
     * This event is used both after session-level transport buffer exhaustion,
     * and Guaranteed Messaging Window exhaustion.
     */
    on(
      event: solace.SessionEventCode.CAN_ACCEPT_DATA,
      listener: () => void
    ): this;
    /**
     * The session connect operation failed, or the session that was once up,
     * is now disconnected.
     */
    on(event: solace.SessionEventCode.DISCONNECTED, listener: () => void): this;
    /**
* The session has gone down, and an automatic reconnection attempt is in progress.
* @param {solace.SessionEvent} event The details related to the cause of the connection
   interruption.
*/
    on(
      event: solace.SessionEventCode.RECONNECTING_NOTICE,
      listener: (event: solace.SessionEvent) => void
    ): this;
    /**
* The automatic reconnect of the Session was successful, and the session is established again.
* @param {solace.SessionEvent} event The details related to the re-establishment of the
   connection.
*/
    on(
      event: solace.SessionEventCode.RECONNECTED_NOTICE,
      listener: (event: solace.SessionEvent) => void
    ): this;
    /**
* The session has automatically recovered after the Guaranteed Message publisher
* failed to reconnect.
* Messages sent but not acknowledged are being renumbered and retransmitted.
* Some messages may be duplicated in the system.
* @param {solace.SessionEvent} event The details related to the republishing of messages on the
   session.  {@link solace.SessionEvent#infoStr} will indicate the number of messages being
   republished, which is an upper bound on the number of messages that could be duplicated due
   to this action.
*/
    on(
      event: solace.SessionEventCode.REPUBLISHING_UNACKED_MESSAGES,
      listener: (event: solace.SessionEvent) => void
    ): this;
    /**
* A message was acknowledged by the router.
* @param {solace.SessionEvent} event Allows the acknowledgement to be correlated to the sent
   message.
*/
    on(
      event: solace.SessionEventCode.ACKNOWLEDGED_MESSAGE,
      listener: (event: solace.SessionEvent) => void
    ): this;
    /**
     * Unsubscribing the topic from the Durable Topic Endpoint succeeded.
     */
    on(
      event: solace.SessionEventCode.UNSUBSCRIBE_TE_TOPIC_OK,
      listener: () => void
    ): this;
    /**
* Unsubscribing the topic from the Durable Topic Endpoint failed.
* @param {solace.OperationError} error The details related to the failed attempt to remove the
   subscription from a topic endpoint.
*/
    on(
      event: solace.SessionEventCode.UNSUBSCRIBE_TE_TOPIC_ERROR,
      listener: (error: solace.OperationError) => void
    ): this;
    /**
     * A Direct message was received on the session. This event code is only used
     * on the <b>EventEmitter</b> session interface.  If using the deprecated callback interface,
     * messages are received via the callback provided in {@link solace.MessageRxCBInfo}.
     * @param {solace.Message} message The message received on the session.
     */
    on(
      event: solace.SessionEventCode.MESSAGE,
      listener: (message: solace.Message) => void
    ): this;
    /**
     * Guaranteed Messaging Publisher has been closed by the Solace
     * message router. This usually indicates an operator has disabled the
     * message spool.
     * @param {solace.OperationError} error Information related to the error.
     */
    on(
      event: solace.SessionEventCode.GUARANTEED_MESSAGE_PUBLISHER_DOWN,
      listener: (error: solace.OperationError) => void
    ): this;
    on(event: any, listener: Function): this;
  }
  /**
   * <b>This class is not exposed for construction by API users.</b>
   * Applications must use {@link solace.SolclientFactory.createSession} to create a session.
   *
   * Represents a client Session.
   *
   * Session provides these major functions:
   *  * Subscriber control, such as updating subscriptions;
   *  * Publishes both Direct and Guaranteed Messages to the router;
   *  * Receives direct messages from the router.
   *
   * The Session object is an
   * {@link https://nodejs.org/api/events.html#events_class_eventemitter|EventEmitter}, and will emit
   * events with event names from {@link solace.SessionEventCode} when Session events occur.
   * Each session event can be subscribed using {@link solace.Session#on} with the corresponding
   * {@link solace.SessionEventCode}. If any of the registered event listeners throw an exception,
   * the exception will be emitted on the 'error' event.
   * @fires solace.SessionEventCode#event:ACKNOWLEDGED_MESSAGE
   * @fires solace.SessionEventCode#event:CAN_ACCEPT_DATA
   * @fires solace.SessionEventCode#event:CONNECT_FAILED_ERROR
   * @fires solace.SessionEventCode#event:DISCONNECTED
   * @fires solace.SessionEventCode#event:DOWN_ERROR
   * @fires solace.SessionEventCode#event:GUARANTEED_MESSAGE_PUBLISHER_DOWN
   * @fires solace.SessionEventCode#event:MESSAGE
   * @fires solace.SessionEventCode#event:PROPERTY_UPDATE_ERROR
   * @fires solace.SessionEventCode#event:PROPERTY_UPDATE_OK
   * @fires solace.SessionEventCode#event:RECONNECTED_NOTICE
   * @fires solace.SessionEventCode#event:RECONNECTING_NOTICE
   * @fires solace.SessionEventCode#event:REJECTED_MESSAGE_ERROR
   * @fires solace.SessionEventCode#event:REPUBLISHING_UNACKED_MESSAGES
   * @fires solace.SessionEventCode#event:SUBSCRIPTION_ERROR
   * @fires solace.SessionEventCode#event:SUBSCRIPTION_OK
   * @fires solace.SessionEventCode#event:UNSUBSCRIBE_TE_TOPIC_ERROR
   * @fires solace.SessionEventCode#event:UNSUBSCRIBE_TE_TOPIC_OK
   * @fires solace.SessionEventCode#event:UP_NOTICE
   * @fires solace.SessionEventCode#event:VIRTUALROUTER_NAME_CHANGED
   */
  class Session extends EventEmitter {
    /** @protected */
    protected constructor();
    /**
* A callback that returns replies to requests sent via {@link solace.Session#sendRequest}.
* The replyReceivedCallback <b>must</b> be provided to the API as the third argument of
* {@link solace.Session#sendRequest}.
* @param {solace.Session} session The session object that received the reply.
* @param {solace.Message} message The reply message received.
* @param {object} userObject The user object associated with the callback. 'undefined' when
not provided to <i>sendRequest</i>
*/
    static replyReceivedCallback(
      session: solace.Session,
      message: solace.Message,
      userObject: object
    ): void;
    /**
* A callback that returns errors associated with requests sent via
* {@link solace.Session#sendRequest}. The requestFailedCallback <b>must</b> be
* provided to the API as the fourth argument of
* {@link solace.Session#sendRequest}
* @param {solace.Session} session The session object associated with the event.
* @param {solace.RequestError} error The event associated with the failure.
* @param {object} userObject The user object associated with the callback. 'undefined' when
not provided to <i>sendRequest</i>
*/
    static requestFailedCallback(
      session: solace.Session,
      error: solace.RequestError,
      userObject: object
    ): void;
    /**
* Connects the session to the Solace Message Router as configured in
* the {@link solace.SessionProperties#url}.
* 
* When the session is successfully connected to the Solace Message Router, the
* {@link solace.SessionEventCode#UP_NOTICE} event is emitted if a listener has been registered.
* 
* If {@link solace.SessionProperties#reapplySubscriptions} is set to true, this operation
* re-registers previously registered subscriptions. The connected session event
* ({@link solace.SessionEventCode#event:UP_NOTICE}) is emitted only when all the subscriptions
* are successfully added to the router.
* 
* If the API is unable to connect within {@link solace.SessionProperties#connectTimeoutInMsecs}
* or due to login failures, the session's state transitions back to 'disconnected' and an event
* is generated.
* 
* **Note:** Before the session's state transitions to 'connected', a client
* application cannot use the session; any attempt to call functions will throw
* {@link solace.OperationError}.
* @throws {solace.OperationError} * if the session is disposed, already connected or connecting.
  Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}.
* if the underlying transport cannot be established.
  Subcode: {@link solace.ErrorSubcode.CONNECTION_ERROR}.
*/
    connect(): void;
    /**
* Disconnects the session. The session attempts to disconnect cleanly, concluding all operations
* in progress. The disconnected session event {@link solace.SessionEventCode#event:DISCONNECTED}
* is emitted when these operations complete and the session has completely disconnected.
* @throws {solace.OperationError} if the session is disposed, or has never been connected.
  Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}.
*/
    disconnect(): void;
    /**
     * Release all resources associated with the session.
     * It is recommended to call disconnect() first for proper handshake with the message-router.
     */
    dispose(): void;
    /**
* Subscribe to a topic, optionally requesting a confirmation from the router.
* 
* If requestConfirmation is set to true:
* {@link solace.SessionEventCode.SUBSCRIPTION_OK} is generated when subscription is
* added successfully; otherwise, session event
* {@link solace.SessionEventCode.SUBSCRIPTION_ERROR} is generated.
* 
* If requestConfirmation is set to false, only session event
* {@link solace.SessionEventCode.SUBSCRIPTION_ERROR} is generated upon failure.
* 
* When the application receives session event
* {@link solace.SessionEventCode.SUBSCRIPTION_ERROR}, it
* can obtain the failed topic subscription by calling
* {@link solace.SessionEvent#reason}.
* The returned string is in the format of "Topic: <failed topic subscription>".
* @param {solace.Destination} topic The topic destination subscription to add.
* @param {boolean} requestConfirmation true, to request a confirmation; false otherwise.
* @param {object} correlationKey If specified, and if requestConfirmation is true, this value is
                               echoed in the session event within {@link SessionEvent}.
* @param {number} requestTimeout The request timeout period (in milliseconds). If specified, this
                               value overwrites readTimeoutInMsecs property in
                               {@link SessionProperties}.
* @throws {solace.OperationError} * if the session is disposed or disconnected.
  Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}.
* if the parameters have an invalid type.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_INVALID_TYPE}.
* if the parameters have an invalid value.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_OUT_OF_RANGE}.
* if the topic has invalid syntax.
  Subcode: {@link solace.ErrorSubcode.INVALID_TOPIC_SYNTAX}.
* if there's no space in the transport to send the request.
  Subcode: {@link solace.ErrorSubcode.INSUFFICIENT_SPACE}.  See:
  {@link solace.SessionEventCode#event:CAN_ACCEPT_DATA}.
* if the topic is a shared subscription and the peer router does not support Shared
  Subscriptions.
  Subcode: {@link solace.ErrorSubcode.SHARED_SUBSCRIPTIONS_NOT_SUPPORTED}.
* if the topic is a shared subscription and the client does not allowed Shared
  Subscriptions.
  Subcode: {@link solace.ErrorSubcode.SHARED_SUBSCRIPTIONS_NOT_ALLOWED}.
*/
    subscribe(
      topic: solace.Destination,
      requestConfirmation: boolean,
      correlationKey: object,
      requestTimeout: number
    ): void;
    /**
* Unsubscribe from a topic, and optionally request a confirmation from the router.
* 
* If requestConfirmation is set to true, session event
* {@link solace.SessionEventCode.SUBSCRIPTION_OK} is generated when subscription is removed
* successfully; otherwise, session event
* {@link solace.SessionEventCode.SUBSCRIPTION_ERROR} is generated.
* 
* If requestConfirmation is set to false, only session event
* {@link solace.SessionEventCode.SUBSCRIPTION_ERROR} is generated upon failure.
* 
* When the application receives session event
* {@link solace.SessionEventCode.SUBSCRIPTION_ERROR}, it
* can obtain the failed topic subscription by calling
* {@link solace.SessionEvent#reason}. The returned
* string is in the format "Topic: <failed topic subscription>".
* @param {solace.Destination} topic The topic destination subscription to remove.
* @param {boolean} requestConfirmation true, to request a confirmation; false otherwise.
* @param {object} correlationKey If <code>null</code> or undefined, a Correlation Key is not set
                               in the confirmation session event.
* @param {number} requestTimeout The request timeout period (in milliseconds). If specified, this
                               value overwrites readTimeoutInMsecs property in
                               {@link SessionProperties}.
* @throws {solace.OperationError} * if the session is disposed or disconnected.
  Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}.
* if the parameters have an invalid type.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_INVALID_TYPE}.
* if the parameters have an invalid value.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_OUT_OF_RANGE}.
* if the topic has invalid syntax.
  Subcode: {@link solace.ErrorSubcode.INVALID_TOPIC_SYNTAX}.
* if there's no space in the transport to send the request.
  Subcode: {@link solace.ErrorSubcode.INSUFFICIENT_SPACE}.  See:
  {@link solace.SessionEventCode#event:CAN_ACCEPT_DATA}.
* if the topic is a shared subscription and the peer router does not support Shared
  Subscriptions.
  Subcode: {@link solace.ErrorSubcode.SHARED_SUBSCRIPTIONS_NOT_SUPPORTED}.
* if the topic is a shared subscription and the client does not allowed Shared
  Subscriptions.
  Subcode: {@link solace.ErrorSubcode.SHARED_SUBSCRIPTIONS_NOT_ALLOWED}.
*/
    unsubscribe(
      topic: solace.Destination,
      requestConfirmation: boolean,
      correlationKey: object,
      requestTimeout: number
    ): void;
    /**
* Request that a Durable Topic Endpoint stop receiving data on a topic. Unsubscribe
* requests are only allowed by the router when no clients are bound to the DTE.
* If the unubscribe request is successful, the DTE will stop attracting messages,
* and all messages spooled to the DTE will be deleted.
* 
* {@link solace.SessionEventCode.UNSUBSCRIBE_TE_TOPIC_OK} is generated when the
* subscription is removed successfully; otherwise,
* {@link solace.SessionEventCode.UNSUBSCRIBE_TE_TOPIC_ERROR} is generated.
* 
* When the application receives session event
* {@link solace.SessionEventCode.UNSUBSCRIBE_TE_TOPIC_ERROR}, it
* can obtain the failed topic subscription by calling
* {@link solace.SessionEvent#reason}.
* @param {solace.AbstractQueueDescriptor | solace.QueueDescriptor} queueDescriptor A description
 of the queue to which the topic is subscribed.
* @throws {solace.OperationError} * if the session is disposed or disconnected.
  Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}.
* if the parameters have an invalid type.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_INVALID_TYPE}.
* if the parameters have an invalid value.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_OUT_OF_RANGE}.
* if there's no space in the transport to send the request.
  Subcode: {@link solace.ErrorSubcode.INSUFFICIENT_SPACE}.  See:
  {@link solace.SessionEventCode#event:CAN_ACCEPT_DATA}.
*/
    unsubscribeDurableTopicEndpoint(
      queueDescriptor: solace.AbstractQueueDescriptor | solace.QueueDescriptor
    ): void;
    /**
* Modify a session property after creation of the session.
* @param {MutableSessionProperty} mutableSessionProperty The property key to modify.
* @param {object} newValue The new property value.
* @param {number} requestTimeout The request timeout period (in milliseconds). If specified, it
                               overwrites readTimeoutInMsecs
* @param {object} correlationKey If specified, this value is echoed in the session event within
                               {@link SessionEvent} property in {@link SessionProperties}
* @throws {solace.OperationError} * if the session is disposed or disconnected.
  Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}.
* if the parameters have an invalid type.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_INVALID_TYPE}.
* if the parameters have an invalid value.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_OUT_OF_RANGE}.
* if there's no space in the transport to send the request.
  Subcode: {@link solace.ErrorSubcode.INSUFFICIENT_SPACE}.  See:
  {@link solace.SessionEventCode#event:CAN_ACCEPT_DATA}.
*/
    updateProperty(
      mutableSessionProperty: MutableSessionProperty,
      newValue: object,
      requestTimeout: number,
      correlationKey: object
    ): void;
    /**
* Publish (send) a message over the session. The message is sent to its set destination.
* 
* This method is used for sending both direct and Guaranteed Messages.  If the message's
* {@link solace.MessageDeliveryModeType} is {@link solace.MessageDeliveryModeType.DIRECT}, the
* message is a direct message; otherwise, it is a guaranteed message.
* @param {solace.Message} message The message to send. It must have a destination set.
* @throws {solace.OperationError} * if the session is disposed or disconnected.
  Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}.
* if the parameters have an invalid type.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_INVALID_TYPE}.
* if the message does not have a topic.
  Subcode: {@link solace.ErrorSubcode.TOPIC_MISSING}.
* if there's no space in the transport to send the request.
  Subcode: {@link solace.ErrorSubcode.INSUFFICIENT_SPACE}.  See:
  {@link solace.SessionEventCode#event:CAN_ACCEPT_DATA}.
* if no Guaranteed Message Publisher is available and the message deliveryMode is
  {@link solace.MessageDeliveryModeType.PERSISTENT} or
  {@link solace.MessageDeliveryModeType.NON_PERSISTENT}.
  Subcode: {@link solace.ErrorSubcode.GM_UNAVAILABLE}.
*/
    send(message: solace.Message): void;
    /**
* Sends a request using user-specified callback functions.
* <br>
* <strong>Note:</strong>
* The API sets the correlationId and replyTo fields of the message being sent;
* this overwrites any existing correlationId and replyTo values on the message.
* @param {solace.Message} message The request message to send.
* @param {number} timeout The timeout value (in milliseconds). The minimum value is 100 msecs.
* @param {typeof solace.Session.replyReceivedCallback} replyReceivedCBFunction The callback to notify
   when a reply is received.
* @param {typeof solace.Session.requestFailedCallback} requestFailedCBFunction The callback to notify
   when the request failed.
* @param {object} userObject An optional correlation object to use in the response callback.
* @throws {solace.OperationError} * if the session is disposed or disconnected.
  Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}.
* if the parameters have an invalid type.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_INVALID_TYPE}.
* if the parameters have an invalid value.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_OUT_OF_RANGE}.
* if the message does not have a topic.
  Subcode: {@link solace.ErrorSubcode.TOPIC_MISSING}.
* if there's no space in the transport to send the request.
  Subcode: {@link solace.ErrorSubcode.INSUFFICIENT_SPACE}.  See:
  {@link solace.SessionEventCode#event:CAN_ACCEPT_DATA}.
* if no Guaranteed Message Publisher is available and the message deliveryMode is
  {@link solace.MessageDeliveryModeType.PERSISTENT} or
  {@link solace.MessageDeliveryModeType.NON_PERSISTENT}.
  Subcode: {@link solace.ErrorSubcode.GM_UNAVAILABLE}.
*/
    sendRequest(
      message: solace.Message,
      timeout?: number,
      replyReceivedCBFunction?: typeof solace.Session.replyReceivedCallback,
      requestFailedCBFunction?: typeof solace.Session.requestFailedCallback,
      userObject?: object
    ): void;
    /**
* Sends a reply message to the destination specified in messageToReplyTo.
* 
* If `messageToReplyTo` is non-null:
*  * {@link solace.Message#getReplyTo} is copied from `messageToReplyTo` to
*    {@link solace.Message#setDestination} on `replyMessage`, unless `replyTo` is null.
*  * {@link solace.Message#setCorrelationId} is copied from `messageToReplyTo` to
*    {@link solace.Message#setCorrelationId} on `replyMessage`, unless `correlationId` is null.
* 
* If `messageToReplyTo` is null, the application is responsible for setting
* the `destination` and `correlationId` on the `replyMessage`.
* @param {solace.Message} messageToReplyTo The message to which a reply will be sent.
* @param {solace.Message} replyMessage The reply to send.
* @throws {solace.OperationError} * if the session is disposed or disconnected.
  Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}.
* if the parameters have an invalid type.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_INVALID_TYPE}.
* if the parameters have an invalid value.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_OUT_OF_RANGE}.
* if the message does not have a topic.
  Subcode: {@link solace.ErrorSubcode.TOPIC_MISSING}.
* if there's no space in the transport to send the request.
  Subcode: {@link solace.ErrorSubcode.INSUFFICIENT_SPACE}.  See:
  {@link solace.SessionEventCode#event:CAN_ACCEPT_DATA}.
* if no Guaranteed Message Publisher is available and the message deliveryMode is
  {@link solace.MessageDeliveryModeType.PERSISTENT} or
  {@link solace.MessageDeliveryModeType.NON_PERSISTENT}.
  Subcode: {@link solace.ErrorSubcode.GM_UNAVAILABLE}.
*/
    sendReply(
      messageToReplyTo: solace.Message,
      replyMessage: solace.Message
    ): void;
    /**
* Returns the value of a given {@link solace.StatType}.
* @param {solace.StatType} statType The statistic to query.
* @returns {number} The value of the requested statistic.
* @throws {solace.OperationError} * if the session is disposed.
  Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}.
* if the StatType is invalid.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_OUT_OF_RANGE}.
*/
    getStat(statType: solace.StatType): number;
    /**
* Reset session statistics to initial values.
* @throws {solace.OperationError} if the session is disposed.
  Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}.
*/
    resetStats(): void;
    /**
* Returns a clone of the properties for this session.
* @returns {solace.SessionProperties} A clone of this session's properties.
* @throws {solace.OperationError} if the session is disposed.
  Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}.
*/
    getSessionProperties(): solace.SessionProperties;
    /**
* Check the value of a boolean router capability.
* 
* This function is a shortcut for {@link solace.Session#getCapability}. It performs the same
* operation, but instead of returning a {@link solace.SDTField} wrapping a capability value, it
* just returns the boolean value.
* 
*  Attempting to query a non-boolean capability will return `null`.
* @param {solace.CapabilityType} capabilityType The capability to check.
* @returns {boolean} the value of the capability queried.
* @throws {solace.OperationError} * if the session is disposed.
  Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}.
* if the parameters have an invalid type or value.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_INVALID_TYPE}.
*/
    isCapable(capabilityType: solace.CapabilityType): boolean;
    /**
* Get the value of an router capability, or null if unknown. This function must
* be called after connecting the session.
* 
* SDT Type conversions:
* 
*  * {string} values are returned as {@link solace.SDTFieldType.STRING}.
*  * {boolean} values are returned as {@link solace.SDTFieldType.BOOL}.
*  * All numeric values are returned as {@link solace.SDTFieldType.INT64}.
* @param {solace.CapabilityType} capabilityType The router capability to query.
* @returns {solace.SDTField} The result of the capability query.
* @throws {solace.OperationError} * if the session is disposed
   Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}.
* if the parameters have an invalid type or value.
   Subcode: {@link solace.ErrorSubcode.PARAMETER_INVALID_TYPE}.
*/
    getCapability(capabilityType: solace.CapabilityType): solace.SDTField;
    /**
* Creates a {@link solace.CacheSession} object that uses this Session to service its
* cache requests.
* 
* It should be disposed when the application no longer requires a CacheSession, by calling
* {@link solace.CacheSession#dispose}.
* @param {solace.CacheSessionProperties} properties The properties for the cache session.
* @returns {solace.CacheSession} The newly created cache session.
* @throws {solace.OperationError} if a CacheSession is already associated with this Session.
  Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}
*/
    createCacheSession(
      properties: solace.CacheSessionProperties
    ): solace.CacheSession;
    /**
* Creates a {@link solace.MessageConsumer} to receive Guaranteed Messages in this Session.
* 
* Consumer characteristics and behavior are defined by properties. The consumer properties are
* supplied as an object; the pertinent fields are exposed in
* {@link solace.MessageConsumerProperties};
* other property names are ignored. If the Message Consumer creation
* specifies a non-durable endpoint,
* {@link solace.QueueProperties} can be used to change the default properties on the
* non-durable endpoint. Any values not supplied are set to default values.
* 
* When the consumer is created, a consumer object is returned to the caller. This is the object
* from which events are emitted, and upon which operations (for example, starting and stopping
* the consumer) are performed.
* 
* If this session does not support Guaranteed Messaging, this method will throw. The Solace
* Messaging Router must support Guaranteed Messaging.
* @param {solace.MessageConsumerProperties | object} consumerProperties The properties for the
   consumer.
* @returns {solace.MessageConsumer} The newly created Message Consumer.
* @throws {solace.OperationError} if Guaranteed Message Consume is not supported on this session.
*/
    createMessageConsumer(
      consumerProperties: solace.MessageConsumerProperties | object
    ): solace.MessageConsumer;
    /**
* Creates a {@link solace.QueueBrowser} to receive Guaranteed Messages in this Session.
* 
* Browser characteristics and behavior are defined by properties. The properties are
* supplied as an object; the pertinent fields are exposed in
* {@link solace.QueueBrowserProperties};
* other property names are ignored.
* 
* Delivery restrictions imposed by the queue’s Access type (exclusive or non-exclusive),
* do not apply when browsing messages with a Browser.
* 
* When the browser is created, a browser object is returned to the caller. This is the object
* from which events are emitted, and upon which operations (for example, starting and stopping
* the browser) are performed.
* 
* If this session does not support Guaranteed Messaging, this method will throw. The Solace
* Messaging Router must support Guaranteed Messaging.
* @param {solace.QueueBrowserProperties | object} browserProperties The properties for the
   browser.
* @returns {solace.QueueBrowser} The newly created Queue Browser.
* @throws {solace.OperationError} if Guaranteed Messaging is not supported on this session.
*/
    createQueueBrowser(
      browserProperties: solace.QueueBrowserProperties | object
    ): solace.QueueBrowser;
    /**
     * Gets a transport session information string.
     * This string is informative only, and applications should not attempt to parse it.
     * @returns {string} A description of the current session's transport.
     */
    getTransportInfo(): string;
  }
  /**
   * Encapsulates a {@link solace.CacheSession}'s request listener callback function and
   * optional application-specified context object.
   *
   * Instances of this class are required as a parameter to
   * {@link solace.CacheSession#sendCacheRequest} when creating a CacheSession request.
   */
  class CacheCBInfo {
    /**
     * Creates an instance of CacheCBInfo using the provided callback and user context object.
     * @param {typeof solace.CacheCBInfo.cacheRequestCallback} cacheCBFunction The callback to be invoked.
     * @param {object} userObject A context object to be returned with the callback.
     */
    constructor(
      cacheCBFunction: typeof solace.CacheCBInfo.cacheRequestCallback,
      userObject: object
    );
    /**
     * The function that will be called by the cache session when a request
     * completes.
     */
    cacheCBFunction: typeof solace.CacheCBInfo.cacheRequestCallback;
    /**
     * The user context object that will be supplied to the callback function
     * when the cache request completes.
     */
    userObject: object;
    /**
     * This callback is called by a cache session when a cache request
     * completes.
     * @param {number} requestID The ID of the request on which the event is notified.
     * @param {solace.CacheRequestResult} result The result of the cache request.
     * @param {object} userObject The user object provided.
     */
    static cacheRequestCallback(
      requestID: number,
      result: solace.CacheRequestResult,
      userObject: object
    ): void;
  }
  /**
   * <b>This class is not exposed for construction by API users. A CacheRequestResult object is
   * provided on the callback (see {@link solace.CacheCBInfo.cacheRequestCallback} when a cache
   * request completes.</b>
   *
   * An object that indicates the termination of a cache request, and provides details how it
   * concluded.
   */
  class CacheRequestResult {
    /** @protected */
    protected constructor();
    /**
* Gets the return code from the cache request result.
* @returns {solace.CacheReturnCode} The return code associated with the result of
the request.
*/
    getReturnCode(): solace.CacheReturnCode;
    /**
* Gets the return subcode from the cache request result.
* @returns {solace.CacheReturnSubcode} A subcode that gives more detail than
{@link CacheRequestResult#getReturnCode} about the result of the request.
*/
    getReturnSubcode(): solace.CacheReturnSubcode;
    /**
     * Gets the topic object associated with the cache request.
     * @returns {solace.Destination} The topic destination supplied for the cache request.
     */
    getTopic(): solace.Destination;
    /**
     * Gets the error, if any, associated with the returned result.
     * @returns {string} The error associated with the returned result.
     */
    getError(): string;
  }
  /**
   * Encapsulates the properties of a cache session.
   */
  class CacheSessionProperties {
    /**
* @param {string} cacheName A property that specifies the cache name to which CacheSession
  operations should be sent.
* @param {number} maxAgeSec The maximum allowable message age in seconds to deliver in
  response to a cache request. 0 means no restriction on age.
* @param {number} maxMessages The maximum number of messages per Topic to deliver in
  response to cache requests. 0 means no restriction on the number of messages.
* @param {number} timeoutMsec The timeout period (in milliseconds) to wait for a
  response from the cache. This is a protocol timer used internally by the API on each
  message exchange with SolCache. A single call to
  {@link solace.CacheSession#sendCacheRequest} may lead to many request-reply exchanges
  with SolCache and so is not bounded by this timer as long as each internal request is
  satisfied in time.
  * The valid range for this property is >= 3000.
*/
    constructor(
      cacheName: string,
      maxAgeSec?: number,
      maxMessages?: number,
      timeoutMsec?: number
    );
    /**
     * A property that specifies the cache name to which CacheSession operations should
     * be sent.
     */
    cacheName: string;
    /**
     * The maximum allowable message age in seconds to deliver in response to cache
     * requests.  0 means no restriction on age.
     */
    maxAgeSec?: number;
    /**
     * The maximum number of messages per Topic to deliver in response to cache
     * requests.  0 means no restriction on the number of messages.
     */
    maxMessages?: number;
    /**
     * The timeout for a cache request, in milliseconds.  The valid range for this
     * property is >= 3000.
     */
    timeoutMsec?: number;
    /**
     * Gets the cache name to which {@link solace.CacheSession} requests should be sent, for
     * sessions constructed using these properties.
     * @returns {string} The cache name.
     */
    getCacheName(): string;
    /**
     * Sets the cache name to which requests should be sent. Cannot be null or blank.
     * @param {string} value The cache name to which requests should be sent.
     */
    setCacheName(value: string): void;
    /**
* Gets the maximum allowable message age for messages to be delivered in response to a request
* made on a {@link solace.CacheSession} that was constructed using these properties.  0 means no
* restriction on age.
* @returns {number} The maximum allowable message age to be returned by an associated
{@link solace.CacheSession}, or 0 for no restriction.
*/
    getMaxMessageAgeSec(): number;
    /**
     * Sets the maximum allowable message age. 0 means no restriction on age.
     * @param {number} value The maximum allowable message age, or 0 for no restriction.
     */
    setMaxMessageAgeSec(value: number): void;
    /**
     * Gets the maximum count of messages to be delivered, per {@link solace.Destination}, in
     * response to a request issued on a {@link solace.CacheSession} constructed using these
     * properties.  0 means no restriction on the number of messages.
     * @returns {number} The maximum number of messages per Topic to deliver, or 0 for no restriction.
     */
    getMaxMessages(): number;
    /**
     * Sets the maximum count of messages to be delivered per {@link solace.Destination} in response
     * to a cache request. 0 means no restriction.
     * @param {number} value The maximum count of messages to deliver, or 0 for no restriction.
     */
    setMaxMessages(value: number): void;
    /**
     * Gets the timeout for requests issued on a {@link solace.CacheSession} constructed
     * using these properties.
     *  * The valid range is >= 3000.
     * @returns {number} The timeout, in milliseconds, for cache session requests.
     */
    getTimeoutMsec(): number;
    /**
     * Sets the timeout for requests.
     *  * The valid range is >= 3000.
     * @param {number} value The timeout for requests.
     */
    setTimeoutMsec(value: number): void;
  }
  /**
   * <b>This class is not exposed for construction by API users. Users should obtain an instance from
   * {@link solace.Session#createCacheSession}</b>
   * <p>
   * A session for performing cache requests.
   *
   * Applications must use {@link solace.Session#createCacheSession} to construct this class.
   *
   * The supplied {@link solace.CacheSessionProperties} will be copied. Subsequent modifications
   * to the passed properties will not modify the session. The properties may be reused.
   */
  class CacheSession {
    /** @protected */
    protected constructor();
    /**
     * Disposes the session.  No cache requests will be sent by this CacheSession after it is
     * _disposed.
     *
     * Any subsequent operations on the session will throw {OperationError}.
     *
     * Any pending operations will immediately terminate, returning
     *   * {@link solace.CacheRequestResult}
     *     * #returnCode === {@link solace.CacheReturnCode.INCOMPLETE}
     *     * #subcode === {@link solace.CacheReturnSubcode.CACHE_SESSION_DISPOSED}
     * @throws {solace.OperationError} if the CacheSession is already _disposed.
     */
    dispose(): void;
    /**
     * Gets the cache session properties.
     * @returns {solace.CacheSessionProperties} The properties for the session.
     * @throws {solace.OperationError} if the CacheSession is disposed.
     */
    getProperties(): solace.CacheSessionProperties;
    /**
* Issues an asynchronous cache request. The result of the request will be returned via the
* listener. Messages returned as a result of issuing the request will be returned to the
* application via the {@link solace.MessageRxCBInfo} associated with this
* {@link solace.CacheSession}'s {@link solace.Session}
* @param {number} requestID The application-assigned ID number for the request.
* @param {solace.Destination} topic The topic destination for which the cache request will be
   made.
* @param {boolean} subscribe If true, the session will subscribe to the given {Topic}, if it is
not already subscribed, before performing the cache request.
* @param {solace.CacheLiveDataAction} liveDataAction The action to perform when the
   {@link solace.CacheSession} receives live data on the given topic.
* @param {solace.CacheCBInfo} cbInfo Callback info for the cache request.
* @throws {solace.OperationError} In the following cases:
* If the CacheSession is disposed.
   Subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}
* If one or more parameters were invalid.
   Subcode: {@link solace.ErrorSubcode.PARAMETER_INVALID_TYPE}
* If the supplied topic and live data action cannot be combined.
   Subcode: {@link solace.ErrorSubcode.PARAMETER_CONFLICT}
* If the supplied topic or live data action cannot be used given the current outstanding
   requests.
   Subcode: {@link solace.ErrorSubcode.PARAMETER_CONFLICT}
*/
    sendCacheRequest(
      requestID: number,
      topic: solace.Destination,
      subscribe: boolean,
      liveDataAction: solace.CacheLiveDataAction,
      cbInfo: solace.CacheCBInfo
    ): void;
  }
  /**
   * Enumerates destination types for destination objects.
   */
  enum DestinationType {
    /**
     * A Topic destination.
     */
    TOPIC = "topic",
    /**
     * A queue destination.
     */
    QUEUE = "queue",
    /**
     * A temporary queue destination.
     */
    TEMPORARY_QUEUE = "temporary_queue"
  }
  /**
   * Defines an error subcode enumeration which is returned as a property of
   * the errors/exceptions thrown by the API. The subcode provides more detailed
   * error information.
   *
   * The following subcodes can apply to error responses resulting from
   * any API method.
   * * {@link solace.ErrorSubcode.PARAMETER_OUT_OF_RANGE}
   * * {@link solace.ErrorSubcode.PARAMETER_CONFLICT}
   * * {@link solace.ErrorSubcode.INTERNAL_ERROR}
   */
  enum ErrorSubcode {
    /**
     * Errors that do not have a proper subcode.
     */
    UNKNOWN_ERROR = 4294967295,
    /**
     * No error is associated with this event.
     */
    NO_ERROR = 0,
    /**
     * The session is not connected.
     */
    SESSION_NOT_CONNECTED = 2,
    /**
     * The performed session operation is invalid given the state
     * or configuration of the session.
     */
    INVALID_SESSION_OPERATION = 3,
    /**
     * The performed session operation is invalid given the state
     * or configuration of the session.
     */
    INVALID_OPERATION = 3,
    /**
     * An API call failed due to a timeout.
     */
    TIMEOUT = 4,
    /**
     * The Message VPN name configured for the session does not exist.
     *
     * Causes:
     *  * 403 Message VPN Not Allowed
     */
    MESSAGE_VPN_NOT_ALLOWED = 5,
    /**
     * The Message VPN name set for the session (or the default VPN if none
     * was set) is currently shutdown on the router.
     *
     * Causes:
     *  * 503 Message VPN Unavailable
     */
    MESSAGE_VPN_UNAVAILABLE = 6,
    /**
     * The username for the client is administratively shutdown
     * on the router.
     *
     * Causes:
     *  * 403 Client Username Is Shutdown
     */
    CLIENT_USERNAME_IS_SHUTDOWN = 7,
    /**
     * The username for the session has not been set and dynamic
     * clients are not allowed.
     *
     * Causes:
     *  * 403 Dynamic Clients Not Allowed
     */
    DYNAMIC_CLIENTS_NOT_ALLOWED = 8,
    /**
     * The session is attempting to use a client name that is
     * in use by another client, and the router is configured to reject the
     * new session.
     * A client name cannot be used by multiple clients in the same Message
     * VPN.
     *
     * Causes:
     *  * 403 Client Name Already In Use
     */
    CLIENT_NAME_ALREADY_IN_USE = 9,
    /**
     * The client name chosen has been rejected as invalid by the router.
     *
     * Causes:
     *  * 400 Client Name Parse Error
     */
    CLIENT_NAME_INVALID = 10,
    /**
     * The client login is not currently possible because a previous
     * instance of same client was being deleted.
     *
     * Causes:
     *  * 503 Subscriber Delete In Progress
     */
    CLIENT_DELETE_IN_PROGRESS = 11,
    /**
     * The client login is not currently possible because the maximum
     * number of active clients on router has already been reached.
     *
     * Causes:
     *  * 503 Too Many Clients
     *  * 503 Too Many Connections for VPN
     */
    TOO_MANY_CLIENTS = 12,
    /**
     * The client could not log into the router.
     *
     * Causes:
     *  * 401 error codes
     *  * 404 error codes
     *  * Failed to send a session setup message in the transport.
     */
    LOGIN_FAILURE = 13,
    /**
     * An attempt was made to connect to the wrong IP address on
     * the router (must use CVRID if configured), or the router CVRID has
     * changed and this was detected on reconnect.
     *
     * Causes:
     *  * 403 Invalid Virtual Router Address
     */
    INVALID_VIRTUAL_ADDRESS = 14,
    /**
     * The client login to the router was denied because the
     * IP address/netmask combination used for the client is designated in the
     * ACL (Access Control List) profile associated with that client.
     *
     * Causes:
     *  * 403 Forbidden
     */
    CLIENT_ACL_DENIED = 15,
    /**
     * Adding a subscription was denied because it matched a
     * subscription that was defined as denied on the ACL (Access Control List)
     * profile associated with the client.
     *
     * Causes:
     *  * 403 Subscription ACL Denied
     */
    SUBSCRIPTION_ACL_DENIED = 16,
    /**
     * A message could not be published because its topic matched
     * a topic defined as denied on the ACL (Access Control List) profile
     * associated with the client.
     *
     * Causes:
     *  * 403 Publish ACL Denied
     */
    PUBLISH_ACL_DENIED = 17,
    /**
     * An API call was made with an out-of-range parameter.
     */
    PARAMETER_OUT_OF_RANGE = 18,
    /**
     * An API call was made with a parameter combination
     * that is not valid.
     */
    PARAMETER_CONFLICT = 19,
    /**
     * An API call was made with a parameter of incorrect type.
     */
    PARAMETER_INVALID_TYPE = 20,
    /**
     * An API call had an internal error (not an application fault).
     */
    INTERNAL_ERROR = 21,
    /**
     * An API call failed due to insufficient space in the transport
     * buffer to accept more data,
     * or due to exhaustion of the Guaranteed Messaging Window on a publisher.
     * After an insufficient space error of either kind, the
     * listeners on the {@link solace.SessionEventCode#event:CAN_ACCEPT_DATA}
     * event are notified when it is possible to retry the failed operation.
     */
    INSUFFICIENT_SPACE = 22,
    /**
     * The message router has rejected the request. All available
     * resources of the requested type are in use.
     *
     * Causes:
     *  * 400 Not Enough Space
     */
    OUT_OF_RESOURCES = 23,
    /**
     * An API call failed due to a protocol error with the router
     * (not an application fault).
     */
    PROTOCOL_ERROR = 24,
    /**
     * An API call failed due to a communication error. This typically indicates the
     * transport connection to the message router has been unexpectedly closed.
     */
    COMMUNICATION_ERROR = 25,
    /**
     * The session keep-alive detected a failed session.
     */
    KEEP_ALIVE_FAILURE = 26,
    /**
     * A send call was made that did not have a topic in a mode
     * where one is required (for example, client mode).
     */
    TOPIC_MISSING = 28,
    /**
     * An attempt was made to use a topic which has a syntax that
     * is not supported.
     *
     * Causes:
     *  * 400 Topic Parse Error
     */
    INVALID_TOPIC_SYNTAX = 31,
    /**
     * The client attempted to send a message larger than that
     * supported by the router.
     *
     * Causes:
     *  * 400 Document Is Too Large
     *  * 400 Message Too Long
     */
    MESSAGE_TOO_LARGE = 32,
    /**
     * The router could not parse an XML message.
     *
     * Causes:
     *  * 400 XML Parse Error
     */
    XML_PARSE_ERROR = 33,
    /**
     * The client attempted to add a subscription that already
     * exists. This subcode is only returned if the session property
     * 'IgnoreDuplicateSubscriptionError' is not enabled.
     *
     * Causes:
     * 400 Subscription Already Exists)
     */
    SUBSCRIPTION_ALREADY_PRESENT = 34,
    /**
     * The client attempted to remove a subscription which did not exist.
     * This subcode is only returned if the session property
     * 'IgnoreDuplicateSubscriptionError' is not enabled.
     *
     * Causes:
     * 400 Subscription Not Found)
     */
    SUBSCRIPTION_NOT_FOUND = 35,
    /**
     * The client attempted to add/remove a subscription that
     * is not valid.
     *
     * Causes:
     *  * 400 Subscription Parse Error
     */
    SUBSCRIPTION_INVALID = 36,
    /**
     * The router rejected a subscription add or remove request
     * for a reason not separately enumerated.
     */
    SUBSCRIPTION_ERROR_OTHER = 37,
    /**
     * The client attempted to add a subscription that
     * exceeded the maximum number allowed.
     *
     * Causes:
     *  * 400 Max Num Subscriptions Exceeded
     */
    SUBSCRIPTION_TOO_MANY = 38,
    /**
     * The client attempted to add a subscription which already
     * exists but it has different properties.
     *
     * Causes:
     *  * 400 Subscription Attributes Conflict With Existing Subscription
     */
    SUBSCRIPTION_ATTRIBUTES_CONFLICT = 39,
    /**
     * The client attempted to establish a session with No Local
     * enabled and the capability is not supported by the router.
     */
    NO_LOCAL_NOT_SUPPORTED = 40,
    /**
     * The router rejected a data message for a reason
     * not separately enumerated.
     */
    DATA_ERROR_OTHER = 42,
    /**
     * Failed to create the HTTP connection.
     */
    CREATE_XHR_FAILED = 43,
    /**
     * Failed to create the transport.
     */
    CONNECTION_ERROR = 44,
    /**
     * Failed to decode the data.
     */
    DATA_DECODE_ERROR = 45,
    INACTIVITY_TIMEOUT = 46,
    UNKNOWN_TRANSPORT_SESSION_ID = 47,
    AD_MESSAGING_NOT_SUPPORTED = 48,
    CREATE_WEBSOCKET_FAILED = 49,
    /**
     * An attempt to perform an operation using a VPN that is configured to be
     * STANDBY for replication.
     *
     * Causes:
     * * 403 Replication Is Standby
     */
    REPLICATION_IS_STANDBY = 50,
    /**
     * Basic authentication is administratively shut down on the
     * router.
     *
     * Causes:
     *  * 403 Basic Authentication is Shutdown
     */
    BASIC_AUTHENTICATION_IS_SHUTDOWN = 51,
    /**
     * Client certificate authentication is administratively
     * shut down on the router.
     *
     * Causes:
     *  * 403 Client Certificate Authentication Is Shutdown
     */
    CLIENT_CERTIFICATE_AUTHENTICATION_IS_SHUTDOWN = 52,
    /**
     * Guaranteed Messaging services are not enabled on the router.
     *
     * Causes:
     *  * 503 Service Unavailable
     */
    GM_UNAVAILABLE = 100,
    /**
     * The session attempted to connect to a Guaranteed Message Publisher
     * that does not exist on this router.
     * All unacked messages held by the API are renumbered and redelivered. This subCode
     * is handled internally and will not be seen by the application. After successfully
     * renumbereing and redelivering the messages, if any messages are resent, listeners
     * on the @{link solace.SessionEventCode#event:REPUBLISHING_UNACKED_MESSAGES} event are
     * invoked.
     *
     * Causes:
     * * 400 Unknown Flow Name
     */
    UNKNOWN_FLOW_NAME = 111,
    /**
     * Already bound to the Queue or not authorized to bind to the Queue.
     *
     * Causes:
     *  * 400 Already Bound
     */
    ALREADY_BOUND = 112,
    /**
     * An attempt was made to bind to a Guaranteed Messaging Topic Endpoint with an
     * invalid topic.
     *
     * Causes:
     *  * 400 Invalid Topic Name
     */
    INVALID_TOPIC_NAME_FOR_TOPIC_ENDPOINT = 113,
    /**
     * An attempt was made to bind to an unknown Queue name (for example, not
     * configured on the router).
     *
     * Causes:
     *  * 503 Unknown Queue
     */
    UNKNOWN_QUEUE_NAME = 114,
    /**
     * An attempt was made to perform an operation on an unknown Guaranteed Messaging
     * Topic Endpoint name (for example, not configured on router).
     *
     * Causes:
     *  * 503 Unknown Durable Topic Endpoint
     */
    UNKNOWN_TOPIC_ENDPOINT_NAME = 115,
    /**
     * An attempt was made to bind to a Guaranteed Messaging Queue that has already reached
     * its maximum number of clients.
     *
     * Causes:
     *  * 503 Max clients exceeded for Queue
     */
    MAX_CLIENTS_FOR_QUEUE = 116,
    /**
     * An attempt was made to bind to a Guaranteed Messaging Topic Endpoint that has already
     * reached its maximum number of clients.
     *
     * Causes:
     *  * 503 Max clients exceeded for durable Topic Endpoint
     */
    MAX_CLIENTS_FOR_TE = 117,
    /**
     * An unexpected unbind response was received for a Guaranteed Messaging Queue or Topic
     * Endpoint (for example, the Queue or Topic Endpoint was deleted from the router).
     */
    UNEXPECTED_UNBIND = 118,
    /**
     * The specified Guaranteed Messaging Queue was not found when publishing a message.
     *
     * Causes:
     *  * 400 Queue Not Found
     */
    QUEUE_NOT_FOUND = 119,
    /**
     * Message was not delivered because the Guaranteed Message spool is over its
     * allotted space quota.
     *
     * Causes:
     *  * 503 Spool Over Quota
     */
    SPOOL_OVER_QUOTA = 120,
    /**
     * An attempt was made to operate on a shutdown Guaranteed Messaging queue.
     *
     * Causes:
     *  * 503 Queue Shutdown
     */
    QUEUE_SHUTDOWN = 121,
    /**
     * An attempt was made to operate on a shutdown Guaranteed Messaging Topic Endpoint.
     *
     * Causes:
     *  * 503 Durable Topic Endpoint Shutdown
     *  * 503 TE Shutdown
     *  * 503 Endpoint Shutdown
     */
    TOPIC_ENDPOINT_SHUTDOWN = 122,
    /**
     * An attempt was made to bind to a non-durable Guaranteed Messaging Queue or Topic
     * Endpoint, and the router is out of resources.
     *
     * Causes:
     *  * 503 No More Non-Durable Queue or Topic Endpoint
     */
    NO_MORE_NON_DURABLE_QUEUE_OR_TOPIC_ENDPOINT = 123,
    /**
     * An attempt was made to create a Queue or Topic Endpoint that already exists.
     * This subcode is only returned if
     * {@link solace.SessionProperties.ignoreProvisionEndpointExists} was not set for the current
     * session.
     *
     * Causes:
     *  * 400 Endpoint Already Exists
     */
    ENDPOINT_ALREADY_EXISTS = 124,
    /**
     * An attempt was made to delete or create a Queue or Topic Endpoint when the
     * Session does not have authorization for the action. This subcode is also returned when an
     * attempt is made to remove a message from an endpoint when the Session does not have 'consume'
     * authorization, or when an attempt is made to add or remove a Topic subscription from a Queue
     * when the Session does not have 'modify-topic' authorization.
     *
     * Causes:
     *  * 403 Permission Not Allowed
     */
    PERMISSION_NOT_ALLOWED = 125,
    /**
     * An attempt was made to bind to a Queue or Topic Endpoint with an invalid
     * selector.
     *
     * Causes:
     *  * 400 Invalid Selector
     */
    INVALID_SELECTOR = 126,
    /**
     * Publishing the message was denied due to exceeding the maximum spooled message
     * count.
     *
     * Causes:
     *  * 503 Max message usage exceeded
     */
    MAX_MESSAGE_USAGE_EXCEEDED = 127,
    /**
     * An attempt was made to create a dynamic durable endpoint, and it was found to
     * exist with different properties.
     *
     * Causes:
     *  * 400 Endpoint Property Mismatch
     */
    ENDPOINT_PROPERTY_MISMATCH = 128,
    /**
     * The client attempted to publish an Guaranteed Messaging message to a topic that
     * did not have any guaranteed subscription matches, or only matched a replicated topic.
     *
     * Causes:
     *  * 503 No Subscription Match
     */
    NO_SUBSCRIPTION_MATCH = 129,
    /**
     * The application attempted to acknowledge a message that arrived via a delivery
     * mode that does not allow acknowledgements.
     */
    MESSAGE_DELIVERY_MODE_MISMATCH = 130,
    /**
     * The message was already acknowledged.
     */
    MESSAGE_ALREADY_ACKNOWLEDGED = 131,
    /**
     * The API-supplied subscription did not match when attempting to bind to a
     * non-exclusive durable topic endoint.
     *
     * Causes:
     *  * 403 Subscription Does Not Match
     */
    SUBSCRIPTION_DOES_NOT_MATCH = 133,
    /**
     * The API-supplied selector did not match when attempting to bind to a
     * non-exclusive durable topic endpoint.
     *
     * Causes:
     *  * 403 Selector Does Not Match
     */
    SELECTOR_DOES_NOT_MATCH = 134,
    /**
     * The subscriber has provided an incorrectly formatted durable topic endpoint name.
     *
     * Causes:
     *  * 400 Invalid Durable Topic Endpoint Name
     */
    INVALID_DTE_NAME = 135,
    /**
     * The unsubscribe request was denied by the router because the durable topic endpoint
     * had one or more clients bound.
     *
     * Causes:
     *  * 400 Unsubscribe Not Allowed, Client(s) Bound To DTE
     */
    UNSUBSCRIBE_NOT_ALLOWED_CLIENTS_BOUND = 136,
    /**
     * An application callback threw an error back to the API. The reason property describes
     * the error that occurred.
     */
    CALLBACK_ERROR = 137,
    /**
     * A published message was discarded by the router because it will not be published
     * anywhere based on the NoLocal properties. This can be considered normal.
     *
     * Causes:
     * * 400 Nolocal Discard
     */
    NOLOCAL_DISCARD = 138,
    /**
     * The operation is delayed because Guaranteed Messaging is not ready on the router.
     *
     * Causes:
     * 507 Ad Not Ready
     */
    GM_NOT_READY = 140,
    /**
     * The message was rejected because one or more matching endpoints'
     * reject-low-priority-msg-limit was exceeded.
     *
     * Causes:
     * * 503 Low Priority Msg Congestion
     */
    LOW_PRIORITY_MSG_CONGESTION = 141,
    /**
     * The specified endpoint quota was out of range.
     *
     * Causes:
     * 400 Quota Out Of Range
     */
    QUOTA_OUT_OF_RANGE = 142,
    /**
     * Unable to load the certificate from the TrustStore for a SSL
     * secured session.
     */
    FAILED_LOADING_TRUSTSTORE = 143,
    /**
     * The client failed to load certificate and/or private key files.
     */
    FAILED_LOADING_CERTIFICATE_AND_KEY = 144,
    /**
     * DNS resolution failed for all hostnames.
     */
    UNRESOLVED_HOSTS = 145,
    /**
     * Replay is not supported on the Solace Message Router
     */
    REPLAY_NOT_SUPPORTED = 146,
    /**
     * Replay is not enabled in the message-vpn
     */
    REPLAY_DISABLED = 147,
    /**
     * The client attempted to start replay on a flow bound to a non-exclusive endpoint
     */
    CLIENT_INITIATED_REPLAY_NON_EXCLUSIVE_NOT_ALLOWED = 148,
    /**
     * The client attempted to start replay on an inactive flow
     */
    CLIENT_INITIATED_REPLAY_INACTIVE_FLOW_NOT_ALLOWED = 149,
    /**
     * N/A - Browser Flows are not supported.
     */
    CLIENT_INITIATED_REPLAY_BROWSER_FLOW_NOT_ALLOWED = 150,
    /**
     * Replay is not supported on temporary endpoints
     */
    REPLAY_TEMPORARY_NOT_SUPPORTED = 151,
    /**
     * The client attempted to start a replay but provided an unknown start location type.
     */
    UNKNOWN_START_LOCATION_TYPE = 152,
    /**
     * A replay in progress on a flow was administratively cancelled, causing the flow to be unbound
     */
    REPLAY_CANCELLED = 153,
    /**
     * A replay in progress on a flow failed because messages to be replayed were trimmed
     *  from the replay log
     */
    REPLAY_MESSAGE_UNAVAILABLE = 154,
    /**
     * A replay was requested but the requested start time is not available in the replay log
     */
    REPLAY_START_TIME_NOT_AVAILABLE = 155,
    /**
     * The Solace Message Router attempted to replay a message, but the queue/topic
     *  endpoint rejected the message to the sender
     */
    REPLAY_MESSAGE_REJECTED = 156,
    /**
     * A replay in progress on a flow failed because the replay log was modified
     */
    REPLAY_LOG_MODIFIED = 157,
    /**
     * Endpoint error ID in the bind request does not match the endpoint's error ID.
     */
    MISMATCHED_ENDPOINT_ERROR_ID = 158,
    /**
     * A replay was requested, but the router does not have sufficient resources
     * to fulfill the request, due to too many active replays.
     */
    OUT_OF_REPLAY_RESOURCES = 159,
    /**
     * A replay was in progress on a Durable Topic Endpoint (DTE)
     * when its topic or selector was modified, causing the replay to fail.
     */
    TOPIC_OR_SELECTOR_MODIFIED_ON_DURABLE_TOPIC_ENDPOINT = 160,
    /**
     * A replay in progress on a flow failed
     */
    REPLAY_FAILED = 161,
    /**
     * A replay was started on the queue or DTE, either by another client or by the router.
     */
    REPLAY_STARTED = 162,
    /**
     * Router does not support Compressed TLS
     */
    COMPRESSED_TLS_NOT_SUPPORTED = 163,
    /**
     * The client attempted to add a shared subscription, but the capability is not supported
     * by the appliance.
     */
    SHARED_SUBSCRIPTIONS_NOT_SUPPORTED = 164,
    /**
     * The client attempted to add a shared subscription on a client that is not permitted to
     * use shared subscriptions.
     */
    SHARED_SUBSCRIPTIONS_NOT_ALLOWED = 165,
    /**
     * The client attempted to add a shared subscription to a queue or topic endpoint.
     */
    SHARED_SUBSCRIPTIONS_ENDPOINT_NOT_ALLOWED = 166,
    /**
     * A replay was requested but the requested start message is not available in the replay log.
     */
    REPLAY_START_MESSAGE_NOT_AVAILABLE = 167,
    /**
     * Replication Group Message Id are not comparable.
     * Messages must be published to the same broker or HA pair for their Replicaton Group
     * Message Id to be comparable.
     */
    MESSAGE_ID_NOT_COMPARABLE = 168
  }
  /**
   * An attribute of {@link solace.RequestError}. This enumeration represents the
   * different errors emitted by
   * {@link solace.Session.requestFailedCallback}
   * when a {@link solace.Session#sendRequest} fails.
   *
   * The client application receives a request error with event code
   * {@link solace.RequestEventCode.REQUEST_ABORTED}
   * when the underlying connection is successfully closed, or closed as a result
   * of a communication error.
   */
  enum RequestEventCode {
    /**
     * A request was aborted because the session is disconnected.
     */
    REQUEST_ABORTED = 8,
    /**
     * The event represents a timed-out request API call.
     */
    REQUEST_TIMEOUT = 9
  }
  /**
   * Represents a log level enumeration.
   */
  enum LogLevel {
    /**
     * Fatal. Rserved for unrecoverable errors.
     */
    FATAL = 0,
    /**
     * Error. An internal error to the API or Solace Message Router.
     */
    ERROR = 1,
    /**
     * Warn. An external error which may be caused by the application passing invalid
     * arguments or objects to the API. Often accompanied by an thrown exception.
     */
    WARN = 2,
    /**
     * Info. An unexpected event or occurrence that does not affect the sane
     * operation of the SDK or application.
     */
    INFO = 3,
    /**
     * Debug. The highest (least) level of debug logs. Debug logs provide an overview of
     * the API operation.
     */
    DEBUG = 4,
    /**
     * Trace. The loweest (most verbose) level of debug logs.
     */
    TRACE = 5
  }
  /**
   * An enumeration of consumer acknowledgement modes. The corresponding
   * MessageConsumer property {@link solace.MessageConsumerProperties#acknowledgeMode}
   * configures how acknowledgments are generated for received Guaranteed messages.
   *
   * When received messages are acknowledged they are removed from the Guaranteed
   * Message storage on the Solace Message Router. Message Consumer acknowledgements,
   * <b>only</b> remove messages from the Solace Message Router.
   *
   * In particular, withholding Message Consumer Acknowledgemnts does not stop
   * message delivery. For Message Consumer flow control see
   * {@link solace.MessageConsumer.stop}/{@link solace.MessageConsumer.start}. Message Consumer
   * flow control may also be imlpemented by removing the
   * {@link solace.MessageConsumerEventName#event:MESSAGE} listener.
   */
  enum MessageConsumerAcknowledgeMode {
    /**
     * The API automatically acknowledges any message that was delivered to all
     * {@link solace.MessageConsumerEventName#event:MESSAGE} listeners with no exception thrown
     * on any of them.
     */
    AUTO = "AUTO",
    /**
     * The API acknowledges a message only when the application calls
     * {@link solace.Message#acknowledge}.
     */
    CLIENT = "CLIENT"
  }
  /**
   * An enumeration of message consumer event names. A {@link solace.MessageConsumer} will emit
   * these events as part of its lifecycle.  Applications, having created a MessageConsumer can
   * choose to listen to all of the events described here, or any subset of these events. For Example:
   * <pre>
   *   <code>
   *     mc = solace.Session.createMessageConsumer(...);
   *     mc.on(solace.MessageConsumerEventName.CONNECT_FAILED_ERROR,
   *           function connectFailedErrorEventCb(error) {
   *             // error can be used as an OperationError object
   *           });
   *   </code>
   * </pre>
   */
  enum MessageConsumerEventName {
    UP = "MessageConsumerEventName_up",
    DOWN = "MessageConsumerEventName_down",
    ACTIVE = "MessageConsumerEventName_active",
    INACTIVE = "MessageConsumerEventName_inactive",
    DOWN_ERROR = "MessageConsumerEventName_downError",
    RECONNECTING = "MessageConsumerEventName_reconnecting",
    RECONNECTED = "MessageConsumerEventName_reconnected",
    CONNECT_FAILED_ERROR = "MessageConsumerEventName_connectFailedError",
    GM_DISABLED = "MessageConsumerEventName_GMDisabled",
    DISPOSED = "MessageConsumerEventName_disposed",
    MESSAGE = "MessageConsumerEventName_message",
    SUBSCRIPTION_OK = "MessageConsumerEventName_ok",
    SUBSCRIPTION_ERROR = "MessageConsumerEventName_error"
  }
  interface MessageConsumerEventNameEvents {
    /**
     * The message consumer is established.
     */
    [solace.MessageConsumerEventName.UP]: () => void;
    /**
     * The message consumer is successfully disconnected.
     * The message consumer is disabled.
     */
    [solace.MessageConsumerEventName.DOWN]: () => void;
    /**
     * The message consumer has become active.
     */
    [solace.MessageConsumerEventName.ACTIVE]: () => void;
    /**
     * The message consumer has become inactive.
     */
    [solace.MessageConsumerEventName.INACTIVE]: () => void;
    /**
     * The message consumer was established and then disconnected by the router,
     * likely due to operator intervention. The message consumer is disabled.
     * @param {solace.OperationError} error Details of the error.
     */
    [solace.MessageConsumerEventName.DOWN_ERROR]: (
      error: solace.OperationError
    ) => void;
    /**
     * The message consumer was established and then disconnected by the router,
     * likely due to operator intervention, but flow auto reconnect is active.
     * The message consumer is disabled, but actively reconnecting.
     * Expect a RECONNECTED or DOWN_ERROR on success of failure. respectively.
     * See also MessageConsumerProperties.reconnectAttempts and reconnectIntervalInMsecs.
     * @param {solace.OperationError} error Details of the error that triggered the reconnect.
     */
    [solace.MessageConsumerEventName.RECONNECTING]: (
      error: solace.OperationError
    ) => void;
    /**
     * The message consumer successfully auto-reconnected.
     */
    [solace.MessageConsumerEventName.RECONNECTED]: () => void;
    /**
     * The message consumer attempted to connect but was unsuccessful.
     * The message consumer is disabled.
     * @param {solace.OperationError} error Details of the error.
     */
    [solace.MessageConsumerEventName.CONNECT_FAILED_ERROR]: (
      error: solace.OperationError
    ) => void;
    /**
     * The message consumer will not connect because the current session is incompatible
     * with Guaranteed Messaging. The message consumer is disabled until a compatible session
     * is available.
     */
    [solace.MessageConsumerEventName.GM_DISABLED]: () => void;
    /**
     * The message consumer is being disposed. No further events will be emitted.
     */
    [solace.MessageConsumerEventName.DISPOSED]: () => void;
    /**
     * A message was received on the message consumer.
     *
     * If the application throws an exception in this listener, and the consumer was configured
     * to automatically acknowledge messages
     * (see {@link solace.MessageConsumerProperties#acknowledgeMode}),
     * the API will not acknowledge the message, since it
     * may not have been successfully processed by the application. Such a message must be
     * acknowledged manually. If the application did not retain a reference to the message, it
     * may be redelivered by calling {@link solace.MessageConsumer#disconnect} followed by
     * {@link solace.MessageConsumer#connect} depending on the configuration of the queue.
     *
     * When there is no listener for <i>MESSAGE</i> on a MessageConsumer, messages are queued
     * internally until a listener is added.
     * @param {solace.Message} message The received message being delivered in this event.
     */
    [solace.MessageConsumerEventName.MESSAGE]: (
      message: solace.Message
    ) => void;
    /**
* The subscribe or unsubscribe operation succeeded on the queue.
* @param {solace.MessageConsumerEvent} event The details related
to the successful subscription update.
*/
    [solace.MessageConsumerEventName.SUBSCRIPTION_OK]: (
      event: solace.MessageConsumerEvent
    ) => void;
    /**
* The Solace Message Router rejected a queue subscription (add or remove).
* @param {solace.MessageConsumerEvent} error The details related
to the failed subscription update.
*/
    [solace.MessageConsumerEventName.SUBSCRIPTION_ERROR]: (
      error: solace.MessageConsumerEvent
    ) => void;
  }
  /**
   * An enumeration of queue browser event names. A {@link solace.QueueBrowser} will emit
   * these events as part of its lifecycle.  Applications, having created a QueueBrowser can
   * choose to listen to all of the events described here, or any subset of these events. For Example:
   * <pre>
   *   <code>
   *     qb = solace.Session.createQueueBrowser(...);
   *     qb.on(solace.QueueBrowserEventName.CONNECT_FAILED_ERROR,
   *           function connectFailedErrorEventCb(error) {
   *             // details is an OperationError object
   *           });
   *   </code>
   * </pre>
   */
  enum QueueBrowserEventName {
    UP = "QueueBrowserEventName_up",
    DOWN = "QueueBrowserEventName_down",
    DOWN_ERROR = "QueueBrowserEventName_downError",
    CONNECT_FAILED_ERROR = "QueueBrowserEventName_connectFailedError",
    GM_DISABLED = "QueueBrowserEventName_GMDisabled",
    DISPOSED = "QueueBrowserEventName_disposed",
    MESSAGE = "QueueBrowserEventName_message"
  }
  interface QueueBrowserEventNameEvents {
    /**
     * The queue browser is established.
     */
    [solace.QueueBrowserEventName.UP]: () => void;
    /**
     * The queue browser is successfully disconnected.
     * The queue browser is disabled.
     */
    [solace.QueueBrowserEventName.DOWN]: () => void;
    /**
     * The queue browser was established and then disconnected by the router,
     * likely due to operator intervention. The queue browser is disabled.
     * @param {solace.OperationError} error Details of the error.
     */
    [solace.QueueBrowserEventName.DOWN_ERROR]: (
      error: solace.OperationError
    ) => void;
    /**
     * The queue browser attempted to connect but was unsuccessful.
     * The queue browser is disabled.
     * @param {solace.OperationError} error Details of the error.
     */
    [solace.QueueBrowserEventName.CONNECT_FAILED_ERROR]: (
      error: solace.OperationError
    ) => void;
    /**
     * The queue browser will not connect because the current session is incompatible
     * with Guaranteed Messaging. The queue browser is disabled until a compatible session
     * is available.
     */
    [solace.QueueBrowserEventName.GM_DISABLED]: () => void;
    /**
     * The queue browser is being disposed. No further events will be emitted.
     */
    [solace.QueueBrowserEventName.DISPOSED]: () => void;
    /**
     * A message was received on the queue browser.
     *
     * If the application did not retain a reference to the message, it
     * may be redelivered by calling {@link solace.QueueBrowser#disconnect} followed by
     * {@link solace.QueueBrowser#connect} depending on the configuration of the queue.
     *
     * When there is no listener for <i>MESSAGE</i> on a QueueBrowser, messages are queued
     * internally until a listener is added.
     * @param {solace.Message} message The received message being delivered in this event.
     */
    [solace.QueueBrowserEventName.MESSAGE]: (message: solace.Message) => void;
  }
  /**
   * Represents authentication scheme enumeration.
   */
  enum MessagePublisherAcknowledgeMode {
    /**
     * Applications receive an acknowledgement for every
     * message.
     */
    PER_MESSAGE = "PER_MESSAGE",
    /**
     * Applications receive a windowed acknowledgement that
     * acknowledges the returned correlation identifier and every message sent prior.
     */
    WINDOWED = "WINDOWED"
  }
  /**
   * An attribue of a {@link solace.Message}. Applications receive messages due to subscriptions on
   * topics, or consumers connected to durable objects.  The MessageCacheStatus of such messages is:
   * {@link solace.MessageCacheStatus.LIVE}.
   *
   * Message are also delivered to an application
   * as a result of a cache request (see {@link solace.CacheSession#sendCacheRequest}) which
   * have a MessageCacheStatus that is {@link solace.MessageCacheStatus.CACHED} or
   * {@link solace.MessageCacheStatus.SUSPECT}.
   *
   * The MessageCacheStatus is retrieved with {@link solace.Message#getCacheStatus}.
   */
  enum MessageCacheStatus {
    /**
     * The message is live.
     */
    LIVE = 0,
    /**
     * The message was retrieveed from a solCache Instance.
     */
    CACHED = 1,
    /**
     * The message was retrieved from a suspect solCache Instance.
     */
    SUSPECT = 2
  }
  /**
   * Represents an enumeration of message delivery modes.
   */
  enum MessageDeliveryModeType {
    /**
     * This mode provides at-most-once message delivery. Direct messages have
     * the following characteristics:
     *   * They are not retained for clients that are not connected to a Solace Message Router.
     *   * They can be discarded when congestion or system failures are encountered.
     *   * They can be reordered in the event of network topology changes.
     *
     * Direct messages are most appropriate for messaging applications that require very
     * high-rate or very low-latency message transmission. Direct Messaging enables
     * applications to efficiently publish messages to a large number of clients
     * with matching subscriptions.
     */
    DIRECT = 0,
    /**
     * A Persistent delivery mode is used for Guaranteed Messaging, and this delivery mode
     * is most appropriate for applications that require persistent storage of the messages
     * they send or intend to receive. Persistent messages have the following characteristics:
     *
     *  * They cannot be discarded or lost (once they are acknowledged by the Solace Message Router).
     *  * They cannot be reordered in the event of network topology changes.
     *  * They cannot be delivered more than once to a single client (unless the redelivered
     *    message flag is applied).
     *  * When they match subscriptions on durable endpoints, they are retained for a client
     *    when that client is not connected.
     *
     * Persistent messages are most appropriate for applications that require persistent storage
     * of the messages they send or intend to receive.
     */
    PERSISTENT = 1,
    /**
     * This mode is functionally the same as Persistent. It exists to facilitate interaction
     * with JMS applications. In most situations where you want to use Guaranteed Messaging,
     * it is recommended that you use {@link solace.MessageDeliveryModeType.PERSISTENT}.
     */
    NON_PERSISTENT = 2
  }
  /**
   * Represents an enumeration of message dump formats. It controls
   * the output of {@link solace.Message#dump}.
   */
  enum MessageDumpFlag {
    /**
     * Display only the length of the binary attachment, XML content and user property maps.
     */
    MSGDUMP_BRIEF = 0,
    /**
     * Display the entire message contents.
     */
    MSGDUMP_FULL = 1
  }
  /**
   * Represents an enumeration of message payload types
   * (see {@link solace.Message#getBinaryAttachment})
   *
   * A message may contain unstructured byte data, or a structured container.
   */
  enum MessageType {
    /**
     * Binary message (unstructured bytes stored in the binary attachment message part).
     */
    BINARY = 0,
    /**
     * Structured map message.
     */
    MAP = 1,
    /**
     * Structured stream message.
     */
    STREAM = 2,
    /**
     * Structured text message.
     */
    TEXT = 3
  }
  /**
   * Represents an enumeration of user Class of Service (COS) levels. The COS is set
   * on a Message with {@link solace.Message#setUserCos}
   * The Class of Service has different semantics for direct and guaranteed messages.
   *
   * For messages published with {@link solace.MessageDeliveryModeType.DIRECT}, the
   * class of service selects the weighted round-robin delivery queue when the
   * message is forwarded to a consumer.  {@link solace.MessageUserCosType.COS1} are the
   * lowest priority messages and will use the Solace Message Router D-1 delivery queues.
   *
   * For messages published as guaranteed messages
   * ({@link solace.MessageDeliveryModeType.PERSISTENT} or
   * {@link solace.MessageDeliveryModeType.NON_PERSISTENT}), messages published
   * with {@link solace.MessageUserCosType.COS1} can be rejected by the Solace Message Router if
   * that message would cause any queue or topic-endpoint to exceed its configured
   * low-priority-max-msg-count.
   */
  enum MessageUserCosType {
    /**
     * Direct Messages: Lowest priority, use Solace Message Router client D-1 queues for delivery.
     *
     * Guaranteed Messages: Messages can be rejected if the message would cause any
     * queue or topic-endpoint to exceed its configured <i>low-priority-max-msg-count</i>.
     */
    COS1 = 0,
    /**
     * Direct Messages: Medium priority, use Solace Message Router client D-2 queues for delivery.
     *
     * Guaranteed Messages: N/A (same as COS3)
     */
    COS2 = 1,
    /**
     * Direct Messages: Highest priority, use Solace Message Router client D-3 queues for delivery.
     *
     * Guaranteed Messages: Messages are not rejected for exceeding <i>low-priority-max-msg-count</i>.
     * Messages may still be rejected for other reasons such as Queue 'Spool Over Quota'.
     */
    COS3 = 2
  }
  /**
   * Represents the possible endpoint access types. The corresponding endpoint property is
   * {@link solace.QueueProperties#accessType}.
   */
  enum QueueAccessType {
    /**
     * An exclusive endpoint. The first client to bind
     * receives the stored messages on the Endpoint.
     */
    EXCLUSIVE = "EXCLUSIVE",
    /**
     * A non-exclusive (shared) Queue. Each client to bind
     * receives messages in a round robin fashion.
     */
    NONEXCLUSIVE = "NONEXCLUSIVE"
  }
  /**
   * Enumerates the behavior options when a message cannot be added to an endpoint
   * (for example, the maximum quota {@link solace.QueueProperties#quotaMB} was exceeded).
   */
  enum QueueDiscardBehavior {
    /**
     * Send the publisher a message reject notification.
     */
    NOTIFY_SENDER_ON = "NOTIFY_SENDER_ON",
    /**
     * Discard the message and acknowledge it.
     */
    NOTIFY_SENDER_OFF = "NOTIFY_SENDER_OFF"
  }
  /**
   * Represents the permissions applicable to a queue.
   *
   * The corresponding endpoint property is
   * {@link solace.QueueProperties#permissions}.
   *
   * The access controls:
   *  * the permissions for all other users of the queue, this only applies to
   *  non-durable queues {@link solace.QueueProperties#permissions};
   *  * for the current Message Consumer  on a queue or endpoint,
   *    {@link solace.MessageConsumer.permissions}
   *
   * For example, creating a temporary topic endpoint with MODIFY_TOPIC will allow
   * other users to modify the topic subscribed to that endpoint.
   */
  enum QueuePermissions {
    /**
     * No client other than the queue's owner may access the endpoint.
     */
    NONE = "NONE",
    /**
     * Client may read messages but not consume them.
     */
    READ_ONLY = "READ_ONLY",
    /**
     * Client may read and consume messages.
     */
    CONSUME = "CONSUME",
    /**
     * Client may read and consume messages, and modify topic(s) associated with the
     * queue.
     */
    MODIFY_TOPIC = "MODIFY_TOPIC",
    /**
     * Client may read and consume messages, modify topic(s) associated with the
     * queue, and delete the queue.
     */
    DELETE = "DELETE"
  }
  /**
   * Specifies the type of remote resource to which an
   * {@link solace.AbstractQueueDescriptor} refers.
   */
  enum QueueType {
    /**
     * The queue descriptor refers to a queue endpoint.
     */
    QUEUE = "QUEUE",
    /**
     * The queue descriptor refers to a topic endpoint.
     */
    TOPIC_ENDPOINT = "TOPIC_ENDPOINT"
  }
  /**
   * An enumeration of all SDT data types.
   */
  enum SDTFieldType {
    /**
     * Maps to a boolean.
     */
    BOOL = 0,
    /**
     * Maps to a number.
     */
    UINT8 = 1,
    /**
     * Maps to a number.
     */
    INT8 = 2,
    /**
     * Maps to a number.
     */
    UINT16 = 3,
    /**
     * Maps to a number.
     */
    INT16 = 4,
    /**
     * Maps to a number.
     */
    UINT32 = 5,
    /**
     * Maps to a number.
     */
    INT32 = 6,
    /**
     * Maps to a number. <br>
     * <strong>Warning:</strong> Supports 48-bit integers (range: 0 to 2<sup>48</sup>-1).
     * When decoding, only the lower 48 bits are considered significant.
     */
    UINT64 = 7,
    /**
     * Maps to a number. <br>
     * <strong>Warning:</strong> Supports 48-bit integers + sign (range: -(2<sup>48</sup>-1) to
     * 2<sup>48</sup>-1). When decoding, only the lower 48 bits are considered significant.
     */
    INT64 = 8,
    /**
     * A single character; maps to a string.
     */
    WCHAR = 9,
    /**
     * Maps to a string.
     */
    STRING = 10,
    /**
     * Maps to a Uint8Array.
     *
     * Backward compatibility note:
     * Using the version_10 factory profile or older, the getValue() method of a BYTEARRAY sdtField
     * returns the byte array in 'latin1' String representation.
     * Later profiles return a Uint8Array (in the form of a nodeJS Buffer instance in fact)
     *
     * When creating a field of type BYTEARRAY, the following datatypes are all accepted as value:
     *   Buffer (the nodeJS native type or equivalent)
     *   ArrayBuffer,
     *   Any DataView or TypedArray,
     *   'latin1' String for backwards compatibility:
     *     each character has a code in the range 0-255
     *     representing exactly one byte in the attachment.
     */
    BYTEARRAY = 11,
    /**
     * Single-precision float; maps to a number.
     */
    FLOATTYPE = 12,
    /**
     * Double-precision float; maps to a number.
     */
    DOUBLETYPE = 13,
    /**
     * Maps to {@link SDTMapContainer}.
     */
    MAP = 14,
    /**
     * Maps to {@link SDTStreamContainer}.
     */
    STREAM = 15,
    /**
     * Maps to {@link Destination}.
     */
    DESTINATION = 16,
    /**
     * Maps to <code>null</code>.
     */
    NULLTYPE = 17,
    /**
     * Maps to an unknown type.
     */
    UNKNOWN = 18,
    /**
     * Maps to an encoded SMF message.
     */
    SMF_MESSAGE = 19
  }
  /**
   * Enumeration of {@link solace.SDTUnsuportedValueError} causes.
   */
  enum SDTValueErrorSubcode {
    /**
     * The value for this field may be valid on other platforms, but is outside the
     * range that is supported on this platform for the given type.
     */
    VALUE_OUTSIDE_SUPPORTED_RANGE = 1
  }
  /**
   * Represents authentication schemes that can be used. The corresponding session
   * property is {@link solace.SessionProperties#authenticationScheme}.
   */
  enum AuthenticationScheme {
    /**
     * Username/Password based authentication scheme.
     */
    BASIC = "AuthenticationScheme_basic",
    /**
     * Client-side certificate based authentication scheme.  The certificate and
     *   private key are provided by the browser.
     */
    CLIENT_CERTIFICATE = "AuthenticationScheme_clientCertificate",
    AUTHENTICATION_SCHEME_BASIC = "AuthenticationScheme_basic",
    AUTHENTICATION_SCHEME_CLIENT_CERTIFICATE = "AuthenticationScheme_clientCertificate",
    /**
     * Oauth2 authentication scheme.
     */
    OAUTH2 = "AuthenticationScheme_oauth2"
  }
  /**
   * Represents an enumeration of peer capabilities.
   */
  enum CapabilityType {
    /**
     * Peer's software load version. Type: string.
     */
    PEER_SOFTWARE_VERSION = 0,
    /**
     * Peer's software release date. Type: string.
     */
    PEER_SOFTWARE_DATE = 1,
    /**
     * Peer's platform. Type: string.
     */
    PEER_PLATFORM = 2,
    /**
     * Speed (in Mbps) of the port the client connects to. Type: number.
     */
    PEER_PORT_SPEED = 3,
    /**
     * Type of the port the client has connected to (currently 0: Ethernet). Type: number.
     */
    PEER_PORT_TYPE = 4,
    /**
     * Maximum size of a Direct message (in bytes), including all optional message headers and data.
     * Type: number.
     */
    MAX_DIRECT_MSG_SIZE = 5,
    /**
     * Peer's router name. Type: string.
     *
     * This property is useful when sending SEMP requests to a peer's SEMP topic, which may be
     * constructed as `#P2P/routername/#client/SEMP`.
     */
    PEER_ROUTER_NAME = 6,
    /**
     * Peer supports message eliding. Type: boolean.
     */
    MESSAGE_ELIDING = 7,
    /**
     * Peer supports NoLocal option (client may avoid receiving messages published by itself).
     */
    NO_LOCAL = 8,
    /**
     * Peer supports Guaranteed Message Consumer connections for receiving guaranteed messages.
     */
    GUARANTEED_MESSAGE_CONSUME = 9,
    /**
     * Peer supports temporary endpoints.
     */
    TEMPORARY_ENDPOINT = 10,
    /**
     * Peer supports Guaranteed Message Publisher connections for sedning guaranteed messages.
     */
    GUARANTEED_MESSAGE_PUBLISH = 11,
    /**
     * Peer supports Guaranteed Messages Browser connections for receiving guaranteed messages
     */
    GUARANTEED_MESSAGE_BROWSE = 12,
    /**
     * Peer supports creating/modify/disposing endpoints.
     */
    ENDPOINT_MGMT = 13,
    /**
     * Peer supports selectors on Guaranteed Message Consumers.
     */
    SELECTOR = 14,
    /**
     * Maximum size of a Direct message (in bytes), including all optional message headers and data.
     * Type: number.
     */
    MAX_GUARANTEED_MSG_SIZE = 15,
    /**
     * Peer supports Guaranteed Messaging Consumer state change updates. Type: boolean
     */
    ACTIVE_CONSUMER_INDICATION = 16,
    /**
     * Peer accepts compressed (DEFLATE) data. Type: boolean.
     */
    COMPRESSION = 17,
    /**
     * Peer supports Guaranteed Messaging cut-through. Type: boolean
     */
    CUT_THROUGH = 18,
    /**
     * Peer supports provisioned queue and topic-endpoint discard behavior. Type: boolean
     */
    ENDPOINT_DISCARD_BEHAVIOR = 19,
    /**
     * Peer supports Guaranteed Messaging message TTL and Dead-Message Queues. Type: boolean
     */
    ENDPOINT_MESSAGE_TTL = 20,
    /**
     * Peer accepts JNDI queries. Type: boolean.
     */
    JNDI = 21,
    /**
     * Peer supports per topic sequence numbering for Guaranteed Messaging messages. Type: boolean
     */
    PER_TOPIC_SEQUENCE_NUMBERING = 22,
    /**
     * Peer supports QueueSubscriptionAdd for managing subscriptions on queue endpoints.
     * Type: boolean
     */
    QUEUE_SUBSCRIPTIONS = 23,
    /**
     * Peer supports add/remove subscriptions for a specified clientName. Type: boolean
     */
    SUBSCRIPTION_MANAGER = 24,
    /**
     * Peer supports transacted sessions. Type: boolean.
     */
    TRANSACTED_SESSION = 25,
    /**
     * Peer support Message Replay. Type: boolean.
     */
    MESSAGE_REPLAY = 26,
    /**
     * Peer supports TLS downgrade to compression (encrypted and plaintext) Type: boolean
     */
    COMPRESSED_SSL = 27,
    /**
     * The peer can support \#share and \#noexport subscriptions
     * Type: Boolean
     */
    SHARED_SUBSCRIPTIONS = 28,
    /**
     * The EndpointErrorId in replay bind responses can be trusted.
     */
    BR_REPLAY_ERRORID = 29
  }
  /**
   * Represents an enumeration of client capabilities.
   * These are sent in the ClientCtrl login messages.
   */
  enum ClientCapabilityType {
    /**
     * Client implements acknowledgements to router unsolicited unbinds.
     * Always true.
     */
    UNBIND_ACK = 0,
    /**
     * Indicates whether a client will process an EndpointErrorId in a BindResponse message.
     * Always true
     */
    BR_ERRORID = 1
  }
  /**
   * Represents an enumeration of session properties that can be modified by
   * {@link solace.Session.updateProperty} after the {@link solace.Session} is originally
   * created.
   *
   * These correspond to session properties in {@link solace.SessionProperties}.
   */
  enum MutableSessionProperty {
    /**
     * Client name: {@link solace.SessionProperties#clientName}
     */
    CLIENT_NAME = 1,
    /**
     * Application description: {@link solace.SessionProperties#applicationDescription}
     */
    CLIENT_DESCRIPTION = 2
  }
  /**
   * An attribute of {@link SessionEvent}. This enumeration represents the
   * different events emitted by {@link Session} through the session event
   * callback.
   *
   * When a session is no longer in a usable state, the API tears down the underlying
   * connection and notifies the application with one of the following session events:
   *  * {@link solace.SessionEventCode#event:DOWN_ERROR}
   *  * {@link solace.SessionEventCode#event:CONNECT_FAILED_ERROR}
   */
  enum SessionEventCode {
    UP_NOTICE = 0,
    DOWN_ERROR = 1,
    CONNECT_FAILED_ERROR = 2,
    REJECTED_MESSAGE_ERROR = 4,
    SUBSCRIPTION_ERROR = 5,
    SUBSCRIPTION_OK = 6,
    VIRTUALROUTER_NAME_CHANGED = 7,
    REQUEST_ABORTED = 8,
    REQUEST_TIMEOUT = 9,
    PROPERTY_UPDATE_OK = 10,
    PROPERTY_UPDATE_ERROR = 11,
    CAN_ACCEPT_DATA = 13,
    DISCONNECTED = 14,
    RECONNECTING_NOTICE = 22,
    RECONNECTED_NOTICE = 23,
    REPUBLISHING_UNACKED_MESSAGES = 24,
    ACKNOWLEDGED_MESSAGE = 25,
    UNSUBSCRIBE_TE_TOPIC_OK = 26,
    UNSUBSCRIBE_TE_TOPIC_ERROR = 27,
    MESSAGE = 28,
    GUARANTEED_MESSAGE_PUBLISHER_DOWN = 29
  }
  /**
   * Effectively a boolean governing TLS downgrade to plain text after authentication.
   */
  enum SslDowngrade {
    /**
     * No downgrade, TLS connection remains encrypted.
     */
    NONE = "NONE",
    /**
     * TLS connection downgrades to plain text after authentication.
     * USE WITH CAUTION! Message traffic is not encrypted!
     */
    PLAINTEXT = "PLAIN_TEXT"
  }
  /**
   * solace.CacheLiveDataAction
   * Enumeration of CacheLiveDataAction values, specifying how the CacheSession should handle
   * live data associated with a cache request in progress.
   */
  enum CacheLiveDataAction {
    /**
     * End the cache request when live data arrives that matches the topic.
     * Note that wildcard cache requests must always be {@link CacheLiveDataAction.FLOW_THRU}.
     */
    FULFILL = 1,
    /**
     * Queue arriving live data that matches the topic, until the cache request
     * completes. Note that wildcard cache requests must always be {@link
     * solace.CacheLiveDataAction.FLOW_THRU}.
     */
    QUEUE = 2,
    /**
     * Continue the outstanding cache request while allowing live data to flow through to
     * the application.
     * Note that wildcard cache requests must always be {@link CacheLiveDataAction.FLOW_THRU}.
     */
    FLOW_THRU = 3
  }
  /**
   * Enumeration of CacheReturnCode types.  The method {@link solace.CacheRequestResult#getReturnCode}
   * returns on of these basic results of a cache request.  More details are available in the
   * associated {@link solace.CacheReturnSubcode}, retrieved by
   * {@link solace.CacheRequestResult#getReturnSubcode}.
   */
  enum CacheReturnCode {
    /**
     * The cache request succeeded.  See the subcode for more information.
     */
    OK = 1,
    /**
     * The cache request was not processed.  See the subcode for more information.
     */
    FAIL = 2,
    /**
     * The cache request was processed but could not be completed.  See the subcode for
     * more information.
     */
    INCOMPLETE = 3
  }
  /**
   * Enumeration of CacheReturnSubcode types.
   */
  enum CacheReturnSubcode {
    /**
     * The cache request completed successfully.
     */
    REQUEST_COMPLETE = 0,
    /**
     * The cache request completed when live data arrived on the topic requested.
     */
    LIVE_DATA_FULFILL = 1,
    /**
     * The cache instance or session returned an error response to the cache request.
     */
    ERROR_RESPONSE = 2,
    /**
     * The cache request failed because the {@link Session} used to construct it has been
     * disposed.
     */
    INVALID_SESSION = 3,
    /**
     * The cache request failed because the request timeout expired.
     */
    REQUEST_TIMEOUT = 4,
    /**
     * The cache request was made on the same topic as an existing request, and
     * {@link CacheLiveDataAction.FLOW_THRU} was not set.
     */
    REQUEST_ALREADY_IN_PROGRESS = 5,
    /**
     * The cache reply returned no data.
     */
    NO_DATA = 6,
    /**
     * The cache reply returned suspect data.
     */
    SUSPECT_DATA = 7,
    /**
     * The request was terminated because the cache session was disposed.
     */
    CACHE_SESSION_DISPOSED = 8,
    /**
     * The request was terminated because the subscription request for the specified topic failed.
     */
    SUBSCRIPTION_ERROR = 9
  }
  /**
   * Statistics for sent/received messages and control operations.
   */
  enum StatType {
    /**
     * Count of bytes sent as part of data messages.
     */
    TX_TOTAL_DATA_BYTES = 0,
    /**
     * Count of data messages sent.
     */
    TX_TOTAL_DATA_MSGS = 1,
    /**
     * Count of bytes sent as part of direct data messages.
     */
    TX_DIRECT_BYTES = 2,
    /**
     * Count of direct data messages sent.
     */
    TX_DIRECT_MSGS = 3,
    /**
     * Count of bytes sent as part of control messages.
     */
    TX_CONTROL_BYTES = 4,
    /**
     * Count of control messages sent.
     */
    TX_CONTROL_MSGS = 5,
    /**
     * Count of request messages sent.
     */
    TX_REQUEST_SENT = 6,
    /**
     * Count of request timeouts that occurred.
     */
    TX_REQUEST_TIMEOUT = 7,
    /**
     * Count of bytes received as part of data messages.
     */
    RX_TOTAL_DATA_BYTES = 8,
    /**
     * Count of data messages received.
     */
    RX_TOTAL_DATA_MSGS = 9,
    /**
     * Count of bytes received as part of direct data messages.
     */
    RX_DIRECT_BYTES = 10,
    /**
     * Count of direct data messages received.
     */
    RX_DIRECT_MSGS = 11,
    /**
     * Count of bytes received as part of control messages.
     */
    RX_CONTROL_BYTES = 12,
    /**
     * Count of control messages received.
     */
    RX_CONTROL_MSGS = 13,
    /**
     * Count discard message indications received on incoming messages.
     */
    RX_DISCARD_MSG_INDICATION = 14,
    /**
     * Count of reply messaged received.
     */
    RX_REPLY_MSG_RECVED = 15,
    /**
     * Count of received reply messages that were discarded.
     */
    RX_REPLY_MSG_DISCARD = 16,
    /**
     * Count of messages discarded due to the presence of an unknown element or
     * unknown protocol in the SMF header.
     */
    RX_DISCARD_SMF_UNKNOWN_ELEMENT = 17,
    /**
     * Count of cache requests sent. One conceptual request (i.e. one API call)
     * may involve many requests and replies.
     */
    CACHE_REQUEST_SENT = 18,
    /**
     * Count of OK responses to cache requests.
     */
    CACHE_REQUEST_OK_RESPONSE = 19,
    /**
     * Count of cache requests that returned a failure response.
     */
    CACHE_REQUEST_FAIL_RESPONSE = 20,
    /**
     * Count of cache replies discarded because a request has been fulfilled.
     */
    CACHE_REQUEST_FULFILL_DISCARD_RESPONSE = 21,
    /**
     * Count of cached messages delivered to the application.
     */
    RX_CACHE_MSG = 22,
    /**
     * Count of cache requests that were incomplete.
     */
    CACHE_REQUEST_INCOMPLETE_RESPONSE = 23,
    /**
     * The cache session operation completed when live data arrived on the requested topic.
     */
    CACHE_REQUEST_LIVE_DATA_FULFILL = 24,
    /**
     * Count of bytes sent as part of persistent data messages.
     */
    TX_PERSISTENT_BYTES = 25,
    /**
     * Count of persistent data messages sent.
     */
    TX_PERSISTENT_MSGS = 26,
    /**
     * Count of non-persistent data bytes sent.
     */
    TX_NONPERSISTENT_BYTES = 27,
    /**
     * Count of non-persistent data messages sent.
     */
    TX_NONPERSISTENT_MSGS = 28,
    /**
     * The number of bytes redelivered in Persistent messages.
     */
    TX_PERSISTENT_BYTES_REDELIVERED = 29,
    /**
     * The number of Persistent messages redelivered.
     */
    TX_PERSISTENT_REDELIVERED = 30,
    /**
     * The number of bytes redelivered in Non-Persistent messages.
     */
    TX_NONPERSISTENT_BYTES_REDELIVERED = 31,
    /**
     * The number of Non-Persistent messages redelivered.
     */
    TX_NONPERSISTENT_REDELIVERED = 32,
    /**
     * The number of acknowledgments received.
     */
    TX_ACKS_RXED = 33,
    /**
     * The number of times the transmit window closed.
     */
    TX_WINDOW_CLOSE = 34,
    /**
     * The number of times the acknowledgment timer expired.
     */
    TX_ACK_TIMEOUT = 35,
    /**
     * Count of bytes received as part of persistent data messages.
     */
    RX_PERSISTENT_BYTES = 36,
    /**
     * Count of persistent data messages received.
     */
    RX_PERSISTENT_MSGS = 37,
    /**
     * Count of bytes received as part of non-persistent data messages.
     */
    RX_NONPERSISTENT_BYTES = 38,
    /**
     * Count of non-persistent data messages received.
     */
    RX_NONPERSISTENT_MSGS = 39,
    /**
     * Count of acknowledgements sent to the Solace Message Router
     * for guaranteed messages received by the API.
     */
    RX_ACKED = 40,
    /**
     * Count of guaranteed messages discarded for being duplicates.
     */
    RX_DISCARD_DUPLICATE = 41,
    /**
     * Count of guaranteed messages discarded due to no match message consumer for the message.
     */
    RX_DISCARD_NO_MATCHING_CONSUMER = 42,
    /**
     * Count of guaranteed messages discarded for being received out of order.
     */
    RX_DISCARD_OUT_OF_ORDER = 43
  }
  /**
   * The collection of predefined factory profiles available for application use.
   *
   * See each member for a description of its configuration.
   */
  enum SolclientFactoryProfiles {
    /**
     * The version 7 profile for Node.JS. {@link solace.SolclientFactoryProfiles.version7}
     *
     * A version 7 profile configures API defaults for interoperability with the
     * SolclientJS 7.x API, and applications that use it.
     *
     * {@link solace.SolclientFactoryProfiles.version7}
     */
    version7 = "version7",
    /**
     * The version 10 profile for Node.JS.
     *
     * The version 10 profile configures API defaults for use with Guaranteed Messaging, and other
     * Solace Messaging APIs.
     * It provides a backwards-compatibility mode for existing applications
     * expecting SDTField.getValue() to return a string for BYTEARRAYs.
     *
     * {@link solace.SolclientFactoryProfiles.version10}
     */
    version10 = "version10",
    /**
     * The version 10.5 profile for Node.JS.
     *
     * The version 10.5 profile configures API defaults for use with Guaranteed Messaging, and other
     * Solace Messaging APIs.
     *
     * {@link solace.SolclientFactoryProfiles.version10_5}
     */
    version10_5 = "version10_5"
  }
  /**
   * A singleton used as the main factory for the messaging APIs. The very first operation by
   * any application must be to initialize the API:
   * * {@link solace.SolclientFactory.init}
   *
   * <i>SolclientFactory</i> provides methods to construct:
   * * {@link solace.Session}
   * * {@link solace.Message}
   * * {@link solace.Destination}
   *
   * Additionally <i>SolclientFactory</i> manages the
   * logging level in the API.
   */
  namespace SolclientFactory {
    /**
     * Creates a topic {@link solace.Destination} instance. When the returned Destination is set as
     * the destination of a message via {@link solace.Message#setDestination}, the message will be
     * delivered to direct subscribers or topic endpoints subscribed to the given topic.
     * @param {string} topicName The topic string for the new topic.
     * @returns {solace.Destination} The newly created topic destination.
     */
    function createTopicDestination(topicName: string): solace.Destination;
    /**
     * Creates a durable queue {@link solace.Destination} instance. When the returned Destination is
     * set as the destination of a message via {@link solace.Message#setDestination}, the message will
     * be delivered to the Guaranteed Message queue on the Solace Message Router of the same name.
     * @param {string} queueName The queueName of the queue
     * @returns {solace.Destination} The newly created queue destination.
     */
    function createDurableQueueDestination(
      queueName: string
    ): solace.Destination;
    /**
* Initialize global properties. This function must be called before any other API call is made.
* 
* Note: After the first call to this method, subsequent calls have no effect.
* @param {solace.SolclientFactoryProperties} factoryProps The initialization properties for
 the factory, if required.
* @param {solace.LogImpl} factoryProps.logger A logging implementation
* @param {solace.LogLevel} factoryProps.logLevel The logging level to use
 for filtering log events.
* @param {solace.SolclientFactoryProfiles} factoryProps.profile The factory profile. This class cannot be created by an API user; choose one of the static
    instances from {@link solace.SolclientFactoryProfiles}.
* @returns {typeof solace.SolclientFactory} For method chaining
* @throws {solace.OperationError} Invalid logger implementation
*/
    function init(
      factoryProps?: solace.SolclientFactoryProperties
    ): typeof solace.SolclientFactory;
    /**
     * Gets the current log level, which was set by {@link solace.SolclientFactory.init} or a
     * subsequent call to {@link solace.SolclientFactory.setLogLevel}.
     * @returns {solace.LogLevel} The current log level.
     */
    function getLogLevel(): solace.LogLevel;
    /**
     * This method changes the current log level from the level set when
     * {@link solace.SolclientFactory.init} was called.
     * @param {solace.LogLevel} newLevel The new log level to set.
     * @throws {solace.OperationError} Invalid log level
     */
    function setLogLevel(newLevel: solace.LogLevel): void;
    /**
     * Creates a {@link solace.Message} instance.
     * @returns {solace.Message} a new message instance.
     */
    function createMessage(): solace.Message;
    /**
* Creates a {@link solace.ReplicationGroupMessageId} instance from string.
* A ReplicationGroupMessageId is also a {@link solace.ReplayStartLocation} instance that
* when set in MessageConsumerProperties indicates that only messages spooled
* in the replay log since the message after the given ReplicationGroupMesageId
* should be replayed.
* @param {string} id a serialized ReplicationGroupMessageId had previously been returned
  from {@link solace.ReplicationGroupMessageId.toString}.
* @returns {solace.ReplicationGroupMessageId} a new ReplicationGroupMessageId instance
* @throws {solace.OperationError} * if parameter is not a string.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_INVALID_TYPE}.
* if incorrect format is detected.
  Subcode: {@link solace.ErrorSubcode.PARAMETER_OUT_OF_RANGE}.
*/
    function createReplicationGroupMessageId(
      id: string
    ): solace.ReplicationGroupMessageId;
    /**
     * Creates a ReplayStartLocation {@link solace.ReplayStartLocation} instance that
     * when set in MessageConsumerProperties indicates that all messages available
     * in the replay log should be retrieved.
     * @returns {solace.ReplayStartLocation} The newly created ReplayStartLocation
     */
    function createReplayStartLocationBeginning(): solace.ReplayStartLocation;
    /**
* Creates a ReplayStartLocation {@link solace.ReplayStartLocation} instance that
* when set in MessageConsumerProperties indicates that only messages spooled
* in the replay log since the given Date should be retrieved.
* @param {Date} dateTime The Date object the represents the date and time of the replay
start location.  dateTime is always converted to UTC time if not already a UTC time.
* @returns {solace.ReplayStartLocation} The newly created ReplayStartLocation
*/
    function createReplayStartLocationDate(
      dateTime: Date
    ): solace.ReplayStartLocation;
    /**
* Creates a session instance.
* @param {solace.SessionProperties} sessionProperties Properties to configure the session.
* @returns {solace.Session} The newly-created session.
* @throws {solace.OperationError} if the parameters have an invalid type or value.
                         Subcode: {@link ErrorSubcode.PARAMETER_INVALID_TYPE}.
*/
    function createSession(
      sessionProperties: solace.SessionProperties
    ): solace.Session;
  }
  /**
   * Returns the API version. Use version, date and mode properties for build details.
   * Use the summary property or the .toString() method to return a summary.
   */
  namespace Version {
    /**
     * The API version, as an informational string. The format of this string is subject to change.
     */
    var version: string;
    /**
     * The API build date.
     */
    var date: Date;
    /**
     * The API build date, as a formatted string.
     * The format of this date is:
     * `YYYY-MM-DD hh:mm`
     * where
     *  * `YYYY` is the 4-digit year,
     *  * `MM` is the 2-digit month   (01-12),
     *  * `DD` is the 2-digit day     (01-31),
     *  * `hh` is the 2-digit hour    (00-23),
     *  * `mm` is the 2-digit minute  (00-59)
     */
    var formattedDate: string;
    /**
     * Information about the build target. This object is informational; its type, structure and
     * content are subject to change.
     */
    var target: object;
    /**
     * The build mode. This may be one of 'debug' or 'release'. Other build modes may be added
     * in the future.
     */
    var mode: string;
    /**
     * If `true`, this is an unoptimized debug build.
     */
    var debug: boolean;
    /**
     * If `true`, this is an optimized release build. Note that there may be multiple release
     * builds in a distribution, with varying degrees of optimization.
     */
    var release: boolean;
    /**
     * An informational string summarizing the API name, version and build date.
     */
    var summary: string;
  }
}
export = solace;
