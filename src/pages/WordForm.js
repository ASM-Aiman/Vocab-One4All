import { useState } from 'react';
import api from '../api';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Loader2, ArrowLeft, Wand2, AlertCircle } from 'lucide-react';



export default function WordForm() {
  const [formData, setFormData] = useState({
    word: '',
    meaning: '',
    example_sentence: '',
    notes: '',
    difficulty: 'Medium',
    tags: ''
  });

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({
    type: '',
    text: ''
  });

  const navigate = useNavigate();

  // 🔥 Improved AI Fetch
  const fetchDefinition = async () => {
    if (!formData.word.trim()) {
      setStatusMsg({ type: 'error', text: 'Type a word first!' });
      return;
    }

    setLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const response = await api.post('/deconstruct', {
        text: `
Explain the word "${formData.word}" in ONE very simple sentence 
using easy everyday language as if explaining to a 10-year-old.

Then give ONE short and clear example sentence using the word.

Return ONLY valid JSON in this exact format:
{
  "meaning": "...",
  "example": "..."
}
        `
      });

      let data = response.data;

      // In case AI returns stringified JSON
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }

      setFormData(prev => ({
        ...prev,
        meaning: data.meaning || prev.meaning,
        example_sentence: data.example || prev.example_sentence
      }));

      setStatusMsg({ type: 'success', text: 'AI generated simple definition!' });

    } catch (err) {
      console.error("AI Fetch Error:", err);
      setStatusMsg({ type: 'error', text: 'AI failed to analyze.' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post('', formData);
      navigate('/');
    } catch (err) {
      console.error("Save Error:", err);
      alert("Error saving word.");
    }
  };

  return (
    <div className="app-container">
      <Link to="/" className="back-link" style={{ marginBottom: '20px' }}>
        <ArrowLeft size={18} /> Back to Library
      </Link>

      <div className="form-card">
        <h2 style={{ marginBottom: '10px' }}>New Archive Entry</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '0.9rem' }}>
          Add a word manually or use the sparkles to auto-fill.
        </p>

        <form onSubmit={handleSubmit}>

          {/* WORD */}
          <div className="form-group">
            <label>WORD</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                required
                className="form-input"
                placeholder="e.g. Epiphany"
                value={formData.word}
                onChange={e =>
                  setFormData({ ...formData, word: e.target.value })
                }
              />

              <button
                type="button"
                onClick={fetchDefinition}
                className="neon-sparkle-btn"
                disabled={loading}
                style={{
                  padding: '0 15px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--primary)',
                  color: 'var(--primary)'
                }}
              >
                {loading
                  ? <Loader2 className="animate-spin" size={18} />
                  : <Sparkles size={18} />}
              </button>
            </div>

            {statusMsg.text && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginTop: '8px',
                  fontSize: '0.8rem',
                  color:
                    statusMsg.type === 'error'
                      ? 'var(--accent-red)'
                      : 'var(--accent-green)'
                }}
              >
                {statusMsg.type === 'error' && <AlertCircle size={14} />}
                {statusMsg.text}
              </div>
            )}
          </div>

          {/* MEANING */}
          <div className="form-group">
            <label>MEANING</label>
            <textarea
              required
              className="form-input"
              placeholder="The definition goes here..."
              style={{ height: '80px', resize: 'none' }}
              value={formData.meaning}
              onChange={e =>
                setFormData({ ...formData, meaning: e.target.value })
              }
            />
          </div>

          {/* EXAMPLE */}
          <div className="form-group">
            <label>EXAMPLE SENTENCE</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                placeholder="Use it in a sentence..."
                style={{ paddingRight: '45px' }}
                value={formData.example_sentence}
                onChange={e =>
                  setFormData({
                    ...formData,
                    example_sentence: e.target.value
                  })
                }
              />
              <button
                type="button"
                onClick={fetchDefinition}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  opacity: 0.7
                }}
              >
                <Wand2 size={16} />
              </button>
            </div>
          </div>

          {/* TAGS */}
          <div className="form-group">
            <label>TAGS</label>
            <input
              className="form-input"
              placeholder="e.g. Academic, Literature, Slang"
              value={formData.tags}
              onChange={e =>
                setFormData({ ...formData, tags: e.target.value })
              }
            />
          </div>

          {/* DIFFICULTY */}
          <div className="form-group">
            <label>DIFFICULTY</label>
            <select
              className="form-input"
              value={formData.difficulty}
              onChange={e =>
                setFormData({ ...formData, difficulty: e.target.value })
              }
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <button
            type="submit"
            className="submit-btn"
            style={{ marginTop: '10px' }}
          >
            Save to Archive
          </button>
        </form>
      </div>
    </div>
  );
}
