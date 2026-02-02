import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../api';
import { ArrowLeft, Trash2, Edit3, Save, X, Sparkles, MessageCircle } from 'lucide-react';

export default function WordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [word, setWord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  
  // New State for Deep Linking
  const [aiUsage, setAiUsage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchWord();
  }, [id]);

  const fetchWord = () => {
    axios.get(`/.netlify/functions/api/${id}`)
      .then(res => {
        setWord(res.data);
        setEditData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const generateAiContext = async () => {
    setIsGenerating(true);
    try {
      // We'll reuse your 'deconstruct' logic but for word usage
      const res = await axios.post('/.netlify/functions/api/deconstruct', { 
        text: `Give me a creative, high-level sentence using the word "${word.word}" and explain the nuance.` 
      });
      setAiUsage(res.data);
    } catch (err) {
      console.error("Deep Link Error", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const startDeepLinkedCoach = () => {
    // Navigate to coach and pass the specific sentence as state
    navigate('/coach', { 
      state: { 
        initialMessage: `I want to practice using the word "${word.word}" specifically in this context: ${aiUsage.explanation}` 
      } 
    });
  };

  const handleSave = async () => {
    try {
      await axios.put(`/.netlify/functions/api/${id}`, editData);
      setWord(editData);
      setIsEditing(false);
    } catch (err) { alert("Failed to update."); }
  };

  const deleteWord = async () => {
    if (window.confirm("Permanent deletion?")) {
      await axios.delete(`/.netlify/functions/api/${id}`);
      navigate('/');
    }
  };

  if (loading) return <div className="app-container"><h1>Loading entry...</h1></div>;
  if (!word) return <div className="app-container"><h1>Entry not found.</h1></div>;

  return (
    <div className="app-container">
      <div className="detail-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <Link to="/" className="back-link"><ArrowLeft size={18}/> Back</Link>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="edit-word-btn">
            <Edit3 size={18}/> Edit
          </button>
        )}
      </div>

      <div className="form-card" style={{ maxWidth: '800px' }}>
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <input className="form-input" value={editData.word} onChange={e => setEditData({...editData, word: e.target.value})} />
            <textarea className="form-input" rows="3" value={editData.meaning} onChange={e => setEditData({...editData, meaning: e.target.value})} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSave} className="study-now-btn" style={{ background: 'var(--primary)' }}><Save size={18} /> Save</button>
              <button onClick={() => setIsEditing(false)} className="study-now-btn" style={{ background: 'var(--bg-input)' }}><X size={18} /> Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="card-header" style={{ marginBottom: '20px' }}>
              <h1 style={{ fontSize: '3.5rem', margin: '0', color: 'white' }}>{word.word}</h1>
              <span className={`difficulty-badge ${word.difficulty}`}>{word.difficulty}</span>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label className="section-label">CORE MEANING</label>
              <p style={{ fontSize: '1.2rem', marginTop: '10px' }}>{word.meaning}</p>
            </div>

            {/* DEEP LINKING AI SECTION */}
            <div className="ai-creative-section" style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '25px', borderRadius: '16px', border: '1px dashed var(--primary)' }}>
              {!aiUsage ? (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ opacity: 0.7, marginBottom: '15px' }}>Want to see how to use "{word.word}" like a native?</p>
                  <button onClick={generateAiContext} disabled={isGenerating} className="neon-sparkle-btn" style={{ height: '45px' }}>
                    {isGenerating ? "Consulting Groq..." : <><Sparkles size={18} /> Generate Creative Usage</>}
                  </button>
                </div>
              ) : (
                <div className="fade-in">
                  <label className="section-label" style={{ color: 'var(--accent-green)' }}>NUANCED EXPLANATION</label>
                  <p style={{ fontStyle: 'italic', margin: '10px 0 20px 0' }}>{aiUsage.explanation}</p>
                  
                  <div style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                     <label className="section-label">EXAMPLE VARIATION</label>
                     <p style={{ margin: '5px 0' }}><strong>Formal:</strong> {aiUsage.variations?.formal}</p>
                  </div>

                  <button onClick={startDeepLinkedCoach} className="study-now-btn" style={{ width: '100%', justifyContent: 'center', gap: '10px' }}>
                    <MessageCircle size={18} /> Start Coach Session with this Word
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <div style={{ opacity: 0.5, fontSize: '0.8rem' }}>Added: {new Date(word.created_at).toLocaleDateString()}</div>
              <button onClick={deleteWord} className="delete-btn"><Trash2 size={14} /> Remove Word</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}