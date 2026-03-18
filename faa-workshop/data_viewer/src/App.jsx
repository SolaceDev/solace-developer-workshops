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
  IconButton,
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
  { label: 'FDPS/position/*/*/*/*/KHOU/>', value: 'FDPS/position/*/*/*/*/KHOU/>' },
  { label: 'STDDS/position/KHOU/>', value: 'STDDS/position/KHOU/>' },
];

// Define topic level schemas with colors for dynamic variables
const TOPIC_SCHEMAS = {
  FDPS: {
    levels: [
      { name: 'FDPS', color: '#000000' },           // Level 0 - static
      { name: 'position', color: '#000000' },       // Level 1 - static
      { name: 'FLIGHT_ID', color: '#dc2626' },      // Level 2 - red
      { name: 'STATUS', color: '#2563eb' },         // Level 3 - blue
      { name: 'CALLSIGN', color: '#16a34a' },       // Level 4 - green
      { name: 'ORIGIN', color: '#9333ea' },         // Level 5 - purple
      { name: 'DESTINATION', color: '#ea580c' },    // Level 6 - orange
      { name: 'LATITUDE', color: '#0891b2' },       // Level 7 - cyan
      { name: 'LONGITUDE', color: '#db2777' },      // Level 8 - pink
      { name: 'GROUND_SPEED', color: '#ca8a04' },   // Level 9 - yellow
      { name: 'ALTITUDE', color: '#65a30d' },       // Level 10 - lime
      { name: 'HEADING', color: '#7c3aed' },        // Level 11 - violet
    ]
  },
  STDDS: {
    levels: [
      { name: 'STDDS', color: '#000000' },          // Level 0 - static
      { name: 'position', color: '#000000' },       // Level 1 - static
      { name: 'AIRPORT_CODE', color: '#dc2626' },   // Level 2 - red
      { name: 'FLIGHT_ID', color: '#2563eb' },      // Level 3 - blue
    ]
  }
};

// Get color for a specific level in a topic
const getTopicLevelColor = (topic, levelIndex) => {
  const parts = topic.split('/');
  const rootLevel = parts[0];
  const schema = TOPIC_SCHEMAS[rootLevel];
  
  if (!schema || levelIndex >= schema.levels.length) {
    return '#000000'; // Default to black
  }
  
  return schema.levels[levelIndex].color;
};

// Component to render color-coded topic
const ColorCodedTopic = ({ topic }) => {
  const parts = topic.split('/');
  const rootLevel = parts[0];
  const schema = TOPIC_SCHEMAS[rootLevel];

  if (!schema) {
    // No schema, render in black
    return <span style={{ color: '#000000' }}>{topic}</span>;
  }

  return (
    <>
      {parts.map((part, index) => {
        const color = schema.levels[index]?.color || '#000000';
        const isLast = index === parts.length - 1;
        return (
          <span key={index}>
            <span style={{ color }}>{part}</span>
            {!isLast && <span style={{ color: '#000000' }}>/</span>}
          </span>
        );
      })}
    </>
  );
};

// Component to render color-coded input field overlay
const ColorCodedInput = ({ value }) => {
  if (!value) return null;
  
  const parts = value.split('/');
  const rootLevel = parts[0];
  const schema = TOPIC_SCHEMAS[rootLevel];

  // If no schema, show text in black
  if (!schema) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: '16.5px',
          left: '14px',
          pointerEvents: 'none',
          fontFamily: 'monospace',
          fontSize: '1rem',
          whiteSpace: 'pre',
          overflow: 'hidden',
          lineHeight: '1.4375em',
          color: '#000000',
        }}
      >
        {value}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '16.5px',
        left: '14px',
        pointerEvents: 'none',
        fontFamily: 'monospace',
        fontSize: '1rem',
        whiteSpace: 'pre',
        overflow: 'hidden',
        lineHeight: '1.4375em',
      }}
    >
      {parts.map((part, index) => {
        const color = schema.levels[index]?.color || '#000000';
        const isLast = index === parts.length - 1;
        return (
          <span key={index}>
            <span style={{ color }}>{part}</span>
            {!isLast && <span style={{ color: '#000000' }}>/</span>}
          </span>
        );
      })}
    </Box>
  );
};

