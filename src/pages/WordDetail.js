import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../api';
import { ArrowLeft, Book, Clock, Tag, Trash2 } from 'lucide-react';

export default function WordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [word, setWord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/.netlify/functions/api/${id}`)
      .then(res => {
        setWord(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

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
      <Link to="/" className="add-btn" style={{ background: 'transparent', border: '1px solid var(--border)', marginBottom: '30px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <ArrowLeft size={18} /> Back
      </Link>

      <div className="form-card" style={{ maxWidth: '800px' }}>
        <div className="card-header" style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '3rem', margin: '0', color: 'white' }}>{word.word}</h1>
          <span className={`difficulty-badge ${word.difficulty}`}>{word.difficulty}</span>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '0.8rem', letterSpacing: '1px' }}>MEANING</label>
          <p style={{ fontSize: '1.2rem', lineHeight: '1.6', marginTop: '10px' }}>{word.meaning}</p>
        </div>

        {word.example_sentence && (
          <div style={{ marginBottom: '30px', padding: '20px', background: 'var(--bg-input)', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 'bold' }}>EXAMPLE</label>
            <p style={{ fontStyle: 'italic', marginTop: '8px' }}>"{word.example_sentence}"</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '40px', marginTop: '40px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem' }}>ADDED ON</label>
            <span style={{ fontSize: '0.9rem' }}>{new Date(word.created_at).toLocaleDateString()}</span>
          </div>
          {word.tags && (
             <div>
               <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem' }}>TAGS</label>
               <span style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>#{word.tags.replace(/,/g, ' #')}</span>
             </div>
          )}
        </div>

        <button onClick={deleteWord} className="delete-btn" style={{ marginTop: '40px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}>
          <Trash2 size={16} /> Delete from archives
        </button>
      </div>
    </div>
  );
}