import React, { useState } from 'react';

const VerifyButton = ({ article }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleVerify = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Ensure port matches your server (5000 or 3001)
      const response = await fetch('http://localhost:5000/api/verify-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          content: article.content || article.description,
          url: article.url
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Verification failed:", error);
      alert("Server error. Check if backend is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
      <button 
        onClick={handleVerify} 
        disabled={loading}
        style={{
          backgroundColor: '#6366f1', 
          color: 'white', 
          padding: '8px 12px', 
          borderRadius: '6px',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold'
        }}
      >
        {loading ? 'Thinking...' : '✨ Verify with AI'}
      </button>

      {result && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          borderRadius: '8px',
          backgroundColor: result.verdict === 'Verified' ? '#ecfdf5' : '#fef2f2',
          border: result.verdict === 'Verified' ? '1px solid #10b981' : '1px solid #ef4444',
          fontSize: '0.9rem'
        }}>
          <strong>Verdict: {result.verdict}</strong> ({result.confidence}% Confidence)
          <p style={{ margin: '5px 0 0' }}>{result.analysis}</p>
        </div>
      )}
    </div>
  );
};

export default VerifyButton;