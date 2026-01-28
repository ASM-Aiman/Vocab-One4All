import React, { useState } from 'react';
import axios from 'axios'; // 1. Use standard axios for the login call
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? 'login' : 'signup';
    try {
      // We point directly to the function
      const res = await axios.post(`/.netlify/functions/api/${endpoint}`, formData);
      
      if (isLogin) {
        // Store the data
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('username', res.data.username);
        
        // 2. Use a hard redirect. 
        // This forces App.js to reload and see the new token.
        window.location.href = '/'; 
      } else {
        setIsLogin(true);
        alert("Account created! Please log in.");
      }
    } catch (err) {
      // Safe way to catch errors even if the server doesn't send a pretty message
      const errorMsg = err.response?.data?.error || "Connection failed";
      alert("Auth failed: " + errorMsg);
    }
  };

  return (
    <div className="app-container">
      <div className="form-card" style={{maxWidth: '400px', marginTop: '100px'}}>
        <h2 style={{textAlign: 'center', marginBottom: '30px', color: 'white'}}>
          {isLogin ? 'Welcome Back' : 'Join the Archives'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>USERNAME</label>
            <input 
              className="form-input" 
              required 
              autoComplete="username"
              onChange={e => setFormData({...formData, username: e.target.value})} 
            />
          </div>
          <div className="form-group">
            <label>PASSWORD</label>
            <input 
              className="form-input" 
              type="password" 
              required 
              autoComplete="current-password"
              onChange={e => setFormData({...formData, password: e.target.value})} 
            />
          </div>
          <button type="submit" className="submit-btn" style={{marginTop: '20px'}}>
            {isLogin ? 'Sign In' : 'Register'}
          </button>
        </form>
        <p style={{textAlign: 'center', marginTop: '20px', color: 'var(--text-muted)', fontSize: '0.9rem'}}>
          {isLogin ? "New here?" : "Already a member?"} 
          <span 
            onClick={() => setIsLogin(!isLogin)} 
            style={{color: 'var(--primary)', cursor: 'pointer', marginLeft: '5px', textDecoration: 'underline'}}
          >
            {isLogin ? 'Create account' : 'Log in'}
          </span>
        </p>
      </div>
    </div>
  );
}