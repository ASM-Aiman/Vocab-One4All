import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../api';
import { ArrowLeft, Trash2, Edit3, Save, X, BookOpen } from 'lucide-react';

export default function WordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [word, setWord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState({ syn: [], ant: [] });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchWord();
  }, [id]);

  // FETCH SYNONYMS AND ANTONYMS
  useEffect(() => {
    if (word?.word) {
      const getRelated = async () => {
        try {
          const [sRes, aRes] = await Promise.all([
            fetch(`https://api.datamuse.com/words?rel_syn=${word.word}&max=5`),
            fetch(`https://api.datamuse.com/words?rel_ant=${word.word}&max=5`)
          ]);
          setRelated({ syn: await sRes.json(), ant: await aRes.json() });
        } catch (e) { console.error("DataMuse error", e); }
      };
      getRelated();
    }
  }, [word]);

  const fetchWord = () => {
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
  <div 
    className="detail-header-actions" 
    style={{ 
      display: 'flex', 
      justifyContent: 'space-between', // Fixed: Added quotes
      alignItems: 'center', 
      marginBottom: '30px' 
    }}
  >
    <Link to="/" className="back-link">
      <ArrowLeft size={18}/> Back
    </Link>
  
    {!isEditing && (
      <button onClick={() => setIsEditing(true)} className="edit-word-btn">
        <Edit3 size={18}/> Edit Word
      </button>
    )}
  </div>


      <div className="form-card" style={{ maxWidth: '800px' }}>
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label>WORD</label>
              <input className="form-input" value={editData.word} onChange={e => setEditData({...editData, word: e.target.value})} />
            </div>
            <div className="form-group">
              <label>MEANING</label>
              <textarea className="form-input" rows="3" value={editData.meaning} onChange={e => setEditData({...editData, meaning: e.target.value})} />
            </div>
            <div className="btn-row" style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSave} className="add-btn" style={{ background: 'var(--primary)' }}><Save size={18} /> Save</button>
              <button onClick={() => setIsEditing(false)} className="add-btn" style={{ background: 'var(--bg-input)' }}><X size={18} /> Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="card-header" style={{ marginBottom: '20px' }}>
              <h1 style={{ fontSize: '3.5rem', margin: '0', color: 'white' }}>{word.word}</h1>
              <span className={`difficulty-badge ${word.difficulty}`}>{word.difficulty}</span>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '0.8rem', letterSpacing: '1px' }}>MEANING</label>
              <p style={{ fontSize: '1.2rem', lineHeight: '1.6', marginTop: '10px' }}>{word.meaning}</p>
            </div>

            {/* RELATED WORDS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px', padding: '20px', background: 'var(--bg-input)', borderRadius: '12px' }}>
              <div>
                <h4 style={{ fontSize: '0.7rem', color: 'var(--accent-green)', marginBottom: '10px' }}>SYNONYMS</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {related.syn.length > 0 ? related.syn.map(s => <span key={s.word} style={{ fontSize: '0.85rem', opacity: 0.8 }}>{s.word},</span>) : '...'}
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: '0.7rem', color: 'var(--accent-red)', marginBottom: '10px' }}>ANTONYMS</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {related.ant.length > 0 ? related.ant.map(a => <span key={a.word} style={{ fontSize: '0.85rem', opacity: 0.8 }}>{a.word},</span>) : '...'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '40px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <div style={{ opacity: 0.5, fontSize: '0.8rem' }}>
                Next Review: {word.next_review_date ? new Date(word.next_review_date).toLocaleDateString() : 'Today'}
              </div>
              <button onClick={deleteWord} className="delete-btn" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem' }}>
                <Trash2 size={14} /> Remove Word
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}