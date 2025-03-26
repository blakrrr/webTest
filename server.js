const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Store connected users
const users = new Set();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('new-user', (name) => {
        // Add user to the set
        users.add(name);
        
        // Attach name to socket for later use
        socket.username = name;

        // Emit updated user list to all clients
        io.emit('user-list', Array.from(users));
        
        // Notify other users about new connection
        socket.broadcast.emit('user-connected', name);
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            // Remove user from the set
            users.delete(socket.username);

            // Notify other users about disconnection
            io.emit('user-list', Array.from(users));
            socket.broadcast.emit('user-disconnected', socket.username);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});