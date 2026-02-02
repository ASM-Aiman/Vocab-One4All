import React, { useState } from 'react';
import api from '../api'; 
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Loader2, ArrowLeft, Send } from 'lucide-react';

export default function SentenceForm() {
  const [text, setText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [variations, setVariations] = useState({ formal: '', casual: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

const handleAiDeconstruct = async () => {
  // Debug: check what 'text' actually is in the console
  console.log("Current text state:", text); 

  if (!text || text.trim() === "") {
    return alert("The text field is empty. Type or paste a sentence to analyze!");
  }

  setLoading(true);

  try {
    const response = await api.post('/deconstruct', { text });
    
    // Safety check: handle if response.data is already the object or needs parsing
    const data = response.data;

    setExplanation(data.explanation || "No explanation provided.");
    setVariations(data.variations || { formal: "N/A", casual: "N/A" });

  } catch (err) {
    console.error("Analysis Error:", err);
    alert("AI failed. Check your Netlify logs and Groq API Key.");
  } finally {
    setLoading(false);
  }
};
const saveSentence = async (e) => {
  e.preventDefault();
  if (!explanation) return alert("Analyze first!");

  try {
    await api.post('/sentences', {
      text,
      explanation,
      formal_version: variations.formal,
      casual_version: variations.casual
    });
    
    // ✅ Pass state so Home knows to show sentences
    navigate('/', { state: { initialView: 'sentences' } }); 
  } catch (err) {
    console.error("Save Error:", err);
  }
};

  return (
    <div className="app-container">
      <Link to="/" className="back-link" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <ArrowLeft size={18} /> Back to Library
      </Link>

      <div className="form-card">
        <h2>New Sentence Archive</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
          Paste a sentence to deconstruct grammar and tone.
        </p>

        <form onSubmit={saveSentence}>
          <div className="form-group">
            <label>SENTENCE</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <textarea 
                className="form-input" 
                rows="3"
                placeholder="e.g. I'm feeling a bit under the weather."
                value={text}
                onChange={e => setText(e.target.value)}
                required
              />
              <button 
                type="button" 
                onClick={handleAiDeconstruct} 
                className="neon-sparkle-btn" 
                disabled={loading}
                style={{ background: 'var(--bg-input)', border: '1px solid var(--primary)', color: 'var(--primary)', height: 'fit-content', padding: '15px' }}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
              </button>
            </div>
          </div>

          {explanation && (
            <div className="ai-feedback-box" style={{ marginBottom: '20px', borderLeft: '4px solid var(--accent-green)', padding: '15px', background: 'rgba(16, 185, 129, 0.05)' }}>
              <p className="meaning-label" style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>AI ANALYSIS</p>
              <p style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>{explanation}</p>
              
              <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label className="meaning-label" style={{ fontSize: '0.7rem', opacity: 0.6 }}>FORMAL</label>
                  <p style={{ fontSize: '0.85rem' }}>{variations.formal}</p>
                </div>
                <div>
                  <label className="meaning-label" style={{ fontSize: '0.7rem', opacity: 0.6 }}>CASUAL</label>
                  <p style={{ fontSize: '0.85rem' }}>{variations.casual}</p>
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="submit-btn" style={{ width: '100%', marginTop: '10px' }}>
            <Send size={18} /> Save to Archive
          </button>
        </form>
      </div>
    </div>
  );
}