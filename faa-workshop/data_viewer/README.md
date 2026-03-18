# FAA Realtime Data Viewer

A React SPA application for viewing real-time FAA flight data from a Solace broker using Material UI and the Solace color scheme.

## Features

- **Connect/Disconnect**: Connects to a Solace broker with secure WebSocket (tcps)
- **Topic Subscriptions**: Pre-configured topic buttons for FAA data streams
- **Custom Topics**: Input field to subscribe to custom topics
- **Message Display**: Real-time message viewer with scrollable list
- **View Toggle**: Switch between viewing message topics or payloads
- **Solace Branding**: Uses official Solace color scheme throughout

## Installation

```bash
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Build

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Broker Configuration

The application connects to:
- **URL**: wss://flight-tracking.messaging.solace.cloud:443
- **VPN**: scds
- **Username**: reinvent25
- **Password**: reinvent25

## Pre-configured Topics

1. `FDPS/position>` - All FDPS messages
2. `STDDS/position/>` - All STDDS messages
3. `FDPS/position/*/*/*/*/KIAH/>` - FDPS position data for KIAH airport
4. `STDDS/position/KIAH/>` - STDDS position data for KIAH airport

## Usage

1. Click **Connect** to establish connection to the Solace broker
2. Once connected, click any topic button to subscribe
3. Only one topic can be active at a time (clicking a new topic unsubscribes from the previous)
4. Use the custom topic field to subscribe to additional topics
5. Toggle between **Topic** and **Payload** view to see different message content
6. Click **Disconnect** to close the connection

## Technology Stack

- **React 18** with Vite
- **Material UI v5** for UI components
- **Solace JavaScript API (solclientjs)** for broker connection
- **Emotion** for CSS-in-JS styling

## Project Structure

```
data_viewer/
├── src/
│   ├── solace/
│   │   └── SolaceClient.js    # Solace broker client wrapper
│   ├── App.jsx                 # Main application component
│   ├── main.jsx                # Application entry point
│   ├── theme.js                # Material UI theme with Solace colors
│   └── index.css               # Global styles
├── index.html                  # HTML template
└── package.json                # Dependencies
```

## Solace Color Scheme

The application uses the official Solace color palette:
- Primary Green: #00BD6A
- Dark Navy: #042542
- Teal Accent: #00A68A
- And many more from the official brand guidelines
