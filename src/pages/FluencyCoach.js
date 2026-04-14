import React, { useState, useEffect } from 'react';
import api from '../api';
import { Sparkles, ChevronLeft, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DailyChallenge() {
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // NEW: Refined state to handle multiple attempts
  const [guessedWords, setGuessedWords] = useState([]); // Tracks all wrong guesses
  const [currentMessage, setCurrentMessage] = useState(null); // The AI's feedback message
  const [successData, setSuccessData] = useState(null); // Holds the definitions and final state once they win
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchDailyScenario();
  }, []);

  const fetchDailyScenario = async () => {
    setLoading(true);
    try {
      const res = await api.get('/daily-scenario');
      setScenario(res.data);
    } catch (err) {
      console.error("Failed to fetch scenario", err);
      setScenario({ text: "Uh oh! We couldn't load today's challenge." });
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (word) => {
    // Prevent clicking if it's already submitting, already won, or already guessed this specific word
    if (submitting || successData || guessedWords.includes(word)) return;
    
    setSubmitting(true);
    setCurrentMessage("Thinking...");
    
    try {
      const res = await api.post('/check-scenario', { 
        scenarioId: scenario.id, 
        answer: word,
        options: scenario.options 
      });
      
      const data = res.data;
      
      if (data.isCorrect) {
        // They got it right! Lock the board and save the definitions.
        setSuccessData({
          winningWord: word,
          message: data.message,
          definitions: data.definitions
        });
        setCurrentMessage(null); // Clear the temporary message
      } else {
        // They got it wrong. Add to the "wrong" list and show the AI's hint/correction.
        setGuessedWords(prev => [...prev, word]);
        setCurrentMessage(data.message);
      }

    } catch (err) {
      console.error("Failed to check answer", err);
      setCurrentMessage("Network error. Try clicking again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    // Reset all state for the new round
    setSuccessData(null);
    setGuessedWords([]);
    setCurrentMessage(null);
    setScenario(null);
    fetchDailyScenario();
  };

  return (
    <div className="coach-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="coach-header">
        <button onClick={() => navigate('/')} className="back-btn"><ChevronLeft /></button>
        <div className="coach-info">
          <h3>Daily Challenge <Sparkles size={16} className="sparkle-icon-neon" /></h3>
          <span>Multiple Choice</span>
        </div>
      </header>

      <div className="scenario-container" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, overflowY: 'auto' }}>
        
        {loading ? (
          <div className="loading-spinner">Cooking up a scenario...</div>
        ) : (
          <>
            <div className="scenario-card" style={{ background: 'rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 1rem 0', opacity: 0.8 }}>The Scenario</h4>
              <p style={{ fontSize: '1.2rem', lineHeight: '1.5' }}>{scenario?.text}</p>
              {scenario?.hint && !successData && <p style={{ fontSize: '0.9rem', opacity: 0.6, marginTop: '1rem' }}>💡 Hint: {scenario.hint}</p>}
            </div>

            {scenario?.options && (
              <div className="mcq-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {scenario.options.map((option, index) => {
                  
                  // NEW: Determine button styles based on multiple attempts
                  const isWrong = guessedWords.includes(option);
                  const isWinner = successData?.winningWord === option;
                  
                  let bgColor = 'transparent';
                  let opacity = 1;
                  
                  if (isWinner) {
                    bgColor = 'rgba(46, 204, 113, 0.3)'; // Green for the right answer
                  } else if (isWrong) {
                    bgColor = 'rgba(231, 76, 60, 0.1)'; // Faint red for wrong answers
                    opacity = 0.5; // Dim out the wrong answers so they look "disabled"
                  }

                  return (
                    <button 
                      key={index}
                      onClick={() => submitAnswer(option)}
                      disabled={isWrong || !!successData || submitting} // Only disable if won, submitting, or already guessed THIS word
                      style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: bgColor,
                        color: 'inherit',
                        fontSize: '1rem',
                        opacity: opacity,
                        cursor: (isWrong || successData || submitting) ? 'default' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Temporary Feedback for Wrong Answers */}
            {currentMessage && !successData && (
              <div style={{ textAlign: 'center', color: '#e74c3c', marginTop: '1rem', animation: 'fadeIn 0.3s' }}>
                <XCircle size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                <span>{currentMessage}</span>
              </div>
            )}

            {/* Final Success State Reveal */}
            {successData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', animation: 'fadeIn 0.5s' }}>
                
                <div className="feedback-card success" 
                     style={{ 
                       padding: '1rem', 
                       borderRadius: '8px', 
                       backgroundColor: 'rgba(46, 204, 113, 0.2)',
                       display: 'flex',
                       alignItems: 'center',
                       gap: '10px'
                     }}>
                  <CheckCircle color="#2ecc71" size={24} />
                  <div>
                    <strong style={{ fontSize: '1.1rem' }}>Nailed it!</strong>
                    <p style={{ margin: '0.2rem 0 0 0', opacity: 0.9 }}>{successData.message}</p>
                  </div>
                </div>

                {successData.definitions && (
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                    <h5 style={{ margin: '0 0 0.5rem 0', opacity: 0.7, textTransform: 'uppercase', fontSize: '0.8rem' }}>Word Breakdown</h5>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {Object.entries(successData.definitions).map(([word, definition]) => (
                        <li key={word} style={{ fontSize: '0.9rem' }}>
                          <strong style={{ color: word === successData.winningWord ? '#2ecc71' : 'rgba(255,255,255,0.7)' }}>
                            {word}:
                          </strong> {definition}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button 
                  onClick={handleNext}
                  className="next-btn"
                  style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                    color: '#000',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    marginTop: '0.5rem',
                    border: 'none'
                  }}
                >
                  Next Challenge <ArrowRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}