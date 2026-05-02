import { useState, useEffect } from 'react';
import { StarField } from './components/StarField';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ChatArea } from './components/ChatArea';
import io from "socket.io-client";

// Auto-switch: localhost in dev, deployed URL in production
const SERVER_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://my-chat-app-t5b5.onrender.com';

console.log('🔌 Connecting to server:', SERVER_URL);

const socket = io(SERVER_URL, {
  transports: ["websocket", "polling"],
  autoConnect: true,
});

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [password, setPassword] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [members, setMembers] = useState([]);

  // ── Theme Toggle ────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('chat-theme') || 'dark');

  useEffect(() => {
    localStorage.setItem('chat-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // ── Socket Listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    socket.on("connect", () => console.log("Connected! ID:", socket.id));
    socket.on("update_members", (data) => setMembers(data));
    socket.on("connect_error", (err) => console.log("Connection Error:", err.message));
    return () => {
      socket.off("connect");
      socket.off("update_members");
      socket.off("connect_error");
    };
  }, []);

  // ── Mobile Detection ────────────────────────────────────────────────────────
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ── Join Room ───────────────────────────────────────────────────────────────
  // NOTE: socket.emit("join_room") is intentionally done INSIDE ChatArea
  // so the message_history listener is guaranteed to be registered first.
  const joinRoom = () => {
    if (username !== "" && room !== "" && password !== "") {
      setShowChat(true); // ChatArea's useEffect will emit join_room after mounting
    }
  };

  const isDark = theme === 'dark';

  return (
    <div
      className="relative h-screen overflow-hidden font-['Inter',sans-serif]"
      style={{ color: isDark ? 'white' : '#1a1a2e' }}
    >
      {/* ── Backgrounds ── */}
      {isDark ? (
        <>
          <div className="fixed inset-0 bg-[#050505]" />
          <div className="fixed top-1/4 -left-32 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="fixed bottom-1/4 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <StarField />
        </>
      ) : (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-100 via-slate-100 to-blue-50" />
      )}

      {/* Theme toggle moved into ChatArea 3-dot menu */}

      <div className="relative z-10 h-full flex">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isMobile={isMobile}
          room={room}
          username={username}
          members={members}
          theme={theme}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {isMobile && (
            <TopBar onMenuClick={() => setIsSidebarOpen(true)} room={room} theme={theme} />
          )}
          <ChatArea
            socket={socket}
            username={username}
            room={room}
            password={password}
            setUsername={setUsername}
            setRoom={setRoom}
            setPassword={setPassword}
            joinRoom={joinRoom}
            showChat={showChat}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        </div>
      </div>
    </div>
  );
}