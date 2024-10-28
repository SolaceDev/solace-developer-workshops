"""
module for holding semp endpoint values
"""
from string import Template

GET_MSG_VPN_CLIENT_DETAILS_ENDPOINT = Template("/SEMP/v2/monitor/msgVpns/$msg_vpn_name/clients?select"
                                               "=clientName,msgVpnName,clientUsername&count=20")

GET_MESSAGE_VPN_SERVICE_SETTINGS_ENDPOINT \
    = Template("/SEMP/v2/monitor/msgVpns/$msg_vpn_name?select=msgVpnName,serviceSmfPlainTextEnabled,"
               "serviceSmfTlsEnabled,tlsAllowDowngradeToPlainTextEnabled,serviceSmfMaxConnectionCount,"
               "eventServiceSmfConnectionCountThreshold,serviceWebPlainTextEnabled,serviceWebTlsEnabled,"
               "serviceWebMaxConnectionCount,eventServiceWebConnectionCountThreshold,serviceMqttPlainTextEnabled,"
               "serviceMqttPlainTextListenPort,serviceMqttTlsEnabled,serviceMqttTlsListenPort,"
               "serviceMqttWebSocketEnabled,serviceMqttWebSocketListenPort,serviceMqttTlsWebSocketEnabled,"
               "serviceMqttTlsWebSocketListenPort,serviceMqttMaxConnectionCount,"
               "eventServiceMqttConnectionCountThreshold,mqttRetainMaxMemory,serviceRestMode,"
               "serviceRestIncomingPlainTextEnabled,serviceRestIncomingPlainTextListenPort, "
               "serviceRestIncomingTlsEnabled,serviceRestIncomingTlsListenPort,serviceRestIncomingMaxConnectionCount,"
               "eventServiceRestIncomingConnectionCountThreshold,serviceRestOutgoingMaxConnectionCount,"
               "restTlsServerCertEnforceTrustedCommonNameEnabled,restTlsServerCertMaxChainDepth,"
               "restTlsServerCertValidateDateEnabled,serviceAmqpPlainTextEnabled,serviceAmqpPlainTextListenPort,"
               "serviceAmqpTlsEnabled,serviceAmqpTlsListenPort,serviceAmqpMaxConnectionCount,"
               "eventServiceAmqpConnectionCountThreshold")

PATCH_MESSAGE_VPN_ENDPOINT = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name")

GET_SEMP_ABOUT_ENDPOINT = "/SEMP/v2/monitor/about"
GET_ALL_MSG_VPN_ENDPOINT = "/SEMP/v2/monitor/msgVpns?select=msgVpnName,state,replicationEnabled," \
                           "replicationRole," \
                           "dmrEnabled,msgSpoolCurrentQueuesAndTopicEndpoints,msgSpoolMsgCount,msgVpnConnections," \
                           "maxConnectionCount,msgVpnConnectionsServiceRestOutgoing," \
                           "serviceRestOutgoingMaxConnectionCount&count=20"

GET_ALL_USER_LIST = Template("/SEMP/v2/monitor/msgVpns/$msg_vpn_name/clientUsernames"
                             "?select=clientUsername,msgVpnName,clientProfileName,aclProfileName,enabled,"
                             "subscriptionManagerEnabled,dynamic&count=20")

create_msg_vpn_endpoint = "/SEMP/v2/config/msgVpns"
update_msg_vpn_endpoint = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name/clientProfiles/$client_profile_name")
set_client_user_name_endpoint = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name/clientUsernames")
certificate_authority_endpoint = "/SEMP/v2/config/certAuthorities"
server_certificate_endpoint = "/SEMP/v2/config"

message_vpn_authentication_endpoint = "/SEMP/v2/config/msgVpns?select=msgVpnName"
patch_client_user_name_endpoint = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name/clientUsernames"
                                           "/$client_profile_name")

post_user_creation_endpoint = "/SEMP/v2/config/usernames?select=userName"
post_map_user_to_message_vpn_endpoint = Template("/SEMP/v2/config/usernames/$username/"
                                                 "msgVpnAccessLevelExceptions?select=msgVpnName,userName")
