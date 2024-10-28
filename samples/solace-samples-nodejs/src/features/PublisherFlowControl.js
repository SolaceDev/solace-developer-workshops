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
 * Publish/Subscribe tutorial - Topic Publisher with Flow Control
 * Demonstrates publishing direct messages to a topic with handling network level flow control
 */

/*jslint es6 node:true devel:true*/

var PublisherFlowControl = function (solaceModule, topicName) {
    'use strict';
    var solace = solaceModule;
    var publisher = {};
    publisher.session = null;
    publisher.topicName = topicName;

    function argInt(number){
        var num = -1;
        if (number && typeof number === 'string') {
            num = parseInt(number);
        }
        return num;
    }
    // Logger
    publisher.log = function (line) {
        var now = new Date();
        var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2),
            ('0' + now.getSeconds()).slice(-2)];
        var timestamp = '[' + time.join(':') + '] ';
        console.log(timestamp + line);
    };

    // publisher message options
    publisher.options = {
        MessagesToSend : 50,
        MessageSize : 10,
    };

    publisher.log('\n*** Publisher to topic "' + publisher.topicName + '" is ready to connect ***');

    // main function
    publisher.run = function (argv) {
        publisher.connect(argv);
    };

    // Establishes connection to Solace message router
    publisher.connect = function (argv) {
        if (publisher.session !== null) {
            publisher.log('Already connected and ready to publish.');
            return;
        }
        // extract params
        if (argv.length < (2 + 3 + Object.keys(publisher.options).length)) { // expecting 3 + options.length real arguments
            var optionsStr = '';
            Object.keys(publisher.options).forEach((key) => {
                optionsStr += ` <${key}>`;
            });
            publisher.log('Cannot connect: expecting all arguments' +
                ' <protocol://host[:port]> <client-username>@<message-vpn> <client-password>' + optionsStr + '.\n' +
                'Available protocols are ws://, wss://, http://, https://, tcp://, tcps://');
            process.exit();
        }
        var hosturl = argv.slice(2)[0];
        publisher.log('Connecting to Solace message router using url: ' + hosturl);
        var usernamevpn = argv.slice(3)[0];
        var username = usernamevpn.split('@')[0];
        publisher.log('Client username: ' + username);
        var vpn = usernamevpn.split('@')[1];
        publisher.log('Solace message router VPN name: ' + vpn);
        var pass = argv.slice(4)[0];
        var messagesToSend = argInt(argv.slice(5)[0]);
        publisher.options.MessagesToSend = messagesToSend < 1
            ? publisher.options.MessagesToSend // use default value
            : messagesToSend; // use argument value
        var messageByteSize = argInt(argv.slice(6)[0]);
        publisher.options.MessageSize = messageByteSize < 1
            ? publisher.options.MessageSize // use default value
            : messageByteSize; // argument value
        // create session
        try {
            publisher.session = solace.SolclientFactory.createSession({
                // solace.SessionProperties
                url:      hosturl,
                vpnName:  vpn,
                userName: username,
                password: pass,
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
        publisher.session.on(solace.SessionEventCode.CAN_ACCEPT_DATA, function (sessionEvent) {
            publisher.log(`Got CAN_ACCEPT_DATA, Ready to resume publishing messages`);
            if (publisher.currentSendingMessage) {
                // resume publishing
                publisher.publish();
            }
        });
        publisher.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            publisher.log('Disconnected.');
            if (publisher.session !== null) {
                publisher.session.dispose();
                publisher.session = null;
            }
        });
        // connect the session
        try {
            publisher.session.connect();
        } catch (error) {
            publisher.log(error.toString());
        }
    };

    // publishing message state fields
    publisher.messagesSent = 0;
    publisher.messageBodyText = null;
    // creates publisher.options.MessagesToSend messages to send
    publisher.getNextMessage = function () {
        var message = null;
        publisher.messageBodyText = publisher.messageBodyText || 'c'.repeat(publisher.options.MessageSize);
        if (publisher.messagesSent < publisher.options.MessagesToSend) {
            var messageText = `Sample Message ${publisher.messagesSent++}\n${publisher.messageBodyText}`;
            message = solace.SolclientFactory.createMessage();
            message.setBinaryAttachment(messageText);
            message.setDeliveryMode(solace.MessageDeliveryModeType.DIRECT);
        }
        return message;
    };
    // last message attempted to be sent
    publisher.currentSendingMessage = null;
    // Publishes messages until publisher.getNextMessage is null or socket full exception is caught
    publisher.publish = function () {
        if (publisher.session !== null) {
            publisher.topic = publisher.topic || solace.SolclientFactory.createTopicDestination(publisher.topicName);
            publisher.log(`Starting publishing from message ${publisher.messagesSent}`);
            publisher.currentSendingMessage = publisher.currentSendingMessage || publisher.getNextMessage();
            while (publisher.currentSendingMessage) {
                var message = publisher.currentSendingMessage;
                message.setDestination(publisher.topic);
                try {
                    publisher.session.send(message);
                    publisher.currentSendingMessage = publisher.getNextMessage();
                } catch (error) {
                    if (error instanceof solace.OperationError && error.subcode === solace.ErrorSubcode.INSUFFICIENT_SPACE) {
                        // received socket buffer full error
                        // should expected a session CAN_ACCEPT_DATA event when publishing can resume
                        publisher.log(`Got INSUFFICIENT_SPACE, will resume (published ${publisher.messagesSent})`);
                    } else {
                        publisher.log(error.toString());
                    }
                    break;
                }
            }
            if (!publisher.currentSendingMessage) {
                // finished publishing exit
                publisher.exit();
            }
        } else {
            publisher.log('Cannot publish because not connected to Solace message router.');
        }
    };

    publisher.exit = function () {
        publisher.disconnect();
        setTimeout(function () {
            process.exit();
        }, 1000); // wait for 1 second to finish
    };

    // Gracefully disconnects from Solace message router
    publisher.disconnect = function () {
        publisher.log('Disconnecting from Solace message router...');
        if (publisher.session !== null) {
            try {
                publisher.session.disconnect();
            } catch (error) {
                publisher.log(error.toString());
            }
        } else {
            publisher.log('Not connected to Solace message router.');
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

// create the publisher, specifying the name of the subscription topic
var publisher = new PublisherFlowControl(solace, 'tutorial/topic');

// publish message to Solace message router
publisher.run(process.argv);
