import React, { useEffect, useState } from 'react';
import api from '../api';
import { checkSentence } from '../aiService';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Trash2, Search, ChevronLeft, ChevronRight, Volume2, 
  X, Target, CheckCircle, LogOut, MessageSquare, Type, Quote, Plus, BookOpen
} from 'lucide-react';


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
    fetchWords();
    fetchSentences();
  }, [location]);

  const fetchSentences = () => {
    api.get('/sentences') 
      .then(res => setSentences(res.data))
      .catch(err => console.error("Fetch sentences error:", err));
  };

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

  // Logic for filtering and pagination
  const filteredWords = words.filter(w => {
    const matchesSearch = w.word.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === 'All' || w.difficulty === activeFilter;
    return matchesSearch && matchesFilter;
  });
  const currentWords = filteredWords.slice((currentPage - 1) * wordsPerPage, currentPage * wordsPerPage);
  const totalPages = Math.ceil(filteredWords.length / wordsPerPage);

  const filteredSentences = sentences.filter(s => 
    s.text.toLowerCase().includes(search.toLowerCase())
  );
  const currentSentences = filteredSentences.slice((sentencePage - 1) * sentencesPerPage, sentencePage * sentencesPerPage);
  const totalSentencePages = Math.ceil(filteredSentences.length / sentencesPerPage);

  const deleteWord = async (id) => {
    if (window.confirm("Delete this entry?")) {
      try {
        await api.delete(`/${id}`);
        setWords(words.filter(w => w.id !== id));
      } catch (err) { console.error(err); }
    }
  };

  const deleteSentence = async (id) => {
    if (window.confirm("Remove this sentence analysis?")) {
      try {
        await api.delete(`/sentences/${id}`);
        setSentences(sentences.filter(s => s.id !== id));
      } catch (err) { console.error("Delete failed", err); }
    }
  };

  // SHARED STYLES FOR INLINE EDITING
  const inlineInputStyle = {
    width: '100%',
    background: 'var(--bg-input)',
    color: 'white',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '8px',
    fontSize: '0.9rem'
  };

  // INLINE WORD CARD COMPONENT
  function WordCard({ word }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ word: word.word, meaning: word.meaning, difficulty: word.difficulty });

    const handleUpdate = async () => {
      try {
        await api.put(`/${word.id}`, editData);
        setIsEditing(false);
        fetchWords();
      } catch (err) { alert("Update failed"); }
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
                <h2>{word.word}</h2>
                <Volume2 size={18} style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => speak(word.word)} />
              </div>
              <span className={`difficulty-badge ${word.difficulty}`}>{word.difficulty}</span>
            </div>
            <div className="card-body"><p className="meaning-text"><strong>Def:</strong> {word.meaning}</p></div>
            <div className="card-footer">
              <button onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
              <button onClick={() => deleteWord(word.id)} className="delete-btn"><Trash2 size={18} /></button>
            </div>
          </>
        )}
      </div>
    );
  }

  // INLINE SENTENCE CARD COMPONENT
  function SentenceCard({ sentence }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(sentence.text);
    const [editedEx, setEditedEx] = useState(sentence.explanation);

    const handleUpdate = async () => {
      try {
        await api.put(`/sentences/${sentence.id}`, { text: editedText, explanation: editedEx });
        setIsEditing(false);
        fetchSentences();
      } catch (err) { alert("Failed to update sentence."); }
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

  return (
    <div className="app-container">
      {/* FLASHCARD OVERLAY (Existing) */}
      {isReviewing && reviewWords.length > 0 && (
        <div className="study-overlay-container active">
          <div className="study-overlay-content">
            <div className="flashcard-header">
              <span className="progress-text">{reviewIndex + 1} / {reviewWords.length}</span>
              <button onClick={() => { setIsReviewing(false); fetchWords(); }} className="close-study-btn"><X size={22} /></button>
            </div>
            <div className="flashcard-scene" onClick={() => setIsFlipped(!isFlipped)}>
              <div className={`flashcard-inner ${isFlipped ? 'is-flipped' : ''}`}>
                <div className="card-face card-face-front">
                  <h2>{reviewWords[reviewIndex].word}</h2>
                  <p className="tap-text">Tap to see meaning</p>
                </div>
                <div className="card-face card-face-back">
                  <div className="ai-scroll-area">
                    <div className="meaning-container">
                      <p className="meaning-label">Meaning</p>
                      <h2 className="meaning-text">{reviewWords[reviewIndex].meaning}</h2>
                    </div>
                    {aiFeedback && <div className="ai-feedback-box">{aiFeedback}</div>}
                  </div>
                  <div className="practice-container" onClick={(e) => e.stopPropagation()}>
                    <input type="text" placeholder="Practice sentence..." value={userSentence} onChange={(e) => setUserSentence(e.target.value)} className="practice-input" />
                    <button onClick={() => handleAiPractice(reviewWords[reviewIndex].word)} className="check-ai-btn" disabled={isLoadingAi}>{isLoadingAi ? "Analyzing..." : "Check with AI"}</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="srs-buttons">
              <button className="hard-btn" onClick={async () => {
                await handleSRSUpdate(reviewWords[reviewIndex], 'Hard');
                if (reviewIndex < reviewWords.length - 1) { setReviewIndex(prev => prev + 1); setIsFlipped(false); setAiFeedback(""); setUserSentence(""); } 
                else { setIsReviewing(false); fetchWords(); }
              }}>Hard</button>
              <button className="easy-btn" onClick={async () => {
                await handleSRSUpdate(reviewWords[reviewIndex], 'Easy');
                if (reviewIndex < reviewWords.length - 1) { setReviewIndex(prev => prev + 1); setIsFlipped(false); setAiFeedback(""); setUserSentence(""); } 
                else { setIsReviewing(false); fetchWords(); }
              }}>{reviewIndex === reviewWords.length - 1 ? "Finish" : "Easy"}</button>
            </div>
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
                <button onClick={startReview} className="study-now-btn">
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
              <WordCard key={word.id} word={word} />
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
                <SentenceCard key={s.id} sentence={s} />
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