import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server | null = null;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected to Socket.io:', socket.id);

    socket.on('join-project', (projectId: string) => {
      socket.join(projectId);
      console.log(`Socket ${socket.id} joined project room: ${projectId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected from Socket.io:', socket.id);
    });
  });

  return io;
};

export const getSocketIO = () => {
  return io;
};

export const emitToProject = (projectId: string, event: string, data: any) => {
  if (io) {
    io.to(projectId).emit(event, data);
  }
};

export const emitToUser = (userId: string, event: string, data: any) => {
  if (io) {
    io.emit(`${event}:${userId}`, data);
  }
};
