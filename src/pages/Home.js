import React, { useEffect, useState } from 'react';
import api from '../api';
import { checkSentence } from '../aiService';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Search, ChevronLeft, ChevronRight, Volume2, X, Target, CheckCircle, LogOut } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
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

  // AI State
  const [userSentence, setUserSentence] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const dailyGoal = 5;

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = () => {
    api.get('').then(res => setWords(res.data)).catch(err => console.error("Fetch error:", err));
  };

  const handleAiPractice = async (word) => {
    if (!userSentence) return;
    setIsLoadingAi(true);
    const feedback = await checkSentence(word, userSentence);
    setAiFeedback(feedback);
    setIsLoadingAi(false);
  };

  const handleLogout = () => {
    if (window.confirm("Logout of your archive?")) {
      localStorage.removeItem('token'); 
      localStorage.removeItem('username');
      window.location.href = '/auth'; 
    }
  };

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
    setAiFeedback("");
    setUserSentence("");
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
  {/* FLASHCARD OVERLAY */}
  {isReviewing && reviewWords.length > 0 && (
    <div className="study-overlay-container active">
      <div className="study-overlay-content" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER: Progress and Neon Close */}
        <div className="flashcard-header">
          <span className="progress-text">
            {reviewIndex + 1} / {reviewWords.length}
          </span>
          <button 
            onClick={() => { setIsReviewing(false); fetchWords(); }} 
            className="close-study-btn" /* Added the neon class here */
          >
            <X size={22} />
          </button>
        </div>

        {/* THE CARD */}
        <div className="flashcard-scene" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`flashcard-inner ${isFlipped ? 'is-flipped' : ''}`}>
            
            {/* FRONT FACE */}
            <div className="card-face card-face-front">
              <h2>{reviewWords[reviewIndex].word}</h2>
              <p className="tap-text">Tap to see meaning</p>
            </div>
            
            {/* BACK FACE */}
            <div className="card-face card-face-back">
              {/* This container makes the top part scrollable while input stays fixed */}
              <div className="ai-scroll-area">
                <div className="meaning-container">
                  <p className="meaning-label">Meaning</p>
                  <h2 className="meaning-text">{reviewWords[reviewIndex].meaning}</h2>
                </div>
                
                {aiFeedback && (
                  <div className="ai-feedback-box">
                    {aiFeedback}
                  </div>
                )}
              </div>
              
              <div className="practice-container" onClick={(e) => e.stopPropagation()}>
                <input 
                  type="text"
                  placeholder="Practice sentence..."
                  value={userSentence}
                  onChange={(e) => setUserSentence(e.target.value)}
                  className="practice-input"
                />
                <button 
                  onClick={() => handleAiPractice(reviewWords[reviewIndex].word)}
                  className="check-ai-btn"
                  disabled={isLoadingAi}
                >
                  {isLoadingAi ? "Analyzing..." : "Check with AI"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SRS CONTROLS */}
        <div className="srs-buttons">
          <button 
            className="hard-btn"
            onClick={async () => {
              await handleSRSUpdate(reviewWords[reviewIndex], 'Hard');
              if (reviewIndex < reviewWords.length - 1) {
                setReviewIndex(prev => prev + 1);
                setIsFlipped(false);
                setAiFeedback("");
                setUserSentence("");
              } else {
                setIsReviewing(false);
                fetchWords();
              }
            }}
          >
            Hard
          </button>
          <button 
            className="easy-btn"
            onClick={async () => {
              await handleSRSUpdate(reviewWords[reviewIndex], 'Easy');
              if (reviewIndex < reviewWords.length - 1) {
                setReviewIndex(prev => prev + 1);
                setIsFlipped(false);
                setAiFeedback("");
                setUserSentence("");
              } else {
                setIsReviewing(false);
                fetchWords();
              }
            }}
          >
            {reviewIndex === reviewWords.length - 1 ? "Finish" : "Easy"}
          </button>
        </div>

      </div>
    </div>
  )}



      {/* TOP NAVBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>One4All-Vocab</h1>
        <button 
          onClick={handleLogout} 
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <LogOut size={18} /> Logout
        </button>
      </div>

      {/* DAILY GOAL TRACKER */}
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
          <button onClick={startReview} className="add-btn study-mode-btn">
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

      {/* PAGINATION */}
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