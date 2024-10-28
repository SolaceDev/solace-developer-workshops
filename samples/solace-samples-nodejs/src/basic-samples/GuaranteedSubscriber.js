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
 * Receiving Guaranteed messages on a Topic tutorial - Guaranteed Subscriber
 * Demonstrates receiving persistent messages on a topic
 */

/*jslint es6 browser devel:true*/
/*global solace*/

var GuaranteedSubscriber = function (queueName, topicName) {
    'use strict';
    var subscriber = {};
    subscriber.session = null;
    subscriber.flow = null;
    subscriber.queueName = queueName;
    subscriber.consuming = false;
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

    subscriber.log('*** Consumer to queue "' + subscriber.queueName + '" is ready to connect ***');

    // main function
    subscriber.run = function (argv) {
        subscriber.connect(argv);
    };

    // Establishes connection to Solace PubSub+ Event Broker
    subscriber.connect = function (argv) {
        if (subscriber.session !== null) {
            subscriber.log('Already connected and ready to consume messages.');
            return;
        }

        // extract params
        if (argv.length < (2 + 3)) { // expecting 3 real arguments
            subscriber.log('Cannot connect: expecting all arguments' +
                ' <protocol://host[:port]> <client-username>@<message-vpn> <client-password>.\n' +
                'Available protocols are ws://, wss://, http://, https://, tcp://, tcps://');
            process.exit();
        }
        var hosturl = argv.slice(2)[0];
        subscriber.log('Connecting to Solace PubSub+ Event Broker using url: ' + hosturl);
        var usernamevpn = argv.slice(3)[0];
        var username = usernamevpn.split('@')[0];
        subscriber.log('Client username: ' + username);
        var vpn = usernamevpn.split('@')[1];
        subscriber.log('Solace PubSub+ Event Broker VPN name: ' + vpn);
        var pass = argv.slice(4)[0];

        // create session
        try {
            subscriber.session = solace.SolclientFactory.createSession({
                // solace.SessionProperties
                url:      hosturl,
                vpnName:  vpn,
                userName: username,
                password: pass,
            });
        } catch (error) {
            subscriber.log(error.toString());
        }

        // define session event listeners
        subscriber.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            subscriber.log('=== Successfully connected and ready to start the message subscriber. ===');
            subscriber.startConsume();
        });
        subscriber.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            subscriber.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
        });
        subscriber.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            subscriber.log('Disconnected.');
            subscriber.consuming = false;
            if (subscriber.session !== null) {
                subscriber.session.dispose();
                subscriber.session = null;
            }
        });
        subscriber.connectToSolace();   
    };

    subscriber.connectToSolace = function () {
        try {
            subscriber.session.connect();
        } catch (error) {
            subscriber.log(error.toString());
        }
    };

    // Starts consuming messages from Solace PubSub+ Event Broker
    subscriber.startConsume = function () {
        if (subscriber.session !== null) {
            if (subscriber.consuming) {
                subscriber.log('Already started subscriber for queue "' + subscriber.queueName + '" and ready to receive messages.');
            } else {
                subscriber.log('Starting subscriber for queue: ' + subscriber.queueName);
                try {
                    // Create a message subscriber
                    subscriber.messageSubscriber = subscriber.session.createMessageConsumer({
                        // solace.MessageConsumerProperties
                        queueDescriptor: { name: subscriber.queueName, type: solace.QueueType.QUEUE },
                        acknowledgeMode: solace.MessageConsumerAcknowledgeMode.CLIENT, // Enabling Client ack
                        createIfMissing: true // Create queue if not exists
                    });
                    // Define message subscriber event listeners
                    subscriber.messageSubscriber.on(solace.MessageConsumerEventName.UP, function () {
                        subscriber.subscribe();
                        subscriber.consuming = true;
                        subscriber.log('=== Ready to receive messages. ===');
                    });
                    subscriber.messageSubscriber.on(solace.MessageConsumerEventName.CONNECT_FAILED_ERROR, function () {
                        subscriber.consuming = false;
                        subscriber.log('=== Error: the message subscriber could not bind to queue "' + subscriber.queueName +
                            '" ===\n   Ensure this queue exists on the message router vpn');
                        subscriber.exit();
                    });
                    subscriber.messageSubscriber.on(solace.MessageConsumerEventName.DOWN, function () {
                        subscriber.consuming = false;
                        subscriber.log('=== The message subscriber is now down ===');
                    });
                    subscriber.messageSubscriber.on(solace.MessageConsumerEventName.DOWN_ERROR, function () {
                        subscriber.consuming = false;
                        subscriber.log('=== An error happened, the message subscriber is down ===');
                    });
                    subscriber.messageSubscriber.on(solace.MessageConsumerEventName.SUBSCRIPTION_ERROR, function (sessionEvent) {
                      subscriber.log('Cannot subscribe to topic ' + sessionEvent.reason);
                    });
                    subscriber.messageSubscriber.on(solace.MessageConsumerEventName.SUBSCRIPTION_OK, function (sessionEvent) {
                      if (subscriber.subscribed) {
                        subscriber.subscribed = false;
                        subscriber.log('Successfully unsubscribed from topic: ' + sessionEvent.correlationKey);
                      } else {
                        subscriber.subscribed = true;
                        subscriber.log('Successfully subscribed to topic: ' + sessionEvent.correlationKey);
                        subscriber.log('=== Ready to receive messages. ===');
                      }
                    });
                    // Define message received event listener
                    subscriber.messageSubscriber.on(solace.MessageConsumerEventName.MESSAGE, function (message) {
                        subscriber.log('Received message: "' + message.getBinaryAttachment() + '",' +
                            ' details:\n' + message.dump());
                        // Need to explicitly ack otherwise it will not be deleted from the message router
                        message.acknowledge();
                    });
                    // Connect the message subscriber
                    subscriber.messageSubscriber.connect();
                } catch (error) {
                    subscriber.log(error.toString());
                }
            }
        } else {
            subscriber.log('Cannot start the queue subscriber because not connected to Solace PubSub+ Event Broker.');
        }
    };

    // Subscribes to topic on Solace PubSub+ Event Broker
    subscriber.subscribe = function () {
      if (subscriber.messageSubscriber !== null) {
        if (subscriber.subscribed) {
          subscriber.log('Already subscribed to "' + subscriber.topicName
              + '" and ready to receive messages.');
        } else {
          subscriber.log('Subscribing to topic: ' + subscriber.topicName);
          try {
            subscriber.messageSubscriber.addSubscription(
              solace.SolclientFactory.createTopicDestination(subscriber.topicName),
              subscriber.topicName, // correlation key as topic name
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
        setTimeout(function () {
          subscriber.stopConsume();
          subscriber.disconnect();
          process.exit();
        }, 1000); // wait for 1 second to get confirmation on removeSubscription
    };

    // Disconnects the subscriber from queue on Solace PubSub+ Event Broker
    subscriber.stopConsume = function () {
        if (subscriber.session !== null) {
            if (subscriber.consuming) {
                subscriber.consuming = false;
                subscriber.log('Disconnecting consumption from queue: ' + subscriber.queueName);
                try {
                    subscriber.messageSubscriber.disconnect();
                    subscriber.messageSubscriber.dispose();
                } catch (error) {
                    subscriber.log(error.toString());
                }
            } else {
                subscriber.log('Cannot disconnect the subscriber because it is not connected to queue "' +
                    subscriber.queueName + '"');
            }
        } else {
            subscriber.log('Cannot disconnect the subscriber because not connected to Solace PubSub+ Event Broker.');
        }
    };

    // Unsubscribes from topic on Solace PubSub+ Event Broker
    subscriber.unsubscribe = function () {
      if (subscriber.session !== null) {
        if (subscriber.subscribed) {
          subscriber.log('Unsubscribing from topic: ' + subscriber.topicName);
          try {
            subscriber.messageSubscriber.removeSubscription(
              solace.SolclientFactory.createTopicDestination(subscriber.topicName),
              subscriber.topicName, // correlation key as topic name
              10000 // 10 seconds timeout for this operation
            );
          } catch (error) {
            subscriber.log(error.toString());
          }
        } else {
          subscriber.log('Cannot unsubscribe because not subscribed to the topic "'
              + subscriber.topicName + '"');
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
                setTimeout(function () {
                    subscriber.session.disconnect();
                }, 1000); // wait for 1 second to get confirmation on removeSubscription
            } catch (error) {
                subscriber.log(error.toString());
            }
        } else {
            subscriber.log('Not connected to Solace PubSub+ Event Broker.');
        }
    };

    return subscriber;
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
var subscriber = new GuaranteedSubscriber('tutorial/queue', 'solace/samples/nodejs/pers/>');

// subscribe to messages on Solace PubSub+ Event Broker
subscriber.run(process.argv);

// wait to be told to exit
subscriber.log("Press Ctrl-C to exit");
process.stdin.resume();

process.on('SIGINT', function () {
    'use strict';
    subscriber.exit();
});

