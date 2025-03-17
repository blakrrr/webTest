const WebSocket = require('ws');
const server = new WebSocket.Server({ port: process.env.PORT || 8080 });

// Track connected clients
const clients = new Map();
let nextPlayerID = 1;

server.on('connection', (socket) => {
  // Assign a unique ID to each new connection
  const playerID = nextPlayerID++;
  clients.set(playerID, socket);
  
  // Send initial setup data to the new client
  socket.send(JSON.stringify({
    type: 'init',
    id: playerID,
    positions: Array.from(clients.entries())
      .filter(([id]) => id !== playerID)
      .map(([id, client]) => ({
        id,
        position: client.position || { x: 0, y: 0 }
      }))
  }));
  
  // Broadcast new player joined
  broadcastToOthers(playerID, {
    type: 'player_joined',
    id: playerID
  });
  
  // Server code additions for 3D positions
  // Server-side code update
  // Server-side code update
  socket.on('message', (message) => {
      const data = JSON.parse(message);
      
      if (data.type === 'position') {
          // Handle both 2D and 3D positions
          socket.position = { 
              x: data.x, 
              y: data.y,
              z: data.z || 0  // Default to 0 if z is not provided
          };
          
          broadcastToOthers(playerID, {
              type: 'position',
              id: playerID,
              x: data.x,
              y: data.y,
              z: data.z || 0
          });
      }
  });
  
  // Handle disconnection
  socket.on('close', () => {
    clients.delete(playerID);
    
    // Broadcast player left
    broadcastToOthers(playerID, {
      type: 'player_left',
      id: playerID
    });
  });
});

function broadcastToOthers(senderID, data) {
  const message = JSON.stringify(data);
  for (const [id, client] of clients.entries()) {
    if (id !== senderID && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

console.log('WebSocket server running');
