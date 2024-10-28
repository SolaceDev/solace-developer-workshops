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
 * Persistence with Queues tutorial - Queue Producer
 * Demonstrates sending persistent messages to a queue
 */

/*jslint es6 node:true devel:true*/

var QueueProducer = function (solaceModule, queueName) {
  'use strict';
  var solace = solaceModule;
  var producer = {};
  producer.session = null;
  producer.queueName = queueName;

  // Logger
  producer.log = function (line) {
      var now = new Date();
      var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2),
          ('0' + now.getSeconds()).slice(-2)];
      var timestamp = '[' + time.join(':') + '] ';
      console.log(timestamp + line);
  };

  producer.log('\n*** Producer to queue "' + producer.queueName + '" is ready to connect ***');

  // main function
  producer.run = function (argv) {
      producer.connect(argv);
  };

  // Establishes connection to Solace PubSub+ Event Broker
  producer.connect = function (argv) {
      if (producer.session !== null) {
          producer.log('Already connected and ready to send messages.');
          return;
      }
      // extract params
      if (argv.length < (2 + 3)) { // expecting 3 real arguments
          producer.log('Cannot connect: expecting all arguments' +
              ' <protocol://host[:port]> <client-username>@<message-vpn> <client-password>.\n' +
              'Available protocols are ws://, wss://, http://, https://, tcp://, tcps://');
          process.exit();
      }
      var hosturl = argv.slice(2)[0];
      producer.log('Connecting to Solace PubSub+ Event Broker using url: ' + hosturl);
      var usernamevpn = argv.slice(3)[0];
      var username = usernamevpn.split('@')[0];
      producer.log('Client username: ' + username);
      var vpn = usernamevpn.split('@')[1];
      producer.log('Solace PubSub+ Event Broker VPN name: ' + vpn);
      var pass = argv.slice(4)[0];
      // create session
      try {
          producer.session = solace.SolclientFactory.createSession({
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
          producer.log(error.toString());
      }
      // define session event listeners
      producer.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
          producer.log('=== Successfully connected and ready to send messages. ===');
          producer.sendMessage();
      });
      producer.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
          producer.log('Connection failed to the message router: ' + sessionEvent.infoStr +
              ' - check correct parameter values and connectivity!');
      });
      producer.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
          producer.log('Disconnected.');
          if (producer.session !== null) {
              producer.session.dispose();
              producer.session = null;
          }
      });
      producer.session.on(solace.SessionEventCode.ACKNOWLEDGED_MESSAGE, function (sessionEvent) {
          producer.log('Delivery of message with correlation key = ' +
              sessionEvent.correlationKey.id + ' confirmed.');
          producer.exit();
      });
      producer.session.on(solace.SessionEventCode.REJECTED_MESSAGE_ERROR, function (sessionEvent) {
          producer.log('Delivery of message with correlation key = ' +
              sessionEvent.correlationKey.id + ' rejected, info: ' + sessionEvent.infoStr);
          producer.exit();
      });

      // connect the session
      try {
          producer.session.connect();
      } catch (error) {
          producer.log(error.toString());
      }
  };

  // Sends one message
  producer.sendMessage = function () {
      if (producer.session !== null) {
          var messageText = 'Sample Message';
          var message = solace.SolclientFactory.createMessage();
          producer.log('Sending message "' + messageText + '" to queue "' + producer.queueName + '"...');
          message.setDestination(solace.SolclientFactory.createDurableQueueDestination(producer.queueName));
          message.setBinaryAttachment(messageText);
          message.setDeliveryMode(solace.MessageDeliveryModeType.PERSISTENT);
          // OPTIONAL: You can set a correlation key on the message and check for the correlation
          // in the ACKNOWLEDGE_MESSAGE callback. Define a correlation key object
          const correlationKey = {
              name: "MESSAGE_CORRELATIONKEY",
              id: Date.now()
          };
          message.setCorrelationKey(correlationKey);

          try {
              // Delivery not yet confirmed. See ConfirmedPublish.js
              producer.session.send(message);
              producer.log('Message sent.');
          } catch (error) {
              producer.log(error.toString());
          }
      } else {
          producer.log('Cannot send messages because not connected to Solace PubSub+ Event Broker.');
      }
  };

  producer.exit = function () {
      producer.disconnect();
      setTimeout(function () {
          process.exit();
      }, 1000); // wait for 1 second to finish
  };

  // Gracefully disconnects from Solace PubSub+ Event Broker
  producer.disconnect = function () {
      producer.log('Disconnecting from Solace PubSub+ Event Broker...');
      if (producer.session !== null) {
          try {
              producer.session.disconnect();
          } catch (error) {
              producer.log(error.toString());
          }
      } else {
          producer.log('Not connected to Solace PubSub+ Event Broker.');
      }
  };

  return producer;
};

var solace = require('solclientjs').debug; // logging supported

// Initialize factory with the most recent API defaults
var factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);

// enable logging to JavaScript console at WARN level
// NOTICE: works only with ('solclientjs').debug
solace.SolclientFactory.setLogLevel(solace.LogLevel.WARN);

// create the producer, specifying the name of the destination queue
var producer = new QueueProducer(solace, 'tutorial/queue');

// send message to Solace PubSub+ Event Broker
producer.run(process.argv);
