import express from "express";
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import Chat from "./module/Chat.js";
import authRouter from "./router/Auth.js";

dotenv.config();

// --------------------- EXPRESS APP ---------------------
const app = express();
app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:5173"], // frontend origin
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// --------------------- MONGODB CONNECTION ---------------------
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_DB || "");
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
  }
}
connectDB();

// --------------------- ROUTES ---------------------
app.use("/api/v1", authRouter);

app.get("/", (req: Request, res: Response) => {
  res.send("Server and WebSocket are running!");
});

// --------------------- ERROR HANDLER ---------------------
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err.message || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong!",
  });
});

// --------------------- HTTP SERVER + WEBSOCKET ---------------------
const server = http.createServer(app);
const wss = new WebSocketServer({ server }); // attach WS to same server

interface User {
  socket: WebSocket;
  room: string;
}

let allSocket: User[] = [];

wss.on("connection", (socket) => {
  console.log("🟢 A user connected via WebSocket");

  socket.on("message", async (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());

      // ----- JOIN ROOM -----
      if (parsedMessage.type === "join") {
        const roomId = parsedMessage.payload.roomId;
        console.log(`User joined room: ${roomId}`);
        allSocket.push({ socket, room: roomId });
      }

      // ----- CHAT MESSAGE -----
      if (parsedMessage.type === "chat") {
        const { sender, message: msg,roomId } = parsedMessage.payload;

        // Save to MongoDB
        const newChat = await Chat.create({
          room: roomId,
          sender,
          message: msg,
        });
        await newChat.save();

        // Send message to all sockets in the same room
        allSocket.forEach((user) => {
          if (user.room === roomId) {
            user.socket.send(
              JSON.stringify({
                type: "chat",
                payload: { sender, message: msg },
              })
            );
          }
        });
      }
    } catch (error) {
      console.error("❌ Error handling message:", error);
    }
  });

  socket.on("close", () => {
    console.log("🔴 User disconnected");
    allSocket = allSocket.filter((u) => u.socket !== socket);
  });
});

// --------------------- START SERVER ---------------------
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Server + WebSocket running on port ${PORT}`);
});
