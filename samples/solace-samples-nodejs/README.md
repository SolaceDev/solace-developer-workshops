# Getting Started Examples

## Solace Node.js API

The "Getting Started" tutorials will get you up to speed and sending messages with Solace technology as quickly as possible. There are three ways you can get started:

- Follow [these instructions](https://cloud.solace.com/learn/group_getting_started/ggs_signup.html) to quickly spin up a cloud-based Solace messaging service for your applications.
- Follow [these instructions](https://docs.solace.com/Solace-SW-Broker-Set-Up/Setting-Up-SW-Brokers.htm) to start the Solace VMR in leading Clouds, Container Platforms or Hypervisors. The tutorials outline where to download and how to install the Solace VMR.
- If your company has Solace PubSub+ Event Brokers deployed, contact your middleware team to obtain the host name or IP address of a Solace PubSub+ Event Broker to test against, a username and password to access it, and a VPN in which you can produce and consume messages.

## Content

This repository contains:

* Code and matching tutorial walk throughs for five different **basic** Solace messaging patterns. For a nice introduction to the Solace API and associated tutorials, check out the [tutorials home page](https://tutorials.solace.dev/nodejs).

    See the individual tutorials for details:

    - [Publish/Subscribe](https://tutorials.solace.dev/nodejs/publish-subscribe): Learn how to set up pub/sub messaging on a Solace VMR.
    - [Persistence](https://tutorials.solace.dev/nodejs/persistence-with-queues): Learn how to set up persistence for guaranteed delivery.
    - [Request/Reply](https://tutorials.solace.dev/nodejs/request-reply): Learn how to set up request/reply messaging.
    - [Confirmed Delivery](https://tutorials.solace.dev/nodejs/confirmed-delivery): Learn how to confirm that your messages are received by a Solace PubSub+ Event Broker.
    - [Topic to Queue Mapping](https://tutorials.solace.dev/nodejs/topic-to-queue-mapping): Learn how to map existing topics to Solace queues.

* Additional sample code, showing how to make use of advanced features of the Solace PubSub+ Event Broker is available in the [features directory](https://github.com/SolaceSamples/solace-samples-nodejs/tree/master/src/features).

    - [Secure Session](https://github.com/SolaceSamples/solace-samples-nodejs/blob/master/src/features/SecureSession.js): Learn how to use secure connection to the server, and server and client certificate authentication.
    - [Active Consumer Indication](https://github.com/SolaceSamples/solace-samples-nodejs/blob/master/src/features/ActiveConsumerIndication.js): Learn how multiple consumers can bind to an exclusive queue, but only one client at a time can actively receive messages.
    - [Durable Topic Endpoint Consumer](https://github.com/SolaceSamples/solace-samples-nodejs/blob/master/src/features/DTEConsumer.js): Learn how to consume messages from a Durable Topic Endpoint (DTE).
    - [Event Monitor](https://github.com/SolaceSamples/solace-samples-nodejs/blob/master/src/features/EventMonitor.js): Learn how to monitor message router generated events.
    - [GuaranteedRequestor](https://github.com/SolaceSamples/solace-samples-nodejs/blob/master/src/features/GuaranteedRequestor.js)/[Replier](https://github.com/SolaceSamples/solace-samples-nodejs/blob/master/src/features/GuaranteedReplier.js): Learn how to set up guaranteed request/reply messaging.
    - [NoLocal Pub-Sub](https://github.com/SolaceSamples/solace-samples-nodejs/blob/master/src/features/NoLocalPubSub.js): Learn how to prevent messages published on a session or consumer received on that same session or consumer.
    - [Compressed Publisher](https://github.com/SolaceSamples/solace-samples-nodejs/blob/master/src/features/CompressedPublisher.js): Minor variation on the Topic Publisher tutorial: adds compression.
    - [Flow Controlled Publisher](https://github.com/SolaceSamples/solace-samples-nodejs/blob/master/src/features/PublisherFlowControl.js): Minor variation on the Topic Publisher tutorial: adds publisher network flow control event handling.
    - [Consumer With NACK support](https://github.com/SolaceSamples/solace-samples-nodejs/blob/master/src/features/ConsumerWithNack.js): Learn how to consume and ACK/NACK messages from a queue with the `ACCEPTED`, `FAILED` and `REJECTED` settlement outcomes.

## Checking out

To check out the project, clone this GitHub repository:

```
git clone https://github.com/SolaceSamples/solace-samples-nodejs
cd solace-samples-nodejs
```

Note: the code in the `master` branch of this repository depends on Solace Node.js API version 10 or later. If you want to work with an older version clone the branch that corresponds your version.

### Download the Solace Node.js API

These samples depend on version 10 or later of the Solace Node.js API library.

The library can be installed from the `npmjs` central repository using the `package.json` specs.

For a local installation of the API package, run from the current `solace-samples-nodejs` directory:

```
npm install
```

## Running the Samples

The samples are found in the `src/basic-samples` and `src/features` directories.

You run the sample using node. For example:

```
node TopicPublisher.js <protocol://host:port> <client-username>@<message-vpn> <client-password>
```

See the [tutorials](https://tutorials.solace.dev/nodejs) for more details.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

See the list of [contributors](https://github.com/SolaceSamples/solace-samples-nodejs/contributors) who participated in this project.

## License

This project is licensed under the Apache License, Version 2.0. - See the [LICENSE](LICENSE) file for details.

## Resources

For more information try these resources:

- [Solace API Tutorials](https://tutorials.solace.dev/)
- The Solace Developer Portal website at: https://solace.dev
- Check out the [Solace blog](http://dev.solace.com/blog/) for other interesting discussions around Solace technology
- Ask the [Solace community.](https://solace.community)
