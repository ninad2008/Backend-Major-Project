let io = null;

const initSocket = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Allow user to join a channel with their userId
    socket.on('join_user_room', (userId) => {
      socket.join(userId);
      console.log(`[Socket.io] Socket ${socket.id} joined room: user_${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    console.warn('[Socket.io Warning] Socket.io not initialized yet');
  }
  return io;
};

// Utility function to trigger budget alerts
const emitBudgetAlert = (userId, data) => {
  if (io) {
    io.to(userId.toString()).emit('budget_alert', data);
    // Also emit broadcast alert for simple listening
    io.emit('global_budget_alert', data);
    console.log(`[Socket.io Alert Sent] User ${userId}: Budget for ${data.category} exceeded (${data.spent}/${data.limit})`);
  }
};

module.exports = { initSocket, getIO, emitBudgetAlert };
