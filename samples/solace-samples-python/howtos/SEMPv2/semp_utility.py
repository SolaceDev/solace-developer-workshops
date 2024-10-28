"""module for the semp utility"""
import urllib
from pathlib import Path

from howtos.SEMPv2.semp_endpoint import certificate_authority_endpoint, \
    update_msg_vpn_endpoint, message_vpn_authentication_endpoint, \
    patch_client_user_name_endpoint, get_client_connection_objects, get_client_connection_properties, \
    create_msg_vpn_user_endpoint, \
    activate_msg_vpn_user_patch_endpoint, delete_msg_vpn_user_endpoint, GET_ALL_MSG_VPN_ENDPOINT, GET_ALL_USER_LIST, \
    allow_shared_subscription_endpoint, GET_SEMP_ABOUT_ENDPOINT, PATCH_MESSAGE_VPN_ENDPOINT, \
    GET_MSG_VPN_CLIENT_DETAILS_ENDPOINT, \
    GET_MESSAGE_VPN_SERVICE_SETTINGS_ENDPOINT, create_queue_patch_endpoint, create_queue_post_endpoint, \
    delete_queue_endpoint, queue_permission_change_patch_engress_enable, queue_permission_change_patch, \
    queue_permission_change_get, shutdown_queue_patch_endpoint, sol_clients_connected, server_certificate_endpoint, \
    create_topic_on_queue_post_endpoint, create_topic_on_queue_get_endpoint, exception_topic_list_endpoint, \
    remove_topics_from_exception_list


