import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import WordForm from './pages/WordForm';
import WordDetail from './pages/WordDetail';
import Auth from './pages/Auth';
import SentenceForm from './pages/SentenceForm';
import FluencyCoach from './pages/FluencyCoach';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const checkAuth = () => setIsAuthenticated(!!localStorage.getItem('token'));
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  return (
    <Router>
      <div className="main-wrapper">
        <Routes>
          <Route path="/auth" element={<Auth />} />

          {/* Home Route */}
          <Route 
            path="/" 
            element={isAuthenticated ? <Home /> : <Navigate to="/auth" />} 
          />

          {/* Fluency Coach Route - Updated to use your existing auth pattern */}
          <Route 
            path="/coach" 
            element={isAuthenticated ? <FluencyCoach /> : <Navigate to="/auth" />} 
          />

          <Route 
            path="/add-sentence" 
            element={isAuthenticated ? <SentenceForm /> : <Navigate to="/auth" />} 
          />

          <Route 
            path="/add" 
            element={isAuthenticated ? <WordForm /> : <Navigate to="/auth" />} 
          />

          <Route 
            path="/word/:id" 
            element={isAuthenticated ? <WordDetail /> : <Navigate to="/auth" />} 
          />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;