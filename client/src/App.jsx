import React, { useState } from 'react';
import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PublishPage from './pages/PublishPage';
import ContactPage from './pages/ContactPage';
import './App.css';

// --- Configuration for Dropdowns ---
const radiusOptions = {
  international: 'International',
  national: 'National (India)',
  local: 'Local News',
};
const categoryOptions = {
  top: 'Top Stories',
  business: 'Finance',
  entertainment: 'Entertainment',
  health: 'Health',
  science: 'Science',
  sports: 'Sports',
  technology: 'Technology',
};
const languageOptions = {
  en: 'English',
  hi: 'हिंदी (Hindi)',
  ta: 'தமிழ் (Tamil)',
  kn: 'ಕನ್ನಡ (Kannada)',
  ml: 'മലയാളಂ (Malayalam)',
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const navigate = useNavigate();

  // State for filters
  const [radius, setRadius] = useState('international');
  const [category, setCategory] = useState('top');
  const [language, setLanguage] = useState('en');

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleHomeClick = () => {
    setRadius('international');
    setCategory('top');
    setLanguage('en');
    navigate('/');
  };

  // Dropdown Component
  const Dropdown = ({ options, selected, onSelect, title }) => (
    <div className="nav-item dropdown">
      <button className="dropdown-toggle">{title}: <strong>{options[selected]}</strong></button>
      <div className="dropdown-menu">
        {Object.entries(options).map(([key, value]) => (
          <button key={key} onClick={() => onSelect(key)} className={selected === key ? 'active' : ''}>
            {value}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-main">
          <h1>
            <div onClick={handleHomeClick} className="header-link" style={{cursor: 'pointer'}}>
              News<span className="logo-accent">Breaker</span>
            </div>
          </h1>
          <div className="auth-buttons">
            {token ? (
              <>
                <Link to="/publish" className="auth-button publish">Publish Article</Link>
                <button onClick={handleLogout} className="auth-button logout">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="auth-button">Login</Link>
                <Link to="/register" className="auth-button register">Register</Link>
              </>
            )}
          </div>
        </div>
        {token && (
          <nav className="main-nav">
            <NavLink to="/" className="nav-item" end>Home</NavLink>
            <Dropdown title="Radius" options={radiusOptions} selected={radius} onSelect={setRadius} />
            <Dropdown title="Category" options={categoryOptions} selected={category} onSelect={setCategory} />
            <Dropdown title="Language" options={languageOptions} selected={language} onSelect={setLanguage} />
            <NavLink to="/contact" className="nav-item">Contact Us</NavLink>
          </nav>
        )}
      </header>

      <Routes>
        <Route 
          path="/" 
          element={
            token ? (
              <HomePage radius={radius} category={category} language={language} /> 
            ) : (
              <LoginPage setToken={setToken} />
            )
          } 
        />
        <Route path="/login" element={<LoginPage setToken={setToken} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/publish" element={token ? <PublishPage /> : <LoginPage setToken={setToken} />} />
        <Route path="/contact" element={token ? <ContactPage /> : <LoginPage setToken={setToken} />} />
      </Routes>
    </div>
  );
}

export default App;