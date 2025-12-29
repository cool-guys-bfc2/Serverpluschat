# Serverpluschat - WebSocket Server

A robust WebSocket server built with Node.js using the `ws` library for real-time chat communication.

## Features

✨ **Real-time Messaging**
- Broadcast messages to all connected clients
- Private messaging between users
- User join/leave notifications

🔐 **Client Management**
- Unique client IDs for each connection
- Username support with dynamic updates
- Connection metadata tracking (IP, connection time)

💓 **Connection Health**
- Automatic heartbeat/ping-pong mechanism
- Stale connection detection and cleanup
- Graceful connection handling

📊 **Message Types**
- `chat` - Broadcast chat messages
- `private_message` - Direct messages between users
- `set_username` - Change username
- `get_users` - Retrieve list of connected users
- `ping` - Keep-alive mechanism

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/cool-guys-bfc2/Serverpluschat.git
cd Serverpluschat
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Start the Server

**Production mode:**
```bash
npm start
```

**Development mode (with auto-reload):**
```bash
npm run dev
```

The server will start on `ws://localhost:3000`

### Message Format

All messages should be sent as JSON strings.

#### Chat Message
```json
{
  "type": "chat",
  "text": "Hello, everyone!"
}
```

#### Set Username
```json
{
  "type": "set_username",
  "username": "John"
}
```

#### Private Message
```json
{
  "type": "private_message",
  "targetClientId": 1,
  "text": "This is a private message"
}
```

#### Get Connected Users
```json
{
  "type": "get_users"
}
```

#### Ping (Keep-alive)
```json
{
  "type": "ping"
}
```

## Server Response Types

#### Welcome Message
```json
{
  "type": "welcome",
  "message": "Welcome to the WebSocket Server! Your ID: 1",
  "clientId": 1,
  "timestamp": "2025-12-29T18:14:30Z"
}
```

#### Broadcast Chat
```json
{
  "type": "chat",
  "username": "John",
  "clientId": 1,
  "text": "Hello, everyone!",
  "timestamp": "2025-12-29T18:14:30Z"
}
```

#### User List Response
```json
{
  "type": "user_list",
  "users": [
    {
      "id": 1,
      "username": "User_1",
      "connectedAt": "2025-12-29T18:14:20Z",
      "ip": "::1"
    },
    {
      "id": 2,
      "username": "John",
      "connectedAt": "2025-12-29T18:14:25Z",
      "ip": "::1"
    }
  ],
  "totalUsers": 2,
  "timestamp": "2025-12-29T18:14:30Z"
}
```

#### User Joined
```json
{
  "type": "user_joined",
  "message": "User_2 joined the chat",
  "clientId": 2,
  "timestamp": "2025-12-29T18:14:25Z"
}
```

#### User Left
```json
{
  "type": "user_left",
  "message": "John left the chat",
  "clientId": 1,
  "timestamp": "2025-12-29T18:14:35Z"
}
```

## Client Example (JavaScript)

```javascript
const ws = new WebSocket('ws://localhost:3000');

// Connection opened
ws.addEventListener('open', () => {
  console.log('Connected to server');
  
  // Set username
  ws.send(JSON.stringify({
    type: 'set_username',
    username: 'Alice'
  }));
  
  // Send a chat message
  ws.send(JSON.stringify({
    type: 'chat',
    text: 'Hello everyone!'
  }));
});

// Receive messages
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
  
  switch(message.type) {
    case 'welcome':
      console.log(`Welcome! Your ID: ${message.clientId}`);
      break;
    case 'chat':
      console.log(`${message.username}: ${message.text}`);
      break;
    case 'user_joined':
      console.log(message.message);
      break;
    case 'user_list':
      console.log(`Connected users: ${message.totalUsers}`);
      break;
    default:
      console.log(message);
  }
});

// Error handling
ws.addEventListener('error', (error) => {
  console.error('WebSocket error:', error);
});

// Connection closed
ws.addEventListener('close', () => {
  console.log('Disconnected from server');
});

// Keep connection alive
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 30000);
```

## Environment Variables

Create a `.env` file (optional):
```env
PORT=3000
NODE_ENV=development
```

## Project Structure

```
Serverpluschat/
├── server.js          # Main WebSocket server file
├── package.json       # Project dependencies
├── .gitignore        # Git ignore configuration
└── README.md         # This file
```

## How It Works

1. **Server Initialization**: The server creates an HTTP server and attaches a WebSocket server to it.

2. **Client Connection**: When a client connects:
   - A unique client ID is assigned
   - Client info is stored in a Map
   - A welcome message is sent
   - Other clients are notified of the new user

3. **Message Handling**: The server processes different message types and broadcasts or routes them accordingly.

4. **Connection Health**: The server periodically pings all clients to detect stale connections and remove them.

5. **Graceful Shutdown**: On server shutdown, all clients are properly closed and resources are cleaned up.

## API Methods

### Message Types Supported

| Type | Purpose | Required Fields |
|------|---------|-----------------|
| `chat` | Broadcast message to all users | `text` |
| `set_username` | Change your username | `username` |
| `private_message` | Send message to specific user | `targetClientId`, `text` |
| `get_users` | Request list of connected users | None |
| `ping` | Heartbeat to keep connection alive | None |

## Error Handling

The server validates all incoming messages and sends error responses for:
- Invalid JSON format
- Missing required fields
- Non-existent target clients

## Performance Considerations

- **Heartbeat Interval**: 30 seconds (configurable)
- **Max Connections**: Limited by system resources
- **Message Size**: No strict limit but consider network bandwidth
- **Memory Usage**: Grows with number of connected clients

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Ensure all dependencies are installed: `npm install`

### Clients can't connect
- Verify WebSocket URL is correct
- Check firewall settings
- Ensure server is running

### Messages not being received
- Check message format is valid JSON
- Verify client is listening to 'message' events
- Check browser console for errors

## Future Enhancements

- [ ] Authentication system
- [ ] Room/channel support
- [ ] Message history/persistence
- [ ] User presence indicators
- [ ] Typing indicators
- [ ] File transfer support
- [ ] Message encryption

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.
