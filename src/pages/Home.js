import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { checkSentence } from '../aiService';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Trash2, Search, ChevronLeft, ChevronRight, Volume2, 
  X, Target, CheckCircle, LogOut, MessageSquare, Type, Quote, Plus, BookOpen, Sparkles, ArrowLeft, ArrowRight
} from 'lucide-react';

// Move components outside Home to prevent re-mounting
function SentenceCard({ sentence, inlineInputStyle, fetchSentences, deleteSentence }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(sentence.text);
  const [editedEx, setEditedEx] = useState(sentence.explanation);

  const handleUpdate = async () => {
    try {
      await api.put(`/sentences/${sentence.id}`, { text: editedText, explanation: editedEx });
      setIsEditing(false);
      fetchSentences();
    } catch (err) { 
      alert("Failed to update sentence."); 
    }
  };

  return (
    <div className="sentence-card" style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', position: 'relative' }}>
      <div style={{ position: 'absolute', right: '15px', top: '15px', display: 'flex', gap: '10px' }}>
        <button onClick={() => isEditing ? handleUpdate() : setIsEditing(true)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem' }}>
          {isEditing ? 'Save' : 'Edit'}
        </button>
        <button onClick={() => deleteSentence(sentence.id)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}>
          <Trash2 size={16} />
        </button>
      </div>
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          <textarea style={inlineInputStyle} value={editedText} onChange={e => setEditedText(e.target.value)} />
          <textarea style={inlineInputStyle} value={editedEx} onChange={e => setEditedEx(e.target.value)} rows="3" />
          <button onClick={() => setIsEditing(false)} style={{ fontSize: '0.7rem', opacity: 0.5, background: 'none', border: 'none', color: 'white', textAlign: 'left' }}>Cancel</button>
        </div>
      ) : (
        <>
          <span className="main-sentence-text" style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--primary)', display: 'block', marginBottom: '10px', paddingRight: '60px' }}>{sentence.text}</span>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: '1.5' }}>{sentence.explanation}</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <span className="variation-tag" style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem' }}>Formal: {sentence.formal_version}</span>
            <span className="variation-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem' }}>Casual: {sentence.casual_version}</span>
          </div>
        </>
      )}
    </div>
  );
}

