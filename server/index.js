const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

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

    // Room Join Logic with Member Tracking
    socket.on("join_room", (data) => {
        const { room, username } = data; // Ab hume object mil raha hai jisme username bhi hai
        socket.join(room);
        
        // Room mein user ko add karo
        if (!roomUsers[room]) {
            roomUsers[room] = [];
        }

        // Check karo ki user pehle se list mein na ho (duplicate prevent karne ke liye)
        const userExists = roomUsers[room].find(user => user.id === socket.id);
        if (!userExists) {
            roomUsers[room].push({ id: socket.id, username: username });
        }

        console.log(`User ${username} joined room: ${room}`);

        // Pure room ko updated members list bhejo
        io.in(room).emit("update_members", roomUsers[room]);
    });

    // Send Message Logic
    socket.on("send_message", (data) => {
        socket.to(data.room).emit("receive_message", data);
    });

    // Typing Logic
    socket.on("typing", (data) => {
        socket.to(data.room).emit("display_typing", data);
    });

    socket.on("stop_typing", (data) => {
        socket.to(data.room).emit("hide_typing");
    });

    // Clear Chat Logic
    socket.on("clear_chat", (room) => {
        io.in(room).emit("chat_cleared");
    });

    // Disconnect Logic: User ko list se hatana zaruri hai
    socket.on("disconnect", () => {
        console.log("User Disconnected", socket.id);
        
        // Har room mein check karo aur user ko remove karo
        for (const room in roomUsers) {
            roomUsers[room] = roomUsers[room].filter(user => user.id !== socket.id);
            // Baki logo ko updated list bhejo
            io.in(room).emit("update_members", roomUsers[room]);
        }
    });
});

server.listen(5000, () => {
    console.log("SERVER RUNNING ON PORT 5000");
});