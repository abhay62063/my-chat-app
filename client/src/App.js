import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { StarField } from './components/StarField';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ChatArea } from './components/ChatArea';
import io from "socket.io-client";

// Socket connection initialization
const socket = io("https://my-chat-app-t5b5.onrender.com", {
  transports: ["websocket"],
  autoConnect: true,
});

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Chat & Members States
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [members, setMembers] = useState([]); // Members list state

  // Socket Connection & Members Update Listeners
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to Server! ID:", socket.id);
    });

    // Jab koi naya user join karega, backend ye event bhejega
    socket.on("update_members", (data) => {
      console.log("Updated members list:", data);
      setMembers(data);
    });

    socket.on("connect_error", (err) => {
      console.log("Connection Error:", err.message);
    });

    return () => {
      socket.off("connect");
      socket.off("update_members");
      socket.off("connect_error");
    };
  }, []);

  // Mobile check logic
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Join Room Logic (Sending object with room and username)
  const joinRoom = () => {
    if (username !== "" && room !== "") {
      socket.emit("join_room", { room, username }); 
      setShowChat(true);
    }
  };

  return (
    <div className="relative h-screen overflow-hidden font-['Inter',sans-serif] text-white">
      {/* Background Gradients */}
      <div className="fixed inset-0 bg-[#050505]" />
      <div className="fixed top-1/4 -left-32 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <StarField />

      <div className="relative z-10 h-full flex">
        {/* Pass members list to Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)}
          isMobile={isMobile}
          room={room}        
          username={username} 
          members={members} 
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {isMobile && (
            <TopBar onMenuClick={() => setIsSidebarOpen(true)} room={room} />
          )}

          <ChatArea 
            socket={socket} 
            username={username} 
            room={room} 
            setUsername={setUsername}
            setRoom={setRoom}
            joinRoom={joinRoom}
            showChat={showChat}
          />
        </div>
      </div>
    </div>
  );
}