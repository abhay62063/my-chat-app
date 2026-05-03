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

  // ── Theme Toggle ────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('chat-theme') || 'light');

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

  // ── Page Visibility API — Security Guard ──────────────────────────────────
  // When the user backgrounds the app (switches tabs, apps, or the screen
  // locks), disconnect the socket immediately. The server's existing
  // 'disconnect' handler will emit the 'left the room' notification to peers
  // automatically — no extra backend code needed.
  // On returning, reconnect and silently re-join the room.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Skip disconnect if the user is just opening the file picker.
        // On Android/iOS the file picker backgrounds the page briefly.
        if (isPickingFile.current) return;
        // User genuinely left — cut the connection so peers see them leave cleanly
        if (socket.connected) socket.disconnect();
      } else {
        // User returned — reconnect and re-join if they were in a room
        if (!socket.connected) {
          socket.connect();
          if (showChat && room && username) {
            // Small delay to let the socket handshake complete
            setTimeout(() => {
              socket.emit('join_room', { room, username });
            }, 400);
            // Show the security banner so the user knows what happened
            setSessionEnded(true);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  // showChat/room/username must be in deps so the closure captures fresh values
  }, [showChat, room, username]);

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
      setShowChat(true); // ChatArea's useEffect will emit join_room after mounting
    }
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
            sessionEnded={sessionEnded}
            clearSessionEnded={() => setSessionEnded(false)}
            isPickingFile={isPickingFile}
          />
        </div>
      </div>
    </div>
  );
}