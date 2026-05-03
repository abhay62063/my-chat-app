import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Lock, User, Hash, Trash2, MoreVertical, Sun, Moon, Check, CheckCheck, Paperclip, Download, Loader2, Eye, EyeOff } from 'lucide-react';
import CryptoJS from 'crypto-js';
import imageCompression from 'browser-image-compression';

// ── Helpers ──────────────────────────────────────────────────────────────────
const encrypt = (text, key) => CryptoJS.AES.encrypt(text, key).toString();

const decrypt = (ciphertext, key) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    return bytes.toString(CryptoJS.enc.Utf8) || '[Encrypted]';
  } catch {
    return '[Encrypted]';
  }
};

// ── Theme helpers ─────────────────────────────────────────────────────────────
const t = {
  // card backgrounds
  card: (dark) => dark ? 'bg-white/10 backdrop-blur-3xl border border-white/20' : 'bg-white border border-slate-200 shadow-xl',
  // input fields
  input: (dark) => dark
    ? 'bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500/50'
    : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-400',
  // header bar
  header: (dark) => dark
    ? 'bg-white/5 backdrop-blur-md border-b border-white/10'
    : 'bg-white border-b border-slate-200 shadow-sm',
  // own message bubble
  ownBubble: (dark) => dark
    ? 'bg-cyan-500/30 border border-cyan-400/30'
    : 'bg-blue-500 text-white',
  // other message bubble
  otherBubble: (dark) => dark
    ? 'bg-white/10 border border-white/20'
    : 'bg-slate-100 border border-slate-200 text-slate-800',
  // input area wrapper
  inputArea: (dark) => dark
    ? 'bg-white/5 border-t border-white/10 backdrop-blur-xl'
    : 'bg-white border-t border-slate-200',
  // send button
  sendBtn: (dark) => dark
    ? 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/30'
    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-400/30',
  // author name color
  author: (dark) => dark ? 'text-cyan-400' : 'text-blue-600',
  // label
  label: (dark) => dark ? 'text-cyan-400/60' : 'text-blue-500/70',
  // title
  title: (dark) => dark ? 'text-white' : 'text-slate-800',
};

// ── Media Download helper ────────────────────────────────────────────────────
const downloadMedia = (base64, mediaType, time) => {
  const ext = mediaType === 'video' ? 'mp4' : 'png';
  const filename = `GhostLink_Media_${time}.${ext}`;
  const link = document.createElement('a');
  link.href = base64;
  link.download = filename;
  link.click();
};

// ── MediaBubble: cinematic glassmorphism frame for shared images & videos ────
const MediaBubble = ({ msg, isOwn, isDark }) => {
  const isVideo = msg.mediaType === 'video';
  const time = msg.time || Date.now();

  const hasSeen = msg.seenBy && msg.seenBy.length > 0;
  const seenTooltip = hasSeen ? `Seen by: ${msg.seenBy.join(', ')}` : 'Sent';

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '1.25rem',
        overflow: 'hidden',
        maxWidth: '280px',
        border: isDark
          ? '1.5px solid rgba(34,211,238,0.35)'
          : '1.5px solid rgba(59,130,246,0.3)',
        boxShadow: isDark
          ? '0 0 24px rgba(34,211,238,0.18), 0 4px 24px rgba(0,0,0,0.5)'
          : '0 4px 24px rgba(59,130,246,0.15)',
        background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {isVideo ? (
        <video
          src={msg.mediaBase64}
          controls
          playsInline           // Essential for iOS inline playback
          muted={false}         // Unmuted by default so sound works on first play
          style={{ display: 'block', width: '100%', maxHeight: '280px', objectFit: 'contain', background: '#000' }}
        />
      ) : (
        <img
          src={
            // Ensure the Base64 string always has a valid data: URI prefix.
            // If imageCompression returns a Blob URL or a raw base64 string without
            // the prefix, the img tag will show broken. Always normalise here.
            msg.mediaBase64 && msg.mediaBase64.startsWith('data:')
              ? msg.mediaBase64
              : `data:image/jpeg;base64,${msg.mediaBase64}`
          }
          alt="Shared image"
          style={{ display: 'block', width: '100%', maxHeight: '260px', objectFit: 'cover' }}
          onError={(e) => {
            // Fallback: if the src is still broken, hide the broken icon
            e.currentTarget.style.opacity = '0.3';
          }}
        />
      )}

      {/* Download button — top-right corner overlay */}
      <button
        onClick={() => downloadMedia(msg.mediaBase64, msg.mediaType, time)}
        title="Save to device"
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)',
          border: isDark ? '1px solid rgba(34,211,238,0.4)' : '1px solid rgba(59,130,246,0.3)',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Download size={14} color={isDark ? '#22d3ee' : '#3b82f6'} />
      </button>

      {/* Caption bar — label + time + read receipt */}
      <div style={{
        padding: '4px 10px 6px',
        fontSize: '0.65rem',
        color: isDark ? 'rgba(156,163,175,0.9)' : 'rgba(100,116,139,0.9)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(248,250,252,0.8)',
      }}>
        <span style={{ fontStyle: 'italic' }}>{isVideo ? '🎬 Video' : '🖼 Image'}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {msg.time}
          {/* Read-receipt ticks — only visible on sender's side */}
          {isOwn && (
            <span title={seenTooltip} style={{ display: 'flex', alignItems: 'center', cursor: 'help' }}>
              {hasSeen
                ? <CheckCheck size={11} color="#60a5fa" />
                : <Check size={11} color={isDark ? '#6b7280' : '#94a3b8'} />
              }
            </span>
          )}
        </span>
      </div>
    </div>
  );
};

