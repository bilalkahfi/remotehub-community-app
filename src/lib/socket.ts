import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { NextApiResponse } from "next";

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

export function getSocketServer(res: NextApiResponseWithSocket): SocketIOServer {
  if (!res.socket.server.io) {
    const io = new SocketIOServer(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      const userId = socket.handshake.query.userId as string;
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`User ${userId} connected via socket`);
      }

      // Join a room
      socket.on("join-room", (roomId: string) => {
        socket.join(roomId);
      });

      // Leave a room
      socket.on("leave-room", (roomId: string) => {
        socket.leave(roomId);
      });

      // Private message
      socket.on(
        "send-message",
        (data: { receiverId: string; content: string; senderName: string }) => {
          // Emit new message to receiver
          io.to(`user:${data.receiverId}`).emit("new-message", {
            from: userId,
            content: data.content,
            senderName: data.senderName,
            timestamp: new Date().toISOString(),
          });
          // Send notification to receiver
          io.to(`user:${data.receiverId}`).emit("notification", {
            type: "new_message",
            title: `New message from ${data.senderName}`,
            message: data.content,
            link: `/messages/${userId}`,
          });
          // Also send confirmation back to sender
          socket.emit("message-sent", {
            to: data.receiverId,
            content: data.content,
            timestamp: new Date().toISOString(),
          });
        }
      );

      // Typing indicator
      socket.on(
        "typing",
        (data: { receiverId: string; isTyping: boolean }) => {
          io.to(`user:${data.receiverId}`).emit("user-typing", {
            from: userId,
            isTyping: data.isTyping,
          });
        }
      );

      // Forum notification events
      socket.on(
        "forum-new-post",
        (data: { categorySlug: string; title: string; content: string; authorName: string }) => {
          // Broadcast to all users in the category
          socket.broadcast.emit("notification", {
            type: "forum_post",
            title: `New thread: ${data.title}`,
            message: `${data.authorName} posted in #${data.categorySlug}`,
            link: `/forum/${data.categorySlug}`,
          });
        }
      );

      socket.on(
        "forum-new-reply",
        (data: { categorySlug: string; postId: string; title: string; replierName: string }) => {
          socket.broadcast.emit("notification", {
            type: "forum_reply",
            title: `New reply in ${data.title}`,
            message: `${data.replierName} replied to a thread`,
            link: `/forum/${data.categorySlug}/${data.postId}`,
          });
        }
      );

      // WebRTC signaling
      socket.on(
        "webrtc-offer",
        (data: { target: string; offer: any }) => {
          io.to(`user:${data.target}`).emit("webrtc-offer", {
            from: userId,
            offer: data.offer,
          });
        }
      );

      socket.on(
        "webrtc-answer",
        (data: { target: string; answer: any }) => {
          io.to(`user:${data.target}`).emit("webrtc-answer", {
            from: userId,
            answer: data.answer,
          });
        }
      );

      socket.on(
        "webrtc-ice-candidate",
        (data: { target: string; candidate: any }) => {
          io.to(`user:${data.target}`).emit("webrtc-ice-candidate", {
            from: userId,
            candidate: data.candidate,
          });
        }
      );

      // Voice room events
      socket.on(
        "join-voice-room",
        (data: { roomId: string; userName: string }) => {
          socket.join(`voice:${data.roomId}`);
          io.to(`voice:${data.roomId}`).emit("user-joined", {
            userId,
            userName: data.userName,
          });
        }
      );

      socket.on(
        "leave-voice-room",
        (data: { roomId: string; userName: string }) => {
          socket.leave(`voice:${data.roomId}`);
          io.to(`voice:${data.roomId}`).emit("user-left", {
            userId,
            userName: data.userName,
          });
        }
      );

      socket.on("disconnect", () => {
        console.log(`User ${userId} disconnected`);
      });
    });

    res.socket.server.io = io;
  }
  return res.socket.server.io;
}
