const { Server } = require('socket.io');

let io = null;

function init(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join match room to receive seat updates
    socket.on('join_match', (matchId) => {
      socket.join(matchId.toString());
      console.log(`🟢 Socket ${socket.id} joined match room: ${matchId}`);
    });

    // Leave match room
    socket.on('leave_match', (matchId) => {
      socket.leave(matchId.toString());
      console.log(`🔴 Socket ${socket.id} left match room: ${matchId}`);
    });

    // Join user's personal notification room
    socket.on('join_user', (userId) => {
      const room = `user_${userId}`;
      socket.join(room);
      console.log(`🟢 Socket ${socket.id} joined user room: ${room}`);
    });

    // Leave user room
    socket.on('leave_user', (userId) => {
      const room = `user_${userId}`;
      socket.leave(room);
      console.log(`🔴 Socket ${socket.id} left user room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet!');
  }
  return io;
}

/**
 * Broadcast seat updates to a specific match room.
 * @param {string} matchId - The match ID room to broadcast to.
 * @param {object} seatData - The updated seat information: { id, status, lockedUntil, lockedBy }
 */
function emitSeatUpdate(matchId, seatData) {
  if (!io) return;
  io.to(matchId.toString()).emit('seat_update', seatData);
}

/**
 * Broadcast attendance update to administrative dashboard rooms.
 * @param {string} matchId - The match ID.
 * @param {object} attendanceData - Live metrics update: { matchId, totalSeats, bookedSeats, attendedCount, entryRate, premiumRate, generalRate }
 */
function emitAttendanceUpdate(matchId, attendanceData) {
  if (!io) return;
  // Broadcast to all dashboard clients
  io.emit('attendance_update', { matchId, ...attendanceData });
}

/**
 * Emit a new notification event to a specific user.
 * @param {string} userId - The user's ObjectId string.
 * @param {object} notification - The notification document object.
 */
function emitNewNotification(userId, notification) {
  if (!io) return;
  io.to(`user_${userId}`).emit('new_notification', notification);
}

module.exports = {
  init,
  getIO,
  emitSeatUpdate,
  emitAttendanceUpdate,
  emitNewNotification,
};