delete_user_endpoint = Template("/SEMP/v2/config/usernames/$username")
get_client_connection_objects = Template("/SEMP/v2/monitor/msgVpns/$msg_vpn_name/clients/"
                                         "$client_name/connections")
get_client_connection_properties = Template("/SEMP/v2/monitor/msgVpns/$msg_vpn_name/clients/$client_name")

vpn_specific_user_endpoint = Template("/SEMP/v2/config/msgVpns/msg_vpn_name/clientUsernames?"
                                      "select=clientUsername,msgVpnName")

create_msg_vpn_user_endpoint = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name/clientUsernames?select"
                                        "=clientUsername,msgVpnName")

activate_msg_vpn_user_patch_endpoint = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name/clientUsernames/"
                                                "$client_user_name")
delete_msg_vpn_user_endpoint = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name/clientUsernames"
                                        "/$client_user_name")
allow_shared_subscription_endpoint = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name/clientProfiles"
                                              "/$client_profile_name")

create_queue_post_endpoint = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name/queues?select=queueName,"
                                      "msgVpnName")
create_queue_patch_endpoint = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name/queues/$queue_name")
delete_queue_endpoint = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name/queues/$queue_name")

queue_permission_change_get = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name/queues/$queue_name?select"
                                       "=msgVpnName,queueName,ingressEnabled,egressEnabled,accessType,maxMsgSpoolUsage,"
                                       "eventMsgSpoolUsageThreshold,owner,permission,maxBindCount,"
                                       "eventBindCountThreshold,maxMsgSize,maxDeliveredUnackedMsgsPerFlow,"
                                       "deadMsgQueue,respectMsgPriorityEnabled,respectTtlEnabled,maxTtl,"
                                       "maxRedeliveryCount,rejectMsgToSenderOnDiscardBehavior,"
                                       "rejectLowPriorityMsgEnabled,rejectLowPriorityMsgLimit,"
                                       "eventRejectLowPriorityMsgLimitThreshold,consumerAckPropagationEnabled")

queue_permission_change_patch = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name/queues/$queue_name")

queue_permission_change_patch_engress_enable = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name/queues"
                                                        "/$queue_name")

create_topic_on_queue_post_endpoint = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name/queues/$queue_name"
                                               "/subscriptions?select=subscriptionTopic,msgVpnName,queueName")

create_topic_on_queue_get_endpoint = Template("/SEMP/v2/monitor/msgVpns/$msg_vpn_name/queues/$queue_name"
                                              "/subscriptions?select=msgVpnName,queueName,subscriptionTopic,"
                                              "createdByManagement&count=$count")
created_topic_subscriptions_count_endpoint = Template("SEMP/v2/monitor/msgVpns/$msg_vpn_name/queues"
                                                      "/$queue_name?select=topicSubscriptionCount,durable")

# to shut-down a queue and bring it back online the following patch url will be used
shutdown_queue_patch_endpoint = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name/queues/$queue_name")

# to add exception topic list
exception_topic_list_endpoint = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name/aclProfiles"
                                         "/$msg_vpn_name/publishTopicExceptions?select=publishTopicExceptionSyntax,"
                                         "publishTopicException,msgVpnName,aclProfileName")

# remove topics from the exception list
remove_topics_from_exception_list = Template("/SEMP/v2/config/msgVpns/$msg_vpn_name/aclProfiles/$msg_vpn_name"
                                             "/publishTopicExceptions/smf,$topic_name")

# end point to get number of solace clients connected
sol_clients_connected = Template("/SEMP/v2/__private_monitor__/msgVpns/$msg_vpn_name/clients?select=clientName"
                                 ",msgVpnName,clientUsername,subscriptionCount,rxDiscardedMsgCount,txDiscardedMsgCount,"
                                 "noSubscriptionMatchRxDiscardedMsgCount,clientAddress,slowSubscriber&count=20")