// ── Message Item Component (Handles Visibility & Seen Status) ───────────────
const MessageItem = ({ msg, username, isDark, socket, room }) => {
  const isOwn = username === msg.author;
  const ref = useRef(null);

  // All hooks must be called unconditionally (Rules of Hooks).
  // For notification messages the IntersectionObserver is a no-op.
  useEffect(() => {
    if (msg.type === 'notification') return; // Skip for system messages
    if (isOwn) return;
    if (msg.seenBy && msg.seenBy.includes(username)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          socket.emit("message_seen", { room, msgId: msg.msgId, username });
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [isOwn, msg, username, socket, room]);

  // ── Notification (system) messages render as a centered pill ─────────────
  if (msg.type === 'notification') {
    return (
      <div className="flex justify-center my-1">
        <span
          style={{
            fontSize: '0.75rem', // 12px
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.9)',
            background: 'rgba(30, 41, 59, 0.65)', // Dark glassmorphism
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '4px 16px',
            borderRadius: '999px',
            userSelect: 'none',
          }}
        >
          {msg.message}
        </span>
      </div>
    );
  }

  // ── Media messages (image / video) ────────────────────────────────────────
  if (msg.type === 'image' || msg.type === 'video') {
    return (
      <div ref={ref} className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
        <p className={`text-[10px] font-bold px-1 ${t.author(isDark)}`}>{msg.author}</p>
        <MediaBubble msg={msg} isOwn={isOwn} isDark={isDark} />
      </div>
    );
  }

  const hasSeen = msg.seenBy && msg.seenBy.length > 0;
  const seenTooltip = hasSeen ? `Seen by: ${msg.seenBy.join(', ')}` : 'Sent';

  return (
    <div ref={ref} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] p-3 rounded-2xl relative group ${isOwn ? t.ownBubble(isDark) : t.otherBubble(isDark)}`}>
        <p className={`text-[10px] font-bold mb-1 ${t.author(isDark)}`}>{msg.author}</p>
        <p className="text-sm">{msg.message}</p>
        
        <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
          <span>{msg.time}</span>
          {isOwn && (
            <div title={seenTooltip} className="cursor-help">
              {hasSeen ? (
                <CheckCheck className="w-3 h-3 text-blue-400" />
              ) : (
                <Check className="w-3 h-3 text-gray-400" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function ChatArea({ socket, username, room, password, setUsername, setRoom, setPassword, joinRoom, leaveRoom, showChat, theme, toggleTheme, sessionEnded, clearSessionEnded, isPickingFile }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [whoIsTyping, setWhoIsTyping] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fileSizeError, setFileSizeError] = useState(false); // File too large alert
  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);         // Hidden file picker for media
  const isInitialLoad = useRef(true); // Track first history load vs live messages
  const isDark = theme === 'dark';

  // Auto-dismiss the session-ended toast after 4 seconds
  useEffect(() => {
    if (!sessionEnded) return;
    const t = setTimeout(() => clearSessionEnded(), 4000);
    return () => clearTimeout(t);
  }, [sessionEnded, clearSessionEnded]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll to bottom (WhatsApp-style)
  // On initial history load → instant jump; on new messages → smooth scroll
  useEffect(() => {
    if (messageList.length === 0) return;
    const behavior = isInitialLoad.current ? 'instant' : 'smooth';
    messagesEndRef.current?.scrollIntoView({ behavior });
    isInitialLoad.current = false;
  }, [messageList]);

  // ── Send Message ─────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (currentMessage.trim() === "") return;

    const encryptedMsg = encrypt(currentMessage, password);
    const msgId = Date.now().toString() + Math.random().toString(36).substring(2);

    const messageData = {
      msgId,
      room,
      author: username,
      message: encryptedMsg,           // Encrypted ciphertext sent to server & DB
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      seenBy: []
    };

    await socket.emit("send_message", messageData);

    // Show plaintext locally for the sender
    setMessageList((list) => [...list, { ...messageData, message: currentMessage }]);
    setCurrentMessage("");
    socket.emit("stop_typing", { room });
  };

  // ── Send Multimedia (image / video via Base64) — 100MB limit ───────────────
  const sendMultimedia = async (file) => {
    if (!file) return;

    // ── 100MB hard limit ─────────────────────────────────────────────────────
    const MAX_BYTES = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_BYTES) {
      setFileSizeError(true);
      // Auto-dismiss after 4 s
      setTimeout(() => setFileSizeError(false), 4000);
      if (isPickingFile) isPickingFile.current = false;
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsSending(true);

    try {
      let processedFile = file;
      const isVideo = file.type.startsWith('video/');
      const mediaType = isVideo ? 'video' : 'image';

      // Compress images larger than 2MB (skip for video — already encoded)
      if (!isVideo && file.size > 2 * 1024 * 1024) {
        const options = { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true };
        processedFile = await imageCompression(file, options);
      }

      const reader = new FileReader();

      reader.onload = () => {
        const base64 = reader.result;
        const msgId = Date.now().toString() + Math.random().toString(36).substring(2);
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const payload = { msgId, room, author: username, mediaBase64: base64, mediaType, time };

        // Keep overlay visible until AFTER the full payload is handed to the socket buffer
        socket.emit('send_multimedia', payload, () => {
          // Acknowledgement callback fires once the server receives the entire buffer
          setIsSending(false);
        });

        // If server doesn't ack (e.g. no callback wired), fall back after 30 s
        setTimeout(() => setIsSending(false), 30000);

        // Show immediately in the sender's own chat
        setMessageList((list) => [...list, { ...payload, type: mediaType }]);
      };

      reader.onerror = () => setIsSending(false);
      reader.readAsDataURL(processedFile);
    } catch (error) {
      console.error("Error processing file:", error);
      setIsSending(false);
    } finally {
      // Reset file-picker guard and input so the same file can be re-picked
      if (isPickingFile) isPickingFile.current = false;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTyping = (e) => {
    setCurrentMessage(e.target.value);
    if (e.target.value !== "") {
      socket.emit("typing", { room, username });
    } else {
      socket.emit("stop_typing", { room });
    }
  };

  // ── JOIN PHASE: Register history listener FIRST, then emit join_room ────────
  // useRef guard prevents React StrictMode from double-firing the emit.
  const hasJoined = useRef(false);

  useEffect(() => {
    if (!showChat) return;          // Only activate after user clicks join
    if (hasJoined.current) return;  // Prevent double-fire in StrictMode
    hasJoined.current = true;

    console.log('%c[JOIN] Step 1: Registering message_history listener...', 'color:cyan');

    // Step 1: Register history listener BEFORE emitting join_room
    const handleHistory = (rawMessages) => {
      console.log(`%c[JOIN] Step 3: message_history received! Count: ${rawMessages.length}`, 'color:lime');
      if (rawMessages.length === 0) {
        console.log('[JOIN] No history found for this room.');
        setMessageList([]);
        return;
      }
      const decrypted = rawMessages.map((msg) => {
        const plainText = decrypt(msg.message, password);
        console.log(`[DECRYPT] author=${msg.author} | plain=${plainText.slice(0, 30)}`);
        return { ...msg, message: plainText };
      });
      setMessageList(decrypted);
      console.log(`%c[JOIN] History loaded: ${decrypted.length} messages`, 'color:lime');
    };

    socket.on('message_history', handleHistory);
    console.log('%c[JOIN] Step 2: Emitting join_room...', 'color:cyan', { room, username });

    // Step 2: NOW emit — listener is guaranteed to be ready
    socket.emit('join_room', { room, username });

    return () => {
      socket.off('message_history', handleHistory);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showChat]);

  // ── Socket Listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    // Incoming message from another user: decrypt before display
    socket.on("receive_message", (data) => {
      setMessageList((list) => [...list, { ...data, message: decrypt(data.message, password) }]);
    });

    // System join/leave notifications — no decryption needed, never saved to DB
    socket.on("receive_notification", (data) => {
      setMessageList((list) => [...list, data]);
    });

    // Incoming multimedia from a peer — append with full Base64 for rendering
    socket.on("receive_multimedia", (data) => {
      setMessageList((list) => [...list, { ...data, type: data.mediaType }]);
    });

    // Handle status updates for seen messages
    socket.on("status_updated", ({ msgId, seenBy }) => {
      setMessageList((list) => list.map(msg => 
        msg.msgId === msgId ? { ...msg, seenBy } : msg
      ));
    });

    socket.on("display_typing", (data) => {
      if (data.username !== username) {
        setWhoIsTyping(data.username);
        setIsTyping(true);
      }
    });

    socket.on("hide_typing", () => setIsTyping(false));

    // Clear chat: UI only, DB untouched
    socket.on("chat_cleared", () => setMessageList([]));

    return () => {
      socket.off("receive_message");
      socket.off("receive_notification");
      socket.off("receive_multimedia");
      socket.off("status_updated");
      socket.off("display_typing");
      socket.off("hide_typing");
      socket.off("chat_cleared");
    };
  }, [socket, username, password]);

  // ── Join Screen ───────────────────────────────────────────────────────────
  if (!showChat) {
    return (
      // Relative wrapper so the toggle button is contained and never overlaps the form
      <div className="relative flex-1 flex flex-col">

        {/* ── Theme toggle — top-right, absolute so it never pushes content down ── */}
        <motion.button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all duration-300 border login-theme-btn"
          style={isDark
            ? {
                background: 'rgba(255,255,255,0.07)',
                borderColor: 'rgba(34,211,238,0.3)',
                color: '#22d3ee',
                boxShadow: '0 0 16px rgba(34,211,238,0.15)',
                backdropFilter: 'blur(12px)',
              }
            : {
                background: 'white',
                borderColor: '#e2e8f0',
                color: '#475569',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              }
          }
        >
          {isDark
            ? <Sun className="w-4 h-4 text-yellow-400" />
            : <Moon className="w-4 h-4 text-blue-500" />
          }
          {/* Hide the label text on very small screens to prevent overlap */}
          <span className="login-btn-label">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </motion.button>

        {/* ── Login card — padded top so it clears the toggle button on mobile ── */}
        <div className="flex-1 flex items-center justify-center p-4 pt-16 sm:pt-6 login-card-wrapper">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-md rounded-[2rem] login-card ${t.card(isDark)}`}
            style={{ padding: 'clamp(1.5rem, 5vw, 2.5rem)' }}
          >
            <div className="text-center mb-6">
              {/* GhostLink neon wordmark — Orbitron font with ghost glow */}
              <h1 className="mb-3" style={{ lineHeight: 1.1 }}>
                <span
                  className="ghostlink-logo"
                  style={{ fontSize: 'clamp(2rem, 7vw, 2.75rem)' }}
                >
                  GhostLink
                </span>
                <span className="ghostlink-dot" style={{ fontSize: 'clamp(2rem, 7vw, 2.75rem)' }}>.</span>
              </h1>
              <p className={`text-xs font-bold uppercase tracking-[0.2em] ${t.label(isDark)}`}>
                End-to-End Encrypted
              </p>
            </div>

            <div className="space-y-3">
              {/* Name */}
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                <input
                  type="text"
                  placeholder="Your Name..."
                  className={`w-full rounded-xl py-3 pl-11 pr-4 outline-none transition-all text-sm ${t.input(isDark)}`}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              {/* Room ID */}
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                <input
                  type="text"
                  placeholder="Room ID..."
                  className={`w-full rounded-xl py-3 pl-11 pr-4 outline-none transition-all text-sm ${t.input(isDark)}`}
                  onChange={(e) => setRoom(e.target.value)}
                />
              </div>

              {/* Room Password (encryption key) */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Room Password (Encryption Key)..."
                  className={`w-full rounded-xl py-3 pl-11 pr-12 outline-none transition-all text-sm ${t.input(isDark)}`}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-cyan-400' : 'text-slate-400 hover:text-blue-500'}`}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(6,182,212,0.4)" }}
                whileTap={{ scale: 0.98 }}
                onClick={joinRoom}
                className="w-full py-3.5 mt-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-black text-xs uppercase tracking-widest shadow-xl transition-all"
              >
                Enter Private Room
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Chat Interface ─────────────────────────────────────────────────────────
  return (
    // h-full + flex-col: fills the available viewport; min-h-0 prevents overflow pushing input off-screen
    <div className="relative flex-1 flex flex-col h-full min-h-0">
      {/* Header */}
      <div className={`flex-shrink-0 px-4 py-2 flex justify-between items-center ${t.header(isDark)}`}>
        {/* GhostLink brand in header */}
        <div className="flex items-center gap-2">
          <span
            className="ghostlink-logo"
            style={{ fontSize: 'clamp(0.85rem, 3vw, 1rem)' }}
          >
            GhostLink
          </span>
          <span
            className={`hidden sm:flex items-center gap-1 text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full border ${
              isDark
                ? 'border-cyan-500/30 text-cyan-400/70 bg-cyan-500/10'
                : 'border-blue-300/50 text-blue-500/70 bg-blue-50'
            }`}
          >
            <Lock className="w-2.5 h-2.5" />
            E2E
          </span>
        </div>
        {/* 3-dot Options Menu — chat-header-btn ensures 44×44 px touch target on mobile */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className={`chat-header-btn p-2 rounded-xl transition-all ${
              isDark
                ? 'hover:bg-white/10 text-gray-400 hover:text-cyan-400'
                : 'hover:bg-slate-100 text-slate-400 hover:text-blue-500'
            }`}
            title="Options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 w-52 rounded-2xl overflow-hidden z-50 shadow-2xl"
                style={isDark
                  ? { background: 'rgba(10,10,30,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(34,211,238,0.2)', boxShadow: '0 0 30px rgba(34,211,238,0.1)' }
                  : { background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }
                }
              >
                {/* Theme Toggle Item */}
                <button
                  onClick={() => { toggleTheme(); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all ${
                    isDark
                      ? 'text-gray-200 hover:bg-white/10 hover:text-cyan-400'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
                  }`}
                >
                  {isDark
                    ? <Sun className="w-4 h-4 text-yellow-400" />
                    : <Moon className="w-4 h-4 text-blue-500" />
                  }
                  {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                </button>

                {/* Divider */}
                <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9' }} />

                {/* Clear Chat Item */}
                <button
                  onClick={() => { setMessageList([]); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all ${
                    isDark
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-red-500 hover:bg-red-50'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Chat (UI only)
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── File-size error toast ── */}
      <AnimatePresence>
        {fileSizeError && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            style={{
              position: 'fixed',
              top: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10001,
              width: '95%',
              maxWidth: '360px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '13px 16px',
              borderRadius: '12px',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <span>⚠️</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                File too large! Max limit is 100MB.
              </span>
            </div>
            <button
              onClick={() => setFileSizeError(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.9rem', color: 'inherit', opacity: 0.7,
                padding: '0 2px', lineHeight: 1, flexShrink: 0,
              }}
              title="Dismiss"
            >✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating session-ended toast (top-center, outside message flow) ── */}
      <AnimatePresence>
        {sessionEnded && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            style={{
              position: 'fixed',
              top: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10000,
              width: '95%',
              maxWidth: '350px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid rgba(255, 0, 0, 0.2)',
              color: isDark ? '#fca5a5' : '#dc2626',
              boxShadow: isDark
                ? '0 8px 32px rgba(0,0,0,0.5)'
                : '0 8px 32px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <span>👻</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Session paused — reconnected automatically.
              </span>
            </div>
            <button
              onClick={clearSessionEnded}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.85rem', color: 'inherit', opacity: 0.65,
                padding: '0 2px', lineHeight: 1, flexShrink: 0,
              }}
              title="Dismiss"
            >✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Full-screen Sending Overlay ── */}
      <AnimatePresence>
        {isSending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[20000] flex flex-col items-center justify-center backdrop-blur-md bg-black/40"
          >
            <div className="bg-white/10 p-6 rounded-2xl flex flex-col items-center gap-4 border border-white/20 shadow-2xl backdrop-blur-xl">
              <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
              <p className="text-white font-semibold tracking-wide text-sm">
                Sending media... Please wait.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages — flex-1 min-h-0 is the key */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 chat-messages">
        {/* Session-ended banner REMOVED from here — now a floating toast above */}
        {messageList.map((msg, index) => (
          <MessageItem 
            key={msg.msgId || index}
            msg={msg}
            username={username}
            isDark={isDark}
            socket={socket}
            room={room}
          />
        ))}

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={`text-[10px] italic flex items-center gap-1 ${t.author(isDark)}`}
            >
              <span className="flex gap-0.5">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce delay-75">.</span>
                <span className="animate-bounce delay-150">.</span>
              </span>
              {whoIsTyping} is typing
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input — sticky bottom-0 keeps it anchored above the mobile keyboard */}
      <div className={`flex-shrink-0 sticky bottom-0 z-10 p-3 chat-input-area ${t.inputArea(isDark)}`}>
        {/* Hidden file input — accepts images and videos */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            // File selected — reset the picker guard first
            if (isPickingFile) isPickingFile.current = false;
            sendMultimedia(e.target.files[0]);
          }}
        />

        <div className={`flex items-center gap-2 rounded-full p-1.5 border transition-all shadow-inner ${isDark ? 'bg-white/10 border-white/10 focus-within:border-cyan-500/50' : 'bg-slate-50 border-slate-200 focus-within:border-blue-400'}`}>
          {/* Attachment button — sets isPickingFile guard before opening picker */}
          <button
            onClick={() => {
              if (isPickingFile) isPickingFile.current = true;
              fileInputRef.current?.click();
            }}
            disabled={isSending}
            title="Share image or video"
            className={`p-2 rounded-full transition-all flex-shrink-0 disabled:opacity-50 ${
              isDark
                ? 'text-gray-400 hover:text-cyan-400 hover:bg-white/10'
                : 'text-slate-400 hover:text-blue-500 hover:bg-slate-100'
            }`}
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={currentMessage}
            onChange={handleTyping}
            onKeyPress={(e) => !isSending && e.key === "Enter" && sendMessage()}
            disabled={isSending}
            className={`flex-1 bg-transparent px-2 outline-none text-sm ${isDark ? 'text-white placeholder:text-gray-500' : 'text-slate-800 placeholder:text-slate-400'} disabled:opacity-50`}
            placeholder={isSending ? "Sending media..." : "Type your message..."}
          />
          <button
            onClick={sendMessage}
            disabled={!currentMessage.trim() || isSending}
            className={`p-2.5 rounded-full text-white shadow-lg transition-all disabled:opacity-50 ${t.sendBtn(isDark)}`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}