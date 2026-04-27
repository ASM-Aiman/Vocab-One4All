import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, ChevronRight, ArrowRight } from 'lucide-react';
import axios from './../api';

const BATCH_SIZE = 6;

const SRS_INTERVALS    = [1, 3, 7, 14, 30, 60];
const SRS_LEVEL_LABELS = ['1 day', '3 days', '1 week', '2 weeks', '1 month', '2 months'];

/* ─────────────────────────────────────────────────────
   SRS HELPERS
───────────────────────────────────────────────────── */
const loadSRS     = () => { try { return JSON.parse(localStorage.getItem('vocab_srs') || '{}'); } catch { return {}; } };
const storeSRS    = d => localStorage.setItem('vocab_srs', JSON.stringify(d));
const daysFromNow = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); };

function selectBatch(allWords, srs) {
  const now = new Date();
  const due = [], fresh = [], later = [];
  for (const w of allWords) {
    const s = srs[w.id];
    if (!s)                                fresh.push(w);
    else if (new Date(s.nextReview) <= now) due.push(w);
    else                                   later.push(w);
  }
  later.sort((a, b) => new Date(srs[a.id].nextReview) - new Date(srs[b.id].nextReview));
  return [...shuffle(due), ...shuffle(fresh), ...later].slice(0, BATCH_SIZE);
}

function computeSRSUpdate(currentSRS, wordResults) {
  const updated = { ...currentSRS };
  const changes = [];
  for (const [id, { correct, total, wordLabel }] of Object.entries(wordResults)) {
    const prev     = currentSRS[id] || { level: 0 };
    const pass     = total > 0 && correct / total >= 0.6;
    const newLevel = pass
      ? Math.min(prev.level + 1, SRS_INTERVALS.length - 1)
      : Math.max(0, prev.level - 1);
    updated[id] = {
      level: newLevel,
      nextReview: daysFromNow(SRS_INTERVALS[newLevel]),
      lastReviewed: new Date().toISOString(),
    };
    changes.push({ id, word: wordLabel, oldLevel: prev.level, newLevel });
  }
  return { updatedSRS: updated, changes };
}

/* ─────────────────────────────────────────────────────
   SHUFFLE
───────────────────────────────────────────────────── */
const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* ─────────────────────────────────────────────────────
   AI WORD DATA GENERATOR
───────────────────────────────────────────────────── */
async function generateWordData(words) {
  const requests = words.map(w =>
    axios.post('/check-ai', {
      word: w.word,
      sentence: [
        `You are creating memory aids for a vocabulary app.`,
        `Word: "${w.word}"`,
        `Meaning: "${w.meaning}"`,
        ``,
        `Return ONLY a JSON object with exactly two keys:`,
        `  "clue": a 1–3 word synonym or tight phrase (for a matching tile)`,
        `  "hook": a short memorable mental anchor of 5–8 words`,
        `          vivid, concrete, never abstract, never a formal definition`,
        ``,
        `STRICT RULES for both fields:`,
        `- NEVER use the word "${w.word}" or any form/variant of it`,
        `- hook must feel like a natural thought, not a dictionary entry`,
        ``,
        `Good hook examples:`,
        `  coerce      → "forcing someone without physical violence"`,
        `  thrive      → "a plant growing in perfect conditions"`,
        `  innuendo    → "saying something bad without saying it"`,
        `  disposition → "your default personality setting"`,
        ``,
        `Reply with ONLY raw JSON. No markdown, no explanation.`,
        `Example: {"clue":"default attitude","hook":"your natural personality setting"}`,
      ].join('\n'),
    })
  );

  const results = await Promise.allSettled(requests);

  const wordData = {};
  results.forEach((result, i) => {
    const w         = words[i];
    const id        = String(w.id);
    const wordLower = w.word.toLowerCase();
    const fallback  = w.meaning.split(/[,;.]/)[0].slice(0, 50);

    if (result.status === 'rejected') {
      wordData[id] = { clue: fallback.slice(0, 30), hook: fallback };
      return;
    }

    try {
      const raw    = (result.value?.data?.text || '').trim();
      const clean  = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      const clue   = (parsed.clue || '').trim();
      const hook   = (parsed.hook || '').trim();

      wordData[id] = {
        clue: clue && !clue.toLowerCase().includes(wordLower) ? clue : fallback.slice(0, 30),
        hook: hook && !hook.toLowerCase().includes(wordLower) ? hook : fallback,
      };
    } catch {
      wordData[id] = { clue: fallback.slice(0, 30), hook: fallback };
    }
  });

  return wordData;
}

