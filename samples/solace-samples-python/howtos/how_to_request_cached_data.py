"""
This module contains example snippets on how to request cached data from a cache, through a direct receiver. These
examples assume that the direct receiver has already been started, and that it was created from a messaging service
which has already been connected.
"""

from solace.messaging.utils.cache_request_outcome_listener import CacheRequestOutcomeListener
from solace.messaging.utils.cache_request_outcome import CacheRequestOutcome
from solace.messaging.resources.topic_subscription import TopicSubscription
from solace.messaging.resources.cached_message_subscription_request import CachedMessageSubscriptionRequest

class MyCacheRequestOutcomeListener(CacheRequestOutcomeListener):
    def on_completion(result: CacheRequestOutcome, correlation_id: int, e: Exception):
        print("Completed!")

class HowToUseCachedMessageSubscriptionRequests:
    """
    Sampler for making cache requests. Usage of cache subscriptions require
    configuration and hosting of PubSub+ Cache application.
    """
    def create_subscription_request_to_receive_cached_and_live_messages(subscription_expression: str,
                                                                        cache_name: str,
                                                                        cache_access_timeout: int,
                                                                        direct_message_receiver: 'DirectMessageReceiver'):
        """
        An example how to create and perform CachedMessageSubscriptionRequest to receive a
        mix of live and cached messages matching specified topic subscription.
        Args:
            subscription_expression(str): topic subscription expression
            cache_name(str): name of the solace cache to retrieve from
            cache_access_timeout(int): solace cache request timeout, in milliseconds
            direct_message_receiver(DirectMessageReceiver): an already configured and connected receiver

        Raises:
            InterruptedException: if any thread has interrupted the current thread
            PubSubPlusClientException: if the operation could not be performed, i.e. when
            cache request failed and subscription rolled back/removed
            IllegalStateException: If the service is not running
        """
        cached_message_subscription_request = CachedMessageSubscriptionRequest.asAvailable(cache_name,
                                                                                           TopicSubscription.of(subscription_expression),
                                                                                           cache_access_timeout)
        correlation_id = 1
        cache_request_outcome_listener = MyCacheRequestOutcomeListener()

        direct_message_receiver.request_cached(cached_message_subscription_request, correlation_id, cache_request_outcome_listener)

    def create_subscription_request_to_receive_latest_message(direct_message_receiver: 'DirectMessageReceiver',
                                                              subscription_expression: str,
                                                              cache_name: str,
                                                              cache_access_timeout: int):
        """
        An example of how to create and perform CachedMessageSubscriptionRequest to receive latest messages. When no live
        messages are available, cached messages matching specified topic subscription considered latest, live messages otherwise.
        When live messages are available then cached messages are discarded.

        Args:
            direct_message_receiver(DirectMessageReceiver): An already configured and connected receiver.
            subscription_expression(str): Topic subscription expression.
            cache_name(str): name of the solace cache to retrieve from
            cache_access_timeout(int): Solace cache request timeout, in milliseconds

        Raises:
            InterruptedException: If any thread has interrupted the current thread
            PubSubPlusClientException: If the operation could not be performed
            IllegalStateException: If the service is not running
        """
        cached_message_subscription_request_for_latest_of_cached_or_live_messages = \
            CachedMessageSubscriptionRequest.live_cancels_cached(cache_name,
                                                                 TopicSubscription.of(subscriptionExpression),
                                                                 cache_access_timeout)

        correlation_id = 2
        cache_request_outcome_listener = MyCacheRequestOutcomeListener()

        direct_message_receiver.request_cached(cached_message_subscription_request_for_latest_of_cached_or_live_messages,
                                       correlation_id,
                                       cache_request_outcome_listener)

    def create_cached_subscription_with_more_options(direct_message_receiver: 'DirectMessageReceiver',
                                                     subscription_expression: 'SubscriptionExpression',
                                                     cache_name: str,
                                                     cache_access_timeout: int,
                                                     max_cached_messages: int,
                                                     cached_message_age: int):
        """
        An example how to create and perform CachedMessageSubscriptionRequest to receive first cached
        messages when available, followed by live messages. Additional cached message properties such
        as max number of cached messages and age of a message from cache can be specified. Live messages
        will be queued until the solace cache response is received.
        Queued live messages are delivered to the application after the cached messages are delivered.
        Args:
            direct_message_receiver(DirectMessageReceiver): An already configured and connected receiver
            subscription_expression(str): topic subscription expression
            cache_name(str): Name of the solace cache to retrieve from
            cache_access_timeout(int): Solace cache request timeout, in milliseconds
            max_cached_messages(int): The max number of messages expected to be received from a Solace cache
            cached_message_age(int): The maximum age, in seconds, of the messages to retrieve from a Solace cache
        Raises:
            InterruptedException: If any thread has interrupted the current thread
            PubSubPlusClientException: If the operation could not be performed
            IllegalStateException: If the service is not running
        """
        topic = TopicSubscription.of(subscription_expression)
        subscription_to_receive_cached_followed_by_live_messages = CachedMessageSubscriptionRequest.cached_first(cache_name,
                                                                                                                 topic,
                                                                                                                 cache_access_timeout,
                                                                                                                 max_cached_messages,
                                                                                                                 cached_message_age)
        correlation_id = 3
        completion_listener = MyCacheRequestOutcomeListener()

        direct_message_receiver.request_cached(subscription_receive_cached_followed_by_live_messages, correlation_id, completion_listener)

    def create_subscription_to_receiver_only_cached_messages(direct_message_receiver: 'DirectMessageReceiver',
                                                             subscription_expression: str,
                                                             cache_name: str,
                                                             cache_access_timeout):
        """
        An example how to create and perform CachedMessageSuibscriptionRequest to receive cached messages
        only, when available; no live messages are expected to be received.
        Args:
            direct_message_receiver(DirectMessageReceiver): An already configured and connected receiver.
            subscription_expression(str): topic subscription expression
            cache_name(str): name of the solace cache to retrieve from
            cache_access_timeout(int): solace cache request timeout, in milliseconds
        Raises:
            InterruptedException: If any thread has interrupted the current thread
            PubSubPlusClientException: If the operation could not be performed
            IllegalStateException: If the service is not running
        """
        subscription_request_to_receive_only_cached_messages = CachedMessageSubscriptionRequest.cached_only(cache_name,
                                                                                                            TopicSubscription.of(subscription_expression),
                                                                                                            cache_access_timeout)
        correlation_id = 4
        completion_listener = MyCacheRequestOutcomeListener()

        direct_message_receiver.request_cached(subscription_request_to_receive_only_cached_messages, correlation_id, completion_listener)
