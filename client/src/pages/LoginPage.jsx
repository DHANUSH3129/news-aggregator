import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
// You may need to create a simple CSS file for this
// import './LoginPage.css'; 

// THIS IS THE FIX:
// We explicitly tell the frontend to send requests to your server on port 3001
const API_URL = 'https://news-aggregator-b4su.onrender.com';

function LoginPage({ setToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    try {
      // THIS IS THE FIX:
      // We use API_URL to send the request to the correct port
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });

      // Login was successful
      const { token } = response.data;
      setToken(token);
      localStorage.setItem('token', token);
      navigate('/'); // Redirect to the homepage
    } catch (err) {
      // Login failed
      console.error("Login error:", err.response ? err.response.data : err.message);
      setError('Invalid email or password.');
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Login</h2>
        
        {error && <p className="auth-error">{error}</p>}
        
        <div className="input-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="auth-button">Login</button>
        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;