/* ─────────────────────────────────────────────────────
   ACTIVITY 1 – TAP TO MATCH
───────────────────────────────────────────────────── */
function MatchActivity({ words, wordData, onComplete }) {
  const tiles = useMemo(() => {
    if (!wordData) return [];
    const wt = words.map(w => ({ uid: `w-${w.id}`, pairId: w.id, type: 'word', text: w.word }));
    const dt = words.map(w => ({
      uid: `d-${w.id}`, pairId: w.id, type: 'def',
      text: wordData[String(w.id)]?.clue || w.meaning.split(/[,;.]/)[0].slice(0, 30),
    }));
    return shuffle([...wt, ...dt]);
  }, [wordData, words]);

  const [selected, setSelected] = useState(null);
  const [matched, setMatched]   = useState(new Set());
  const [flash, setFlash]       = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const mistakesRef  = useRef(0);
  const wrongPairRef = useRef(new Set());

  const handleTap = tile => {
    if (matched.has(tile.pairId) || flash) return;
    if (!selected) { setSelected(tile.uid); return; }
    if (selected === tile.uid) { setSelected(null); return; }

    const first = tiles.find(t => t.uid === selected);
    if (first.type === tile.type) { setSelected(tile.uid); return; }

    const correct = first.pairId === tile.pairId;
    setFlash({ uids: [selected, tile.uid], correct });

    setTimeout(() => {
      setFlash(null);
      setSelected(null);
      if (correct) {
        setMatched(prev => new Set([...prev, tile.pairId]));
      } else {
        mistakesRef.current += 1;
        setMistakes(m => m + 1);
        wrongPairRef.current = new Set([...wrongPairRef.current, first.pairId, tile.pairId]);
      }
    }, 520);
  };

  useEffect(() => {
    if (matched.size > 0 && matched.size === words.length) {
      const score = Math.max(0, words.length - Math.floor(mistakesRef.current / 2));
      const wordResults = Object.fromEntries(
        words.map(w => [w.id, { correct: wrongPairRef.current.has(w.id) ? 0 : 1, total: 1, wordLabel: w.word }])
      );
      setTimeout(() => onComplete(score, wordResults), 700);
    }
  }, [matched.size]); 

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <p style={{ fontSize: '0.8rem', opacity: 0.45, margin: 0 }}>Tap a word, then its clue</p>
        {mistakes > 0 && (
          <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>
            {mistakes} miss{mistakes !== 1 ? 'es' : ''}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {tiles.map(tile => {
          const isMatched  = matched.has(tile.pairId);
          const isSelected = selected === tile.uid;
          const isFlashing = flash?.uids.includes(tile.uid);
          const flashOk    = flash?.correct;
          return (
            <button
              key={tile.uid}
              onClick={() => handleTap(tile)}
              style={{
                padding: '14px 10px', minHeight: '54px', borderRadius: '10px',
                border: `2px solid ${
                  isMatched    ? '#22c55e'
                  : isFlashing ? (flashOk ? '#22c55e' : '#ef4444')
                  : isSelected ? 'var(--primary)'
                  : 'var(--border)'
                }`,
                background: isMatched ? 'rgba(34,197,94,0.1)' : isSelected ? 'rgba(99,102,241,0.18)' : 'var(--bg-card)',
                color: isMatched ? '#22c55e' : 'white',
                fontWeight: tile.type === 'word' ? '700' : '500',
                fontSize:   tile.type === 'word' ? '1rem' : '0.85rem',
                fontStyle:  tile.type === 'def' ? 'italic' : 'normal',
                textAlign: 'center', lineHeight: '1.3', wordBreak: 'break-word',
                cursor: isMatched ? 'default' : 'pointer',
                transition: 'border-color 0.18s, background 0.18s',
                opacity: isMatched ? 0.6 : 1,
              }}
            >
              {tile.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   ACTIVITY 2 – WORD BANK
───────────────────────────────────────────────────── */
function WordBankActivity({ words, wordData, onComplete }) {
  const questions = useMemo(() =>
    shuffle(words).map(w => {
      let sentence = '';
      
      if (w.example_sentence) {
        // Try strict word boundary first
        let replaced = w.example_sentence.replace(new RegExp(`\\b${w.word}\\b`, 'gi'), '<<BLANK>>');
        
        // If strict failed (e.g., word is "thrive" but sentence uses "thriving"), try loose replace
        if (replaced === w.example_sentence) {
          replaced = w.example_sentence.replace(new RegExp(w.word, 'gi'), '<<BLANK>>');
        }
        
        // If a replacement actually happened, use it
        if (replaced !== w.example_sentence) {
          sentence = replaced;
        }
      }
      
      // Ultimate fallback: if there is STILL no blank, use the dictionary definition format
      if (!sentence.includes('<<BLANK>>')) {
        sentence = `The word that means "${w.meaning.split(/[,;.]/)[0]}" is <<BLANK>>.`;
      }
      
      return { word: w, sentence };
    }), []
  );

  const bankWords = useMemo(() => shuffle([...words]), [words]);

  const [qIndex, setQIndex]     = useState(0);
  const [picked, setPicked]     = useState(null);   
  const [feedback, setFeedback] = useState(null);   
  const scoreRef   = useRef(0);
  const resultsRef = useRef({});

  const handlePick = word => {
    if (feedback) return;
    const q       = questions[qIndex];
    const correct = word.id === q.word.id;
    setPicked(word);
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct) scoreRef.current += 1;

    const id = String(q.word.id);
    if (!resultsRef.current[id]) resultsRef.current[id] = { correct: 0, total: 0, wordLabel: q.word.word };
    resultsRef.current[id].total++;
    if (correct) resultsRef.current[id].correct++;

    setTimeout(() => {
      if (qIndex < questions.length - 1) {
        setQIndex(i => i + 1);
        setPicked(null);
        setFeedback(null);
      } else {
        onComplete(scoreRef.current, resultsRef.current);
      }
    }, 1400);
  };

  const q    = questions[qIndex];
  const hook = wordData?.[String(q.word.id)]?.hook;

  const renderSentence = () => {
    const parts = q.sentence.split('<<BLANK>>');
    if (parts.length < 2) return <>{q.sentence}</>;

    const filledText = feedback ? q.word.word : null;
    const fillColor  = feedback === 'correct' ? '#22c55e' : feedback === 'wrong' ? '#ef4444' : 'var(--primary)';

    return (
      <>
        {parts[0]}
        <span style={{
          display: 'inline-block', minWidth: '80px', borderBottom: `2px solid ${fillColor}`,
          marginInline: '6px', verticalAlign: 'bottom', textAlign: 'center', color: fillColor,
          fontWeight: '700', transition: 'color 0.2s, border-color 0.2s', paddingBottom: '1px',
        }}>
          {filledText || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
        </span>
        {parts[1]}
      </>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
        {questions.map((_, i) => (
          <div key={i} style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: i < qIndex ? '#22c55e' : i === qIndex ? 'var(--primary)' : 'var(--border)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      <div style={{
        background: 'var(--bg-card)', padding: '28px 20px',
        borderRadius: '14px', border: `1px solid ${
          feedback === 'correct' ? 'rgba(34,197,94,0.3)' : feedback === 'wrong'  ? 'rgba(239,68,68,0.3)' : 'var(--border)'
        }`,
        textAlign: 'center', transition: 'border-color 0.25s', minHeight: '100px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
      }}>
        <p style={{ fontSize: '1.05rem', lineHeight: '2.1', margin: 0, fontStyle: 'italic' }}>
          "{renderSentence()}"
        </p>
        {feedback && hook && (
          <p style={{
            fontSize: '0.78rem', margin: 0, color: feedback === 'correct' ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)',
            animation: 'fadeIn 0.3s ease',
          }}>
            💡 Think: {hook}
          </p>
        )}
      </div>

      {feedback === 'wrong' && picked && (
        <p style={{ textAlign: 'center', color: '#ef4444', fontSize: '0.82rem', margin: '-4px 0 0', fontWeight: '600' }}>
          ✗ &nbsp;"{picked.word}" doesn't fit — the answer is "{q.word.word}"
        </p>
      )}

      <div>
        <p style={{ fontSize: '0.7rem', opacity: 0.3, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 10px' }}>Word bank</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {bankWords.map(w => {
            const isCorrectAnswer = w.id === q.word.id;
            const isPicked        = picked?.id === w.id;
            const isWrongPick     = feedback === 'wrong' && isPicked;
            const isReveal        = feedback === 'wrong' && isCorrectAnswer;

            let bg = 'var(--bg-card)', border = 'var(--border)', color = 'white';
            let opacity = feedback && !isPicked && !isCorrectAnswer ? 0.35 : 1;

            if (isReveal)    { bg = 'rgba(34,197,94,0.12)';  border = '#22c55e'; color = '#22c55e'; }
            if (isWrongPick) { bg = 'rgba(239,68,68,0.12)';  border = '#ef4444'; color = '#ef4444'; }
            if (!feedback && isPicked) { bg = 'rgba(99,102,241,0.18)'; border = 'var(--primary)'; }

            return (
              <button
                key={w.id} onClick={() => handlePick(w)} disabled={!!feedback}
                style={{
                  padding: '10px 20px', borderRadius: '24px', border: `2px solid ${border}`,
                  background: bg, color, fontWeight: '700', fontSize: '0.95rem',
                  cursor: feedback ? 'default' : 'pointer', transition: 'all 0.2s', opacity,
                }}
              >
                {w.word}
              </button>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   ACTIVITY 3 – ACTIVE RECALL (THE BOSS LEVEL)
───────────────────────────────────────────────────── */
function ActiveRecallActivity({ words, wordData, onComplete }) {
  const questions = useMemo(() => shuffle(words).map(w => ({ word: w })), [words]);
  
  const [qIndex, setQIndex]       = useState(0);
  const [inputVal, setInputVal]   = useState('');
  const [feedback, setFeedback]   = useState(null); 
  
  const scoreRef   = useRef(0);
  const resultsRef = useRef({});
  const inputRef   = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [qIndex, feedback]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputVal.trim() || feedback === 'correct') return;

    const q = questions[qIndex];
    const targetWord = q.word.word.toLowerCase();
    const typedWord = inputVal.trim().toLowerCase();
    const isMatch = targetWord === typedWord;

    const id = String(q.word.id);
    if (!resultsRef.current[id]) {
      resultsRef.current[id] = { correct: 0, total: 0, wordLabel: q.word.word };
    }

    if (feedback === 'forceType') {
      if (isMatch) {
        setFeedback('correct');
        setTimeout(() => nextQuestion(), 800);
      } else {
        setInputVal(''); 
      }
      return;
    }

    resultsRef.current[id].total++;
    if (isMatch) {
      resultsRef.current[id].correct++;
      scoreRef.current += 1;
      setFeedback('correct');
      setTimeout(() => nextQuestion(), 1000);
    } else {
      setFeedback('wrong');
      setTimeout(() => {
        setFeedback('forceType');
        setInputVal('');
      }, 2000);
    }
  };

  const nextQuestion = () => {
    if (qIndex < questions.length - 1) {
      setQIndex(i => i + 1);
      setInputVal('');
      setFeedback(null);
    } else {
      onComplete(scoreRef.current, resultsRef.current);
    }
  };

  const q = questions[qIndex];
  const hook = wordData?.[String(q.word.id)]?.hook || q.word.meaning;
  
  // Generate visual hint: First letter + underscores (e.g. T _ _ _ _)
  const targetWord = q.word.word;
  const hintText = targetWord.charAt(0).toUpperCase() + ' ' + Array(targetWord.length - 1).fill('_').join(' ');

  let borderColor = 'var(--border)';
  if (feedback === 'correct') borderColor = '#22c55e';
  if (feedback === 'wrong') borderColor = '#ef4444';
  if (feedback === 'forceType') borderColor = '#f59e0b'; 

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
        {questions.map((_, i) => (
          <div key={i} style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: i < qIndex ? '#22c55e' : i === qIndex ? 'var(--primary)' : 'var(--border)',
          }} />
        ))}
      </div>

      <div style={{
        background: 'var(--bg-card)', padding: '28px 20px', borderRadius: '14px',
        border: '1px solid var(--border)', textAlign: 'center'
      }}>
        <p style={{ fontSize: '0.75rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 10px' }}>
          What is the word?
        </p>
        <p style={{ fontSize: '1.3rem', fontWeight: '600', margin: '0 0 0', fontStyle: 'italic' }}>
          "{hook}"
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {feedback === 'wrong' ? (
          <p style={{ color: '#ef4444', textAlign: 'center', margin: 0, fontWeight: 'bold' }}>
            Incorrect. The word is: {q.word.word}
          </p>
        ) : feedback === 'forceType' ? (
          <p style={{ color: '#f59e0b', textAlign: 'center', margin: 0, fontSize: '0.9rem' }}>
            Type <strong style={{color: 'white'}}>{q.word.word}</strong> to continue
          </p>
        ) : (
          <p style={{ 
            textAlign: 'center', margin: '0 0 4px', fontSize: '1.2rem', 
            letterSpacing: '4px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' 
          }}>
            {hintText}
          </p>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            disabled={feedback === 'correct' || feedback === 'wrong'}
            placeholder="Type here..."
            autoCapitalize="none"
            autoComplete="off"
            style={{
              flex: 1, padding: '16px', borderRadius: '12px', fontSize: '1.1rem',
              border: `2px solid ${borderColor}`, background: 'var(--bg-card)', color: 'white',
              outline: 'none', transition: 'border 0.2s', textAlign: 'center'
            }}
          />
          <button 
            type="submit"
            disabled={!inputVal.trim() || feedback === 'correct' || feedback === 'wrong'}
            style={{
              padding: '0 20px', borderRadius: '12px', background: 'var(--primary)', 
              color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   RESULTS SCREEN
───────────────────────────────────────────────────── */
function ResultsScreen({ scores, batchSize, onNext, onClose, hasMore, srsChanges }) {
  const total = scores.reduce((a, b) => a + b, 0);
  const max   = scores.length * batchSize;
  const pct   = max > 0 ? Math.round((total / max) * 100) : 0;
  const names = ['Tap to Match', 'Word Bank', 'Active Recall'];
  const medal = pct >= 80 ? '🏆' : pct >= 60 ? '⭐' : '📖';

  const strengthened = srsChanges.filter(c => c.newLevel > c.oldLevel);
  const needsReview  = srsChanges.filter(c => c.newLevel < c.oldLevel);
  const unchanged    = srsChanges.filter(c => c.newLevel === c.oldLevel);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', paddingTop: '10px' }}>
      <div style={{ fontSize: '3.2rem' }}>{medal}</div>
      <h2 style={{ margin: 0, fontSize: '2.8rem', fontWeight: '700' }}>{pct}%</h2>
      <p style={{ opacity: 0.45, margin: 0, fontSize: '0.85rem' }}>{total} of {max} points</p>

      <div style={{ width: '100%', background: 'var(--bg-card)', borderRadius: '14px', padding: '4px 20px', border: '1px solid var(--border)' }}>
        {names.map((name, i) => (
          <div key={name} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '13px 0', borderBottom: i < names.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <span style={{ opacity: 0.65, fontSize: '0.9rem' }}>{name}</span>
            <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{scores[i] ?? 0} / {batchSize}</span>
          </div>
        ))}
      </div>

      {srsChanges.length > 0 && (
        <div style={{ width: '100%', background: 'var(--bg-card)', borderRadius: '14px', padding: '16px 20px', border: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 14px', fontSize: '0.7rem', opacity: 0.35, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
            Memory Schedule Updated
          </p>
          {/* SRS UI code stays the exact same... omitted for brevity but included in full file if requested */}
          {strengthened.length > 0 && (
            <div style={{ marginBottom: (needsReview.length + unchanged.length) > 0 ? '14px' : 0 }}>
              <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#22c55e', fontWeight: '600' }}>
                ↑ Strengthened · {strengthened.length} word{strengthened.length !== 1 ? 's' : ''}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {strengthened.map(c => (
                  <span key={c.id} style={{ padding: '4px 11px', borderRadius: '20px', fontSize: '0.74rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }}>
                    {c.word}<span style={{ opacity: 0.5, marginLeft: '5px', fontSize: '0.68rem' }}>→ {SRS_LEVEL_LABELS[c.newLevel]}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {needsReview.length > 0 && (
            <div style={{ marginBottom: unchanged.length > 0 ? '14px' : 0 }}>
              <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#f59e0b', fontWeight: '600' }}>
                ↺ Needs more practice · {needsReview.length} word{needsReview.length !== 1 ? 's' : ''}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {needsReview.map(c => (
                  <span key={c.id} style={{ padding: '4px 11px', borderRadius: '20px', fontSize: '0.74rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
                    {c.word}<span style={{ opacity: 0.5, marginLeft: '5px', fontSize: '0.68rem' }}>→ {SRS_LEVEL_LABELS[c.newLevel]}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {unchanged.length > 0 && (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: '0.8rem', opacity: 0.45, fontWeight: '600' }}>
                — Holding · {unchanged.length} word{unchanged.length !== 1 ? 's' : ''}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {unchanged.map(c => (
                  <span key={c.id} style={{ padding: '4px 11px', borderRadius: '20px', fontSize: '0.74rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'rgba(255,255,255,0.4)' }}>
                    {c.word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
        <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}>
          Done
        </button>
        {hasMore && (
          <button onClick={onNext} style={{ flex: 2, padding: '14px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            Next Session <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   LOADING SCREEN
───────────────────────────────────────────────────── */
function LoadingScreen() {
  const lines = ['Building memory hooks…', 'Crafting clues…', 'Getting your session ready…'];
  const [lineIdx, setLineIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setLineIdx(i => (i + 1) % lines.length), 1800);
    return () => clearInterval(t);
  }, []); 
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '80px' }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', animation: 'studySpin 0.75s linear infinite' }} />
      <p style={{ opacity: 0.4, fontSize: '0.82rem', margin: 0 }}>{lines[lineIdx]}</p>
      <style>{`@keyframes studySpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   MAIN WRAPPER
───────────────────────────────────────────────────── */
const ACTIVITIES = ['match', 'wordbank', 'recall'];
const ACTIVITY_META = {
  match:    { icon: '🔗', label: 'Tap to Match',   desc: 'Pair each word with its clue' },
  wordbank: { icon: '📝', label: 'Word Bank',      desc: 'Tap the word that fits the sentence' },
  recall:   { icon: '🧠', label: 'Active Recall',  desc: 'Type the word from memory' },
};

export default function StudyMode({ allWords, onClose }) {
  const [srsData, setSrsData] = useState(() => loadSRS());
  const [batch, setBatch]     = useState(() => selectBatch(allWords, loadSRS()));
  const [wordData, setWordData]   = useState(null);
  const [loadErr, setLoadErr]     = useState(false);
  const [step, setStep]           = useState(0);
  const [scores, setScores]       = useState([]);
  const [sessionWordResults, setSessionWordResults] = useState({});
  const [srsChanges, setSrsChanges]                 = useState([]);

  const isResults = step >= ACTIVITIES.length;
  const activity  = ACTIVITIES[step];

  useEffect(() => {
    let cancelled = false;
    setWordData(null);
    setLoadErr(false);
    generateWordData(batch)
      .then(data => { if (!cancelled) setWordData(data); })
      .catch(() => {
        if (cancelled) return;
        setLoadErr(true);
        const fallback = {};
        for (const w of batch) {
          const s = w.meaning.split(/[,;.]/)[0].slice(0, 50);
          fallback[String(w.id)] = { clue: s.slice(0, 30), hook: s };
        }
        setWordData(fallback);
      });
    return () => { cancelled = true; };
  }, [batch]);

  useEffect(() => {
    if (!isResults || Object.keys(sessionWordResults).length === 0) return;
    const { updatedSRS, changes } = computeSRSUpdate(srsData, sessionWordResults);
    storeSRS(updatedSRS);
    setSrsData(updatedSRS);
    setSrsChanges(changes);
  }, [isResults]);

  const handleActivityDone = (score, wordResults) => {
    setSessionWordResults(prev => {
      const merged = { ...prev };
      for (const [id, res] of Object.entries(wordResults)) {
        if (!merged[id]) merged[id] = { correct: 0, total: 0, wordLabel: res.wordLabel };
        merged[id].correct += res.correct;
        merged[id].total   += res.total;
      }
      return merged;
    });
    setScores(prev => [...prev, score]);
    setStep(s => s + 1);
  };

  const handleNextSession = () => {
    const freshSRS  = loadSRS();
    const nextBatch = selectBatch(allWords, freshSRS);
    setBatch(nextBatch);
    setSrsData(freshSRS);
    setStep(0);
    setScores([]);
    setSessionWordResults({});
    setSrsChanges([]);
  };

  const { dueCount, newCount } = useMemo(() => {
    const now = new Date();
    let due = 0, fresh = 0;
    for (const w of allWords) {
      const s = srsData[w.id];
      if (!s) fresh++;
      else if (new Date(s.nextReview) <= now) due++;
    }
    return { dueCount: due, newCount: fresh };
  }, [allWords, srsData]);

  const hasMore = allWords.some(w => {
    const s = srsData[w.id];
    return !s || s.level < SRS_INTERVALS.length - 1;
  });

  const sessionLabel = (() => {
    const parts = [];
    if (dueCount > 0) parts.push(`${dueCount} due`);
    if (newCount > 0) parts.push(`${newCount} new`);
    if (parts.length === 0) parts.push('Reviewing');
    return parts.join(' · ') + ` · ${batch.length} words`;
  })();

  const isLoading = !wordData && !isResults;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.97)', zIndex: 1000, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexShrink: 0 }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.68rem', opacity: 0.32, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {sessionLabel}
            {loadErr && <span style={{ marginLeft: '8px', color: '#f59e0b' }}>· fallback mode</span>}
          </p>
          <h2 style={{ margin: '4px 0 2px', fontSize: '1.2rem', fontWeight: '700' }}>
            {isResults   ? '📊 Results'
             : isLoading ? 'Preparing…'
             : `${ACTIVITY_META[activity].icon} ${ACTIVITY_META[activity].label}`}
          </h2>
          {!isResults && !isLoading && (
            <p style={{ margin: 0, fontSize: '0.74rem', opacity: 0.36 }}>
              {ACTIVITY_META[activity].desc} · Round {step + 1} of {ACTIVITIES.length}
            </p>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>
          <X size={26} />
        </button>
      </div>

      {!isResults && !isLoading && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexShrink: 0 }}>
          {ACTIVITIES.map((a, i) => (
            <div key={a} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i < step ? '#22c55e' : i === step ? 'var(--primary)' : 'var(--border)', transition: 'background 0.35s' }} />
          ))}
        </div>
      )}

      <div style={{ flex: 1 }}>
        {isLoading && <LoadingScreen />}

        {!isLoading && step === 0 && (
          <MatchActivity     key={`m-${batch[0]?.id}`} words={batch} wordData={wordData} onComplete={handleActivityDone} />
        )}
        {!isLoading && step === 1 && (
          <WordBankActivity  key={`w-${batch[0]?.id}`} words={batch} wordData={wordData} onComplete={handleActivityDone} />
        )}
        {!isLoading && step === 2 && (
          <ActiveRecallActivity key={`r-${batch[0]?.id}`} words={batch} wordData={wordData} onComplete={handleActivityDone} />
        )}
        {isResults && (
          <ResultsScreen scores={scores} batchSize={batch.length} onNext={handleNextSession} onClose={onClose} hasMore={hasMore} srsChanges={srsChanges} />
        )}
      </div>
    </div>
  );
}