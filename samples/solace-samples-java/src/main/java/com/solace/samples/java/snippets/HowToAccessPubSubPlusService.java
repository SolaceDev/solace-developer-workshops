/*
 * Copyright 2021-2023 Solace Corporation. All rights reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

package com.solace.samples.java.snippets;


import com.solace.messaging.MessagingService;
import com.solace.messaging.MessagingServiceClientBuilder;
import com.solace.messaging.config.profile.ConfigurationProfile;
import com.solace.messaging.util.CompletionListener;
import java.util.LinkedList;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;

/**
 * Sampler for messaging service access configuration
 */
public class HowToAccessPubSubPlusService {

//  /**
//   * Example how to configure service access using environment variables. Random generated
//   * application identifier will be used. PATH environment variable can be used to pass parameter to
//   * the application.
//   *
//   * @return connected instance of a messaging service, ready to be used
//   */
//  public static MessagingService configureAndConnectFromEnvironmentVariables() {
//    return MessagingService.builder(ConfigurationProfile.V1).fromEnvironmentVariables()
//        .build().connect();
//  }

//  /**
//   * Example how to configure service access using environment variables and with a given
//   * application identifier.
//   *
//   * @param myApplicationIdentifier static application identifier
//   * @return connected instance of a messaging service, ready to be used
//   */
//  public static MessagingService configureAndConnectWithStaticApplicationIdentifier(
//      String myApplicationIdentifier) {
//    return MessagingService.builder(ConfigurationProfile.V1).fromEnvironmentVariables()
//        .build(myApplicationIdentifier).connect();
//  }

//  /**
//   * Example how to configure service access using system properties. System properties can be set
//   * using -D[propertyName]=propertyValue
//   *
//   * @return connected instance of a messaging service, ready to be used
//   */
//  public static MessagingService configureFromSystemProperties() {
//    return MessagingService.builder(ConfigurationProfile.V1).fromSystemProperties()
//        .build().connect();
//  }

  /**
   * Example how to configure service access to the broker running on a localhost using well known
   * defaults. To be used for testing only.
   *
   * @return connected instance of a messaging service, ready to be used
   */
  public static MessagingService configureAndConnectOnLocalHost() {
    return MessagingService.builder(ConfigurationProfile.V1).local().build().connect();
  }

  /**
   * Example how to configure service access to the broker and check if it is connected.
   *
   * @return true if service access is established
   */
  public static boolean configureConnectOnLocalHostAndCheckIfConnected() {
    MessagingService service = MessagingService.builder(ConfigurationProfile.V1).local().build()
        .connect();
    return service.isConnected();
  }

  /**
   * Example how to configure service access to the broker using properties
   *
   * @param serviceConfiguration configuration properties with keys from {@link
   *                             com.solace.messaging.config.SolaceProperties}
   * @return connected instance of a messaging service, ready to be used
   */
  public static MessagingService configureAndConnectUsingProperties(
      Properties serviceConfiguration) {
    return MessagingService.builder(ConfigurationProfile.V1).fromProperties(serviceConfiguration)
        .build().connect();
  }

//  /**
//   * Example how to configure service access to the broker using properties file.
//   *
//   * @return connected instance of a messaging service, ready to be used
//   */
//  public static MessagingService configureAndConnectUsingPropertyFile() {
//    return MessagingService.builder(ConfigurationProfile.V1)
//        .fromFile(new File("myBrokerConfig.properties")).build().connect();
//  }


  /**
   * Example how to get a list of 2 independent Service instances, which are sharing common
   * configuration, but independent up to the tcp layer
   *
   * @param serviceConfiguration properties for service configuration
   * @return list of 2 fully independent Service instances connected to the same hard- or software
   * PubSub+ message broker
   */
  public static List<MessagingService> get2ServicesAccessedFromSingleBuilder(
      Properties serviceConfiguration) {
    // loading config from a file
    MessagingServiceClientBuilder serviceConfigurationBuilder = MessagingService
        .builder(ConfigurationProfile.V1)
        .fromProperties(serviceConfiguration);

    //serviceA and serviceB pointing to the same hard- or software PubSub+ message broker
    MessagingService serviceA = serviceConfigurationBuilder.build().connect();
    MessagingService serviceB = serviceConfigurationBuilder.build().connect();

    List<MessagingService> services = new LinkedList<>();
    services.add(serviceA);
    services.add(serviceB);
    return services;
  }

