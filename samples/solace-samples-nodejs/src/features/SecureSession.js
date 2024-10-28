/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Solace Systems Node.js API
 * Secure Session tutorial
 * Demonstrates the use of secure session and
 * server and client certificate authentication
 *
 * Prerequisites:
 * Following certificates and key must be locally available in the `certs` folder
 * under `advanced-samples`.
 * It is assumed that you know how TLS/SSL certificates and Certificate Authorities ("CAs") work
 * and you have generated the required private/public keys and certificates using ssl tools.
 * root_ca-rsa.crt - root certificate of the Certificate Authority which signed the message router's
 *     certificate
 * client1-rsa-1.crt - client certificate
 * client1-rsa-1.key - client private key
 * On the message router:
 * server trusted root is configured - root certificate of the Certificate Authority
 * which signed the client certificate
 * server certificate including private key is configured
 */

/*jslint es6 node:true devel:true*/

var SecureTopicSubscriber = function (solaceModule, topicName) {
    'use strict';
    var solace = solaceModule;
    var subscriber = {};
    subscriber.session = null;
    subscriber.topicName = topicName;
    subscriber.subscribed = false;

    // Logger
    subscriber.log = function (line) {
        var now = new Date();
        var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2),
            ('0' + now.getSeconds()).slice(-2)];
        var timestamp = '[' + time.join(':') + '] ';
        console.log(timestamp + line);
    };

    subscriber.log('\n*** Secure Subscriber to topic "' + subscriber.topicName + '" is ready to connect ***');

    // main function
    subscriber.run = function (argv) {
        subscriber.connect(argv);
    };

    subscriber.res = function (arg) {
        const { resolve } = require('path');
        return resolve(__dirname, '.', arg);
    }

    // Establishes connection to Solace PubSub+ Event Broker
    subscriber.connect = function (argv) {
        if (subscriber.session !== null) {
            subscriber.log('Already connected and ready to subscribe.');
            return;
        }
        // extract params
        if (argv.length < (2 + 3)) { // expecting 3 real arguments
            subscriber.log('Cannot connect: expecting all arguments' +
                ' <protocol://host[:port]> <client-username>@<message-vpn> <client-password>.\n' +
                'Available protocols are wss://, https://, tcps://');
            process.exit();
        }
        var hosturl = argv.slice(2)[0];
        // check for using secure protocols for this sample
        if (hosturl.lastIndexOf('wss://', 0) !== 0 &&
          hosturl.lastIndexOf('https://', 0) !== 0 &&
          hosturl.lastIndexOf('tcps://', 0) !== 0) {
            subscriber.log('This sample expects to use secure protocols: wss://, https://, or tcps://');
            process.exit();
        }
        subscriber.log('Connecting to Solace PubSub+ Event Broker using url: ' + hosturl);
        var usernamevpn = argv.slice(3)[0];
        var username = usernamevpn.split('@')[0];
        subscriber.log('Client username: ' + username);
        var vpn = usernamevpn.split('@')[1];
        subscriber.log('Solace PubSub+ Event Broker VPN name: ' + vpn);
        var pass = argv.slice(4)[0];
        // create session properties
        var sessionProperties = new solace.SessionProperties({
            url:      hosturl,
            vpnName:  vpn,
            userName: username,
            password: pass,
        });

        // optional: add secure session related session properties
        sessionProperties.sslExcludedProtocols = ['TLSv1'];
        sessionProperties.sslCipherSuites = 'AES128-GCM-SHA256';

        // for server certificate authentication
        sessionProperties.sslValidateCertificate = true;
        sessionProperties.sslTrustedCommonNameList = ['TestServerCN'];
        sessionProperties.sslTrustStores = [subscriber.res('certs/root_ca-rsa.crt')];

        // for client certificate authentication
        sessionProperties.authenticationScheme = solace.AuthenticationScheme.CLIENT_CERTIFICATE;
        // -> sslPrivateKey: file containing private key of the client in PEM format.
        sessionProperties.sslPrivateKey = subscriber.res('certs/client1-rsa-1.key');
        sessionProperties.sslPrivateKeyPassword = 'key_password';
        sessionProperties.sslCertificate = subscriber.res('certs/client1-rsa-1.crt');
        // -> sslPfx: private key, certificate and optional CA certificates of the client
        // in PFX or PKCS12 format. Cannot be used at the same time as sslPrivateKey and sslCertificate
        // sessionProperties.sslPfx = subscriber.res('certs/client-rsa.pfx');
        // sessionProperties.sslPfxPassword = 'pfx_password';

        // -> sslConnectionDowngradeTo: Send messages unencrypted. Use TLS for authentication only.
        // WARNING! Messages are sent over the network in the clear, without encryption!
        // sessionProperties.sslConnectionDowngradeTo = solace.SslDowngrade.PLAINTEXT;
        // WARNING! The above disables encryption!

        // create session
        subscriber.session = solace.SolclientFactory.createSession(sessionProperties);
        // define session event listeners
        subscriber.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            subscriber.log('=== Successfully connected and ready to subscribe. ===');
            subscriber.subscribe();
        });
        subscriber.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            subscriber.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
        });
        subscriber.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            subscriber.log('Disconnected.');
            subscriber.subscribed = false;
            if (subscriber.session !== null) {
                subscriber.session.dispose();
                subscriber.session = null;
            }
        });
        subscriber.session.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, function (sessionEvent) {
            subscriber.log('Cannot subscribe to topic: ' + sessionEvent.correlationKey);
        });
        subscriber.session.on(solace.SessionEventCode.SUBSCRIPTION_OK, function (sessionEvent) {
            if (subscriber.subscribed) {
                subscriber.subscribed = false;
                subscriber.log('Successfully unsubscribed from topic: ' + sessionEvent.correlationKey);
            } else {
                subscriber.subscribed = true;
                subscriber.log('Successfully subscribed to topic: ' + sessionEvent.correlationKey);
                subscriber.log('=== Ready to receive messages. ===');
            }
        });
        // define message event listener
        subscriber.session.on(solace.SessionEventCode.MESSAGE, function (message) {
            subscriber.log('Received message: "' + message.getBinaryAttachment() + '", details:\n' +
                message.dump());
        });
        // connect the session
        try {
            subscriber.session.connect();
        } catch (error) {
            subscriber.log(error.toString());
        }
    };

    // Subscribes to topic on Solace PubSub+ Event Broker
    subscriber.subscribe = function () {
        if (subscriber.session !== null) {
            if (subscriber.subscribed) {
                subscriber.log('Already subscribed to "' + subscriber.topicName +
                    '" and ready to receive messages.');
            } else {
                subscriber.log('Subscribing to topic: ' + subscriber.topicName);
                try {
                    subscriber.session.subscribe(
                        solace.SolclientFactory.createTopicDestination(subscriber.topicName),
                        true, // generate confirmation when subscription is added successfully
                        subscriber.topicName, // use topic name as correlation key
                        10000 // 10 seconds timeout for this operation
                    );
                } catch (error) {
                    subscriber.log(error.toString());
                }
            }
        } else {
            subscriber.log('Cannot subscribe because not connected to Solace PubSub+ Event Broker.');
        }
    };

    subscriber.exit = function () {
        subscriber.unsubscribe();
        subscriber.disconnect();
        setTimeout(function () {
            process.exit();
        }, 1000); // wait for 1 second to finish
    };

    // Unsubscribes from topic on Solace PubSub+ Event Broker
    subscriber.unsubscribe = function () {
        if (subscriber.session !== null) {
            if (subscriber.subscribed) {
                subscriber.log('Unsubscribing from topic: ' + subscriber.topicName);
                try {
                    subscriber.session.unsubscribe(
                        solace.SolclientFactory.createTopicDestination(subscriber.topicName),
                        true, // generate confirmation when subscription is removed successfully
                        subscriber.topicName, // use topic name as correlation key
                        10000 // 10 seconds timeout for this operation
                    );
                } catch (error) {
                    subscriber.log(error.toString());
                }
            } else {
                subscriber.log('Cannot unsubscribe because not subscribed to the topic "' +
                    subscriber.topicName + '"');
            }
        } else {
            subscriber.log('Cannot unsubscribe because not connected to Solace PubSub+ Event Broker.');
        }
    };

    // Gracefully disconnects from Solace PubSub+ Event Broker
    subscriber.disconnect = function () {
        subscriber.log('Disconnecting from Solace PubSub+ Event Broker...');
        if (subscriber.session !== null) {
            try {
                subscriber.session.disconnect();
            } catch (error) {
                subscriber.log(error.toString());
            }
        } else {
            subscriber.log('Not connected to Solace PubSub+ Event Broker.');
        }
    };

    return subscriber;
};

solace = require('solclientjs').debug; // logging supported

// Initialize factory with the most recent API defaults
var factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);

// enable logging to JavaScript console at WARN level
// NOTICE: works only with ('solclientjs').debug
solace.SolclientFactory.setLogLevel(solace.LogLevel.WARN);

// create the subscriber, specifying the name of the subscription topic
var subscriber = new SecureTopicSubscriber(solace, 'tutorial/topic');

// subscribe to messages on Solace PubSub+ Event Broker
subscriber.run(process.argv);

// wait to be told to exit
subscriber.log("Press Ctrl-C to exit");
process.stdin.resume();

process.on('SIGINT', function () {
    'use strict';
    subscriber.exit();
});
