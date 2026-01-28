import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import WordForm from './pages/WordForm';
import WordDetail from './pages/WordDetail';
import Auth from './pages/Auth';

function App() {
  // Check token to determine auth state
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    // This handles cases where login might happen in another tab or via a hard redirect
    const checkAuth = () => setIsAuthenticated(!!localStorage.getItem('token'));
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  return (
    <Router>
      <div className="main-wrapper">
        <Routes>
          {/* Auth page is always accessible */}
          <Route path="/auth" element={<Auth />} />

          {/* Protected Routes */}
          <Route 
            path="/" 
            element={isAuthenticated ? <Home /> : <Navigate to="/auth" />} 
          />
          <Route 
            path="/add" 
            element={isAuthenticated ? <WordForm /> : <Navigate to="/auth" />} 
          />
          <Route 
            path="/word/:id" 
            element={isAuthenticated ? <WordDetail /> : <Navigate to="/auth" />} 
          />
          
          {/* Catch-all: redirect to home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;