class SempUtility:
    """SEMP utility class"""

    def __init__(self, semp_client):
        self.semp_client = semp_client

    def create_message_vpn(self, msg_vpn_name, authentication_basic_enabled=True,
                           authentication_basic_profile_name="", authentication_basic_type="internal",
                           enabled=False, max_msg_spool_usage=0, client_profile="default"):
        """method will create a message vpn using the parameters
        Args:
            msg_vpn_name: message vpn name
            authentication_basic_enabled: boolean value stating the status of basic authentication
            authentication_basic_profile_name: basic authentication profile name
            authentication_basic_type: basic authentication type
            enabled: boolean value for enabling the vpn
            max_msg_spool_usage: maximum message spool usage count set to 0
            client_profile: set to default

        Raises:
            unable to create new Message VPN
        """
        try:
            if msg_vpn_name is None:
                raise Exception(f'MESSAGE VPN is [{msg_vpn_name}]')
            default_client_user_name = "default"
            default_client_password = "default"
            default_client_profile = "default"

            print(f"Creating new MESSAGE VPN: '{msg_vpn_name}'")

            self.__message_vpn_authentication_basic(msg_vpn_name, authentication_basic_enabled,
                                                    authentication_basic_profile_name,
                                                    authentication_basic_type, enabled, max_msg_spool_usage)

            self.__message_vpn_client_profile(msg_vpn_name, client_profile)

            # we have to create default user first for a given vpn
            self.__message_vpn_client_user_details(msg_vpn_name, default_client_user_name, default_client_password,
                                                   default_client_profile)

            self.__message_vpn_enabling(msg_vpn_name)
        except Exception as exception:
            raise Exception(f'Unable to create new MESSAGE VPN [{msg_vpn_name}]. '
                            f'Exception: {exception}')

    def get_about(self):
        """method to get SEMP v2 details """
        print('Get SEMP V2 details')
        return self.semp_client.http_get(GET_SEMP_ABOUT_ENDPOINT)

    def delete_message_vpn(self, msg_vpn_name):
        """method is used to delete the message vpn
        Args:
            msg_vpn_name: message vpn name

        Returns:
            the vpn name to be deleted by the semp client
        """
        try:
            if msg_vpn_name is not None:
                print(f"DELETE VPN: {msg_vpn_name}")
                return self.semp_client.http_delete(
                    PATCH_MESSAGE_VPN_ENDPOINT.substitute(msg_vpn_name=msg_vpn_name))
        except Exception as err:
            print(f'Unable to delete MESSAGE VPN [{msg_vpn_name}]. Exception: {err}')

    def allow_shared_subscriptions(self, msg_vpn_name, username, password, client_profile_name="default"):
        try:
            print(f'Update allow shared subscription MESSAGE VPN [{msg_vpn_name}], '
                  f'client profile name: [{client_profile_name}]')
            payload = {"clientProfileName": client_profile_name, "msgVpnName": msg_vpn_name,
                       "allowSharedSubscriptionsEnabled": True}
            self.semp_client.http_patch(allow_shared_subscription_endpoint
                                        .substitute(msg_vpn_name=msg_vpn_name, client_profile_name=client_profile_name),
                                        payload)
        except Exception as exception:
            print(f'Unable to allow shared subscription MESSAGE VPN [{msg_vpn_name}]. Exception: {exception}')

    def map_user_to_message_vpn(self, message_vpn, username, password, client_profile_name="default"):
        """method to map user to message vpn
        Args:
            message_vpn: message vpn name
            username: username string
            password: client password
            client_profile_name: client profile name
        Raises:
            unable to map username to message vpn exception, if username is not according to standard
        """
        try:
            print(f'Map new CLIENT USER: [{username}] to VPN: [{message_vpn}]')
            patch_client_user_payload = {"aclProfileName": "default", "clientProfileName": client_profile_name,
                                         "clientUsername": username, "enabled": True,
                                         "guaranteedEndpointPermissionOverrideEnabled": False,
                                         "msgVpnName": message_vpn, "password": password,
                                         "subscriptionManagerEnabled": False}
            self.__create_user(username, message_vpn)

            self.semp_client.http_patch(
                activate_msg_vpn_user_patch_endpoint.substitute(msg_vpn_name=message_vpn, client_user_name=username),
                patch_client_user_payload)
        except Exception as exception:
            print(f'Unable to map user to MESSAGE VPN [{message_vpn}] CLIENT USER: [{username}]. '
                  f'Exception: {exception}')

    def delete_user(self, username, msg_vpn_name=None):
        """method to delete the user
        Args:
            msg_vpn_name ():
            username: username string

        Returns:
            the user name to be removed to the semp client
        """
        try:
            if msg_vpn_name is not None:
                print(f"DELETE CLIENT USER: [{username}] in MESSAGE VPN: [{msg_vpn_name}]")
                delete_msg_vpn_user_response = self.semp_client.http_delete(
                    delete_msg_vpn_user_endpoint.substitute(msg_vpn_name=msg_vpn_name, client_user_name=username))

                return delete_msg_vpn_user_response
        except Exception as exception:
            print(f'Unable to delete user to MESSAGE VPN [{msg_vpn_name}]. Exception: {exception}')

    # try to use links given by REST instead of constructing by ourselves
    def add_certificate(self, cert_file_full_path: str, override_existing: bool = False):
        """method to add certificate"""
        try:
            ca_name = Path(cert_file_full_path).stem
            response = self.semp_client.http_get(certificate_authority_endpoint)
            if response['data'] is not None:
                if len(response['data']) == 0:
                    self.__add_ca_cert(cert_file_full_path)
                else:
                    certificate_authorities = [cert['certAuthorityName'] for cert in response['data']]
                    if ca_name in certificate_authorities:
                        if override_existing:
                            self.delete_certificate(ca_name)
                            self.__add_ca_cert(cert_file_full_path)
                    # else:
                    #     self.__add_ca_cert(cert_file_full_path)
            else:
                raise Exception("Failed to retrieve Certifcate Authorities")
        except Exception as exception:
            print(f'Unable to add certificate from path [{cert_file_full_path}]. Exception: {exception}')

    # try to use links given by REST instead of constructing by ourselves
    def delete_certificate(self, cert_authority_name: str):
        """method to delete certificate"""
        try:
            print(f"Delete certificate [{cert_authority_name}]")
            response = self.semp_client.http_get(certificate_authority_endpoint)
            delete_ca = f'{certificate_authority_endpoint}/{cert_authority_name}'
            if response['data'] is not None and len(response['data']) > 0:
                for counter in range(len(response['data'])):
                    if response['data'][counter]['certAuthorityName'] == cert_authority_name:
                        self.semp_client.http_delete(delete_ca)
        except Exception as exception:
            print(f'Unable to delete certificate [{cert_authority_name}]. Exception: {exception}')

    def add_server_certificate(self, cert_file_full_path: str):
        """add server certificate - server cert cannot be read from broker """
        cert_payload = self.__prepare_server_certificate_payload(cert_file_full_path)
        self.add_new_server_cert(cert_payload)

    def add_new_server_cert(self, cert_payload):
        self.semp_client.http_patch(server_certificate_endpoint, cert_payload)

    def get_client_name_list(self, vpn_name: str):
        """method to get client name list
        Args:
            vpn_name (str): message vpn name

        Returns:
            client list
        Raises:
            unable to get the client name list
        """
        try:
            print(f"Get CLIENT name list from MESSAGE VPN: [{vpn_name}]")
            json_response = self.semp_client \
                .http_get(GET_MSG_VPN_CLIENT_DETAILS_ENDPOINT.substitute(msg_vpn_name=vpn_name))
            data_property = json_response['data']
            return [client_info['clientName'] for client_info in data_property]
        except Exception as err:
            print(f'Unable to GET CLIENT NAME list: [{vpn_name}]. Exception: {err}')

    def get_client_connection_objects(self, vpn_name: str, client_name: str):
        """method to get client connection object list
        Args:
            client_name: client name
            vpn_name (str): message vpn name

        Returns:
            client connection objects list
        Raises:
            unable to get client connection objects list
        """
        try:
            print(f"Get CLIENT CONNECTIONS OBJECTS list from MESSAGE VPN: [{vpn_name}],"
                  f" CLIENT Name: [{client_name}]")
            json_response = self.semp_client \
                .http_get(get_client_connection_objects.substitute(msg_vpn_name=vpn_name, client_name=client_name))
            return json_response['data']
        except Exception as err:
            print(f'Unable to GET CLIENT CONNECTIONS OBJECTS list: [{vpn_name}], CLIENT Name: [{client_name}].'
                  f'Exception: {err}')

    def get_client_connection_properties(self, vpn_name: str, client_name: str):
        """method to get client connection properties
        Args:
            client_name: client name
            vpn_name (str): message vpn name

        Returns:
            client connection properties
        Raises:
            unable to get client connection properties
        """
        try:
            print(
                f"Get CLIENT CONNECTIONS properties from MESSAGE VPN: [{vpn_name}], CLIENT Name: [{client_name}]")
            json_response = self.semp_client \
                .http_get(get_client_connection_properties.substitute(msg_vpn_name=vpn_name, client_name=client_name))
            return json_response['data']
        except Exception as err:
            print(f'Unable to GET CLIENT CONNECTIONS properties: [{vpn_name}], CLIENT Name: [{client_name}].'
                  f'Exception: {err}')

    def get_message_vpn_service_settings(self, vpn_name: str):
        """method to get message vpn service settings
        Args:
            vpn_name (str): message vpn name

        Returns:
            vpn settings

        Raises:
            unable to get message vpn details
        """
        try:
            print(f"Get MESSAGE VPN: {vpn_name} service settings")
            json_response = self.semp_client \
                .http_get(GET_MESSAGE_VPN_SERVICE_SETTINGS_ENDPOINT.substitute(msg_vpn_name=vpn_name))
            return json_response['data']
        except Exception as err:
            print(f'Unable to GET MESSAGE-VPN service settings: [{vpn_name}] details. Exception: {err}')

    def patch_allow_downgrade_tls_to_plain_text(self, vpn_name: str, is_enable: bool):
        """method to patch allow downgradable tls to plain text
        Args:
            vpn_name: message vpn name
            is_enable: boolean value

        Returns:
            key value for the tls allow downgradable to plain text

        Raises:
            unable to update key exception
        """
        tls_allow_downgrade_to_plain_text = 'tlsAllowDowngradeToPlainTextEnabled'
        try:
            print(f"Update [{tls_allow_downgrade_to_plain_text}]: {is_enable} in MESSAGE VPN: {vpn_name}")
            data = {tls_allow_downgrade_to_plain_text: is_enable}
            json_response = self.__patch_message_vpn_endpoint(vpn_name, data)
            if not json_response:
                raise Exception(f'Unable to update KEY: [{tls_allow_downgrade_to_plain_text}] VALUE: {is_enable}.')
            return json_response['data'][tls_allow_downgrade_to_plain_text]
        except Exception as err:
            raise Exception(f'Unable to update KEY: [{tls_allow_downgrade_to_plain_text}] VALUE: {is_enable}. '
                            f'Exception: {err}')

    def patch_rest_tls_server_cert_enforce_trusted_common_name(self, vpn_name: str, is_enable: bool):
        """method to update test tls server certificate enforcing trusted common name
        Args:
            vpn_name:  message vpn name
            is_enable: boolean value

        Returns:
            key value for the rest tls server certificate enforcing trusted common name

        Raises:
            unable to update the key exception
        """
        tls_server_cert = 'restTlsServerCertEnforceTrustedCommonNameEnabled'
        try:
            print(f"Update [{tls_server_cert}]: {is_enable} in MESSAGE VPN: {vpn_name}")
            data = {tls_server_cert: is_enable}
            json_response = self.__patch_message_vpn_endpoint(vpn_name, data)

            return json_response['data'][tls_server_cert]
        except Exception as err:
            print(f'Unable to update KEY: [{tls_server_cert}] VALUE: [{is_enable}]. Exception: {err}')

    def patch_rest_tls_server_cert_validate_date(self, vpn_name: str, is_enable: bool):
        """method to update rest tls certificate validation date
        Args:
            is_enable: boolean value
            vpn_name: message vpn name

        Returns:
            key value for rest tls server certificate validation date

        Raises:
            unable to update key exception
        """
        cert_validate_date_enabled = 'restTlsServerCertValidateDateEnabled'
        try:
            print(f"Update [{cert_validate_date_enabled}]: {is_enable} in MESSAGE VPN: {vpn_name}")
            data = {cert_validate_date_enabled: is_enable}
            json_response = self.__patch_message_vpn_endpoint(vpn_name, data)

            return json_response['data'][cert_validate_date_enabled]
        except Exception as err:
            print(f'Unable to update KEY: {cert_validate_date_enabled}. Exception: {err}')

    def update_client_certificate_authentication_feature(self, vpn_name: str, is_enable: bool):
        """method to update the client certificate authentication
        Args:
            vpn_name: message vpn name
            is_enable: boolean value

        Returns:
            key value for client certification authentication enabled

        Raises:
            unable to update key exception
        """
        authentication_client_cert_enabled = 'authenticationClientCertEnabled'
        try:
            print(f"\nUpdate [{authentication_client_cert_enabled}]: {is_enable} on MESSAGE VPN: {vpn_name}")
            data = {authentication_client_cert_enabled: is_enable}

            json_response = self.__patch_message_vpn_endpoint(vpn_name, data)

            return json_response['data'][authentication_client_cert_enabled]
        except Exception as err:
            print(f'Unable to update KEY: [{authentication_client_cert_enabled}]. Exception: {err}')

    def get_all_message_vpn(self):
        """method to get all message vpn
            Returns:
                message vpn list
            Raises:
                unable to get the message vpn list
        """
        try:
            print('Get MESSAGE VPN list.')
            json_response = self.semp_client \
                .http_get(GET_ALL_MSG_VPN_ENDPOINT)
            return json_response['data']
        except Exception as err:
            print(f'Unable to get MESSAGE VPN list. Exception: {err}')

    def get_all_user(self, vpn_name: str):
        """method to get all user
            Args:
                vpn_name (str): message vpn name
            Returns:
                user list
            Raises:
                unable to get the user list
        """
        try:
            print(f'Get all USER list for Message VPN: "{vpn_name}"')
            json_response = self.semp_client \
                .http_get(GET_ALL_USER_LIST.substitute(msg_vpn_name=vpn_name))
            return json_response['data']
        except Exception as err:
            print(f'Unable to get USER list for Message VPN: "{vpn_name}". Exception: {err}')

    def create_queue(self, name, msg_vpn_name, delete_if_exists=True, access_type="exclusive", egress_enabled=True,
                     reject_msg_to_sender_on_discard_behavior="when-queue-enabled"):
        print("Creating QUEUE: [%s]", name)
        payload = {"egressEnabled": True, "ingressEnabled": True, "permission": "consume", "queueName": name}
        patch_payload = {"accessType": "exclusive", "consumerAckPropagationEnabled": True,
                         "deadMsgQueue": "#DEAD_MSG_QUEUE", "egressEnabled": egress_enabled,
                         "eventBindCountThreshold": {"clearPercent": 60, "setPercent": 80},
                         "eventMsgSpoolUsageThreshold": {"clearPercent": 60, "setPercent": 80},
                         "eventRejectLowPriorityMsgLimitThreshold": {"clearPercent": 60, "setPercent": 80},
                         "ingressEnabled": True, "maxBindCount": 1000, "maxDeliveredUnackedMsgsPerFlow": 10000,
                         "maxMsgSize": 10000000, "maxMsgSpoolUsage": 1500, "maxRedeliveryCount": 0, "maxTtl": 0,
                         "msgVpnName": msg_vpn_name, "owner": "", "permission": "consume", "queueName": name,
                         "rejectLowPriorityMsgEnabled": False, "rejectLowPriorityMsgLimit": 0,
                         "rejectMsgToSenderOnDiscardBehavior": reject_msg_to_sender_on_discard_behavior,
                         "respectMsgPriorityEnabled": False, "respectTtlEnabled": False}

        create_queue_response = self.semp_client.http_post(
            create_queue_post_endpoint.substitute(msg_vpn_name=msg_vpn_name), payload, False)
        if create_queue_response is not None and create_queue_response["meta"]["responseCode"] == 200:
            name_encoded = urllib.parse.quote(name, safe='')
            patch_queue_response = self.semp_client.http_patch(create_queue_patch_endpoint
                                                               .substitute(msg_vpn_name=msg_vpn_name,
                                                                           queue_name=name_encoded), patch_payload)
            if patch_queue_response is not None and patch_queue_response["meta"]["responseCode"] != 200:
                print("Failed to update the config for the queue [%s]", name)
                raise Exception("Failed to update the config for the queue [%s]", name)
            self.change_queue_permission(queue_name=name, msg_vpn_name=msg_vpn_name, access_type=access_type)
        elif create_queue_response is not None and create_queue_response["meta"]["responseCode"] == 400 and \
                create_queue_response["meta"]["error"]["status"] == "ALREADY_EXISTS":
            print("Queue [%s] is already exist", name)
            if delete_if_exists:
                self.delete_queue(name, msg_vpn_name)
                self.create_queue(name, msg_vpn_name)
        else:
            print("Failed to create the queue [%s]", name)
            raise Exception(f"Failed to create the queue [{name}]")

    def change_queue_permission(self, queue_name, msg_vpn_name, access_type="exclusive"):
        changed_patch_payload = {"accessType": access_type, "consumerAckPropagationEnabled": True,
                                 "deadMsgQueue": "#DEAD_MSG_QUEUE", "egressEnabled": False,
                                 "eventBindCountThreshold": {"clearPercent": 60, "setPercent": 80},
                                 "eventMsgSpoolUsageThreshold": {"clearPercent": 60, "setPercent": 80},
                                 "eventRejectLowPriorityMsgLimitThreshold": {"clearPercent": 60, "setPercent": 80},
                                 "ingressEnabled": True, "maxBindCount": 1000, "maxDeliveredUnackedMsgsPerFlow": 10000,
                                 "maxMsgSize": 10000000, "maxMsgSpoolUsage": 1500, "maxRedeliveryCount": 0, "maxTtl": 0,
                                 "msgVpnName": msg_vpn_name, "owner": "", "permission": "modify-topic",
                                 "queueName": queue_name, "rejectLowPriorityMsgEnabled": False,
                                 "rejectLowPriorityMsgLimit": 0,
                                 "rejectMsgToSenderOnDiscardBehavior": "when-queue-enabled",
                                 "respectMsgPriorityEnabled": False, "respectTtlEnabled": False}
        enable_engress_patch = {"egressEnabled": True}
        name_encoded = urllib.parse.quote(queue_name, safe='')
        queue_available = self.semp_client.http_get(queue_permission_change_get
                                                    .substitute(msg_vpn_name=msg_vpn_name,
                                                                queue_name=name_encoded))

        if queue_available is not None and queue_available["meta"]["responseCode"] != 200:
            print("The queue [%s] is not available", queue_name)
            raise Exception("The queue [%s] is not available", queue_name)

        queue_changed_permission_response = self.semp_client.http_patch(
            queue_permission_change_patch.substitute(msg_vpn_name=msg_vpn_name,
                                                     queue_name=name_encoded), changed_patch_payload)

        if queue_changed_permission_response is not None and \
                queue_changed_permission_response["meta"]["responseCode"] != 200:
            print("Unable to change the queue: [%s] permission to modify the topics", queue_name)
            raise Exception("Unable to change the queue: [%s] permission to modify the topics", queue_name)

        queue_engress_enabled_response = self.semp_client.http_patch(
            queue_permission_change_patch_engress_enable.substitute(msg_vpn_name=msg_vpn_name, queue_name=name_encoded),
            enable_engress_patch)
        if queue_engress_enabled_response is not None and \
                queue_engress_enabled_response["meta"]["responseCode"] != 200:
            print("Failed to set engressEnabled flag to True in queue: [%s]", queue_name)
            raise Exception("Failed to set engressEnabled flag to True in queue: [%s]", queue_name)

    def delete_queue(self, name, msg_vpn_name):
        print("Deleting QUEUE: [%s]", name)
        name_encoded = urllib.parse.quote(name, safe='')
        delete_queue_response = self.semp_client.http_delete(delete_queue_endpoint.substitute(msg_vpn_name=msg_vpn_name,
                                                                                              queue_name=name_encoded))
        if delete_queue_response is not None and delete_queue_response["meta"]["responseCode"] != 200:
            print("Failed to delete QUEUE: [%s]", name)
            raise Exception("Failed to delete QUEUE: [%s]", name)

    def shutdown_queue(self, queue_name, msg_vpn_name, access_type="exclusive"):
        changed_patch_payload = {"accessType": access_type, "consumerAckPropagationEnabled": True,
                                 "deadMsgQueue": "#DEAD_MSG_QUEUE", "egressEnabled": False,
                                 "eventBindCountThreshold": {"clearPercent": 60, "setPercent": 80},
                                 "eventMsgSpoolUsageThreshold": {"clearPercent": 60, "setPercent": 80},
                                 "eventRejectLowPriorityMsgLimitThreshold": {"clearPercent": 60, "setPercent": 80},
                                 "ingressEnabled": False, "maxBindCount": 1000, "maxDeliveredUnackedMsgsPerFlow": 10000,
                                 "maxMsgSize": 10000000, "maxMsgSpoolUsage": 1500, "maxRedeliveryCount": 0, "maxTtl": 0,
                                 "msgVpnName": msg_vpn_name, "owner": "", "permission": "modify-topic",
                                 "queueName": queue_name, "rejectLowPriorityMsgEnabled": False,
                                 "rejectLowPriorityMsgLimit": 0,
                                 "rejectMsgToSenderOnDiscardBehavior": "when-queue-enabled",
                                 "respectMsgPriorityEnabled": False, "respectTtlEnabled": False}
        name_encoded = urllib.parse.quote(queue_name, safe='')
        shutdown_queue = self.semp_client.http_patch(
            shutdown_queue_patch_endpoint.substitute(msg_vpn_name=msg_vpn_name,
                                                     queue_name=name_encoded), changed_patch_payload)
        if shutdown_queue is not None and \
                shutdown_queue["meta"]["responseCode"] != 200:
            print("Unable to shutdown the queue: [%s] ", queue_name)
            raise Exception("Unable to shutdown the queue: [%s] ", queue_name)

    def re_enable_queue(self, queue_name, msg_vpn_name, access_type="exclusive"):
        changed_patch_payload = {"accessType": access_type, "consumerAckPropagationEnabled": True,
                                 "deadMsgQueue": "#DEAD_MSG_QUEUE", "egressEnabled": True,
                                 "eventBindCountThreshold": {"clearPercent": 60, "setPercent": 80},
                                 "eventMsgSpoolUsageThreshold": {"clearPercent": 60, "setPercent": 80},
                                 "eventRejectLowPriorityMsgLimitThreshold": {"clearPercent": 60, "setPercent": 80},
                                 "ingressEnabled": True, "maxBindCount": 1000, "maxDeliveredUnackedMsgsPerFlow": 10000,
                                 "maxMsgSize": 10000000, "maxMsgSpoolUsage": 1500, "maxRedeliveryCount": 0, "maxTtl": 0,
                                 "msgVpnName": msg_vpn_name, "owner": "", "permission": "modify-topic",
                                 "queueName": queue_name, "rejectLowPriorityMsgEnabled": False,
                                 "rejectLowPriorityMsgLimit": 0,
                                 "rejectMsgToSenderOnDiscardBehavior": "when-queue-enabled",
                                 "respectMsgPriorityEnabled": False, "respectTtlEnabled": False}
        name_encoded = urllib.parse.quote(queue_name, safe='')
        re_enable_queue = self.semp_client.http_patch(
            shutdown_queue_patch_endpoint.substitute(msg_vpn_name=msg_vpn_name,
                                                     queue_name=name_encoded), changed_patch_payload)
        if re_enable_queue is not None and \
                re_enable_queue["meta"]["responseCode"] != 200:
            print("Unable to enable the queue: [%s] ", queue_name)
            raise Exception("Unable to enable the queue: [%s] ", queue_name)

    def add_topic_to_queue(self, topic_name, queue_name, msg_vpn_name):
        payload = {'subscriptionTopic': topic_name}
        name_encoded = urllib.parse.quote(queue_name, safe='')
        create_topic_on_queue_response = self.semp_client.http_post(
            create_topic_on_queue_post_endpoint.substitute(msg_vpn_name=msg_vpn_name, queue_name=name_encoded), payload)
        if create_topic_on_queue_response is not None and create_topic_on_queue_response["meta"]["responseCode"] == 200:
            topic_added_to_queue_response = self.semp_client.http_get \
                (create_topic_on_queue_get_endpoint.substitute(msg_vpn_name=msg_vpn_name,
                                                               queue_name=name_encoded, count=20))
            if topic_added_to_queue_response["meta"]["responseCode"] != 200:
                print("Failed to add topic [%s] to the queue [%s]", topic_name, queue_name)
                raise Exception("Failed to add topic [%s] to the queue [%s]", topic_name, queue_name)
        elif create_topic_on_queue_response is not None and \
                create_topic_on_queue_response["meta"]["responseCode"] == 400 and \
                create_topic_on_queue_response["meta"]["error"]["status"] == "ALREADY_EXISTS":
            print("Topic [%s] is already exist", topic_name)
        else:
            print("Failed to create the topic [%s]", topic_name)
            raise Exception("Failed to create the topic [%s]", topic_name)

    def patch_reject_msg_to_sender_on_no_subscription_match_enabled(self, vpn_name: str, is_enable: bool,
                                                                    client_profile_name="default"):
        """method to patch allow downgradable tls to plain text
        Args:
            client_profile_name (object):
            vpn_name: message vpn name
            is_enable: boolean value
        Returns:
            key value for reject_msg_to_sender_on_no_subscription_match_enabled
        Raises:
            unable to update key exception
        """
        reject_msg_to_sender_on_no_subscription_match_enabled = 'rejectMsgToSenderOnNoSubscriptionMatchEnabled'
        try:
            print('Update allow shared subscription MESSAGE VPN [%s], client profile name: [%s]',
                  vpn_name, client_profile_name)
            payload = {reject_msg_to_sender_on_no_subscription_match_enabled: is_enable}
            url = allow_shared_subscription_endpoint.substitute(msg_vpn_name=vpn_name,
                                                                client_profile_name=client_profile_name)
            self.semp_client.http_patch(allow_shared_subscription_endpoint
                                        .substitute(msg_vpn_name=vpn_name, client_profile_name=client_profile_name),
                                        payload)
        except Exception as exception:
            raise Exception('Unable reject_msg_to_sender_on_no_subscription_match_enabled in '
                            'MESSAGE VPN [%s]. Exception: %s', vpn_name, exception)

    def add_exception_topic_on_publish(self, topic_name, msg_vpn_name, publish_topic_exception_syntax="smf"):
        """method to add topics to an exception list at publish"""
        # for topic in topic_name:
        payload = {"publishTopicException": topic_name, "publishTopicExceptionSyntax": publish_topic_exception_syntax}
        adding_exeption_topic_on_publish_response = self.semp_client.http_post(
            exception_topic_list_endpoint.substitute(msg_vpn_name=msg_vpn_name), payload, False)
        if adding_exeption_topic_on_publish_response is not None and \
                adding_exeption_topic_on_publish_response["meta"]["responseCode"] == 200:
            print("The topic : %s, is added to the exception list successfully", topic_name)
        elif adding_exeption_topic_on_publish_response is not None and \
                adding_exeption_topic_on_publish_response["meta"]["responseCode"] == 400 and \
                adding_exeption_topic_on_publish_response["meta"]["error"]["status"] == "ALREADY_EXISTS":
            print("Topic : %s, already exists", topic_name)
        else:
            print("Failed to add the topic [%s} to the exception list", topic_name)
            raise Exception(f"Failed to add the topic: {topic_name}, to the exception list")

    def remove_topics_from_exception_list(self, topic_name, msg_vpn_name):
        name_encoded = urllib.parse.quote(topic_name, safe='')
        removing_topics_from_exception_list_response = self.semp_client.http_delete(
            remove_topics_from_exception_list.substitute(msg_vpn_name=msg_vpn_name, topic_name=name_encoded))
        if removing_topics_from_exception_list_response is not None and \
                removing_topics_from_exception_list_response["meta"]["responseCode"] != 200:
            print("Failed to delete topic: [%s] from the exception list", topic_name)
            raise Exception("Failed to delete topic: [%s] from the exception list", topic_name)

    @staticmethod
    def __prepare_ca_certificate_payload(cert_file_full_path: str):
        with open(cert_file_full_path) as reader:
            certificate_contents = reader.read()  # .replace("\n", "\\n")[:-2]
        ca_name = Path(cert_file_full_path).stem
        return {"certAuthorityName": ca_name, "certContent": certificate_contents,
                "crlDayList": "daily", "crlTimeList": "3:00", "crlUrl": "", "ocspNonResponderCertEnabled": False,
                "ocspOverrideUrl": "", "ocspTimeout": 5, "revocationCheckEnabled": False}

    @staticmethod
    def __prepare_server_certificate_payload(cert_file_full_path: str):
        with open(cert_file_full_path) as reader:
            certificate_contents = reader.read()  # .replace("\n", "\\n")[:-2]
        return {"tlsServerCertContent": certificate_contents}

    def __patch_message_vpn_endpoint(self, vpn_name: str, data):
        """method to update message vpn endpoint
        Args:
          vpn_name: message vpn name
          data: endpoint data

        Raises;
        unable to update message vpn details exception
        """
        try:
            return self.semp_client \
                .http_patch(PATCH_MESSAGE_VPN_ENDPOINT.substitute(msg_vpn_name=vpn_name), data)
        except Exception as err:
            print(f'Unable to update MESSAGE VPN details: "{vpn_name}"\nException: {err}')

    def __message_vpn_authentication_basic(self, msg_vpn_name, authentication_basic_enabled=True,
                                           authentication_basic_profile_name="",
                                           authentication_basic_type="internal", enabled=False, max_msg_spool_usage=0):
        """method to create basic message vpn authentication
        Args:
            msg_vpn_name: name fo the message vpn
            authentication_basic_enabled: boolean value stating the status of basic authentication
            authentication_basic_profile_name: basic authentication profile name
            authentication_basic_type: basic authentication type
            enabled: boolean value for enabling the vpn
            max_msg_spool_usage: maximum message spool usage count set to 0

        Raises:
            message vpn is not created
        """
        authentication_payload = {'authenticationBasicEnabled': authentication_basic_enabled,
                                  'authenticationBasicProfileName': authentication_basic_profile_name,
                                  'authenticationBasicType': authentication_basic_type, 'enabled': enabled,
                                  'maxMsgSpoolUsage': max_msg_spool_usage, 'msgVpnName': msg_vpn_name}

        message_vpn_response = self.semp_client.http_post(message_vpn_authentication_endpoint,
                                                          authentication_payload)

        new_message_vpn_name = message_vpn_response['data']['msgVpnName']
        if new_message_vpn_name.casefold() != msg_vpn_name.casefold():
            raise Exception(f"MESSAGE VPN: '{msg_vpn_name}' is not created")

    def __create_user(self, username, message_vpn):
        """method to create the user
        Args:
            username: user name string
            message_vpn: message_vpn string

        Raises:
            unable to create new user exception, if the user name  is not according to standard
        """
        create_client_user_payload = {"clientUsername": username}
        message_vpn_response = self.semp_client.http_post(
            create_msg_vpn_user_endpoint.substitute(msg_vpn_name=message_vpn),
            create_client_user_payload)
        new_user_name = message_vpn_response['data']['clientUsername']
        if new_user_name != username:
            raise Exception(f"Unable to create new user: {username}")

    def __message_vpn_client_profile(self, msg_vpn_name, client_profile="default"):
        """method to update client profile
        Args:
            msg_vpn_name: message vpn name
            client_profile: client profile name

        Raises:
            unable to update client profile in message vpn exception
        """
        client_profile_payload = {"allowBridgeConnectionsEnabled": True,
                                  "allowGuaranteedEndpointCreateEnabled": True,
                                  "allowGuaranteedMsgReceiveEnabled": True, "allowGuaranteedMsgSendEnabled": True,
                                  "clientProfileName": client_profile}

        client_profile_response = self.semp_client.http_patch(
            update_msg_vpn_endpoint.substitute(msg_vpn_name=msg_vpn_name,
                                               client_profile_name=client_profile),
            client_profile_payload)
        data_response = client_profile_response['data']
        new_message_vpn_name = data_response['msgVpnName']
        client_profile_in_response = data_response['clientProfileName']
        if new_message_vpn_name.casefold() != msg_vpn_name.casefold() or \
                client_profile_in_response.casefold() != client_profile.casefold():
            raise Exception(f"Unable to update Client profile: '{client_profile}' in MESSAGE VPN: '{msg_vpn_name}'")

    def __message_vpn_client_user_details(self, msg_vpn_name, client_user_name="default", client_password="default",
                                          client_profile="default"):
        """method to update message vpn client user details
        Args:
            msg_vpn_name: message vpn name
            client_user_name: client user name string
            client_password: client password string
            client_profile: client profile

        Raises:
            unable to update client user details in message vpn
        """
        client_user_details_payload = \
            {"password": client_password, "clientUsername": client_user_name, "enabled": True,
             "msgVpnName": msg_vpn_name}
        client_user_details_response = self.semp_client.http_patch(
            patch_client_user_name_endpoint.substitute(msg_vpn_name=msg_vpn_name, client_profile_name=client_profile),
            client_user_details_payload)
        data_response = client_user_details_response['data']
        new_message_vpn_name = data_response['msgVpnName']
        client_username_in_response = data_response['clientUsername']
        if new_message_vpn_name.casefold() != msg_vpn_name.casefold() or \
                client_username_in_response.casefold() != client_profile.casefold():
            raise Exception(
                f"Unable to update Client user details: '{client_profile}' in MESSAGE VPN: '{msg_vpn_name}'")

    def __message_vpn_enabling(self, msg_vpn_name):
        """method to enable message vpn
        Args:
            msg_vpn_name: message vpn name string

        Raises:
            unable to enable message vpn
        """
        enable_message_vpn_payload = {'enabled': True}
        client_user_details_response = self.semp_client.http_patch(
            PATCH_MESSAGE_VPN_ENDPOINT.substitute(msg_vpn_name=msg_vpn_name),
            enable_message_vpn_payload)

        data_response = client_user_details_response['data']
        new_message_vpn_name = data_response['msgVpnName']
        message_vpn_enable_in_response = data_response['enabled']

        if new_message_vpn_name.casefold() != msg_vpn_name.casefold() or not message_vpn_enable_in_response:
            raise Exception(f"Unable to ENABLE MESSAGE VPN: '{msg_vpn_name}'")

    def __add_ca_cert(self, cert_file_full_path):
        cert_payload = self.__prepare_ca_certificate_payload(cert_file_full_path)
        self.semp_client.http_post(certificate_authority_endpoint, cert_payload)

    def get_all_sol_client_list(self, msg_vpn_name):
        response = self.semp_client.http_get(sol_clients_connected.substitute(msg_vpn_name=msg_vpn_name))
        return len(response['data'])
