const express = require('express');
const http = require('http');
const cors = require('cors'); // Import CORS middleware
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Enable CORS for all origins (or restrict to specific origin)
app.use(cors({
    origin: "https://ghosttchat.netlify.app", // Allow requests from your React app
    methods: ["GET", "POST"], // Allow specific HTTP methods
}));

const io = new Server(server, {
    cors: {
        origin: "https://ghosttchat.netlify.app", // Match your frontend origin
        methods: ["GET", "POST"], // Allow specific HTTP methods
    },
});

let waitingUsers = [];
let totalOnlineUsers = 0; // Track the total number of online users

io.on('connection', (socket) => {
    totalOnlineUsers++; // Increment the total online users count
    console.log(`[INFO] User connected: ${socket.id}`);
    io.emit('totalUsers', totalOnlineUsers); // Emit the total users to all clients

    let partnerSocket = null;

    socket.on('findPartner', () => {
        if (waitingUsers.length > 0) {
            partnerSocket = waitingUsers.pop();
            partnerSocket.partnerSocket = socket;
            socket.partnerSocket = partnerSocket;

            partnerSocket.emit('partnerFound');
            socket.emit('partnerFound');
        } else {
            waitingUsers.push(socket);
        }
    });

    socket.on('sendMessage', (message) => {
        if (socket.partnerSocket) {
            socket.partnerSocket.emit('receiveMessage', message);
        }
    });

    // Typing event to trigger typing effect
    socket.on('typing', () => {
        if (socket.partnerSocket) {
            socket.partnerSocket.emit('partnerTyping');
        }
    });

    socket.on('stopTyping', () => {
        if (socket.partnerSocket) {
            socket.partnerSocket.emit('partnerStopTyping');
        }
    });

    socket.on('disconnect', () => {
        totalOnlineUsers--; // Decrement the total online users count
        io.emit('totalUsers', totalOnlineUsers); // Emit the updated total users to all clients

        waitingUsers = waitingUsers.filter((user) => user !== socket);
        if (socket.partnerSocket) {
            socket.partnerSocket.emit('partnerDisconnected');
            socket.partnerSocket.partnerSocket = null;
        }
        console.log(`[INFO] User disconnected: ${socket.id}`);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`[INFO] Server running on http://localhost:${PORT}`);
});
