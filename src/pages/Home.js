import React, { useEffect, useState } from 'react';
import api from '../api';
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { Trash2, Search, ChevronLeft, ChevronRight, Volume2, X, Target, CheckCircle, LogOut } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate(); // For redirecting after logout
  const [words, setWords] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const wordsPerPage = 6;

  // Review / Flashcard State
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewWords, setReviewWords] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const dailyGoal = 5;

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = () => {
    api.get('').then(res => setWords(res.data)).catch(err => console.error("Fetch error:", err));
  };

// --- LOGOUT LOGIC ---
  const handleLogout = () => {
    if (window.confirm("Logout of your archive?")) {
      // 1. Clear the 'token' because that's what App.js checks
      localStorage.removeItem('token'); 
      localStorage.removeItem('username');
      
      // 2. Redirect to Auth and force a reload to clear the React state
      window.location.href = '/auth'; 
    }
  };

  // --- SRS LOGIC: Calculate next review date ---
  const handleSRSUpdate = async (word, performance) => {
    let daysToAdd = performance === 'Easy' ? 4 : performance === 'Hard' ? 1 : 2;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + daysToAdd);

    try {
      await api.put(`/${word.id}`, { 
        ...word, 
        next_review_date: nextDate.toISOString() 
      });
    } catch (err) {
      console.error("SRS Update failed", err);
    }
  };

  const startReview = () => {
    const now = new Date();
    const dueWords = words.filter(w => !w.next_review_date || new Date(w.next_review_date) <= now);
    const listToReview = dueWords.length > 0 ? dueWords : words;
    if (listToReview.length === 0) return alert("Add some words first!");
    
    setReviewWords([...listToReview].sort(() => Math.random() - 0.5));
    setIsReviewing(true);
    setReviewIndex(0);
    setIsFlipped(false);
  };

  const wordsAddedToday = words.filter(w => 
    new Date(w.created_at).toDateString() === new Date().toDateString()
  ).length;

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const filteredWords = words.filter(w => {
    const matchesSearch = w.word.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === 'All' || w.difficulty === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const currentWords = filteredWords.slice((currentPage - 1) * wordsPerPage, currentPage * wordsPerPage);
  const totalPages = Math.ceil(filteredWords.length / wordsPerPage);

  const deleteWord = async (id) => {
    if (window.confirm("Delete this entry?")) {
      try {
        await api.delete(`/${id}`);
        setWords(words.filter(w => w.id !== id));
      } catch (err) { console.error(err); }
    }
  };

  return (
    <div className="app-container">
      {/* FLASHCARD OVERLAY (Remains the same) */}
      {isReviewing && reviewWords.length > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(11, 15, 26, 0.98)', zIndex: 2000, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <button onClick={() => { setIsReviewing(false); fetchWords(); }} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={28} />
          </button>

          <div style={{ color: 'var(--primary)', marginBottom: '20px', fontWeight: '800' }}>
            {reviewIndex + 1} / {reviewWords.length}
          </div>

          <div className="word-card" onClick={() => setIsFlipped(!isFlipped)} style={{ width: '100%', maxWidth: '450px', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', border: '2px solid var(--primary)', cursor: 'pointer', padding: '20px' }}>
            {isFlipped ? (
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Meaning</p>
                <h2 style={{ fontSize: '1.5rem' }}>{reviewWords[reviewIndex].meaning}</h2>
              </div>
            ) : (
              <h2 style={{ fontSize: '3rem' }}>{reviewWords[reviewIndex].word}</h2>
            )}
            <p style={{ marginTop: '20px', opacity: 0.3, fontSize: '0.7rem' }}>Tap to flip</p>
          </div>

          <div style={{ marginTop: '30px', display: 'flex', gap: '10px', width: '100%', maxWidth: '450px' }}>
            <button className="add-btn" style={{ flex: 1, background: '#ef444422', border: '1px solid #ef4444' }} onClick={() => handleSRSUpdate(reviewWords[reviewIndex], 'Hard')}>Hard (1d)</button>
            <button className="add-btn" style={{ flex: 2 }} onClick={() => {
              handleSRSUpdate(reviewWords[reviewIndex], 'Easy');
              if (reviewIndex < reviewWords.length - 1) {
                setReviewIndex(prev => prev + 1);
                setIsFlipped(false);
              } else {
                setIsReviewing(false);
                fetchWords();
              }
            }}>
              {reviewIndex === reviewWords.length - 1 ? "Finish" : "Easy (4d)"}
            </button>
          </div>
        </div>
      )}

      {/* TOP NAVBAR (Logout Added Here) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>One4All-Vocab</h1>
        <button 
          onClick={handleLogout} 
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <LogOut size={18} /> Logout
        </button>
      </div>

      {/* DAILY GOAL TRACKER (Remains same) */}
      <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '15px', marginBottom: '30px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'var(--bg-input)', borderRadius: '50%', display: 'flex', padding: '10px' }}>
            <Target color="var(--primary)" size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Daily Archive</h3>
            <p style={{ margin: 0, opacity: 0.6, fontSize: '0.8rem' }}>{wordsAddedToday} / {dailyGoal} words added</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {wordsAddedToday >= dailyGoal ? (
            <div style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
              <CheckCircle size={20} /> Goal Met
            </div>
          ) : (
            <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{Math.round((wordsAddedToday / dailyGoal) * 100)}%</span>
          )}
        </div>
      </div>

      <div className="header">
        <h1>Archives</h1>
        <div className="header-actions">
          <button onClick={startReview} className="add-btn study-mode-btn" style={{ background: 'var(--bg-input)', border: '1px solid var(--primary)', color: 'var(--primary)' }}>
            Study Due
          </button>
          <Link to="/add" className="add-btn">+ Add Word</Link>
        </div>
      </div>

      <div className="search-container">
        <div className="search-icon-wrapper"><Search size={20} /></div>
        <input type="text" placeholder="Search your library..." className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="word-grid">
        {currentWords.map(word => (
          <div key={word.id} className="word-card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2>{word.word}</h2>
                <Volume2 size={18} style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => speak(word.word)} />
              </div>
              <span className={`difficulty-badge ${word.difficulty}`}>{word.difficulty}</span>
            </div>
            <div className="card-body">
              <p className="meaning-text"><strong>Def:</strong> {word.meaning}</p>
            </div>
            <div className="card-footer">
              <Link to={`/word/${word.id}`} className="details-link">Details →</Link>
              <button onClick={() => deleteWord(word.id)} className="delete-btn"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION (Remains same) */}
      {filteredWords.length > wordsPerPage && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '40px', paddingBottom: '40px' }}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="add-btn" style={{ opacity: currentPage === 1 ? 0.3 : 1 }}><ChevronLeft size={18} /></button>
          <span style={{ color: 'var(--text-muted)' }}>Page <strong>{currentPage}</strong></span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="add-btn" style={{ opacity: currentPage === totalPages ? 0.3 : 1 }}><ChevronRight size={18} /></button>
        </div>
      )}
    </div>
  );
}