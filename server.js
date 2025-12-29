const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Server is running\n');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients with metadata
const clients = new Map();
let clientCounter = 0;

// Handle new WebSocket connections
wss.on('connection', (ws, req) => {
  const clientId = ++clientCounter;
  const clientIp = req.socket.remoteAddress;
  const connectionTime = new Date();

  // Store client information
  const clientInfo = {
    id: clientId,
    ws: ws,
    ip: clientIp,
    connectedAt: connectionTime,
    username: `User_${clientId}`,
    isAlive: true
  };

  clients.set(ws, clientInfo);

  console.log(`[${connectionTime.toISOString()}] Client ${clientId} connected from ${clientIp}`);

  // Send welcome message to new client
  ws.send(JSON.stringify({
    type: 'welcome',
    message: `Welcome to the WebSocket Server! Your ID: ${clientId}`,
    clientId: clientId,
    timestamp: new Date().toISOString()
  }));

  // Broadcast connection notification to all other clients
  broadcastMessage({
    type: 'user_joined',
    message: `${clientInfo.username} joined the chat`,
    clientId: clientId,
    timestamp: new Date().toISOString()
  }, ws);

  // Handle incoming messages from client
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      console.log(`[${new Date().toISOString()}] Message from Client ${clientId}:`, message);

      // Handle different message types
      switch (message.type) {
        case 'set_username':
          if (message.username && message.username.trim().length > 0) {
            const oldUsername = clientInfo.username;
            clientInfo.username = message.username.trim();
            
            ws.send(JSON.stringify({
              type: 'username_changed',
              message: `Username changed from "${oldUsername}" to "${clientInfo.username}"`,
              username: clientInfo.username,
              timestamp: new Date().toISOString()
            }));

            broadcastMessage({
              type: 'user_renamed',
              message: `${oldUsername} changed username to ${clientInfo.username}`,
              oldUsername: oldUsername,
              newUsername: clientInfo.username,
              clientId: clientId,
              timestamp: new Date().toISOString()
            });
          }
          break;

        case 'chat':
          if (message.text && message.text.trim().length > 0) {
            broadcastMessage({
              type: 'chat',
              username: clientInfo.username,
              clientId: clientId,
              text: message.text,
              timestamp: new Date().toISOString()
            });
          }
          break;

        case 'private_message':
          if (message.targetClientId && message.text) {
            let targetWs = null;
            for (let [ws_key, client] of clients) {
              if (client.id === message.targetClientId) {
                targetWs = ws_key;
                break;
              }
            }

            if (targetWs) {
              targetWs.send(JSON.stringify({
                type: 'private_message',
                from: clientInfo.username,
                fromClientId: clientId,
                text: message.text,
                timestamp: new Date().toISOString()
              }));

              // Send confirmation to sender
              ws.send(JSON.stringify({
                type: 'private_message_sent',
                to: clients.get(targetWs).username,
                text: message.text,
                timestamp: new Date().toISOString()
              }));
            } else {
              ws.send(JSON.stringify({
                type: 'error',
                message: `Target client ${message.targetClientId} not found`,
                timestamp: new Date().toISOString()
              }));
            }
          }
          break;

        case 'get_users':
          const userList = Array.from(clients.values()).map(client => ({
            id: client.id,
            username: client.username,
            connectedAt: client.connectedAt,
            ip: client.ip
          }));

          ws.send(JSON.stringify({
            type: 'user_list',
            users: userList,
            totalUsers: clients.size,
            timestamp: new Date().toISOString()
          }));
          break;

        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;

        default:
          // Echo unknown messages back
          ws.send(JSON.stringify({
            type: 'echo',
            message: message,
            timestamp: new Date().toISOString()
          }));
      }
    } catch (error) {
      console.error(`Error processing message from Client ${clientId}:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format. Expected JSON.',
        timestamp: new Date().toISOString()
      }));
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    const disconnectTime = new Date();
    console.log(`[${disconnectTime.toISOString()}] Client ${clientId} (${clientInfo.username}) disconnected`);

    clients.delete(ws);

    // Broadcast disconnection notification
    broadcastMessage({
      type: 'user_left',
      message: `${clientInfo.username} left the chat`,
      clientId: clientId,
      timestamp: disconnectTime.toISOString()
    });
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`Error on Client ${clientId}:`, error.message);
  });

  // Heart beat to keep connection alive
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
});

// Broadcast message to all connected clients except sender
function broadcastMessage(message, senderWs = null) {
  const messageData = JSON.stringify(message);

  clients.forEach((clientInfo, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      if (!senderWs || ws !== senderWs) {
        ws.send(messageData);
      } else {
        // Send to sender with acknowledgment
        ws.send(JSON.stringify({
          ...message,
          acknowledged: true
        }));
      }
    }
  });
}

// Heart beat interval to detect stale connections
const heartbeatInterval = setInterval(() => {
  clients.forEach((clientInfo, ws) => {
    if (ws.isAlive === false) {
      console.log(`Terminating inactive client ${clientInfo.id}`);
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // Every 30 seconds

// Clean up on server close
wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     WebSocket Server Started              ║
║     Server running on port ${PORT}           ║
║     WebSocket URL: ws://localhost:${PORT}    ║
╚════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  wss.clients.forEach((ws) => {
    ws.close();
  });
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = server;
