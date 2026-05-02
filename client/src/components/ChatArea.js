import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Lock, User, Hash, Trash2, MoreVertical, Sun, Moon, Check, CheckCheck } from 'lucide-react';
import CryptoJS from 'crypto-js';

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

// ── Message Item Component (Handles Visibility & Seen Status) ───────────────
const MessageItem = ({ msg, username, isDark, socket, room }) => {
  const isOwn = username === msg.author;
  const ref = useRef(null);

  useEffect(() => {
    // If it's our own message, or we already saw it, do nothing.
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

export function ChatArea({ socket, username, room, password, setUsername, setRoom, setPassword, joinRoom, showChat, theme, toggleTheme }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [whoIsTyping, setWhoIsTyping] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);
  const isDark = theme === 'dark';

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

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      socket.off("status_updated");
      socket.off("display_typing");
      socket.off("hide_typing");
      socket.off("chat_cleared");
    };
  }, [socket, username, password]);

  // ── Join Screen ───────────────────────────────────────────────────────────
  if (!showChat) {
    return (
      <>
        {/* ── Fixed theme toggle — top-right of login screen ── */}
        <motion.button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 border"
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
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </motion.button>

        {/* ── Login card ── */}
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-md p-10 rounded-[2rem] ${t.card(isDark)}`}
          >
            <div className="text-center mb-8">
              <h2 className={`text-4xl font-black mb-2 tracking-tight font-['Outfit'] ${t.title(isDark)}`}>
                Private Space<span className="text-cyan-400">.</span>
              </h2>
              <p className={`text-xs font-bold uppercase tracking-[0.2em] ${t.label(isDark)}`}>
                End-to-End Encrypted
              </p>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                <input
                  type="text"
                  placeholder="Your Name..."
                  className={`w-full rounded-xl py-3.5 pl-11 pr-4 outline-none transition-all text-sm ${t.input(isDark)}`}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              {/* Room ID */}
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                <input
                  type="text"
                  placeholder="Room ID..."
                  className={`w-full rounded-xl py-3.5 pl-11 pr-4 outline-none transition-all text-sm ${t.input(isDark)}`}
                  onChange={(e) => setRoom(e.target.value)}
                />
              </div>

              {/* Room Password (encryption key) */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                <input
                  type="password"
                  placeholder="Room Password (Encryption Key)..."
                  className={`w-full rounded-xl py-3.5 pl-11 pr-4 outline-none transition-all text-sm ${t.input(isDark)}`}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(6,182,212,0.4)" }}
                whileTap={{ scale: 0.98 }}
                onClick={joinRoom}
                className="w-full py-4 mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-black text-xs uppercase tracking-widest shadow-xl transition-all"
              >
                Enter Private Room
            </motion.button>
          </div>
        </motion.div>
      </div>
    </>
    );
  }

  // ── Chat Interface ─────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className={`px-4 py-3 flex justify-between items-center ${t.header(isDark)}`}>
        <div className={`flex items-center gap-2 text-[10px] font-bold tracking-widest ${t.author(isDark)}`}>
          <Lock className="w-3 h-3" />
          <span>E2E ENCRYPTED</span>
        </div>
        {/* 3-dot Options Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className={`p-2 rounded-lg transition-all ${
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

      {/* Input */}
      <div className={`p-4 ${t.inputArea(isDark)}`}>
        <div className={`flex items-center gap-2 rounded-full p-1.5 border transition-all shadow-inner ${isDark ? 'bg-white/10 border-white/10 focus-within:border-cyan-500/50' : 'bg-slate-50 border-slate-200 focus-within:border-blue-400'}`}>
          <input
            type="text"
            value={currentMessage}
            onChange={handleTyping}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className={`flex-1 bg-transparent px-2 outline-none text-sm ${isDark ? 'text-white placeholder:text-gray-500' : 'text-slate-800 placeholder:text-slate-400'}`}
            placeholder="Type your message..."
          />
          <button
            onClick={sendMessage}
            disabled={!currentMessage.trim()}
            className={`p-2.5 rounded-full text-white shadow-lg transition-all disabled:opacity-50 ${t.sendBtn(isDark)}`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}