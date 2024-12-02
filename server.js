const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: 'https://hiddchat.vercel.app', // Allow requests from React frontend
    methods: ['GET', 'POST'],
  })
);

const io = new Server(server, {
  cors: {
    origin: 'https://hiddchat.vercel.app',
    methods: ['GET', 'POST'],
  },
});

let waitingUsers = [];
let totalOnlineUsers = 0;

io.on('connection', (socket) => {
  totalOnlineUsers++;
  console.log(`[INFO] User connected: ${socket.id}`);
  io.emit('totalUsers', totalOnlineUsers);

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

  socket.on('endChat', () => {
    if (socket.partnerSocket) {
      socket.partnerSocket.emit('partnerDisconnected');
      socket.partnerSocket.partnerSocket = null;
      socket.partnerSocket = null;
    }
    waitingUsers = waitingUsers.filter((user) => user !== socket);
    console.log(`[INFO] User ended chat: ${socket.id}`);
  });

  socket.on('sendMessage', (message) => {
    if (socket.partnerSocket) {
      socket.partnerSocket.emit('receiveMessage', message);
    }
  });

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
    totalOnlineUsers--;
    io.emit('totalUsers', totalOnlineUsers);

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
