import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

function HomePage({ radius, category, language }) {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState(null);
    
    // State for Features
    const [speakingId, setSpeakingId] = useState(null); // Audio
    const [commentText, setCommentText] = useState({}); // Map articleId -> text input

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUserId(decoded.userId);
            } catch (e) { console.error("Invalid token:", e); }
        }
    }, []);

    // 1. Fetch Articles
    const fetchArticles = () => {
        setLoading(true);
        setError(null);
        let url = `https://news-aggregator-b4su.onrender.com/news?filter=${radius}&lang=${language}`;
        if (category !== 'top') url += `&category=${category}`;
        
        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setArticles(data.data.articles.filter(article => article.title));
                } else {
                    throw new Error(data.message || 'Failed to fetch news');
                }
                setLoading(false);
            })
            .catch(err => {
                setError(err);
                setLoading(false);
            });
    };

    useEffect(() => { fetchArticles(); }, [radius, category, language]);

    // --- SOCIAL FEATURES (Likes & Comments) ---
    
    const handleLike = async (articleId) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return alert("Please log in to like.");
            await axios.post(`https://news-aggregator-b4su.onrender.com/api/articles/${articleId}/like`, {}, { headers: { 'x-auth-token': token } });
            fetchArticles(); // Refresh to show new like count
        } catch (err) { console.error("Like failed:", err); }
    };

    const submitComment = async (articleId) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return alert("Please log in to comment.");
            const text = commentText[articleId];
            if (!text) return;

            await axios.post(`https://news-aggregator-b4su.onrender.com/api/articles/${articleId}/comments`, { text }, { headers: { 'x-auth-token': token } });
            setCommentText({ ...commentText, [articleId]: '' }); // Clear input
            fetchArticles(); // Refresh to show new comment
        } catch (err) { console.error("Comment failed:", err); }
    };

    const deleteComment = async (articleId, commentId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`https://news-aggregator-b4su.onrender.com/api/articles/${articleId}/comments/${commentId}`, { headers: { 'x-auth-token': token } });
            fetchArticles();
        } catch (err) { console.error("Delete comment failed:", err); }
    };

    const handleDeleteArticle = async (articleId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`https://news-aggregator-b4su.onrender.com/api/articles/${articleId}`, { headers: { 'x-auth-token': token } });
            setArticles(prev => prev.filter(a => a._id !== articleId));
        } catch (err) { console.error("Delete failed:", err); }
    };

    // --- NEW FEATURES (Audio & Verification) ---

    const handleSpeak = (articleId, title, content) => {
        if (speakingId === articleId) {
            window.speechSynthesis.cancel();
            setSpeakingId(null);
            return;
        }
        window.speechSynthesis.cancel();
        const textToRead = `${title}. ${content || ''}`;
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.onend = () => setSpeakingId(null);
        window.speechSynthesis.speak(utterance);
        setSpeakingId(articleId);
    };

    const handleVerifyWithGemini = (title, content) => {
        const promptText = `Act as a fact-checker. Verify this: Title: "${title}". Content: "${content || ''}"`;
        navigator.clipboard.writeText(promptText).then(() => {
            window.open("https://gemini.google.com/app", "_blank");
        });
    };

    const handleVerifyWithGoogle = (title) => {
        const query = encodeURIComponent(`${title} fact check`);
        window.open(`https://www.google.com/search?q=${query}`, "_blank");
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <main className="main-content">
            {loading && <div className="loader">Loading...</div>}
            {error && <div className="error-message">Error fetching news.</div>}
            
            {!loading && !error && (
                <div className="news-grid">
                    {articles.map((article) => {
                        const isSpeaking = speakingId === article._id;
                        // Safe access to likes/comments for rendering
                        const likesCount = article.likes ? article.likes.length : article.likesCount || 0;
                        const comments = article.comments || [];

                        return (
                            <div className="article-card" key={article._id || article.url}>
                                {article.urlToImage ? <img src={article.urlToImage} alt={article.title} className="article-image" /> : <div className="article-image-placeholder"></div>}
                                <div className="article-content">
                                    <span className="article-source">{article.source.name}</span>
                                    
                                    {/* Header with Audio Button */}
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
                                        <h2 className="article-title" style={{flex: 1}}>{article.title}</h2>
                                        <button onClick={() => handleSpeak(article._id, article.title, article.description)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}>
                                            {isSpeaking ? '⏸️' : '🔊'}
                                        </button>
                                    </div>

                                    <p className="article-description">{article.description || article.content}</p>
                                    
                                    {/* LOCAL NEWS FEATURES */}
                                    {article.isLocal && (
                                        <div className="local-features" style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                            
                                            {/* 1. Verification Buttons */}
                                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                                <button onClick={() => handleVerifyWithGemini(article.title, article.description)} style={{ flex: 1, background: 'linear-gradient(135deg, #4E75F8, #8749F0)', color: 'white', border: 'none', padding: '8px', borderRadius: '5px', cursor: 'pointer' }}>
                                                    ✨ Ask Gemini
                                                </button>
                                                <button onClick={() => handleVerifyWithGoogle(article.title)} style={{ flex: 1, backgroundColor: '#4285F4', color: 'white', border: 'none', padding: '8px', borderRadius: '5px', cursor: 'pointer' }}>
                                                    🔍 Google Check
                                                </button>
                                            </div>

                                            {/* 2. Like Section */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                                <button onClick={() => handleLike(article._id)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '20px', padding: '5px 15px', cursor: 'pointer' }}>
                                                    ❤️ Like ({likesCount})
                                                </button>
                                            </div>

                                            {/* 3. Comment Section */}
                                            <div className="comments-section">
                                                <h4 style={{fontSize: '0.9em', margin: '5px 0'}}>Comments ({comments.length})</h4>
                                                <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: '10px', fontSize: '0.85em', color: '#555' }}>
                                                    {comments.length > 0 ? comments.map(c => (
                                                        <div key={c._id} style={{ padding: '5px 0', borderBottom: '1px solid #f0f0f0' }}>
                                                            <strong>{c.user?.email?.split('@')[0] || 'User'}:</strong> {c.text}
                                                            {userId && c.user?._id === userId && (
                                                                <button onClick={() => deleteComment(article._id, c._id)} style={{ marginLeft: '10px', color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8em' }}>x</button>
                                                            )}
                                                        </div>
                                                    )) : <div>No comments yet.</div>}
                                                </div>
                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Add a comment..." 
                                                        value={commentText[article._id] || ''}
                                                        onChange={(e) => setCommentText({ ...commentText, [article._id]: e.target.value })}
                                                        style={{ flex: 1, padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
                                                    />
                                                    <button onClick={() => submitComment(article._id)} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Post</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="article-footer" style={{marginTop: '15px'}}>
                                        <span className="article-date">{formatDate(article.publishedAt)}</span>
                                        {article.isLocal && article.authorId === userId ? (
                                            <button onClick={() => handleDeleteArticle(article._id)} className="delete-button">Delete</button>
                                        ) : (
                                            article.url && article.url.startsWith('http') && 
                                            <a href={article.url} target="_blank" rel="noopener noreferrer" className="read-more-link">Read More &rarr;</a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
export default HomePage;