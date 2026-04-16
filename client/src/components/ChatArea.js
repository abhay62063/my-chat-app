import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Lock, User, Hash, Image as ImageIcon, Trash2 } from 'lucide-react';

export function ChatArea({ socket, username, room, setUsername, setRoom, joinRoom, showChat }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [whoIsTyping, setWhoIsTyping] = useState("");

  // Messaging Logic
  const sendMessage = async () => {
    if (currentMessage !== "") {
      const messageData = {
        room: room,
        author: username,
        message: currentMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      await socket.emit("send_message", messageData);
      setMessageList((list) => [...list, messageData]);
      setCurrentMessage("");
      socket.emit("stop_typing", { room });
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

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessageList((list) => [...list, data]);
    });
    socket.on("display_typing", (data) => {
      if (data.username !== username) {
        setWhoIsTyping(data.username);
        setIsTyping(true);
      }
    });
    socket.on("hide_typing", () => setIsTyping(false));
    socket.on("chat_cleared", () => setMessageList([]));

    return () => {
      socket.off("receive_message");
      socket.off("display_typing");
      socket.off("hide_typing");
      socket.off("chat_cleared");
    };
  }, [socket, username]);

 if (!showChat) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-transparent">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white/10 backdrop-blur-3xl border border-white/20 p-10 rounded-[2rem] shadow-2xl"
        >
          <div className="text-center mb-8">
            <h2 className="text-4xl font-black text-white mb-2 tracking-tight font-['Outfit']">
              Private Space<span className="text-cyan-400">.</span>
            </h2>
            <p className="text-cyan-400/60 text-xs font-bold uppercase tracking-[0.2em]">Secure Authentication</p>
          </div>
          
          <div className="space-y-4">
            {/* 1. Display Name */}
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
              <input 
                type="text" 
                placeholder="Your Name..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-gray-500 outline-none focus:border-cyan-500/50 transition-all shadow-inner text-sm"
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            {/* 2. Room ID */}
            <div className="relative group">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
              <input 
                type="text" 
                placeholder="Room ID..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-gray-500 outline-none focus:border-cyan-500/50 transition-all shadow-inner text-sm"
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>

            {/* 3. Password Input - NAYA ADD KIYA HAI */}
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
              <input 
                type="password" 
                placeholder="Room Password..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-gray-500 outline-none focus:border-cyan-500/50 transition-all shadow-inner text-sm"
                // Agar tumhare paas setPassword state hai toh yahan connect karo
                // onChange={(e) => setPassword(e.target.value)} 
              />
            </div>

            <motion.button 
              whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(6, 182, 212, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              onClick={joinRoom}
              className="w-full py-4 mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-black text-xs uppercase tracking-widest shadow-xl transition-all"
            >
              Enter Private Room
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- CHAT INTERFACE (Sirf tab dikhega jab showChat true hoga) ---
  return (
    <div className="flex-1 flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-md">
         <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-bold tracking-widest">
           <Lock className="w-3 h-3" /> <span>ENCRYPTED SPACE</span>
         </div>
         <button 
           onClick={() => socket.emit("clear_chat", room)} 
           className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-all"
         >
           <Trash2 className="w-3.5 h-3.5" /> CLEAR CHAT
         </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messageList.map((msg, index) => (
          <div key={index} className={`flex ${username === msg.author ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] p-3 rounded-2xl ${username === msg.author ? 'bg-cyan-500/30 border border-cyan-400/30' : 'bg-white/10 border border-white/20'}`}>
              <p className="text-[10px] text-cyan-400 font-bold mb-1">{msg.author}</p>
              <p className="text-sm text-gray-100">{msg.message}</p>
              <p className="text-[9px] text-gray-500 mt-1 text-right">{msg.time}</p>
            </div>
          </div>
        ))}
        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="text-[10px] text-cyan-400 italic flex items-center gap-1"
            >
              <span className="flex gap-0.5"><span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span></span>
              {whoIsTyping} is typing
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Message Input Area */}
      <div className="p-4 bg-white/5 border-t border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-2 bg-white/10 rounded-full p-1.5 border border-white/10 focus-within:border-cyan-500/50 transition-all shadow-inner">
          <button className="p-2.5 hover:bg-white/10 rounded-full transition-colors">
            <ImageIcon className="w-5 h-5 text-gray-400" />
          </button>
          <input 
            type="text" 
            value={currentMessage} 
            onChange={handleTyping}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 bg-transparent text-white px-2 outline-none text-sm placeholder:text-gray-500" 
            placeholder="Type your message..."
          />
          <button 
            onClick={sendMessage} 
            disabled={!currentMessage.trim()}
            className="bg-cyan-500 p-2.5 rounded-full text-white shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}