import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import EmojiPicker from 'emoji-picker-react';

const socket = io.connect("https://my-chat-app-t5b5.onrender.com");

function App() {
  const [room, setRoom] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showTyping, setShowTyping] = useState("");
  
  const scrollRef = useRef();

  const joinRoom = () => {
    if (username !== "" && room !== "" && password !== "") {
      socket.emit("join_room", { room, password, username });
      setShowChat(true);
    }
  };

  const sendMessage = async () => {
    if (message !== "") {
      const msgData = { 
        id: Math.random(), // Unique ID for key
        room, 
        user: username, 
        text: message, 
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
      };
      socket.emit("send_message", msgData);
      setMessages((list) => [...list, msgData]);
      setMessage("");
      setShowEmoji(false);
    }
  };

  const sendImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const msgData = { room, user: username, image: reader.result, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
        socket.emit("send_message", msgData);
        setMessages((list) => [...list, msgData]);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAllMessages = () => {
    if (window.confirm("Dono side se chat saaf karni hai?")) {
      socket.emit("clear_all_chat", { room });
    }
  };

  useEffect(() => {
    // 1. Purane listeners ko khatam karo (Double Msg Fix)
    socket.off("receive_message");
    socket.off("chat_cleared_done");
    socket.off("display_typing");

    // 2. Naye listeners lagao
    socket.on("receive_message", (data) => {
      setMessages((list) => [...list, data]);
      new Audio("/fahh.mpeg").play().catch(() => {});
    });

    socket.on("chat_cleared_done", () => {
      setMessages([]);
    });

    socket.on("display_typing", (data) => {
      setShowTyping(`${data.user} is typing...`);
      setTimeout(() => setShowTyping(""), 2000);
    });

    return () => {
      socket.off("receive_message");
      socket.off("chat_cleared_done");
      socket.off("display_typing");
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={styles.container}>
      {!showChat ? (
        <div style={styles.loginCard}>
          <h2 style={styles.title}>Private Space</h2>
          <input placeholder="Name" style={styles.input} onChange={(e) => setUsername(e.target.value)} />
          <input placeholder="Room ID" style={styles.input} onChange={(e) => setRoom(e.target.value)} />
          <input placeholder="Password" type="password" style={styles.input} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={joinRoom} style={styles.button}>Join Chat</button>
        </div>
      ) : (
        <div style={styles.chatWrapper}>
          <div style={styles.chatHeader}>
            <span>Room: {room}</span>
            <button onClick={clearAllMessages} style={styles.clearBtn}>Clear All Chat</button>
          </div>
          <div style={styles.messageArea}>
            {messages.map((m, i) => (
              <div key={i} style={{...styles.messageRow, justifyContent: m.user === username ? 'flex-end' : 'flex-start'}}>
                <div style={{...styles.bubble, backgroundColor: m.user === username ? '#1db954' : '#333'}}>
                  <div style={styles.msgUser}>{m.user === username ? "You" : m.user}</div>
                  {m.image ? <img src={m.image} style={{maxWidth:'100%', borderRadius:'10px'}} alt="sent" /> : <div>{m.text}</div>}
                  <div style={styles.msgTime}>{m.time}</div>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
          {showTyping && <div style={styles.typing}>{showTyping}</div>}
          {showEmoji && <div style={{position:'absolute', bottom:'80px', zIndex:5}}><EmojiPicker onEmojiClick={(e) => setMessage(p => p + e.emoji)} /></div>}
          <div style={styles.inputArea}>
            <button onClick={() => setShowEmoji(!showEmoji)} style={styles.iconBtn}>😊</button>
            <label style={styles.iconBtn}>🖼️<input type="file" hidden onChange={sendImage} accept="image/*" /></label>
            <input 
              value={message} 
              style={styles.chatInput} 
              placeholder="Message..." 
              onChange={(e) => {
                setMessage(e.target.value);
                socket.emit("typing", { room, user: username });
              }} 
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()} 
            />
            <button onClick={sendMessage} style={styles.sendBtn}>➤</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { height: '100vh', backgroundColor: '#0f0f0f', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontFamily: 'sans-serif' },
  loginCard: { background: '#222', padding: '30px', borderRadius: '15px', textAlign: 'center' },
  input: { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: 'none', boxSizing: 'border-box' },
  button: { width: '100%', padding: '10px', borderRadius: '5px', backgroundColor: '#1db954', color: '#fff', border: 'none', cursor: 'pointer' },
  chatWrapper: { width: '400px', height: '600px', backgroundColor: '#181818', borderRadius: '15px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' },
  chatHeader: { padding: '15px', background: '#222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' },
  clearBtn: { background: '#ff4d4d', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '10px', cursor: 'pointer', padding: '5px 8px' },
  messageArea: { flex: 1, padding: '15px', overflowY: 'auto' },
  messageRow: { display: 'flex', marginBottom: '10px' },
  bubble: { padding: '10px', borderRadius: '10px', maxWidth: '80%' },
  msgUser: { fontSize: '10px', fontWeight: 'bold' },
  msgTime: { fontSize: '9px', textAlign: 'right', opacity: 0.6 },
  typing: { padding: '5px 15px', fontSize: '12px', color: '#1db954' },
  inputArea: { padding: '15px', display: 'flex', background: '#222', alignItems: 'center' },
  iconBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', marginRight: '10px' },
  chatInput: { flex: 1, padding: '10px', borderRadius: '20px', border: 'none', backgroundColor: '#333', color: '#fff' },
  sendBtn: { backgroundColor: '#1db954', border: 'none', color: '#fff', width: '35px', height: '35px', borderRadius: '50%', marginLeft: '10px' }
};

export default App;