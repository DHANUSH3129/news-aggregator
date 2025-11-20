import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
// You may need to create a simple CSS file for this
// import './RegisterPage.css';

// THIS IS THE FIX:
const API_URL = 'https://news-aggregator-b4su.onrender.com';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      // THIS IS THE FIX:
      // We use API_URL to send the request to the correct port
      await axios.post(`${API_URL}/api/auth/register`, {
        email,
        password,
      });

      // Registration was successful
      navigate('/login'); // Redirect to the login page
    } catch (err) {
      // Registration failed
      console.error("Registration error:", err.response ? err.response.data : err.message);
      if (err.response && err.response.data.message) {
        setError(err.response.data.message); // e.g., "User with this email already exists."
      } else {
        setError('Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Register</h2>

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
        <button type="submit" className="auth-button">Register</button>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </form>
    </div>
  );
}

export default RegisterPage;