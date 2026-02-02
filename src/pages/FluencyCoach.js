import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Sparkles, Send, ChevronLeft } from 'lucide-react';
// Added useLocation to the import below
import { useNavigate, useLocation } from 'react-router-dom';

export default function FluencyCoach() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
 const hasStarted = useRef(false); 

  const navigate = useNavigate();
  const location = useLocation();

useEffect(() => {
    // 2. CHECK THE GATEKEEPER
    if (hasStarted.current) return; 
    
    const startMsg = location.state?.initialMessage || "Start the session and give me my first challenge.";
    sendMessage(startMsg);
    
    // 3. LOCK THE GATE
    hasStarted.current = true; 
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (msg) => {
    const content = msg || input;
    if (!content) return;

    // UI Logic: Don't show the hidden system commands or long "Deep Link" instructions to the user
    const isSystemPrompt = msg && (msg.includes("Start the session") || msg.includes("I want to practice using the word"));
    
    if (!isSystemPrompt) {
      setMessages(prev => [...prev, { role: 'user', content }]);
    }
    
    setLoading(true);
    setInput("");

    try {
      const res = await api.post('/coach-session', { message: content });
      const aiMsg = { role: 'assistant', content: res.data.reply };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error("Coach failed", err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I lost my connection. Try again?" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="coach-page">
      <header className="coach-header">
        <button onClick={() => navigate('/')} className="back-btn"><ChevronLeft /></button>
        <div className="coach-info">
          <h3>Fluency Coach <Sparkles size={16} className="sparkle-icon-neon" /></h3>
          <span>AI Roleplay Session</span>
        </div>
      </header>

      <div className="chat-window">
        {/* If chat is empty and loading, show a nice entry message */}
        {messages.length === 0 && !loading && (
          <div className="msg-wrapper assistant">
            <div className="msg-bubble assistant">Setting up your scenario...</div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg-wrapper ${m.role}`}>
            <div className={`msg-bubble ${m.role}`}>
              {m.content}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="msg-wrapper assistant">
            <div className="msg-bubble assistant typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="chat-input-wrapper">
        <div className="input-glass-container">
          <input 
            className="coach-input" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Talk to the coach..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={() => sendMessage()} className="send-btn">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}