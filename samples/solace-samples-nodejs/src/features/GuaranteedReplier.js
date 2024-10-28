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
 * Guaranteed Request/Reply tutorial - Guaranteed Replier
 * Demonstrates how to receive a request message and responds
 * to it by sending a guaranteed reply message.
 *
 * This sample will show the implementation of guaranteed Request-Reply messaging,
 * where `GuaranteedRequestor` is a message Endpoint that sends a guaranteed request message
 * to a request topic and waits to receive a reply message on a dedicated temporary queue as
 * a response; `GuaranteedReplier` is a message Endpoint that waits to receive a request message
 * on a request topic - it will create a non-durable topic endpoint for that - and responds to
 * it by sending a guaranteed reply message.
 * Start the replier first as the non-durable topic endpoint will only be created for the
 * duration of the replier session and any request sent before that will not be received.
 */

/*jslint es6 devel:true node:true*/

var GuaranteedReplier = function (solaceModule, requestTopicName) {
    'use strict';
    var solace = solaceModule;
    var replier = {};
    replier.session = null;
    replier.messageConsumer = null;
    replier.requestTopicName = requestTopicName;
    replier.active = false;

    // Logger
    replier.log = function (line) {
        var now = new Date();
        var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2), ('0' + now.getSeconds()).slice(-2)];
        var timestamp = '[' + time.join(':') + '] ';
        console.log(timestamp + line);
    };

    replier.log('\n*** replier to request topic "' + replier.requestTopicName + '" is ready to connect ***');

    // main function
    replier.run = function (argv) {
        replier.connect(argv);
    };

    // Establishes connection to Solace PubSub+ Event Broker
    replier.connect = function (argv) {
        if (replier.session !== null) {
            replier.log('Already connected and ready to subscribe to request topic.');
            return;
        }
        // extract params
        if (argv.length < (2 + 3)) { // expecting 3 real arguments
            replier.log('Cannot connect: expecting all arguments' +
                ' <protocol://host[:port]> <client-username>@<message-vpn> <client-password>.\n' +
                'Available protocols are ws://, wss://, http://, https://, tcp://, tcps://');
            process.exit();
        }
        var hosturl = argv.slice(2)[0];
        replier.log('Connecting to Solace PubSub+ Event Broker using url: ' + hosturl);
        var usernamevpn = argv.slice(3)[0];
        var username = usernamevpn.split('@')[0];
        replier.log('Client username: ' + username);
        var vpn = usernamevpn.split('@')[1];
        replier.log('Solace PubSub+ Event Broker VPN name: ' + vpn);
        var pass = argv.slice(4)[0];        // create session
        try {
            replier.session = solace.SolclientFactory.createSession({
                // solace.SessionProperties
                url:      hosturl,
                vpnName:  vpn,
                userName: username,
                password: pass,
            });
        } catch (error) {
            replier.log(error.toString());
        }
        // define session event listeners
        replier.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            replier.log('=== Successfully connected and reply-service is starting ===');
            replier.startService();
        });
        replier.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            replier.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
        });
        replier.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            replier.log('Disconnected.');
            replier.active = false;
            if (replier.session !== null) {
                replier.session.dispose();
                replier.session = null;
            }
        });
        // connect the session
        try {
            replier.session.connect();
        } catch (error) {
            replier.log(error.toString());
        }
    };

    // Subscribes to temporary topic endpoint on Solace PubSub+ Event Broker
    replier.startService = function () {
        if (replier.session !== null) {
            if (replier.active) {
                replier.log('Replier already connected to temporary topic endpoint and ready to receive' +
                    ' messages.');
            } else {
                try {
                    replier.messageConsumer = replier.session.createMessageConsumer({
                        topicEndpointSubscription: replier.requestTopicName,
                        queueDescriptor: { type: solace.QueueType.TOPIC_ENDPOINT, durable: false }
                    });
                    replier.messageConsumer.on(solace.MessageConsumerEventName.UP, function () {
                        replier.active = true;
                        replier.log('Replier is consuming from temporary topic endpoint,' +
                            ' which is attracting messages to "' + replier.requestTopicName + '"');
                    });
                    replier.messageConsumer.on(solace.MessageConsumerEventName.MESSAGE,
                                               function onMessage(message) {
                        replier.reply(message);
                    });
                    replier.messageConsumer.connect();
                } catch (error) {
                    replier.log(error.toString());
                }
            }
        } else {
            replier.log('Cannot start replier because not connected to Solace PubSub+ Event Broker.');
        }
    };

    replier.reply = function (message) {
        replier.log('Received request: "' + message.getBinaryAttachment() + '", details:\n' + message.dump());
        replier.log('Replying...');
        if (replier.session !== null) {
            try {
                var replyMsg = solace.SolclientFactory.createMessage();
                var replyText = message.getBinaryAttachment().toString() + " - Sample Reply";
                replyMsg.setBinaryAttachment(replyText);
                replyMsg.setDestination(message.getReplyTo());
                replyMsg.setCorrelationId(message.getCorrelationId());
                replyMsg.setDeliveryMode(solace.MessageDeliveryModeType.PERSISTENT);
                replier.session.send(replyMsg);
            } catch (error) {
                console.log('Failed to send reply ');
                console.log(error.toString());
            }
            replier.log('Replied.');
        } else {
            replier.log('Cannot reply: not connected to Solace PubSub+ Event Broker.');
        }
    };

    replier.exit = function () {
        replier.stopService();
        replier.disconnect();
        setTimeout(function () {
            process.exit();
        }, 2000); // wait for 2 seconds to finish
    };

    // Stops the replier service on Solace PubSub+ Event Broker
    replier.stopService = function () {
        if (replier.session !== null) {
            if (replier.active) {
                replier.active = false;
                replier.log('Disconnecting from request topic endpoint: ' + replier.requestTopicName);
                try {
                    replier.messageConsumer.disconnect();
                    replier.messageConsumer.dispose();
                } catch (error) {
                    replier.log(error.toString());
                }
            } else {
                replier.log('Cannot stop replier because it is not connected to request topic endpoint "' +
                    replier.requestTopicName + '"');
            }
        } else {
            replier.log('Cannot stop replier because not connected to Solace PubSub+ Event Broker.');
        }
    };

    // Gracefully disconnects from Solace PubSub+ Event Broker
    replier.disconnect = function () {
        replier.log('Disconnecting from Solace PubSub+ Event Broker...');
        if (replier.session !== null) {
            try {
                replier.session.disconnect();
                replier.session.dispose();
                replier.session = null;
            } catch (error) {
                replier.log(error.toString());
            }
        } else {
            replier.log('Not connected to Solace PubSub+ Event Broker.');
        }
    };

    return replier;
};

var solace = require('solclientjs').debug; // logging supported

// Initialize factory with the most recent API defaults
var factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);

// enable logging to JavaScript console at WARN level
// NOTICE: works only with ('solclientjs').debug
solace.SolclientFactory.setLogLevel(solace.LogLevel.WARN);

// create the replier, specifying the name of the request topic endpoint
var replier = new GuaranteedReplier(solace, 'tutorial/requesttopic');

// reply to messages on Solace PubSub+ Event Broker
replier.run(process.argv);

// wait to be told to exit
replier.log("Press Ctrl-C to exit");
process.stdin.resume();

process.on('SIGINT', function () {
    'use strict';
    replier.exit();
});
