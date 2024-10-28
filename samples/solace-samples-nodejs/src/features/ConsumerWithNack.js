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
 * Nackconsumer tutorial - Consumer with NACK support
 * Demonstrates Acking persistent messages with a FAILED or REJECTED settlement outcomes from a queue.
 *
 * This sample shows how to consume messages from an Endpoint and settle the consumed
 * messages with an outcome of ACCEPTED, FAILED or REJECTED. The sample will
 * consume messages from the "tutorial/queue" queue.
 */

/*jslint es6 node:true devel:true*/

var ConsumerWithNack = function (solaceModule, queueName) {
    'use strict';
    var solace = solaceModule;
    var consumer = {};
    consumer.session = null;
    consumer.messageConsumer = null;
    consumer.queueName = queueName;
    consumer.consuming = false;
    consumer.settlementOutcome = null;

    // Logger
    consumer.log = function (line) {
        var now = new Date();
        var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2),
            ('0' + now.getSeconds()).slice(-2)];
        var timestamp = '[' + time.join(':') + '] ';
        console.log(timestamp + line);
    };

    consumer.log('\n*** Consumer to queue "' + consumer.queueName + '" is ready to connect ***');

    // main function
    consumer.run = function (argv) {
        consumer.connect(argv);
    };

    // Establishes connection to Solace PubSub+ Event Broker
    consumer.connect = function (argv) {
        if (consumer.session !== null) {
            consumer.log('Already connected and ready to consume messages.');
            return;
        }
        // extract params
        if (argv.length < (2 + 3)) { // expecting at least 3 real arguments (password is optional)
            consumer.log('Cannot connect: expecting at least 3 arguments (Password is Optional)' +
                ' <protocol://host[:port]> <client-username>@<message-vpn> <client-password> <message-settlement-outcome>.\n' +
                'Available protocols are ws://, wss://, http://, https://, tcp://, tcps:// \n' +
                'Available Message settlement outcomes are: --accepted, --failed, --rejected, --any');
            process.exit();
        }
        var hosturl = argv.slice(2)[0];
        consumer.log('Connecting to Solace PubSub+ Event Broker using url: ' + hosturl);
        var usernamevpn = argv.slice(3)[0];
        var usernameVpnParts = usernamevpn.split('@');
        var username = usernameVpnParts[0];
        consumer.log('Client username: ' + username);
        var vpn = usernameVpnParts[1];
        consumer.log('Solace PubSub+ Event Broker VPN name: ' + vpn);
        var passOrOutcome = argv.slice(4)[0];
        var isSettlementOutcome = argv.slice(5)[0];

        var pass = null;
        var outcome = ""; // default is an empty string

        var settlementOpts = ['--accepted', '--failed', '--rejected', '--any'];
        // is settlement outcome passed as 4th argument ? or 5th ?
        if(isSettlementOutcome) {
            pass = passOrOutcome; // should be password
            outcome = isSettlementOutcome; // the settlement outcome
        }
        else if(!isSettlementOutcome && (settlementOpts.indexOf(passOrOutcome.toLowerCase()) !== -1)) {
            outcome = passOrOutcome;
        } 

        // no valid settlement outcome found, log error and exit
        if(settlementOpts.indexOf(outcome.toLowerCase()) === -1) {
            consumer.log('Cannot connect: expecting valid settlement outcomes argument.\n' +
                'Available Message settlement outcomes are: --accepted, --failed, --rejected, --any');
            process.exit();
        }

        // set the settlement outcome on the consumer here
        consumer.settlementOutcome = outcome.substring(2);

        // create session
        try {
            consumer.session = solace.SolclientFactory.createSession({
                // solace.SessionProperties
                url:      hosturl,
                vpnName:  vpn,
                userName: username,
                password: pass,
            });
        } catch (error) {
            consumer.log(error.toString());
        }
        // define session event listeners
        consumer.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            consumer.log('=== Successfully connected and ready to start the message consumer. ===');
            consumer.startConsume();
        });
        consumer.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            consumer.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
        });
        consumer.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            consumer.log('Disconnected.');
            consumer.consuming = false;
            if (consumer.session !== null) {
                consumer.session.dispose();
                consumer.session = null;
            }
        });
        // connect the session
        try {
            consumer.session.connect();
        } catch (error) {
            consumer.log(error.toString());
        }
    };

    // Starts consuming from a queue on Solace PubSub+ Event Broker
    consumer.startConsume = function () {
        if (consumer.session !== null) {
            if (consumer.consuming) {
                consumer.log('Already started consumer for queue "' + consumer.queueName +
                    '" and ready to receive messages.');
            } else {
                consumer.log('Starting consumer for queue: ' + consumer.queueName);
                try {
                    // Create a message consumer
                    consumer.messageConsumer = consumer.session.createMessageConsumer({
                        // solace.MessageConsumerProperties
                        queueDescriptor: { name: consumer.queueName, type: solace.QueueType.QUEUE },
                        acknowledgeMode: solace.MessageConsumerAcknowledgeMode.CLIENT, // Enabling Client ack
                        requiredSettlementOutcomes: [
                            solace.MessageOutcome.FAILED,
                            solace.MessageOutcome.REJECTED
                        ], // set the settlement outcome for the flow
                        createIfMissing: true // Create queue if not exists
                    });
                    // Define message consumer event listeners
                    consumer.messageConsumer.on(solace.MessageConsumerEventName.UP, function () {
                        consumer.consuming = true;
                        consumer.log('=== Ready to receive messages. ===');
                    });
                    consumer.messageConsumer.on(solace.MessageConsumerEventName.CONNECT_FAILED_ERROR, function () {
                        consumer.consuming = false;
                        consumer.log('=== Error: the message consumer could not bind to queue "' + consumer.queueName +
                            '" ===\n   Ensure this queue exists on the message router vpn');
                        consumer.exit();
                    });
                    consumer.messageConsumer.on(solace.MessageConsumerEventName.DOWN, function () {
                        consumer.consuming = false;
                        consumer.log('=== The message consumer is now down ===');
                    });
                    consumer.messageConsumer.on(solace.MessageConsumerEventName.DOWN_ERROR, function () {
                        consumer.consuming = false;
                        consumer.log('=== An error happened, the message consumer is down ===');
                    });
                    // Define message received event listener
                    consumer.messageConsumer.on(solace.MessageConsumerEventName.MESSAGE, function (message) {
                        consumer.log('Received message: "' + message.getBinaryAttachment() + '",' +
                            ' details:\n' + message.dump());

                        try {
                            let messageSettlementOutcome = solace.MessageOutcome.ACCEPTED; // default

                            if(consumer.settlementOutcome === 'any') {
                                const outcomes = [
                                    solace.MessageOutcome.ACCEPTED,
                                    solace.MessageOutcome.FAILED,
                                    solace.MessageOutcome.REJECTED
                                ];
                                const rand = Math.floor(Math.random() * 3);
                                messageSettlementOutcome = outcomes[rand]; // select one randomly
                            } else if(consumer.settlementOutcome === 'accepted') {
                                messageSettlementOutcome = solace.MessageOutcome.ACCEPTED;
                            }
                            else if(consumer.settlementOutcome === 'failed') {
                                messageSettlementOutcome = solace.MessageOutcome.FAILED;
                            }
                            else if(consumer.settlementOutcome === 'rejected') {
                                messageSettlementOutcome = solace.MessageOutcome.REJECTED;
                            }

                            // Need to explicitly settle (NACK) otherwise it will not be deleted from the message router
                            message.settle(messageSettlementOutcome);
            
                            consumer.log(`Message was successfully Settled with Outcome: solace.MessageOutcome.${
                                solace.MessageOutcome.nameOf(messageSettlementOutcome)
                            }`);
                        } catch (error) {
                            // log message.settle(MessageOutcome); error
                            consumer.log(`Message Outcome Settlement Error: ${error.toString()}`);
                        }
                    });
                    // Connect the message consumer
                    consumer.messageConsumer.connect();
                } catch (error) {
                    consumer.log(error.toString());
                }
            }
        } else {
            consumer.log('Cannot start the Nack consumer because not connected to Solace PubSub+ Event Broker.');
        }
    };

    consumer.exit = function () {
        consumer.stopConsume();
        consumer.disconnect();
        setTimeout(function () {
            process.exit();
        }, 1000); // wait for 1 second to finish
    };

    // Disconnects the consumer from queue on Solace PubSub+ Event Broker
    consumer.stopConsume = function () {
        if (consumer.session !== null) {
            if (consumer.consuming) {
                consumer.consuming = false;
                consumer.log('Disconnecting consumption from queue: ' + consumer.queueName);
                try {
                    consumer.messageConsumer.disconnect();
                    consumer.messageConsumer.dispose();
                } catch (error) {
                    consumer.log(error.toString());
                }
            } else {
                consumer.log('Cannot disconnect the consumer because it is not connected to queue "' +
                    consumer.queueName + '"');
            }
        } else {
            consumer.log('Cannot disconnect the consumer because not connected to Solace PubSub+ Event Broker.');
        }
    };

    // Gracefully disconnects from Solace PubSub+ Event Broker
    consumer.disconnect = function () {
        consumer.log('Disconnecting from Solace PubSub+ Event Broker...');
        if (consumer.session !== null) {
            try {
                consumer.session.disconnect();
            } catch (error) {
                consumer.log(error.toString());
            }
        } else {
            consumer.log('Not connected to Solace PubSub+ Event Broker.');
        }
    };

    return consumer;
};

var solace = require('solclientjs').debug; // logging supported

// Initialize factory with the most recent API defaults
var factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);

// enable logging to JavaScript console at WARN level
// NOTICE: works only with ('solclientjs').debug
solace.SolclientFactory.setLogLevel(solace.LogLevel.WARN);

// create the consumer, specifying the name of the queue
var consumer = new ConsumerWithNack(solace, 'tutorial/queue');

// subscribe to messages on Solace PubSub+ Event Broker
consumer.run(process.argv);

// wait to be told to exit
consumer.log("Press Ctrl-C to exit");
process.stdin.resume();

process.on('SIGINT', function () {
    'use strict';
    consumer.exit();
});
