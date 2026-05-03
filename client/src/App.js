import { useState, useEffect, useRef } from 'react';
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
  reconnection: true,
  reconnectionAttempts: Infinity,
});

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [password, setPassword] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [members, setMembers] = useState([]);
  // Banner shown when the session was ended by the Page Visibility guard
  const [sessionEnded, setSessionEnded] = useState(false);
  // Ref set to true while the OS file-picker dialog is open.
  // The file picker backgrounds the page (visibilityState → 'hidden') on
  // Android and iOS, so we must NOT disconnect the socket during that window.
  const isPickingFile = useRef(false);
  // Tracks whether the socket has connected at least once.
  // Used to distinguish first-connect from auto-reconnect inside the 'connect' listener.
  const wasConnected = useRef(false);

  // ── Theme Toggle ────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('chat-theme') || 'light');

  useEffect(() => {
    localStorage.setItem('chat-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // ── Socket Listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected! ID:", socket.id);
      if (wasConnected.current && showChat && room && username) {
        // This is a RECONNECT (tab switch, network blip, file picker, etc.).
        // Re-join the room silently — the server will suppress the notification
        // because our 5-minute grace timer is still running.
        console.log('🔄 Auto-reconnecting and re-joining room...');
        socket.emit("join_room", { room, username });
        setSessionEnded(true);
      }
      wasConnected.current = true;
    });
    socket.on("update_members", (data) => setMembers(data));
    socket.on("connect_error", (err) => console.log("Connection Error:", err.message));
    return () => {
      socket.off("connect");
      socket.off("update_members");
      socket.off("connect_error");
    };
  }, [showChat, room, username]);

  // ── Mobile Detection ────────────────────────────────────────────────────────
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Client-side Page Visibility grace period has been removed.
  // Grace period and background timeouts are now handled natively by the backend
  // and Socket.io auto-reconnection.

  // ── Visual Viewport Height (keyboard-aware) ──────────────────────────────
  // Writes --vvh to <html> so the app shrinks exactly when the soft keyboard
  // appears in Instagram/Safari/Chrome in-app browsers. 100dvh and
  // window.innerHeight are both unreliable in these environments.
  useEffect(() => {
    const setVvh = () => {
      const h = window.visualViewport
        ? window.visualViewport.height
        : window.innerHeight;
      document.documentElement.style.setProperty('--vvh', `${h}px`);
    };

    setVvh(); // Set immediately before first paint

    const vvp = window.visualViewport;
    if (vvp) {
      vvp.addEventListener('resize', setVvh);
      vvp.addEventListener('scroll', setVvh);
    }
    // Fallback for browsers without Visual Viewport API
    window.addEventListener('resize', setVvh);

    return () => {
      if (vvp) {
        vvp.removeEventListener('resize', setVvh);
        vvp.removeEventListener('scroll', setVvh);
      }
      window.removeEventListener('resize', setVvh);
    };
  }, []);

  // ── Join Room ───────────────────────────────────────────────────────────────
  // NOTE: socket.emit("join_room") is intentionally done INSIDE ChatArea
  // so the message_history listener is guaranteed to be registered first.
  const joinRoom = () => {
    if (username !== "" && room !== "" && password !== "") {
      if (!socket.connected) socket.connect();
      setShowChat(true); // ChatArea's useEffect will emit join_room after mounting
    }
  };

  // ── Manual Leave Room ───────────────────────────────────────────────────────
  // Called by the Leave Room button.
  // Sends the explicit manual_leave event to immediately clear backend timers and notify peers.
  const leaveRoom = () => {
    socket.emit("manual_leave", { room, username });
    if (socket.connected) socket.disconnect();
    setShowChat(false);
    setUsername("");
    setRoom("");
    setPassword("");
  };

  const isDark = theme === 'dark';

  return (
    <div
      className="app-root relative overflow-hidden font-['Inter',sans-serif]"
      style={{ height: 'var(--vvh, 100dvh)', color: isDark ? 'white' : '#1a1a2e' }}
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
          leaveRoom={leaveRoom}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {isMobile && (
            <TopBar onMenuClick={() => setIsSidebarOpen(true)} room={room} theme={theme} members={members} />
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
            leaveRoom={leaveRoom}
            showChat={showChat}
            theme={theme}
            toggleTheme={toggleTheme}
            sessionEnded={sessionEnded}
            clearSessionEnded={() => setSessionEnded(false)}
            isPickingFile={isPickingFile}
          />
        </div>
      </div>
    </div>
  );
}