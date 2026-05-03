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
  message: { type: String, required: true }, // Encrypted ciphertext OR placeholder text
  time: { type: String, required: true },
  type: { type: String, default: 'text' },   // 'text' | 'image' | 'video'
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

// ── Rapid-reconnect grace window ───────────────────────────────────────────────
// If a user disconnects and re-joins the SAME room within 5 seconds,
// suppress both the 'left' and the 'joined' notifications to avoid spam
// caused by fast tab-switches, the file-picker backgrounding the page, etc.
// Key: `${username}::${room}`  Value: setTimeout timer ID
const pendingLeaveTimers = new Map();

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

    // ── Grace-window check: suppress notification if user just left ──
    const graceKey = `${username}::${room}`;
    if (pendingLeaveTimers.has(graceKey)) {
      // They're back within 5 s — cancel the leave timer, send NO notifications
      clearTimeout(pendingLeaveTimers.get(graceKey));
      pendingLeaveTimers.delete(graceKey);
      console.log(`⚡ ${username} re-joined '${room}' within grace window — suppressing notifications`);
    } else {
      // Genuinely new join — notify everyone else
      socket.to(room).emit("receive_notification", {
        author: 'System',
        message: `${username} joined the room`,
        time: Date.now(),
        type: 'notification'
      });
    }

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

  // ── Send Multimedia (image / video) ──────────────────────────────────────
  // CRITICAL: Only the placeholder text is saved to MongoDB.
  // The actual Base64 payload is relayed over the socket ONLY — never stored.
  socket.on("send_multimedia", async (data) => {
    // data = { msgId, room, author, mediaBase64, mediaType ('image'|'video'), time }
    const placeholder = data.mediaType === 'video' ? '[Video Shared]' : '[Image Shared]';

    try {
      const newMessage = new Message({
        msgId: data.msgId,
        room: data.room,
        author: data.author,
        message: placeholder,   // ← lightweight text, NOT the Base64
        time: data.time,
        type: data.mediaType,   // 'image' or 'video'
        seenBy: []
      });
      await newMessage.save();
      console.log(`🖼️  Multimedia placeholder saved for room: ${data.room} [${data.mediaType}]`);
    } catch (err) {
      console.error("❌ Error saving multimedia placeholder:", err);
    }

    // Relay the FULL payload (including Base64) only to peers — not back to sender
    socket.to(data.room).emit("receive_multimedia", data);
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
      // Find the user BEFORE removing them so we can get their username
      const leavingUser = roomUsers[room].find(user => user.id === socket.id);
      roomUsers[room] = roomUsers[room].filter(user => user.id !== socket.id);
      io.in(room).emit("update_members", roomUsers[room]);

      if (leavingUser) {
        const graceKey = `${leavingUser.username}::${room}`;
        // Start a 5-second grace window.
        // If the same username re-joins before it expires, the timer is
        // cancelled in join_room and no notification is sent at all.
        const timer = setTimeout(() => {
          pendingLeaveTimers.delete(graceKey);
          io.in(room).emit("receive_notification", {
            author: 'System',
            message: `${leavingUser.username} left the room`,
            time: Date.now(),
            type: 'notification'
          });
        }, 5000); // 5-second grace window
        pendingLeaveTimers.set(graceKey, timer);
      }
    }
  });
});

server.listen(5000, () => {
  console.log("🚀 SERVER RUNNING ON PORT 5000");
});