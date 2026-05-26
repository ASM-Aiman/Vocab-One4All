import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { getWordExamples } from '../aiService'; // <-- Added this!
import { ChevronLeft, Search, X, Volume2, Edit2, Trash2, ArrowUpDown, EyeOff, Eye, Sparkles, ExternalLink } from 'lucide-react'; // <-- Added Sparkles and ExternalLink
import { useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────────────────────
   SRS level data from localStorage
───────────────────────────────────────────────────── */
const SRS_LABELS = ['New', 'Learning', 'Familiar', 'Confident', 'Strong', 'Mastered'];
const SRS_COLORS = [
  'rgba(255,255,255,0.15)',   // 0 New
  '#f59e0b',                  // 1 Learning
  '#3b82f6',                  // 2 Familiar
  '#8b5cf6',                  // 3 Confident
  '#22c55e',                  // 4 Strong
  '#22c55e',                  // 5 Mastered
];
const SRS_BG = [
  'rgba(255,255,255,0.06)',
  'rgba(245,158,11,0.12)',
  'rgba(59,130,246,0.12)',
  'rgba(139,92,246,0.12)',
  'rgba(34,197,94,0.12)',
  'rgba(34,197,94,0.18)',
];

const loadSRS = () => {
  try { return JSON.parse(localStorage.getItem('vocab_srs') || '{}'); }
  catch { return {}; }
};

/* ─────────────────────────────────────────────────────
   WORD CARD — Now with Vibe Check & New Window Linking
───────────────────────────────────────────────────── */
function WordCard({ word, srsEntry, onDelete, onEdit, globalHideMeaning }) {
  const level    = srsEntry?.level ?? 0;
  const label    = SRS_LABELS[level];
  const color    = SRS_COLORS[level];
  const bg       = SRS_BG[level];
  const isMaster = level >= 5;

  const [localReveal, setLocalReveal] = useState(false);
  
  // Vibe Check States
  const [aiData, setAiData] = useState(
    word.vibe_one_liner ? {
      oneLiner: word.vibe_one_liner,
      examples: word.vibe_examples ? JSON.parse(word.vibe_examples) : []
    } : null
  );
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Reset local reveal if global toggle changes
  useEffect(() => {
    setLocalReveal(false);
  }, [globalHideMeaning]);

  const playAudio = (e) => {
    e.stopPropagation(); 
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.word);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVibeCheck = async (e) => {
    e.stopPropagation(); // Don't trigger the hide/reveal card tap
    setIsLoadingAi(true);
    try {
      const data = await getWordExamples(word.word);
      setAiData(data);
      // Save it to the database silently in the background
      await api.put(`/${word.id}`, {
        vibe_one_liner: data.oneLiner,
        vibe_examples: data.examples
      });
    } catch (err) {
      alert("Failed to load vibe check.");
    } finally {
      setIsLoadingAi(false);
    }
  };

  const openFullView = (e) => {
    e.stopPropagation();
    // Opens the WordDetail view in a new browser tab/window
    window.open(`/word/${word.id}`, '_blank');
  };

  const isHidden = globalHideMeaning && !localReveal;

  return (
    <div 
      onClick={() => isHidden && setLocalReveal(true)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        cursor: isHidden ? 'pointer' : 'default',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Row 1: Word + Audio + SRS progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Clicking the word opens the detailed view in a new window */}
          <h3 
            onClick={openFullView}
            style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.3px', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Open in new window"
          >
            {word.word}
            <ExternalLink size={14} style={{ opacity: 0.5 }} />
          </h3>
          <button 
            onClick={playAudio}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
            title="Listen"
          >
            <Volume2 size={18} />
          </button>
        </div>
        
        {/* Progress Bar Badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {isMaster ? '★ ' : ''}{label}
          </span>
          <div style={{ display: 'flex', gap: '3px' }}>
            {[1, 2, 3, 4, 5].map(step => (
              <div key={step} style={{
                width: '8px', height: '4px', borderRadius: '2px',
                background: level >= step ? color : 'var(--border)',
                opacity: level >= step ? 1 : 0.3
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Meaning / AI Vibe Check / Hidden State */}
      {isHidden ? (
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border)',
          borderRadius: '8px', padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)',
          fontSize: '0.85rem', fontWeight: '600'
        }}>
          Tap to reveal meaning
        </div>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.55', color: 'rgba(255,255,255,0.85)', animation: 'fadeIn 0.3s' }}>
            {word.meaning}
          </p>
          
          {/* AI Vibe Check Display */}
          {aiData ? (
            <div style={{ marginTop: '5px', background: 'rgba(99,102,241,0.08)', padding: '12px', borderRadius: '8px', borderLeft: '2px solid var(--primary)', animation: 'fadeIn 0.3s' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={14} /> {aiData.oneLiner}
              </p>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {aiData.examples.map((ex, i) => <li key={i}>{ex}</li>)}
              </ul>
            </div>
          ) : (
            /* Generate Button if no Vibe Check exists yet */
            <button 
              onClick={handleVibeCheck}
              disabled={isLoadingAi}
              style={{
                background: 'none', border: '1px solid var(--primary)', color: 'var(--primary)',
                padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600',
                cursor: isLoadingAi ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                alignSelf: 'flex-start', marginTop: '5px', opacity: isLoadingAi ? 0.6 : 1, animation: 'fadeIn 0.3s'
              }}
            >
              <Sparkles size={12} /> {isLoadingAi ? "Consulting AI..." : "Generate Vibe Check"}
            </button>
          )}

          {word.example_sentence && !aiData && (
            <p style={{
              margin: '5px 0 0 0', fontSize: '0.85rem', lineHeight: '1.5', color: 'rgba(255,255,255,0.4)',
              fontStyle: 'italic', borderLeft: '2px solid var(--border)', paddingLeft: '10px', animation: 'fadeIn 0.3s'
            }}>
              {word.example_sentence}
            </p>
          )}
        </>
      )}

      {/* Row 3: Action Buttons (Edit / Delete) */}
      {!isHidden && (
        <div style={{ 
          display: 'flex', justifyContent: 'flex-end', gap: '12px', 
          marginTop: '4px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', animation: 'fadeIn 0.3s'
        }}>
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(word); }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.8rem' }}
          >
            <Edit2 size={14} /> Edit
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(word.id); }}
            style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.8, cursor: 'pointer', display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.8rem' }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   MAIN — VOCABULARY BROWSER
