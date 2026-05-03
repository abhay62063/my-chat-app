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
  },
  maxHttpBufferSize: 1e8 // 100MB — supports large video clips and high-res camera photos
});

// ── Room tracking ─────────────────────────────────────────────────────────────
const roomUsers = {};

// ── 5-Minute Grace Period ─────────────────────────────────────────────────────
// Prevents "left" spam during tab switches, file-picker events and auto-reconnects.
// Key: `${username}::${room}`  →  Value: setTimeout timer ID
const disconnectTimers = {};

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // ── Join Room ────────────────────────────────────────────────────────────────
  socket.on("join_room", async (data) => {
    const { room, username } = data;
    const graceKey = `${username}::${room}`;

    socket.join(room);

    // Add user to room tracking (avoid duplicates by username)
    if (!roomUsers[room]) roomUsers[room] = [];
    const alreadyTracked = roomUsers[room].find(u => u.username === username);
    if (alreadyTracked) {
      alreadyTracked.id = socket.id;
    } else {
      roomUsers[room].push({ id: socket.id, username });
    }

    // Ensure uniqueness just in case
    const uniqueUsers = Array.from(new Map(roomUsers[room].map(item => [item.username, item])).values());
    roomUsers[room] = uniqueUsers;

    console.log(`User ${username} joined room: ${room}`);
    io.in(room).emit("update_members", roomUsers[room]);

    // ── Grace-window check ────────────────────────────────────────────────────
    // If a timer is running it means this is a SILENT RECONNECT (tab switch /
    // file-picker / auto-reconnect). Cancel it and send NO notification.
    if (disconnectTimers[graceKey]) {
      clearTimeout(disconnectTimers[graceKey]);
      delete disconnectTimers[graceKey];
      console.log(`⚡ ${username} silently reconnected to '${room}' — suppressing notifications`);
    } else {
      // Genuine first join — notify everyone else in the room
      socket.to(room).emit("receive_notification", {
        author: 'System',
        message: `${username} joined the room`,
        time: Date.now(),
        type: 'notification'
      });
    }

    // Fetch last 200 messages and send only to the joining user
    try {
      const history = await Message.find({ room })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
      socket.emit("message_history", history.reverse());
      console.log(`📜 Sent ${history.length} history messages to ${username}`);
    } catch (err) {
      console.error("❌ Error fetching message history:", err);
    }
  });

  // ── Send Message (save encrypted message to DB) ───────────────────────────
  socket.on("send_message", async (data) => {
    try {
      const newMessage = new Message({
        msgId: data.msgId,
        room: data.room,
        author: data.author,
        message: data.message,
        time: data.time,
        seenBy: []
      });
      await newMessage.save();
    } catch (err) {
      console.error("❌ Error saving message:", err);
    }
    socket.to(data.room).emit("receive_message", data);
  });

  // ── Send Multimedia ───────────────────────────────────────────────────────
  // Only the placeholder text is saved to MongoDB. Base64 is relayed only.
  socket.on("send_multimedia", async (data) => {
    const placeholder = data.mediaType === 'video' ? '[Video Shared]' : '[Image Shared]';
    try {
      const newMessage = new Message({
        msgId: data.msgId,
        room: data.room,
        author: data.author,
        message: placeholder,
        time: data.time,
        type: data.mediaType,
        seenBy: []
      });
      await newMessage.save();
    } catch (err) {
      console.error("❌ Error saving multimedia placeholder:", err);
    }
    socket.to(data.room).emit("receive_multimedia", data);
  });

  // ── Typing Indicators ─────────────────────────────────────────────────────
  socket.on("typing", (data) => {
    socket.to(data.room).emit("display_typing", data);
  });

  socket.on("stop_typing", (data) => {
    socket.to(data.room).emit("hide_typing");
  });

  // ── Clear Chat (UI only) ──────────────────────────────────────────────────
  socket.on("clear_chat", (room) => {
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

  // ── Manual Leave — Instant broadcast, no grace period ────────────────────
  socket.on("manual_leave", (data) => {
    const { room, username } = data;
    const graceKey = `${username}::${room}`;

    // Cancel any pending timer so it doesn't fire a duplicate notification
    if (disconnectTimers[graceKey]) {
      clearTimeout(disconnectTimers[graceKey]);
      delete disconnectTimers[graceKey];
    }

    // Remove from tracking
    if (roomUsers[room]) {
      roomUsers[room] = roomUsers[room].filter(u => u.username !== username);
      io.in(room).emit("update_members", roomUsers[room]);
    }

    // Broadcast the leave immediately
    io.in(room).emit("receive_notification", {
      author: 'System',
      message: `${username} left the room`,
      time: Date.now(),
      type: 'notification'
    });

    socket.leave(room);
    console.log(`🚪 ${username} manually left room: ${room}`);
  });

  // ── Disconnect — 5-Minute Grace Window ───────────────────────────────────
  // Suppresses spurious "left" messages caused by tab switches, file pickers,
  // and mobile auto-reconnects. If the user genuinely stays away for 5+ mins,
  // the notification fires.
  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);

    for (const room in roomUsers) {
      const leavingUser = roomUsers[room].find(u => u.id === socket.id);
      if (!leavingUser) continue;

      const { username } = leavingUser;
      const graceKey = `${username}::${room}`;

      // Don't stack timers if one already exists for this user
      if (disconnectTimers[graceKey]) {
        clearTimeout(disconnectTimers[graceKey]);
      }

      disconnectTimers[graceKey] = setTimeout(() => {
        delete disconnectTimers[graceKey];
        
        // Remove from member list only after grace period
        roomUsers[room] = roomUsers[room].filter(u => u.username !== username);
        io.in(room).emit("update_members", roomUsers[room]);

        io.in(room).emit("receive_notification", {
          author: 'System',
          message: `${username} left the room`,
          time: Date.now(),
          type: 'notification'
        });
        console.log(`⏰ Grace expired — ${username} left '${room}'`);
      }, 10 * 60 * 1000); // 10-minute grace window

      console.log(`⏳ Grace timer started for ${username} in '${room}'`);
    }
  });
});

server.listen(5000, () => {
  console.log("🚀 SERVER RUNNING ON PORT 5000");
});