function WordCard({ word, onStartReview, speak, deleteWord, inlineInputStyle, fetchWords }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ word: word.word, meaning: word.meaning, difficulty: word.difficulty });

  const handleUpdate = async () => {
    try {
      await api.put(`/${word.id}`, editData);
      setIsEditing(false);
      fetchWords();
    } catch (err) { 
      alert("Update failed"); 
    }
  };

  const handlePractice = () => {
    onStartReview(word);
  };

  return (
    <div className="word-card" style={{ border: isEditing ? '1px solid var(--primary)' : '1px solid var(--border)' }}>
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px' }}>
          <input style={inlineInputStyle} value={editData.word} onChange={e => setEditData({...editData, word: e.target.value})} />
          <textarea style={inlineInputStyle} value={editData.meaning} onChange={e => setEditData({...editData, meaning: e.target.value})} />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleUpdate} className="add-btn-main" style={{ padding: '5px 10px', fontSize: '0.7rem' }}>Save</button>
            <button onClick={() => setIsEditing(false)} style={{ fontSize: '0.7rem', color: 'gray', background: 'none', border: 'none' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 
                onClick={handlePractice}
                style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'none' }}
                className="word-title-hover"
              >
                {word.word}
              </h2>
              <Volume2 size={18} style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => speak(word.word)} />
            </div>
            <span className={`difficulty-badge ${word.difficulty}`}>{word.difficulty}</span>
          </div>
          <div className="card-body">
            <p className="meaning-text"><strong>Def:</strong> {word.meaning}</p>
          </div>
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
              
              <button 
                onClick={handlePractice}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Sparkles size={14} /> Practice
              </button>
            </div>
            <button onClick={() => deleteWord(word.id)} className="delete-btn"><Trash2 size={18} /></button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
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

  // View / Sentence State
  const [viewMode, setViewMode] = useState('words');
  const [sentences, setSentences] = useState([]);
  
  // Sentence Pagination State
  const [sentencePage, setSentencePage] = useState(1);
  const sentencesPerPage = 4;

  // AI State
  const [userSentence, setUserSentence] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const dailyGoal = 5;

  useEffect(() => {
    if (location.state?.initialView) {
      setViewMode(location.state.initialView);
    }
  }, [location.state?.initialView]);

  useEffect(() => {
    fetchWords();
    fetchSentences();
    
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const fetchSentences = useCallback(() => {
    api.get('/sentences') 
      .then(res => setSentences(res.data))
      .catch(err => console.error("Fetch sentences error:", err));
  }, []);

  const fetchWords = useCallback(() => {
    api.get('')
      .then(res => setWords(res.data))
      .catch(err => console.error("Fetch error:", err));
  }, []);

  const handleAiPractice = useCallback(async (word) => {
    if (!userSentence) return;
    setIsLoadingAi(true);
    try {
      const feedback = await checkSentence(word, userSentence);
      setAiFeedback(feedback);
    } catch (err) {
      console.error("AI check failed:", err);
      setAiFeedback("Failed to analyze sentence. Please try again.");
    } finally {
      setIsLoadingAi(false);
    }
  }, [userSentence]);

  const handleLogout = useCallback(() => {
    if (window.confirm("Logout of your archive?")) {
      localStorage.removeItem('token'); 
      localStorage.removeItem('username');
      window.location.href = '/auth'; 
    }
  }, []);

  const handleSRSUpdate = useCallback(async (word, performance) => {
    let daysToAdd = performance === 'Easy' ? 4 : performance === 'Hard' ? 1 : 2;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    nextDate.setHours(0, 0, 0, 0);

    try {
      await api.put(`/${word.id}`, { 
        ...word, 
        next_review_date: nextDate.toISOString() 
      });
    } catch (err) {
      console.error("SRS Update failed", err);
    }
  }, []);

  const startReview = useCallback(async (specificWord = null) => {
    if (words.length === 0 && !specificWord) {
      await fetchWords();
      if (words.length === 0) {
        alert("No words available. Add some words first!");
        return;
      }
    }

    if (specificWord) {
      setReviewWords([specificWord]);
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dueWords = words.filter(w => {
        if (!w.next_review_date) return true;
        const reviewDate = new Date(w.next_review_date);
        reviewDate.setHours(0, 0, 0, 0);
        return reviewDate <= today;
      });
      
      const listToReview = dueWords.length > 0 ? dueWords : words;
      
      if (listToReview.length === 0) {
        alert("Add some words first!");
        return;
      }
      
      const shuffled = [...listToReview];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      setReviewWords(shuffled);
    }

    setIsReviewing(true);
    setReviewIndex(0);
    setIsFlipped(false);
    setAiFeedback("");
    setUserSentence("");
  }, [words, fetchWords]);

  // Navigation functions for bulk study
  const goToNextCard = useCallback(() => {
    if (reviewIndex < reviewWords.length - 1) {
      setReviewIndex(prev => prev + 1);
      setIsFlipped(false);
      setAiFeedback("");
      setUserSentence("");
    }
  }, [reviewIndex, reviewWords.length]);

  const goToPreviousCard = useCallback(() => {
    if (reviewIndex > 0) {
      setReviewIndex(prev => prev - 1);
      setIsFlipped(false);
      setAiFeedback("");
      setUserSentence("");
    }
  }, [reviewIndex]);

  const wordsAddedToday = words.filter(w => 
    new Date(w.created_at).toDateString() === new Date().toDateString()
  ).length;

  const speak = useCallback((text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }, []);

  const filteredWords = React.useMemo(() => {
    return words.filter(w => {
      const matchesSearch = w.word.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = activeFilter === 'All' || w.difficulty === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [words, search, activeFilter]);

  const currentWords = React.useMemo(() => {
    return filteredWords.slice((currentPage - 1) * wordsPerPage, currentPage * wordsPerPage);
  }, [filteredWords, currentPage, wordsPerPage]);

  const totalPages = Math.ceil(filteredWords.length / wordsPerPage);

  const filteredSentences = React.useMemo(() => {
    return sentences.filter(s => 
      s.text.toLowerCase().includes(search.toLowerCase())
    );
  }, [sentences, search]);

  const currentSentences = React.useMemo(() => {
    return filteredSentences.slice((sentencePage - 1) * sentencesPerPage, sentencePage * sentencesPerPage);
  }, [filteredSentences, sentencePage, sentencesPerPage]);

  const totalSentencePages = Math.ceil(filteredSentences.length / sentencesPerPage);

  const deleteWord = useCallback(async (id) => {
    if (window.confirm("Delete this entry?")) {
      try {
        await api.delete(`/${id}`);
        setWords(prev => prev.filter(w => w.id !== id));
      } catch (err) { 
        console.error(err); 
        alert("Failed to delete word");
      }
    }
  }, []);

  const deleteSentence = useCallback(async (id) => {
    if (window.confirm("Remove this sentence analysis?")) {
      try {
        await api.delete(`/sentences/${id}`);
        setSentences(prev => prev.filter(s => s.id !== id));
      } catch (err) { 
        console.error("Delete failed", err);
        alert("Failed to delete sentence");
      }
    }
  }, []);

  const inlineInputStyle = {
    width: '100%',
    background: 'var(--bg-input)',
    color: 'white',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '8px',
    fontSize: '0.9rem'
  };

  // Check if we're in bulk mode (more than 1 word)
  const isBulkMode = reviewWords.length > 1;

  return (
    <div className="app-container">
      {/* FLASHCARD OVERLAY - FIXED LAYOUT */}
      {isReviewing && reviewWords.length > 0 && (
        <div className="study-overlay-container active" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.95)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div className="flashcard-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexShrink: 0
          }}>
            <span className="progress-text" style={{ color: 'white', fontSize: '1.1rem' }}>
              {reviewIndex + 1} / {reviewWords.length}
            </span>
            <button 
              onClick={() => { setIsReviewing(false); fetchWords(); }} 
              className="close-study-btn"
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              <X size={28} />
            </button>
          </div>

          {/* Main Content Area - Flexible */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 0, // Important for flex child scrolling
            gap: '20px'
          }}>
            {/* Flashcard */}
            <div 
              className="flashcard-scene" 
              onClick={() => setIsFlipped(!isFlipped)}
              style={{
                width: '100%',
                maxWidth: '500px',
                aspectRatio: '3/4',
                maxHeight: '60vh',
                perspective: '1000px',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <div 
                className={`flashcard-inner ${isFlipped ? 'is-flipped' : ''}`}
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.6s',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                {/* Front */}
                <div 
                  className="card-face card-face-front"
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                    background: 'var(--bg-card)',
                    borderRadius: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    border: '2px solid var(--primary)',
                    padding: '20px'
                  }}
                >
                  <h2 style={{ fontSize: '2.5rem', marginBottom: '20px', textAlign: 'center' }}>
                    {reviewWords[reviewIndex].word}
                  </h2>
                  <p className="tap-text" style={{ opacity: 0.6, fontSize: '0.9rem' }}>
                    Tap to see meaning
                  </p>
                </div>

                {/* Back - SCROLLABLE CONTENT */}
                <div 
                  className="card-face card-face-back"
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                    background: 'var(--bg-card)',
                    borderRadius: '20px',
                    transform: 'rotateY(180deg)',
                    border: '2px solid var(--primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden' // Container handles overflow
                  }}
                >
                  {/* Scrollable meaning area */}
                  <div 
                    className="meaning-scroll-area"
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '20px',
                      paddingBottom: '10px'
                    }}
                  >
                    <div className="meaning-container" style={{ marginBottom: '15px' }}>
                      <p className="meaning-label" style={{ 
                        color: 'var(--primary)', 
                        fontSize: '0.8rem', 
                        marginBottom: '5px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}>
                        Meaning
                      </p>
                      <h2 className="meaning-text" style={{ 
                        fontSize: '1.3rem', 
                        lineHeight: '1.4',
                        wordWrap: 'break-word'
                      }}>
                        {reviewWords[reviewIndex].meaning}
                      </h2>
                    </div>

                    {aiFeedback && (
                      <div 
                        className="ai-feedback-box" 
                        style={{ 
                          background: 'rgba(99, 102, 241, 0.1)', 
                          padding: '12px', 
                          borderRadius: '10px',
                          border: '1px solid var(--primary)',
                          marginTop: '10px'
                        }}
                      >
                        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>{aiFeedback}</p>
                      </div>
                    )}
                  </div>

                  {/* Practice input - Fixed at bottom of card */}
                  <div 
                    className="practice-container" 
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      padding: '15px 20px',
                      borderTop: '1px solid var(--border)',
                      background: 'rgba(0,0,0,0.2)'
                    }}
                  >
                    <input 
                      type="text" 
                      placeholder="Practice sentence..." 
                      value={userSentence} 
                      onChange={(e) => setUserSentence(e.target.value)} 
                      className="practice-input"
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-input)',
                        color: 'white',
                        marginBottom: '8px',
                        fontSize: '0.9rem'
                      }}
                    />
                    <button 
                      onClick={() => handleAiPractice(reviewWords[reviewIndex].word)} 
                      className="check-ai-btn" 
                      disabled={isLoadingAi}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'var(--primary)',
                        color: 'white',
                        cursor: isLoadingAi ? 'not-allowed' : 'pointer',
                        opacity: isLoadingAi ? 0.6 : 1,
                        fontSize: '0.9rem'
                      }}
                    >
                      {isLoadingAi ? "Analyzing..." : "Check with AI"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Buttons for Bulk Mode */}
            {isBulkMode && (
              <div style={{
                display: 'flex',
                gap: '20px',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <button
                  onClick={goToPreviousCard}
                  disabled={reviewIndex === 0}
                  style={{
                    background: reviewIndex === 0 ? 'rgba(255,255,255,0.1)' : 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    cursor: reviewIndex === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.9rem',
                    opacity: reviewIndex === 0 ? 0.5 : 1
                  }}
                >
                  <ArrowLeft size={18} /> Previous
                </button>

                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {reviewIndex + 1} of {reviewWords.length}
                </span>

                <button
                  onClick={goToNextCard}
                  disabled={reviewIndex === reviewWords.length - 1}
                  style={{
                    background: reviewIndex === reviewWords.length - 1 ? 'rgba(255,255,255,0.1)' : 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    cursor: reviewIndex === reviewWords.length - 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.9rem',
                    opacity: reviewIndex === reviewWords.length - 1 ? 0.5 : 1
                  }}
                >
                  Next <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>

     {/* SRS Buttons - Fixed at bottom - COMPACT VERSION */}
<div 
  className="srs-buttons" 
  style={{
    display: 'flex',
    gap: '30px',
    justifyContent: 'center',
    paddingTop: '15px',
    flexShrink: 0
  }}
>
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
    style={{
      padding: '8px 24px',
      borderRadius: '8px',
      border: 'none',
      background: '#ef4444',
      color: 'white',
      fontSize: '0.85rem',
      fontWeight: '600',
      cursor: 'pointer',
      minWidth: '30px',
      maxWidth: '100px'
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
    style={{
      padding: '8px 24px',
      borderRadius: '8px',
      border: 'none',
      background: '#22c55e',
      color: 'white',
      fontSize: '0.85rem',
      fontWeight: '600',
      cursor: 'pointer',
      minWidth: '30px',
       maxWidth: '100px'
    }}
  >
    {reviewIndex === reviewWords.length - 1 ? "Finish" : "Easy"}
  </button>
</div>
        </div>
      )}

      {/* TOP NAVBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>One4All-Vocab</h1>
        <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
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

      {/* HEADER & TOGGLE */}
      <div className="header-container">
        <div className="header-content">
          <h1>Archives</h1>
          <div className="action-row">
              <div className="view-toggle-group">
                <button 
                  className={`toggle-btn ${viewMode === 'words' ? 'active' : ''}`} 
                  onClick={() => setViewMode('words')}
                >
                  <Type size={18} /> <span>Words</span>
                </button>
                <button 
                  className={`toggle-btn ${viewMode === 'sentences' ? 'active' : ''}`} 
                  onClick={() => setViewMode('sentences')}
                >
                  <Quote size={18} /> <span>Sentences</span>
                </button>
              </div>
              
              <button onClick={() => navigate('/coach')} className="neon-sparkle-btn coach-mobile-fix">
                <MessageSquare size={18} /> <span>Coach</span>
              </button>

              <Link to={viewMode === 'words' ? "/add" : "/add-sentence"} className="add-btn-main">
                <Plus size={18} /> <span>{viewMode === 'words' ? 'Word' : 'Sentence'}</span>
              </Link>
              
              {viewMode === 'words' && (
                <button onClick={() => startReview()} className="study-now-btn">
                  <BookOpen size={18} /> <span>Study</span>
                </button>
              )}
            </div>
        </div>
      </div>

      <div className="search-container">
        <div className="search-icon-wrapper"><Search size={20} /></div>
        <input type="text" placeholder="Search your library..." className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* MAIN CONTENT AREA */}
      {viewMode === 'words' ? (
        <>
          <div className="word-grid">
            {currentWords.length > 0 ? currentWords.map(word => (
              <WordCard 
                key={word.id} 
                word={word} 
                onStartReview={startReview}
                deleteWord={deleteWord}
                speak={speak}
                fetchWords={fetchWords}
                inlineInputStyle={inlineInputStyle}
              />
            )) : <p style={{ textAlign: 'center', gridColumn: '1/-1', opacity: 0.5 }}>No words found.</p>}
          </div>
          {filteredWords.length > wordsPerPage && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '40px', paddingBottom: '40px' }}>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="add-btn" style={{ opacity: currentPage === 1 ? 0.3 : 1 }}><ChevronLeft size={18} /></button>
              <span style={{ color: 'var(--text-muted)' }}>Page <strong>{currentPage}</strong> of {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="add-btn" style={{ opacity: currentPage === totalPages ? 0.3 : 1 }}><ChevronRight size={18} /></button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="sentence-stack" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {currentSentences.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.5, marginTop: '20px' }}>No sentences found.</p>
            ) : (
              currentSentences.map(s => (
                <SentenceCard 
                  key={s.id} 
                  sentence={s} 
                  inlineInputStyle={inlineInputStyle}
                  fetchSentences={fetchSentences}
                  deleteSentence={deleteSentence}
                />
              ))
            )}
          </div>
          {filteredSentences.length > sentencesPerPage && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '40px', paddingBottom: '40px' }}>
              <button disabled={sentencePage === 1} onClick={() => setSentencePage(prev => prev - 1)} className="add-btn" style={{ opacity: sentencePage === 1 ? 0.3 : 1 }}><ChevronLeft size={18} /></button>
              <span style={{ color: 'var(--text-muted)' }}>Page <strong>{sentencePage}</strong> of {totalSentencePages}</span>
              <button disabled={sentencePage === totalSentencePages} onClick={() => setSentencePage(prev => prev + 1)} className="add-btn" style={{ opacity: sentencePage === totalSentencePages ? 0.3 : 1 }}><ChevronRight size={18} /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}