───────────────────────────────────────────────────── */
export default function VocabBrowser() {
  const [words, setWords]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [query, setQuery]       = useState('');
  const [sortBy, setSortBy]     = useState('alpha');
  const [hideAll, setHideAll]   = useState(false); 
  const [srs, setSrs]           = useState({});
  const navigate                = useNavigate();

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = () => {
    setLoading(true);
    setSrs(loadSRS());
    api.get('/words')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data.words || []);
        setWords(list);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this word?")) {
      api.delete(`/${id}`).then(() => fetchWords()).catch(() => alert('Delete failed'));
      // Note: Updated to api.delete(`/${id}`) to match your backend standard!
    }
  };

  const handleEdit = (word) => {
    console.log("Edit word:", word);
    // You could also redirect to /word/:id to edit in the full view!
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...words];

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(w =>
        w.word.toLowerCase().includes(q) ||
        w.meaning.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'alpha') return a.word.localeCompare(b.word);
      const levelA = srs[a.id]?.level ?? 0;
      const levelB = srs[b.id]?.level ?? 0;
      if (sortBy === 'lowest') return levelA - levelB; 
      if (sortBy === 'highest') return levelB - levelA; 
      return 0;
    });

    return result;
  }, [words, query, sortBy, srs]);

  const total    = words.length;
  const mastered = words.filter(w => (srs[w.id]?.level ?? 0) >= 5).length;
  const learning = words.filter(w => {
    const l = srs[w.id]?.level ?? 0;
    return l > 0 && l < 5;
  }).length;
  const fresh = total - mastered - learning;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <header className="coach-header" style={{ flexShrink: 0 }}>
        <button onClick={() => navigate('/')} className="back-btn"><ChevronLeft /></button>
        <div className="coach-info">
          <h3 style={{ margin: 0 }}>My Library</h3>
          <span>{total} word{total !== 1 ? 's' : ''}</span>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px' }}>
        
        {!loading && !error && total > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
            {[
              { label: 'New',      count: fresh,    color: 'rgba(255,255,255,0.5)' },
              { label: 'Learning', count: learning, color: '#f59e0b' },
              { label: 'Mastered', count: mastered, color: '#22c55e' },
            ].map(({ label, count, color }) => (
              <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 10px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color }}>{count}</p>
                <p style={{ margin: 0, fontSize: '0.68rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && total > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 150px' }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.35, pointerEvents: 'none' }} />
              <input
                type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..."
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 36px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'white', fontSize: '0.9rem', outline: 'none' }}
              />
              {query && <button onClick={() => setQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '2px', display: 'flex' }}><X size={15} /></button>}
            </div>
            
            {/* Sort Dropdown */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0 10px', flexShrink: 0 }}>
              <ArrowUpDown size={16} style={{ opacity: 0.5, marginRight: '4px' }} />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ background: 'transparent', color: 'white', border: 'none', fontSize: '0.85rem', outline: 'none', cursor: 'pointer', appearance: 'none', paddingRight: '8px' }}>
                <option value="alpha">A-Z</option>
                <option value="lowest">Need Review</option>
                <option value="highest">Mastered</option>
              </select>
            </div>

            {/* Quick Review Toggle */}
            <button 
              onClick={() => setHideAll(!hideAll)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px',
                borderRadius: '10px', border: `1px solid ${hideAll ? 'var(--primary)' : 'var(--border)'}`,
                background: hideAll ? 'rgba(99,102,241,0.1)' : 'var(--bg-card)',
                color: hideAll ? 'var(--primary)' : 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.2s'
              }}
            >
              {hideAll ? <EyeOff size={16} /> : <Eye size={16} />}
              Review
            </button>
          </div>
        )}

        {/* States */}
        {loading && <div style={{ textAlign: 'center', paddingTop: '60px', opacity: 0.4, fontSize: '0.9rem' }}>Loading your words…</div>}
        {!loading && error && <div style={{ textAlign: 'center', paddingTop: '60px', opacity: 0.5, fontSize: '0.9rem' }}>Couldn't load words. Check your connection.</div>}
        {!loading && !error && total === 0 && <div style={{ textAlign: 'center', paddingTop: '60px', opacity: 0.4, fontSize: '0.9rem' }}>No words yet — add some from the home screen.</div>}
        {!loading && !error && filteredAndSorted.length === 0 && query && <div style={{ textAlign: 'center', paddingTop: '40px', opacity: 0.4, fontSize: '0.9rem' }}>No matches for "{query}"</div>}

        {/* Word list */}
        {!loading && !error && filteredAndSorted.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredAndSorted.map(w => (
              <WordCard key={w.id} word={w} srsEntry={srs[w.id]} onDelete={handleDelete} onEdit={handleEdit} globalHideMeaning={hideAll} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}