function App() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [customTopic, setCustomTopic] = useState('');
  const [activeTopics, setActiveTopics] = useState(new Set()); // Track multiple active subscriptions
  const [subscriptionError, setSubscriptionError] = useState(null);
  const [viewMode, setViewMode] = useState('topic'); // 'topic' or 'payload'
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [prettyPrintEnabled, setPrettyPrintEnabled] = useState(new Set()); // Track which messages have pretty-print ENABLED (default is disabled/raw)
  const solaceClient = useRef(null);
  const customTopicInputRef = useRef(null);

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
          
          // Clean up payload - extract valid JSON
          const jsonStart = payload.indexOf('{');
          if (jsonStart >= 0) {
            if (jsonStart > 0) {
              console.log('📦 Removing', jsonStart, 'header bytes before JSON');
              payload = payload.substring(jsonStart);
            }
            
            // Try to find the end of the JSON object by parsing
            try {
              // Parse to validate and find the actual JSON end
              const parsed = JSON.parse(payload);
              // Re-stringify to get clean JSON without trailing data
              payload = JSON.stringify(parsed);
              console.log('📦 Extracted clean JSON, length:', payload.length);
            } catch (e) {
              // If parsing fails, try to manually find the matching closing brace
              let braceCount = 0;
              let inString = false;
              let escape = false;
              let jsonEnd = -1;
              
              for (let i = 0; i < payload.length; i++) {
                const char = payload[i];
                
                if (escape) {
                  escape = false;
                  continue;
                }
                
                if (char === '\\') {
                  escape = true;
                  continue;
                }
                
                if (char === '"' && !escape) {
                  inString = !inString;
                  continue;
                }
                
                if (!inString) {
                  if (char === '{') {
                    braceCount++;
                  } else if (char === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                      jsonEnd = i + 1;
                      break;
                    }
                  }
                }
              }
              
              if (jsonEnd > 0) {
                payload = payload.substring(0, jsonEnd);
                console.log('📦 Manually extracted JSON, length:', payload.length);
              }
            }
          }
          
          console.log('📦 Final payload:', payload.substring(0, 100));
        } else if (message.getSdtContainer()) {
          // Store raw JSON string - don't format here
          payload = JSON.stringify(message.getSdtContainer());
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
    setConnecting(true);
    setSnackbar({ open: true, message: 'Connecting to Solace broker...', severity: 'info' });
    
    solaceClient.current.connect(
      BROKER_CONFIG.url,
      BROKER_CONFIG.vpn,
      BROKER_CONFIG.username,
      BROKER_CONFIG.password,
      () => {
        setConnected(true);
        setConnecting(false);
        setSnackbar({ open: true, message: 'Successfully connected!', severity: 'success' });
      },
      (error) => {
        setConnecting(false);
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
    setActiveTopics(new Set());
    setMessages([]);
    setSnackbar({ open: true, message: 'Disconnected from broker', severity: 'info' });
  };

  const handleTopicSubscribe = (topic) => {
    if (!connected) {
      setSnackbar({ open: true, message: 'Please connect first', severity: 'warning' });
      return;
    }

    // If clicking an already active topic, unsubscribe
    if (activeTopics.has(topic)) {
      solaceClient.current.unsubscribe(topic);
      setActiveTopics((prev) => {
        const newSet = new Set(prev);
        newSet.delete(topic);
        return newSet;
      });
      setSnackbar({ open: true, message: `Unsubscribed from ${topic}`, severity: 'info' });
      return;
    }

    // Subscribe to new topic (add to existing subscriptions)
    solaceClient.current.subscribe(
      topic,
      () => {
        setActiveTopics((prev) => new Set(prev).add(topic));
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
    setPrettyPrintEnabled(new Set());
    setSnackbar({ open: true, message: 'Messages cleared', severity: 'info' });
  };

  const togglePrettyPrint = (messageId) => {
    console.log('🎯 Toggle clicked for message:', messageId);
    console.log('📋 Current prettyPrintEnabled:', prettyPrintEnabled);
    
    setPrettyPrintEnabled((prev) => {
      const newSet = new Set(prev);
      const isEnabled = newSet.has(messageId);
      
      if (isEnabled) {
        newSet.delete(messageId);
        console.log('❌ Disabling pretty-print for:', messageId);
      } else {
        newSet.add(messageId);
        console.log('✅ Enabling pretty-print for:', messageId);
      }
      
      console.log('📋 New prettyPrintEnabled:', newSet);
      return newSet;
    });
  };

  const formatPayload = (payload, messageId) => {
    const isEnabled = prettyPrintEnabled.has(messageId);
    console.log(`🎨 Formatting payload for ${messageId}, pretty-print enabled: ${isEnabled}`);
    console.log(`📄 Payload preview:`, payload?.substring(0, 100));
    
    // If not enabled, return raw payload (default)
    if (!isEnabled) {
      console.log('📦 Returning raw payload (pretty-print disabled)');
      return payload;
    }

    // Try to pretty-print JSON when enabled
    try {
      const jsonObj = JSON.parse(payload);
      const formatted = JSON.stringify(jsonObj, null, 2);
      console.log('✨ Returning formatted payload, length:', formatted.length);
      return formatted;
    } catch (e) {
      // Not valid JSON, return as-is
      console.log('⚠️ Not valid JSON, returning as-is. Error:', e.message);
      return payload;
    }
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
              component="div"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
              }}
            >
              <ColorCodedTopic topic="FDPS/position/{FLIGHT_ID}/{STATUS}/{CALLSIGN}/{ORIGIN}/{DESTINATION}/{LATITUDE}/{LONGITUDE}/{GROUND_SPEED}/{ALTITUDE}/{HEADING}" />
            </Typography>
            <Typography
              variant="body2"
              component="div"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
              }}
            >
              <ColorCodedTopic topic="STDDS/position/{AIRPORT_CODE}/{FLIGHT_ID}" />
            </Typography>
          </Stack>
        </Paper>

        {/* Connect/Disconnect Section */}
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 4 }}>
          <Button
            variant="contained"
            size="large"
            disabled={connected || connecting}
            onClick={handleConnect}
            sx={{
              minWidth: 200,
              ...(connecting && {
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -2,
                  left: -2,
                  right: -2,
                  bottom: -2,
                  background: `linear-gradient(45deg, ${solaceColors.primary}, ${solaceColors.tealAccent}, ${solaceColors.primary})`,
                  backgroundSize: '200% 200%',
                  borderRadius: '4px',
                  zIndex: -1,
                  animation: 'borderGlow 1.5s ease-in-out infinite',
                },
                '@keyframes borderGlow': {
                  '0%': {
                    backgroundPosition: '0% 50%',
                  },
                  '50%': {
                    backgroundPosition: '100% 50%',
                  },
                  '100%': {
                    backgroundPosition: '0% 50%',
                  },
                },
              }),
            }}
          >
            {connecting ? 'Connecting...' : 'Connect'}
          </Button>
          <Button
            variant="contained"
            size="large"
            disabled={!connected}
            onClick={handleDisconnect}
            sx={{
              minWidth: 200,
              background: connected
                ? '#ffcdd2'
                : undefined,
              color: connected ? '#c62828' : undefined,
              '&:hover': {
                background: connected ? '#ef9a9a' : undefined,
              },
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
                variant={activeTopics.has(topic.value) ? 'contained' : 'outlined'}
                onClick={() => handleTopicSubscribe(topic.value)}
                disabled={!connected}
                sx={{
                  flex: '0 1 auto',
                  fontFamily: 'monospace',
                  textTransform: 'none',
                  ...(!connected && {
                    backgroundColor: '#f5f5f5',
                    '&.Mui-disabled': {
                      backgroundColor: '#f5f5f5',
                    },
                  }),
                  ...(activeTopics.has(topic.value) && {
                    background: '#ffcdd2',
                    color: '#c62828',
                    '&:hover': {
                      background: '#ef9a9a',
                    },
                  }),
                }}
              >
                <ColorCodedTopic topic={topic.label} />
              </Button>
            ))}
          </Stack>

          {/* Custom Topic Input */}
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Box sx={{ position: 'relative', flex: 1 }}>
              <TextField
                fullWidth
                inputRef={customTopicInputRef}
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
                InputProps={{
                  style: {
                    fontFamily: 'monospace',
                    color: 'transparent',
                    caretColor: '#000000',
                  }
                }}
                sx={{
                  ...(customTopic && activeTopics.has(customTopic) && {
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: solaceColors.greenTint,
                      '& fieldset': {
                        borderColor: solaceColors.primary,
                        borderWidth: 2,
                      },
                    },
                  }),
                }}
              />
              <ColorCodedInput value={customTopic} />
            </Box>
            <Button
              variant={customTopic && activeTopics.has(customTopic) ? 'contained' : 'outlined'}
              onClick={handleCustomTopicSubscribe}
              disabled={!connected}
              sx={{
                minWidth: 140,
                ...(customTopic && activeTopics.has(customTopic) && {
                  background: '#ffcdd2',
                  color: '#c62828',
                  '&:hover': {
                    background: '#ef9a9a',
                  },
                }),
              }}
            >
              {customTopic && activeTopics.has(customTopic) ? 'Unsubscribe' : 'Subscribe'}
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
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Typography
                        variant="caption"
                        sx={{ color: solaceColors.lightGrey, display: 'block', mb: 0.5 }}
                      >
                        {msg.timestamp}
                      </Typography>
                      {viewMode === 'payload' && (
                        <IconButton
                          size="small"
                          onClick={() => togglePrettyPrint(msg.id)}
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            color: prettyPrintEnabled.has(msg.id)
                              ? solaceColors.primary
                              : solaceColors.lightGrey,
                            backgroundColor: prettyPrintEnabled.has(msg.id)
                              ? solaceColors.greenTint
                              : 'transparent',
                            border: `1px solid ${
                              prettyPrintEnabled.has(msg.id)
                                ? solaceColors.primary
                                : solaceColors.diagramBorders
                            }`,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: prettyPrintEnabled.has(msg.id)
                                ? solaceColors.primary
                                : solaceColors.patternLines,
                              color: prettyPrintEnabled.has(msg.id)
                                ? solaceColors.white
                                : solaceColors.primaryDarkText,
                            },
                          }}
                        >
                          {'{}'}
                        </IconButton>
                      )}
                    </Stack>
                    {viewMode === 'topic' ? (
                      <Typography
                        variant="body2"
                        component="div"
                        sx={{
                          fontFamily: 'monospace',
                          wordBreak: 'break-all',
                        }}
                      >
                        <ColorCodedTopic topic={msg.topic} />
                      </Typography>
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          color: solaceColors.primaryDarkText,
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {formatPayload(msg.payload, msg.id) || 'No payload'}
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
            {activeTopics.size > 0 && ` | Active Subscriptions: ${activeTopics.size}`}
          </Typography>
          {activeTopics.size > 0 && (
            <Typography
              variant="caption"
              sx={{
                color: solaceColors.secondaryText,
                display: 'block',
                mt: 0.5,
                fontSize: '0.7rem'
              }}
            >
              {Array.from(activeTopics).join(', ')}
            </Typography>
          )}
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
