import solace from 'solclientjs';

class SolaceClient {
  constructor() {
    this.session = null;
    this.subscribed = new Set(); // Track multiple subscriptions
    this.messageCallback = null;
    this.eventCallback = null;
    
    // Initialize the Solace library
    const factoryProps = new solace.SolclientFactoryProperties();
    factoryProps.profile = solace.SolclientFactoryProfiles.version10;
    solace.SolclientFactory.init(factoryProps);
    
    // Enable logging
    solace.SolclientFactory.setLogLevel(solace.LogLevel.INFO);
  }

  connect(url, vpn, username, password, onSuccess, onFailure) {
    if (this.session !== null) {
      console.log('Already connected');
      return;
    }

    try {
      this.session = solace.SolclientFactory.createSession({
        url: url,
        vpnName: vpn,
        userName: username,
        password: password,
        connectRetries: 3,
        reconnectRetries: 3,
      });

      // Set up event handlers
      this.session.on(solace.SessionEventCode.UP_NOTICE, (sessionEvent) => {
        console.log('=== Successfully connected ===');
        if (this.eventCallback) {
          this.eventCallback('connected', sessionEvent);
        }
        if (onSuccess) {
          onSuccess(sessionEvent);
        }
      });

      this.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, (sessionEvent) => {
        console.log('Connection failed', sessionEvent);
        if (this.eventCallback) {
          this.eventCallback('connect_failed', sessionEvent);
        }
        if (onFailure) {
          onFailure(sessionEvent);
        }
        this.session.dispose();
        this.session = null;
      });

      this.session.on(solace.SessionEventCode.DISCONNECTED, (sessionEvent) => {
        console.log('Disconnected');
        if (this.eventCallback) {
          this.eventCallback('disconnected', sessionEvent);
        }
        if (this.session !== null) {
          this.session.dispose();
          this.session = null;
        }
      });

      this.session.on(solace.SessionEventCode.MESSAGE, (message) => {
        console.log('📩 Message received:', message);
        if (this.messageCallback) {
          this.messageCallback(message);
        } else {
          console.warn('⚠️ Message received but no callback set');
        }
      });

      this.session.on(solace.SessionEventCode.SUBSCRIPTION_OK, (sessionEvent) => {
        console.log('✅ Subscription confirmed:', sessionEvent.correlationKey);
        if (this.eventCallback) {
          this.eventCallback('subscription_ok', sessionEvent);
        }
      });

      this.session.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, (sessionEvent) => {
        console.error('❌ Subscription error:', sessionEvent);
        if (this.eventCallback) {
          this.eventCallback('subscription_error', sessionEvent);
        }
      });

      // Connect the session
      this.session.connect();
    } catch (error) {
      console.error('Error connecting:', error);
      if (onFailure) {
        onFailure(error);
      }
    }
  }

  disconnect() {
    if (this.session !== null) {
      try {
        this.session.disconnect();
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }
  }

  subscribe(topic, onSuccess, onFailure) {
    if (this.session === null) {
      console.log('Cannot subscribe - not connected');
      if (onFailure) {
        onFailure('Not connected');
      }
      return;
    }

    // Check if already subscribed to this topic
    if (this.subscribed.has(topic)) {
      console.log('Already subscribed to:', topic);
      if (onSuccess) {
        onSuccess(topic);
      }
      return;
    }

    try {
      this.session.subscribe(
        solace.SolclientFactory.createTopicDestination(topic),
        true, // request confirmation
        topic,
        10000 // timeout
      );
      this.subscribed.add(topic);
      console.log('Subscribed to:', topic);
      console.log('Active subscriptions:', Array.from(this.subscribed));
      if (onSuccess) {
        onSuccess(topic);
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      if (onFailure) {
        onFailure(error);
      }
    }
  }

  unsubscribe(topic) {
    if (this.session === null) {
      return;
    }

    try {
      this.session.unsubscribe(
        solace.SolclientFactory.createTopicDestination(topic),
        true,
        topic,
        10000
      );
      this.subscribed.delete(topic);
      console.log('Unsubscribed from:', topic);
      console.log('Active subscriptions:', Array.from(this.subscribed));
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }
  }

  setMessageCallback(callback) {
    this.messageCallback = callback;
  }

  setEventCallback(callback) {
    this.eventCallback = callback;
  }

  isConnected() {
    return this.session !== null;
  }

  getCurrentSubscriptions() {
    return Array.from(this.subscribed);
  }

  isSubscribed(topic) {
    return this.subscribed.has(topic);
  }
}

export default SolaceClient;
