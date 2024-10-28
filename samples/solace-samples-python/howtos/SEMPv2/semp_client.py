"""module for semp client"""
import json

import requests
from requests.auth import HTTPBasicAuth
from requests.exceptions import HTTPError


class SempClient:
    """class holds semp client related methods"""

    def __init__(self, semp_base_url: str, user_name="admin", password="admin", verify_ssl=False):
        self.url_with_port = semp_base_url
        self.user_name = user_name
        self.password = password
        self.verify_ssl = verify_ssl

        self.authHeader = HTTPBasicAuth(self.user_name, self.password)
        self.json_content_type_header = {'Content-Type': 'application/json'}

    def http_get(self, endpoint: str):
        """method to get the http endpoint
        Args:
            endpoint: endpoint string

        Raises:
            HTTP GET request failed. with response status code or
            HTTP error occurred while HTTP GET exception
        """
        url = f"{self.url_with_port}{endpoint}"
        try:
            req = requests.get(url, auth=self.authHeader, verify=self.verify_ssl)
            if req.status_code == 200:
                return req.json()
            else:
                raise Exception(f"HTTP GET request failed. Response status code: {req.status_code}. \n {req.json()}")
        except HTTPError as http_err:
            print(f'HTTP error occurred while HTTP GET - {url}. \n Exception: {http_err}')
        except Exception as err:
            print(f'Error occurred while HTTP GET - {url}. \n Exception: {err}')

    def http_patch(self, endpoint: str, payload):
        """method to update the http endpoint
        Args:
            endpoint: endpoint string
            payload: request payload

        Raises:
            HTTP PATCH request failed. with response status code or
            HTTP error occurred while HTTP PATCH exception
        """
        url = f"{self.url_with_port}{endpoint}"
        try:
            req = requests.patch(url, auth=self.authHeader, data=json.dumps(payload),
                                 headers=self.json_content_type_header, verify=self.verify_ssl)

            if req.status_code == 200:
                return req.json()
            else:
                raise Exception(f"HTTP PATCH request failed. Response status code: {req.status_code}. \n {req.json()}")
        except HTTPError as http_err:
            print(f'HTTP error occurred while HTTP PATCH - {url}. \n Exception: {http_err}')
        except Exception as err:
            print(f'Error occurred while HTTP PATCH - {url}. \n Exception: {err}')

    def http_post(self, endpoint: str, payload, raise_exception=True):
        """method for http post
        Args:
            endpoint: endpoint string
            payload: request payload

        Raises:
            HTTP POST request failed. with response status code or
            HTTP error occurred while HTTP POST exception
        """

        url = f"{self.url_with_port}{endpoint}"
        try:

            req = requests.post(url, auth=self.authHeader, data=json.dumps(payload),
                                headers=self.json_content_type_header, verify=self.verify_ssl)
            if req.status_code == 200:
                return req.json()
            else:
                if raise_exception:
                    raise Exception(f"HTTP POST [%s] request failed. Response status code: %s.\n%s",
                                    url, req.status_code, req.json())
                else:
                    return req.json()
        except HTTPError as http_err:
            print(f'HTTP error occurred while HTTP POST [%s].\nException: %s', url, http_err)
        except Exception as err:
            print(f'HTTP error occurred while HTTP POST [%s].\nException: %s', url, err)

    def http_delete(self, endpoint: str):
        """method for http delete
        Args:
            endpoint: endpoint string

        Raises:
            HTTP DELETE request failed. with response status code or
            HTTP error occurred while HTTP DELETE exception
        """
        url = f"{self.url_with_port}{endpoint}"
        try:
            req = requests.delete(url, auth=self.authHeader, headers=self.json_content_type_header,
                                  verify=self.verify_ssl)
            if req.status_code == 200:
                return req.json()
            else:
                raise Exception(f'HTTP DELETE request failed. Response status code: {req.status_code}. \n {req.json()}')
        except HTTPError as http_err:
            print(f'HTTP error occurred while HTTP DELETE - {url}. \n Exception: {http_err}')
        except Exception as err:
            print(f'Error occurred while HTTP DELETE - {url}. \n Exception: {err}')
