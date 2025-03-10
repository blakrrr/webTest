const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*", // Allow all origins to connect
    methods: ["GET", "POST"]
  }
});

// State management
const state = {
    grid: Array(25).fill(null),
    users: []
};

// Socket.IO events
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Add user to the list
    state.users.push({
        id: socket.id,
        color: '#3498db'
    });
    
    // Send current state to the new user
    socket.emit('initialState', state);
    
    // Broadcast updated user list
    io.emit('userList', state.users);
    
    // Handle cell updates
    socket.on('updateCell', (data) => {
        const { cellId, color } = data;
        
        // Update state
        state.grid[cellId] = color;
        
        // Broadcast update to all clients except sender
        socket.broadcast.emit('cellUpdate', {
            cellId: cellId,
            color: color
        });
    });
    
    // Handle grid clear
    socket.on('clearGrid', () => {
        state.grid = Array(25).fill(null);
        io.emit('clearGrid');
    });
    
    // Handle user color update
    socket.on('updateUser', (data) => {
        const userIndex = state.users.findIndex(user => user.id === socket.id);
        if (userIndex !== -1) {
            state.users[userIndex].color = data.color;
            io.emit('userList', state.users);
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        
        // Remove user from list
        const userIndex = state.users.findIndex(user => user.id === socket.id);
        if (userIndex !== -1) {
            state.users.splice(userIndex, 1);
            io.emit('userList', state.users);
        }
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
