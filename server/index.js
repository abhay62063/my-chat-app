const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" } 
});

io.on("connection", (socket) => {
    socket.on("join_room", (data) => {
        socket.join(data.room);
        console.log(`Room joined: ${data.room}`);
    });

    socket.on("send_message", (data) => {
        // Sirf dusre logon ko bhejo (Double prevent)
        socket.to(data.room).emit("receive_message", data);
    });

    socket.on("typing", (data) => {
        socket.to(data.room).emit("display_typing", data);
    });

    socket.on("clear_all_chat", (data) => {
        io.in(data.room).emit("chat_cleared_done");
    });
});

server.listen(5000, () => console.log("Server running on port 5000"));