import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Alert,
  Snackbar,
} from '@mui/material';
import SolaceClient from './solace/SolaceClient';
import { solaceColors } from './theme';

const BROKER_CONFIG = {
  url: 'wss://flight-tracking.messaging.solace.cloud:443',
  vpn: 'scds',
  username: 'reinvent25',
  password: 'reinvent25',
};

const PREDEFINED_TOPICS = [
  { label: 'FDPS/position/>', value: 'FDPS/position/>' },
  { label: 'STDDS/position/>', value: 'STDDS/position/>' },
  { label: 'FDPS/position/*/*/*/*/KIAH/>', value: 'FDPS/position/*/*/*/*/KIAH/>' },
  { label: 'STDDS/position/KIAH/>', value: 'STDDS/position/KIAH/>' },
];

function App() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [customTopic, setCustomTopic] = useState('');
  const [activeTopic, setActiveTopic] = useState(null);
  const [subscriptionError, setSubscriptionError] = useState(null);
  const [viewMode, setViewMode] = useState('topic'); // 'topic' or 'payload'
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const solaceClient = useRef(null);

  useEffect(() => {
    // Initialize Solace client
    solaceClient.current = new SolaceClient();

    // Set up message callback
    solaceClient.current.setMessageCallback((message) => {
      console.log('🔔 Processing message in callback');
      
      const topic = message.getDestination().getName();
      console.log('📍 Topic:', topic);
      
      // Try to extract payload - handle different message types
      let payload = 'No payload';
      try {
        // Try getBinaryAttachment first
        const binaryAttachment = message.getBinaryAttachment();
        if (binaryAttachment) {
          console.log('📦 Binary attachment type:', typeof binaryAttachment, binaryAttachment);
          
          // Handle different possible return types
          if (typeof binaryAttachment === 'string') {
            payload = binaryAttachment;
          } else if (binaryAttachment instanceof ArrayBuffer) {
            payload = new TextDecoder().decode(binaryAttachment);
          } else if (binaryAttachment instanceof Uint8Array) {
            payload = new TextDecoder().decode(binaryAttachment);
          } else if (Array.isArray(binaryAttachment)) {
            payload = new TextDecoder().decode(new Uint8Array(binaryAttachment));
          } else {
            // Try to convert to string
            payload = String(binaryAttachment);
          }
          
          // Clean up payload - find the first '{' character for JSON
          const jsonStart = payload.indexOf('{');
          if (jsonStart > 0) {
            console.log('📦 Removing', jsonStart, 'header bytes before JSON');
            payload = payload.substring(jsonStart);
          }
          
          // Try to parse and format as JSON if it's JSON
          try {
            const jsonObj = JSON.parse(payload);
            payload = JSON.stringify(jsonObj, null, 2);
            console.log('📦 Formatted JSON payload:', payload.substring(0, 100));
          } catch (e) {
            // Not JSON, keep as-is
            console.log('📦 Text payload:', payload.substring(0, 100));
          }
        } else if (message.getSdtContainer()) {
          payload = JSON.stringify(message.getSdtContainer(), null, 2);
          console.log('📦 SDT payload:', payload.substring(0, 100));
        } else {
          console.log('⚠️ No payload found in message');
        }
      } catch (error) {
        console.error('❌ Error extracting payload:', error);
        payload = 'Error extracting payload: ' + error.message;
      }

      const newMessage = {
        id: Date.now() + Math.random(),
        topic,
        payload,
        timestamp: new Date().toLocaleTimeString(),
      };

      console.log('➕ Adding message to state:', newMessage);
      setMessages((prev) => [newMessage, ...prev].slice(0, 100)); // Keep last 100 messages
    });

    // Set up event callback
    solaceClient.current.setEventCallback((event, data) => {
      console.log('Event:', event, data);
      
      if (event === 'subscription_ok') {
        setSubscriptionError(null);
        console.log('✅ Subscription successful, clearing error');
      } else if (event === 'subscription_error') {
        const errorMsg = data.infoStr || 'Subscription failed - ACL Denied. This topic may not be allowed for your user.';
        setSubscriptionError(errorMsg);
        console.error('❌ Subscription error:', errorMsg);
      }
    });

    return () => {
      if (solaceClient.current) {
        solaceClient.current.disconnect();
      }
    };
  }, []);

  const handleConnect = () => {
    setSnackbar({ open: true, message: 'Connecting to Solace broker...', severity: 'info' });
    
    solaceClient.current.connect(
      BROKER_CONFIG.url,
      BROKER_CONFIG.vpn,
      BROKER_CONFIG.username,
      BROKER_CONFIG.password,
      () => {
        setConnected(true);
        setSnackbar({ open: true, message: 'Successfully connected!', severity: 'success' });
      },
      (error) => {
        setSnackbar({ 
          open: true, 
          message: `Connection failed: ${error.toString()}`, 
          severity: 'error' 
        });
      }
    );
  };

  const handleDisconnect = () => {
    solaceClient.current.disconnect();
    setConnected(false);
    setActiveTopic(null);
    setMessages([]);
    setSnackbar({ open: true, message: 'Disconnected from broker', severity: 'info' });
  };

  const handleTopicSubscribe = (topic) => {
    if (!connected) {
      setSnackbar({ open: true, message: 'Please connect first', severity: 'warning' });
      return;
    }

    // If clicking the same topic, unsubscribe
    if (activeTopic === topic) {
      solaceClient.current.unsubscribe(topic);
      setActiveTopic(null);
      setSnackbar({ open: true, message: `Unsubscribed from ${topic}`, severity: 'info' });
      return;
    }

    solaceClient.current.subscribe(
      topic,
      () => {
        setActiveTopic(topic);
        setSnackbar({ open: true, message: `Subscribed to ${topic}`, severity: 'success' });
      },
      (error) => {
        setSnackbar({
          open: true,
          message: `Subscription failed: ${error.toString()}`,
          severity: 'error'
        });
      }
    );
  };

  const handleClearMessages = () => {
    setMessages([]);
    setSnackbar({ open: true, message: 'Messages cleared', severity: 'info' });
  };

  const handleCustomTopicSubscribe = () => {
    if (!customTopic.trim()) {
      setSnackbar({ open: true, message: 'Please enter a topic', severity: 'warning' });
      return;
    }
    handleTopicSubscribe(customTopic);
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, backgroundColor: solaceColors.white }}>
        {/* Header */}
        <Typography
          variant="h4"
          align="center"
          gutterBottom
          sx={{ mb: 2, color: solaceColors.darkNavy, fontWeight: 700 }}
        >
          FAA Realtime Data Viewer
        </Typography>

        {/* Topic Structure Info */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 4,
            backgroundColor: solaceColors.patternLines,
            border: `1px solid ${solaceColors.diagramBorders}`,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ color: solaceColors.darkNavy, fontWeight: 600, mb: 1 }}
          >
            Topic Structure Reference:
          </Typography>
          <Stack spacing={0.5}>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                color: solaceColors.secondaryText,
                fontSize: '0.75rem',
              }}
            >
              FDPS/position/{'{FLIGHT_ID}'}/{'{STATUS}'}/{'{CALLSIGN}'}/{'{ORIGIN}'}/{'{DESTINATION}'}/{'{LATITUDE}'}/{'{LONGITUDE}'}/{'{GROUND_SPEED}'}/{'{ALTITUDE}'}/{'{HEADING}'}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                color: solaceColors.secondaryText,
                fontSize: '0.75rem',
              }}
            >
              STDDS/position/{'{AIRPORT_CODE}'}/{'{FLIGHT_ID}'}
            </Typography>
          </Stack>
        </Paper>

        {/* Connect/Disconnect Section */}
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 4 }}>
          <Button
            variant="contained"
            size="large"
            disabled={connected}
            onClick={handleConnect}
            sx={{ minWidth: 200 }}
          >
            Connect
          </Button>
          <Button
            variant="contained"
            size="large"
            disabled={!connected}
            onClick={handleDisconnect}
            sx={{ 
              minWidth: 200,
              background: connected 
                ? `linear-gradient(135deg, ${solaceColors.darkNavy} 0%, ${solaceColors.darkTealBlue} 100%)`
                : undefined,
            }}
          >
            Disconnect
          </Button>
        </Stack>

        <Divider sx={{ mb: 3 }} />

        {/* Topic Subscription Buttons */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ color: solaceColors.darkNavy }}>
            Topic Subscriptions
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {PREDEFINED_TOPICS.map((topic) => (
              <Button
                key={topic.value}
                variant={activeTopic === topic.value ? 'contained' : 'outlined'}
                onClick={() => handleTopicSubscribe(topic.value)}
                disabled={!connected}
                sx={{ 
                  flex: '0 1 auto',
                  ...(activeTopic === topic.value && {
                    background: `linear-gradient(135deg, ${solaceColors.primary} 0%, ${solaceColors.tealAccent} 100%)`,
                  }),
                }}
              >
                {topic.label}
              </Button>
            ))}
          </Stack>

          {/* Custom Topic Input */}
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Custom Topic"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              disabled={!connected}
              placeholder="Enter custom topic here"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCustomTopicSubscribe();
                }
              }}
            />
            <Button
              variant="outlined"
              onClick={handleCustomTopicSubscribe}
              disabled={!connected}
              sx={{ minWidth: 120 }}
            >
              Subscribe
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Subscription Error Alert */}
        {subscriptionError && (
          <Alert
            severity="error"
            onClose={() => setSubscriptionError(null)}
            sx={{ mb: 3 }}
          >
            <strong>Subscription Error:</strong> {subscriptionError}
          </Alert>
        )}

        {/* Message Display Area */}
        <Box>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Typography variant="h6" sx={{ color: solaceColors.darkNavy }}>
              Messages
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
              >
                <ToggleButton value="topic">Topic</ToggleButton>
                <ToggleButton value="payload">Payload</ToggleButton>
              </ToggleButtonGroup>
              <Button
                variant="outlined"
                size="small"
                onClick={handleClearMessages}
                disabled={messages.length === 0}
                sx={{ minWidth: 80 }}
              >
                Clear
              </Button>
            </Stack>
          </Stack>

          <Paper
            variant="outlined"
            sx={{
              height: 400,
              overflow: 'auto',
              p: 2,
              backgroundColor: solaceColors.greenTint,
              borderColor: solaceColors.diagramBorders,
            }}
          >
            {messages.length === 0 ? (
              <Typography 
                align="center" 
                sx={{ color: solaceColors.lightGrey, mt: 10 }}
              >
                No messages received yet. Subscribe to a topic to start receiving messages.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {messages.map((msg) => (
                  <Paper
                    key={msg.id}
                    sx={{
                      p: 1.5,
                      backgroundColor: solaceColors.white,
                      borderLeft: `4px solid ${solaceColors.primary}`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: solaceColors.lightGrey, display: 'block', mb: 0.5 }}
                    >
                      {msg.timestamp}
                    </Typography>
                    {viewMode === 'topic' ? (
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          color: solaceColors.primaryDarkText,
                          wordBreak: 'break-all',
                        }}
                      >
                        {msg.topic}
                      </Typography>
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          color: solaceColors.primaryDarkText,
                          wordBreak: 'break-all',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {msg.payload || 'No payload'}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Box>

        {/* Connection Status */}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: solaceColors.secondaryText }}>
            Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}
            {activeTopic && ` | Active Topic: ${activeTopic}`}
          </Typography>
        </Box>
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default App;
