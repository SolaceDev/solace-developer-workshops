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
 * Solace Web Messaging API for JavaScript
 * Publishing Guaranteed messages on a Topic tutorial - Guaranteed publisher
 * Demonstrates sending persistent messages on a topic
 */

/*jslint es6 browser devel:true*/
/*global solace*/

var GuaranteedPublisher = function (topicName) {
    'use strict';
    var publisher = {};
    publisher.session = null;
    publisher.topicName = topicName;

    // Logger
    publisher.log = function (line) {
        var now = new Date();
        var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2),
            ('0' + now.getSeconds()).slice(-2)];
        var timestamp = '[' + time.join(':') + '] ';
        console.log(timestamp + line);
    };

    // main function
    publisher.run = function (argv) {
        publisher.connect(argv);
    };

    // Establishes connection to Solace PubSub+ Event Broker
    publisher.connect = function (argv) {
        if (publisher.session !== null) {
            publisher.log('Already connected and ready to publish messages.');
            return;
        }
        // extract params
        if (argv.length < (2 + 3)) { // expecting 3 real arguments
            publisher.log('Cannot connect: expecting all arguments' +
                ' <protocol://host[:port]> <client-username>@<message-vpn> <client-password>.\n' +
                'Available protocols are ws://, wss://, http://, https://, tcp://, tcps://');
            process.exit();
        }

        publisher.log('*** publisher to topic "' + publisher.topicName + '" is ready to connect ***');

        var hosturl = argv.slice(2)[0];
        publisher.log('Connecting to Solace PubSub+ Event Broker using url: ' + hosturl);
        var usernamevpn = argv.slice(3)[0];
        var username = usernamevpn.split('@')[0];
        publisher.log('Client username: ' + username);
        var vpn = usernamevpn.split('@')[1];
        publisher.log('Solace PubSub+ Event Broker VPN name: ' + vpn);
        var pass = argv.slice(4)[0];

        // create session
        try {
            publisher.session = solace.SolclientFactory.createSession({
                // solace.SessionProperties
                url:      hosturl,
                vpnName:  vpn,
                userName: username,
                password: pass,
                publisherProperties: {
                  acknowledgeMode: solace.MessagePublisherAcknowledgeMode.PER_MESSAGE,
              }          
            });
        } catch (error) {
            publisher.log(error.toString());
        }
        // define session event listeners
        publisher.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            publisher.log('=== Successfully connected and ready to publish messages. ===');
            publisher.publish();
        });
        publisher.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            publisher.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
        });
        publisher.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            publisher.log('Disconnected.');
            if (publisher.session !== null) {
                publisher.session.dispose();
                publisher.session = null;
            }
        });
        publisher.session.on(solace.SessionEventCode.ACKNOWLEDGED_MESSAGE, function (sessionEvent) {
            publisher.log('Delivery of message to PubSub+ Broker with correlation key = ' +
                sessionEvent.correlationKey.id + ' confirmed.');
            publisher.exit();
        });
        publisher.session.on(solace.SessionEventCode.REJECTED_MESSAGE_ERROR, function (sessionEvent) {
            publisher.log('Delivery of message to PubSub+ Broker with correlation key = ' +
                sessionEvent.correlationKey.id + ' rejected, info: ' + sessionEvent.infoStr);
            publisher.exit();
        });

        publisher.connectToSolace();   

    };

    // Actually connects the session triggered when the iframe has been loaded - see in html code
    publisher.connectToSolace = function () {
        try {
            publisher.session.connect();
        } catch (error) {
            publisher.log(error.toString());
        }
    };

    // Publish one message
    publisher.publish = function () {
        if (publisher.session !== null) {
            var messageText = 'Sample Message';
            var message = solace.SolclientFactory.createMessage();
            message.setBinaryAttachment(messageText);
            message.setDeliveryMode(solace.MessageDeliveryModeType.PERSISTENT);
            // OPTIONAL: You can set a correlation key on the message and check for the correlation
            // in the ACKNOWLEDGE_MESSAGE callback. Define a correlation key object
            const correlationKey = {
                name: "MESSAGE_CORRELATIONKEY",
                id: Date.now()
            };
            message.setCorrelationKey(correlationKey);
            publisher.log('Publishing message "' + messageText + '" to topic "' + publisher.topicName + '/' + correlationKey.id + '"...');
            message.setDestination(solace.SolclientFactory.createTopicDestination(publisher.topicName + '/' + correlationKey.id));

            try {
                // Delivery not yet confirmed. See ConfirmedPublish.js
                publisher.session.send(message);
                publisher.log('Message sent with correlation key: ' + correlationKey.id);
            } catch (error) {
                publisher.log(error.toString());
            }
        } else {
            publisher.log('Cannot publish messages because not connected to Solace PubSub+ Event Broker.');
        }
    };

    publisher.exit = function () {
      publisher.disconnect();
        setTimeout(function () {
            process.exit();
        }, 1000); // wait for 1 second to finish
    };

    // Gracefully disconnects from Solace PubSub+ Event Broker
    publisher.disconnect = function () {
        publisher.log('Disconnecting from Solace PubSub+ Event Broker...');
        if (publisher.session !== null) {
            try {
                publisher.session.disconnect();
            } catch (error) {
                publisher.log(error.toString());
            }
        } else {
            publisher.log('Not connected to Solace PubSub+ Event Broker.');
        }
    };

    return publisher;
};


var solace = require('solclientjs').debug; // logging supported

// Initialize factory with the most recent API defaults
var factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);

// enable logging to JavaScript console at WARN level
// NOTICE: works only with ('solclientjs').debug
solace.SolclientFactory.setLogLevel(solace.LogLevel.WARN);

// create the publisher, specifying the name of the destination topic
var publisher = new GuaranteedPublisher('solace/samples/nodejs/pers');
// send message to Solace PubSub+ Event Broker
publisher.run(process.argv);
