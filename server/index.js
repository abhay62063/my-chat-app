const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGO_URI = "mongodb+srv://rajjaiswal9771:Abhay129962@cluster0.3x5j2uq.mongodb.net/chatapp?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully!"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ─── Message Schema & Model ───────────────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  msgId: { type: String, required: true, unique: true },
  room: { type: String, required: true, index: true },
  author: { type: String, required: true },
  message: { type: String, required: true }, // Encrypted ciphertext stored here
  time: { type: String, required: true },
  seenBy: { type: [String], default: [] }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

// ─── Express & Socket.IO Setup ────────────────────────────────────────────────
const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Room users ko track karne ke liye object
const roomUsers = {};

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // ── Join Room (with history retrieval) ────────────────────────────────────
  socket.on("join_room", async (data) => {
    const { room, username } = data;
    socket.join(room);

    // Add user to room tracking
    if (!roomUsers[room]) roomUsers[room] = [];
    const userExists = roomUsers[room].find(user => user.id === socket.id);
    if (!userExists) {
      roomUsers[room].push({ id: socket.id, username });
    }

    console.log(`User ${username} joined room: ${room}`);

    // Broadcast updated members list
    io.in(room).emit("update_members", roomUsers[room]);

    // Fetch last 200 messages for this room and send only to the joining user
    try {
      const history = await Message.find({ room })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();

      // Reverse so oldest messages appear first in chat
      const ordered = history.reverse();
      socket.emit("message_history", ordered);
      console.log(`📜 Sent ${ordered.length} history messages to ${username}`);
    } catch (err) {
      console.error("❌ Error fetching message history:", err);
    }
  });

  // ── Send Message (save encrypted message to DB) ───────────────────────────
  socket.on("send_message", async (data) => {
    // data.message is the encrypted ciphertext from the client
    try {
      const newMessage = new Message({
        msgId: data.msgId,
        room: data.room,
        author: data.author,
        message: data.message, // Encrypted ciphertext
        time: data.time,
        seenBy: []
      });
      await newMessage.save();
      console.log(`💾 Message saved to DB for room: ${data.room}`);
    } catch (err) {
      console.error("❌ Error saving message:", err);
    }

    // Broadcast the encrypted message to all OTHER users in the room
    socket.to(data.room).emit("receive_message", data);
  });

  // ── Typing Indicators ─────────────────────────────────────────────────────
  socket.on("typing", (data) => {
    socket.to(data.room).emit("display_typing", data);
  });

  socket.on("stop_typing", (data) => {
    socket.to(data.room).emit("hide_typing");
  });

  // ── Clear Chat (UI only - NO DB delete) ───────────────────────────────────
  socket.on("clear_chat", (room) => {
    // Only clears the local UI for everyone in the room; DB is untouched
    io.in(room).emit("chat_cleared");
  });

  // ── Message Seen ──────────────────────────────────────────────────────────
  socket.on("message_seen", async (data) => {
    const { room, msgId, username } = data;
    try {
      const msg = await Message.findOne({ msgId });
      if (msg && !msg.seenBy.includes(username)) {
        msg.seenBy.push(username);
        await msg.save();
        io.in(room).emit("status_updated", { msgId, seenBy: msg.seenBy });
      }
    } catch (err) {
      console.error("❌ Error updating seen status:", err);
    }
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);
    for (const room in roomUsers) {
      roomUsers[room] = roomUsers[room].filter(user => user.id !== socket.id);
      io.in(room).emit("update_members", roomUsers[room]);
    }
  });
});

server.listen(5000, () => {
  console.log("🚀 SERVER RUNNING ON PORT 5000");
});