const WebSocket = require('ws');
const server = new WebSocket.Server({ port: process.env.PORT || 8080 });

// Track connected clients
const clients = new Map();
let nextPlayerID = 1;

console.log('Multiplayer server started');

server.on('connection', (socket) => {
  // Assign a unique ID to each new connection
  const playerID = nextPlayerID++;
  console.log(`Player ${playerID} connected`);
  
  // Store client information
  clients.set(playerID, {
    socket: socket,
    position: { x: 0, y: 0, z: 0 }
  });
  
  // Send initial setup data to the new client
  const initialPositions = Array.from(clients.entries())
    .filter(([id]) => id !== playerID)
    .map(([id, client]) => ({
      id,
      position: client.position
    }));
    
  socket.send(JSON.stringify({
    type: 'init',
    id: playerID,
    positions: initialPositions
  }));
  
  console.log(`Sent initial data to player ${playerID}, ${initialPositions.length} other players`);
  
  // Broadcast new player joined
  broadcastToOthers(playerID, {
    type: 'player_joined',
    id: playerID
  });
  
  // Handle messages
  socket.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Update player position in server memory
      if (data.type === 'position') {
        const client = clients.get(playerID);
        if (client) {
          client.position = { 
            x: data.x, 
            y: data.y,
            z: data.z || 0
          };
          
          // Broadcast new position to all other clients
          broadcastToOthers(playerID, {
            type: 'position',
            id: playerID,
            x: data.x,
            y: data.y,
            z: data.z || 0
          });
        }
      }
    } catch (error) {
      console.error(`Error processing message from player ${playerID}:`, error);
    }
  });
  
  // Handle disconnection
  socket.on('close', () => {
    console.log(`Player ${playerID} disconnected`);
    clients.delete(playerID);
    
    // Broadcast player left
    broadcastToOthers(playerID, {
      type: 'player_left',
      id: playerID
    });
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error(`Error with player ${playerID}:`, error);
  });
});

function broadcastToOthers(senderID, data) {
  const message = JSON.stringify(data);
  let recipients = 0;
  
  for (const [id, client] of clients.entries()) {
    if (id !== senderID && client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(message);
      recipients++;
    }
  }
  
  if (recipients > 0) {
    console.log(`Broadcast message from player ${senderID} to ${recipients} other clients`);
  }
}

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Keep-alive to prevent timeout on some hosting platforms
setInterval(() => {
  for (const [id, client] of clients.entries()) {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.ping();
    }
  }
}, 30000);

console.log(`WebSocket server running on port ${process.env.PORT || 8080}`);
