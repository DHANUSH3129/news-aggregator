import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function PublishPage() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [location, setLocation] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const token = localStorage.getItem('token');
            const config = {
                headers: { 'x-auth-token': token }
            };
            await axios.post('https://news-aggregator-b4su.onrender.com/api/articles', { title, content, location }, config);
            setSuccess('Article published successfully!');
            setTimeout(() => navigate('/'), 2000);
        } catch (err) {
            setError('Failed to publish article. Please try again.');
        }
    };

    return (
        <div className="publish-container">
            <form className="publish-form" onSubmit={handleSubmit}>
                <h2>Publish Local News</h2>
                {error && <p className="error-message">{error}</p>}
                {success && <p className="success-message">{success}</p>}
                <input type="text" placeholder="Article Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                <textarea placeholder="Article Content" rows="10" value={content} onChange={(e) => setContent(e.target.value)} required />
                <input type="text" placeholder="Location (e.g., Bengaluru)" value={location} onChange={(e) => setLocation(e.target.value)} />
                <button type="submit">Publish Article</button>
            </form>
        </div>
    );
}

export default PublishPage;