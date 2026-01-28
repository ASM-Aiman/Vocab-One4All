import React, { useEffect, useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import { Trash2, Search, Plus, Book, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';

export default function Home() {
  const [words, setWords] = useState([]);
  const [search, setSearch] = useState("");
  const [wotd, setWotd] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All'); // Feature 1: Filter State

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const wordsPerPage = 6;

  useEffect(() => {
    api.get('').then(res => {
      const allWords = res.data;
      setWords(allWords);
      if (allWords.length > 0) {
        setWotd(allWords[Math.floor(Math.random() * allWords.length)]);
      }
    }).catch(err => console.error("Library fetch failed:", err));
  }, []);

  // Feature 2: Voice Synthesis Function
  const speak = (text) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85; // Slightly slower for clarity
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  // --- UPDATED FILTERING LOGIC ---
  const filteredWords = words.filter(w => {
    const matchesSearch = w.word.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === 'All' || w.difficulty === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterClick = (level) => {
    setActiveFilter(level);
    setCurrentPage(1); // Reset page on filter
  };

  // Pagination Calculations
  const indexOfLastWord = currentPage * wordsPerPage;
  const indexOfFirstWord = indexOfLastWord - wordsPerPage;
  const currentWords = filteredWords.slice(indexOfFirstWord, indexOfLastWord);
  const totalPages = Math.ceil(filteredWords.length / wordsPerPage);

  const deleteWord = async (id) => {
    if (window.confirm("Delete this entry?")) {
      await api.delete(`/${id}`);
      setWords(words.filter(w => w.id !== id));
      if(wotd && wotd.id === id) setWotd(null);
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>One4All-Vocab</h1>
        <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
          <Link to="/add" className="add-btn">+ Add Word</Link>
          <button 
            onClick={() => { localStorage.clear(); window.location.href = '/auth'; }}
            style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem'}}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Word of the Day Widget */}
      {wotd && (
        <div className="wotd-widget" style={{ 
          background: 'linear-gradient(135deg, var(--bg-card) 0%, #1e1b4b 100%)', 
          padding: '25px', borderRadius: '24px', marginBottom: '40px', border: '1px solid var(--primary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h3 style={{ color: 'var(--primary)', margin: '0 0 10px 0', fontSize: '0.8rem', letterSpacing: '2px' }}>WORD OF THE DAY</h3>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
               <h2 style={{ margin: '0', fontSize: '2rem', color: 'white' }}>{wotd.word}</h2>
               <Volume2 size={24} color="var(--primary)" style={{cursor: 'pointer'}} onClick={() => speak(wotd.word)} />
            </div>
            <p style={{ color: 'var(--text-muted)', margin: '5px 0 0 0', maxWidth: '80%', overflowWrap: 'break-word' }}>{wotd.meaning}</p>
          </div>
          <div style={{ textAlign: 'right', opacity: 0.3, color: 'var(--primary)' }}>
            <Book size={48} />
          </div>
        </div>
      )}

      <div className="search-container">
        <input 
          type="text" 
          placeholder="Search your library..." 
          className="search-input"
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      {/* FEATURE 1: FILTER BAR */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', justifyContent: 'center' }}>
        {['All', 'Easy', 'Medium', 'Hard'].map((level) => (
          <button
            key={level}
            onClick={() => handleFilterClick(level)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: activeFilter === level ? 'var(--primary)' : 'var(--border)',
              background: activeFilter === level ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              color: activeFilter === level ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: '0.2s'
            }}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="word-grid">
        {currentWords.map(word => (
          <div key={word.id} className="word-card">
            <div className="card-header">
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <h2 style={{margin: 0}}>{word.word}</h2>
                <Volume2 size={16} style={{cursor: 'pointer', opacity: 0.6}} onClick={() => speak(word.word)} />
              </div>
              <span className={`difficulty-badge ${word.difficulty}`}>
                {word.difficulty}
              </span>
            </div>
            
            <div className="card-body">
              <p className="meaning-text"><strong>Def:</strong> {word.meaning}</p>
              {word.example_sentence && (
                <p className="example-text" style={{ fontStyle: 'italic', marginTop: '8px', fontSize: '0.85rem' }}>
                  "{word.example_sentence}"
                </p>
              )}
            </div>

            <div className="card-footer">
              <Link to={`/word/${word.id}`} className="details-link">Details →</Link>
              <button onClick={() => deleteWord(word.id)} className="delete-btn">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {filteredWords.length > wordsPerPage && (
        <div className="pagination">
           {/* ... previous code for buttons ... */}
        </div>
      )}
    </div>
  );
}