import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../api';
import { ArrowLeft, Trash2, Edit3, Save, X, Sparkles, Volume2, BookOpen } from 'lucide-react';

export default function WordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [word, setWord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchWord();
  }, [id]);

  const fetchWord = () => {
    // Note: ensure this URL matches how your axios instance is set up!
    // I kept your /.netlify/functions/api path from your snippet.
    axios.get(`/.netlify/functions/api/${id}`)
      .then(res => {
        setWord(res.data);
        setEditData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleSave = async () => {
    try {
      await axios.put(`/.netlify/functions/api/${id}`, editData);
      setWord(editData);
      setIsEditing(false);
    } catch (err) { 
      alert("Failed to update."); 
    }
  };

  const deleteWord = async () => {
    if (window.confirm("Permanent deletion?")) {
      await axios.delete(`/.netlify/functions/api/${id}`);
      navigate('/');
    }
  };

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  if (loading) return <div className="app-container"><h1>Loading entry...</h1></div>;
  if (!word) return <div className="app-container"><h1>Entry not found.</h1></div>;

  // Safely parse the examples array from the database
  const vibeExamples = word.vibe_examples ? JSON.parse(word.vibe_examples) : [];

  return (
    <div className="app-container">
      <div className="detail-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <Link to="/" className="back-link" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none' }}>
          <ArrowLeft size={18}/> Back to Archives
        </Link>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="edit-word-btn" style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <Edit3 size={18}/> Edit
          </button>
        )}
      </div>

      <div className="form-card" style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-card)', padding: '40px', borderRadius: '20px', border: '1px solid var(--border)' }}>
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <input className="form-input" value={editData.word} onChange={e => setEditData({...editData, word: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'white' }} />
            <textarea className="form-input" rows="3" value={editData.meaning} onChange={e => setEditData({...editData, meaning: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'white' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSave} className="study-now-btn" style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}><Save size={18} /> Save</button>
              <button onClick={() => setIsEditing(false)} className="study-now-btn" style={{ background: 'var(--bg-input)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}><X size={18} /> Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="card-header" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: '3.5rem', margin: '0 0 10px 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {word.word}
                  <Volume2 size={24} style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => speak(word.word)} />
                </h1>
                <span className={`difficulty-badge ${word.difficulty}`}>{word.difficulty}</span>
              </div>
            </div>

            <div style={{ marginBottom: '40px' }}>
              <label className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                <BookOpen size={18} /> Dictionary Definition
              </label>
              <p style={{ fontSize: '1.2rem', lineHeight: '1.6', margin: 0 }}>{word.meaning}</p>
            </div>

            {/* VIBE CHECK SECTION */}
            <div className="ai-creative-section" style={{ background: 'var(--bg-input)', padding: '30px', borderRadius: '16px', borderLeft: '4px solid var(--primary)' }}>
              {!word.vibe_one_liner ? (
                <div style={{ textAlign: 'center', padding: '20px', opacity: 0.7, fontStyle: 'italic' }}>
                  <p>No vibe check generated for this word yet.</p>
                  <p style={{ fontSize: '0.9rem' }}>Go back to the Archives list and click "Vibe Check" to unlock it!</p>
                </div>
              ) : (
                <div className="fade-in">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', margin: '0 0 15px 0', fontSize: '1.2rem' }}>
                    <Sparkles size={20} /> The Vibe
                  </h3>
                  <p style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 25px 0' }}>{word.vibe_one_liner}</p>
                  
                  <h4 style={{ color: 'var(--text-muted)', marginBottom: '15px', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px' }}>Natural Context Examples</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {vibeExamples.map((ex, idx) => (
                      <div key={idx} style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '1.1rem', lineHeight: '1.5' }}>
                        {ex}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <div style={{ opacity: 0.5, fontSize: '0.8rem' }}>Added: {new Date(word.created_at).toLocaleDateString()}</div>
              <button onClick={deleteWord} className="delete-btn" style={{ background: 'none', border: 'none', color: '#ff4444', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <Trash2 size={14} /> Remove Word
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}