  /**
   * Example how to get a list of 2 independent Service instances, which are pointing to the same
   * broker, but independent up to the tcp layer
   *
   * @return list of 2 fully independent Service instances connected to the same hard- or * software
   * PubSub+ message broker
   */
  public static List<MessagingService> get2ServicesAccessedFrom2Builder() {
    // loading same config files
    MessagingServiceClientBuilder serviceConfigurationBuilder1 = MessagingService
        .builder(ConfigurationProfile.V1).local();
    MessagingServiceClientBuilder serviceConfigurationBuilder2 = MessagingService
        .builder(ConfigurationProfile.V1)
        .local();

    // serviceA and serviceB pointing to the same hard- or software PubSub+ message broker
    MessagingService serviceA = serviceConfigurationBuilder1.build().connect();
    MessagingService serviceB = serviceConfigurationBuilder2.build().connect();

    List<MessagingService> services = new LinkedList<>();
    services.add(serviceA);
    services.add(serviceB);
    return services;
  }

  /**
   * Example how to configure service access using blocking messaging Java API and concurrent
   * utilities running in parallel with another two tasks
   *
   * @param myApplicationIdentifier static application identifier
   * @param execService             Executor service to execute activities to be run in parallel to
   *                                configuration
   */
  public static void asynchronousConnectUsingCountDownLatchAndBlockingApi(
      String myApplicationIdentifier, final ExecutorService execService) {

    final MessagingService service = MessagingService.builder(ConfigurationProfile.V1)
        .local()
        .build(myApplicationIdentifier);

    final int taskCount = 3;
    final CountDownLatch latch = new CountDownLatch(taskCount);

    // T#1 run messaging service connect asynchronously
    execService.submit(() -> {
      service.connect();
      latch.countDown();
    });

    // T#2 establish connection to db asynchronously
    execService.submit(() -> {
      // establish connection to db here
      latch.countDown();
    });

    // T#3 establish connection to an object store asynchronously
    execService.submit(() -> {
      // establish connection to an object store here
      latch.countDown();
    });

    try {
      // wait until all 3 tasks are finished
      latch.await();
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }

    // !!! by now messaging service is connected and 2 another tasks
    // (db connected & object store connected) are finished successfully
  }


  /**
   * Example how to connect to a broker fully asynchronously using Async API. See {@link
   * CompletionStage} API for more use cases
   *
   * @param service configured instance of {@code MessagingService} ready to be connected
   * @see <a href="https://community.oracle.com/docs/DOC-995305">CompletableFuture for Asynchronous
   * Programming in Java 8</a>
   */
  public static void asynchronousConnect(final MessagingService service) {

    // promiseOfConnectedService can be used to start publisher or receiver asynchronously
    // or some another operations
    final CompletionStage<MessagingService> promiseOfConnectedService = service.<MessagingService>connectAsync()
        .whenComplete((messagingService, throwable) -> {
          if (throwable != null) {
            // This method can't prevent exception propagation.
            // Exception logging can be performed here,
            // or code can be placed here that releases some external resources.
            // IMPORTANT: when exception is occurred during connection creation, then
            // this exception is propagated over entire call chain, preventing  ALL another  calls
            // from execution  (receiver won't attempt to start, message listener won't be registered)
            // IMPORTANT: 'throwable' is of type java.util.concurrent.CompletionException, to get out nested exception use:
            final Throwable wrappedException = throwable.getCause();
            // wrappedException is very likely of type PubSubPlusClientException, use cast/type check for processing
          }

        });
  }


  /**
   * Example how to connect to a broker fully asynchronously using callback {@link
   * CompletionListener}
   *
   * @param serviceToBeConnected configured instance of {@code MessagingService} ready to be
   *                             connected
   */
  public static void asynchronousConnectWithCallback(MessagingService serviceToBeConnected) {

    final CompletionListener<MessagingService> callbackListener = (startedService, throwable) -> {
      if (throwable != null) {
        // then connection attempt failed, deal with exception
      } else {
        // connection attempt succeed, can i.e start publisher or receiver out of callback
      }
    };
    serviceToBeConnected.connectAsync(callbackListener);
  }

  /**
   * Example how to connect to a broker fully asynchronously using  {@link CompletionListener}
   *
   * @param serviceToBeDisconnected configured instance of {@code MessagingService} ready to be
   *                                disconnected
   */
  public static void asynchronousDisconnectWithCallback(MessagingService serviceToBeDisconnected) {

    final CompletionListener<Void> callbackListener = (aVoid, throwable) -> {
      if (throwable != null) {
        // then disconnection attempt failed, deal with exception
      } else {
        // disconnection attempt succeed, we are done
      }
    };
    serviceToBeDisconnected.disconnectAsync(callbackListener);
  }

}
