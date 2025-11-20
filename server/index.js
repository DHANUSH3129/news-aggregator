require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import all models
const User = require('./models/User');
const Article = require('./models/Article');
const Source = require('./models/Source');

const app = express();
app.use(cors());
app.use(express.json());



// --- FIX 1: DEFINE THE GEMINI SCHEMA AS A CONSTANT ---
// This schema matches the one you described in your system prompt.
const GEMINI_VERDICT_SCHEMA = {
  type: "OBJECT",
  properties: {
    "status": { "type": "STRING", "enum": ["Reliable", "Unreliable", "Misleading"] },
    "explanation": { "type": "STRING" },
    "reports": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "title": { "type": "STRING" },
          "url": { "type": "STRING" },
          "source": { "type": "STRING" }
        }, "required": ["title", "url", "source"]
      }
    }
  }, "required": ["status", "explanation"]
};

// --- GEMINI API HELPER ---
const callGeminiApi = async (articleTitle, articleContent) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
    const systemPrompt = `
      You are an AI fact-checker. Analyze the provided news article.
      1.  Determine if the article is "Reliable", "Unreliable", or "Misleading".
      2.  Provide a concise, one-sentence explanation for your verdict.
      3.  If (and only if) the article is "Reliable", find 2-3 other news articles from different sources that corroborate the main story.
      Respond in JSON format according to this schema:
      {
        "type": "OBJECT",
        "properties": {
          "status": { "type": "STRING", "enum": ["Reliable", "Unreliable", "Misleading"] },
          "explanation": { "type": "STRING" },
          "reports": {
            "type": "ARRAY",
            "items": {
              "type": "OBJECT",
              "properties": {
                "title": { "type": "STRING" },
                "url": { "type": "STRING" },
                "source": { "type": "STRING" }
              }, "required": ["title", "url", "source"]
            }
          }
        }, "required": ["status", "explanation"]
      }
    `;
  
    const userQuery = `
      Article Title: "${articleTitle}"
      Article Content: "${articleContent}"
    `;
  
    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      tools: [{ "google_search": {} }],
      generationConfig: {
        responseMimeType: "application/json",
        // --- FIX 2: ADD THE responseSchema TO THE API CALL ---
        // This tells the API to *enforce* the JSON output, fixing the 500 error.
        responseSchema: GEMINI_VERDICT_SCHEMA
      }
    };
  
    try {
      const response = await axios.post(apiUrl, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      const result = response.data;
      const candidate = result.candidates?.[0];
      if (candidate && candidate.content?.parts?.[0]?.text) {
        // The response is now guaranteed to be a valid JSON string
        return JSON.parse(candidate.content.parts[0].text);
      } else {
        console.error("Invalid Gemini response structure:", result);
        throw new Error("Failed to get valid JSON from Gemini.");
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error.response ? error.response.data : error.message);
      throw error; // Re-throw the error to be caught by the route handler
    }
};

// --- SOURCE RELIABILITY HELPER ---
async function updateSourceReliability(sourceName, sourceType, verdictStatus) {
    if (!sourceName || !verdictStatus || verdictStatus === 'Pending') {
        console.log("Skipping reliability update: Invalid data.");
        return;
    }

    try {
        const source = await Source.findOneAndUpdate(
            { name: sourceName }, // Query
            { $setOnInsert: { name: sourceName, type: sourceType } }, // Data to set on creation
            { upsert: true, new: true, setDefaultsOnInsert: true } // Options
        );

        let updateField;
        if (verdictStatus === 'Reliable') {
            updateField = 'reliableCount';
        } else if (verdictStatus === 'Unreliable') {
            updateField = 'unreliableCount';
        } else if (verdictStatus === 'Misleading') {
            updateField = 'misleadingCount';
        } else {
            return; // Don't update for other statuses
        }
        
        // Use $inc to safely increment the count
        source[updateField] += 1;

        const totalVerdicts = source.reliableCount + source.unreliableCount + source.misleadingCount;
        if (totalVerdicts > 0) {
            source.reliabilityScore = Math.round((source.reliableCount / totalVerdicts) * 100);
        } else {
            source.reliabilityScore = 50; // Default score
        }

        await source.save();
        console.log(`Reliability score for ${sourceName} updated to ${source.reliabilityScore}.`);

    } catch (error) {
        console.error(`Failed to update reliability for source ${sourceName}:`, error);
    }
}


// --- MIDDLEWARE ---
const authMiddleware = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied.' });
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (e) {
      res.status(400).json({ message: 'Token is not valid.' });
    }
};

// --- AUTHENTICATION ROUTES ---
app.post("/api/auth/register", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User with this email already exists." });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "User registered successfully." });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: "Server error during registration." });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials." });
        
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });
        const payload = { userId: user.id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error during login." });
    }
});

// --- ARTICLE ROUTES ---

// GET All Articles
app.get('/api/articles', async (req, res) => {
    try {
      // Populate author's email to display as the source
      const articles = await Article.find().sort({ createdAt: -1 }).populate('author', 'email');
      res.json(articles);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching articles.' });
    }
});

// POST a new Article
app.post("/api/articles", authMiddleware, async (req, res) => {
    try {
        const { title, content, location } = req.body;
        const newArticle = new Article({ 
            title, 
            content, 
            location, 
            author: req.user.userId 
        });
        const article = await newArticle.save();
        res.status(201).json(article);
    } catch (error) {
        console.error("Error publishing article:", error);
        res.status(500).json({ message: "Server error while publishing." });
    }
});

// DELETE an Article
app.delete("/api/articles/:id", authMiddleware, async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) return res.status(404).json({ message: "Article not found." });
        if (article.author.toString() !== req.user.userId) {
            return res.status(401).json({ message: "User not authorized." });
        }
        await Article.findByIdAndDelete(req.params.id);
        res.json({ message: "Article deleted successfully." });
    } catch (error) {
        console.error("Error deleting article:", error);
        res.status(500).json({ message: "Server error while deleting." });
    }
});

// ##################################################################
// ##### VERIFY an Article (UPGRADED WITH MOCK MODE) #####
// ##################################################################
app.post("/api/articles/:id/verify", authMiddleware, async (req, res) => {
    
    // --- START OF NEW MOCK CODE ---
    if (process.env.MOCK_AI_VERIFICATION === "true") {
        console.log(`MOCK MODE: Simulating AI verification for article ${req.params.id}`);
        
        const fakeVerdictData = {
            status: "Reliable",
            explanation: "This article appears to be well-sourced and aligns with reports from major independent news outlets. (This is a MOCK response).",
            reports: [
                {
                    title: "Mock Report 1: Similar Story",
                    url: "#",
                    source: "Fake News Inc."
                },
                {
                    title: "Mock Report 2: Corroboration",
                    url: "#",
                    source: "Mock Media"
                }
            ]
        };

        await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay
        
        try {
            const article = await Article.findById(req.params.id).populate('author', 'email');
            if (!article) return res.status(404).json({ message: "Article not found." });

            article.verdict = fakeVerdictData;
            await article.save();

            if (article.author && article.author.email) {
                await updateSourceReliability(article.author.email, 'Local User', fakeVerdictData.status);
            }
            
            console.log("MOCK MODE: Saved fake verdict successfully.");
            return res.json(article); // Send the updated article back

        } catch (error) {
            console.error("Error during MOCK verification:", error);
            return res.status(500).json({ message: "Server error during MOCK verification." });
        }
    }
    // --- END OF NEW MOCK CODE ---


    // --- This is the ORIGINAL code that runs if MOCK_AI_VERIFICATION is not "true" ---
    console.log(`LIVE MODE: Starting REAL AI verification for article ${req.params.id}`);
    try {
        const article = await Article.findById(req.params.id).populate('author', 'email');
        if (!article) return res.status(404).json({ message: "Article not found." });
        
        if (article.verdict && article.verdict.status !== 'Pending') {
             console.log("Article already verified. Returning existing verdict.");
             return res.json(article); 
        }

        // 1. Call the REAL Gemini helper
        const verdictData = await callGeminiApi(article.title, article.content);
        
        // 2. Save the verdict
        article.verdict = verdictData;
        await article.save();

        // 3. Update Reliability Ledger
        if (article.author && article.author.email) {
            await updateSourceReliability(article.author.email, 'Local User', verdictData.status);
        }

        // 4. Send the updated article back
        res.json(article);

    } catch (error) {
        console.error("Error verifying article:", error);
        res.status(500).json({ message: "Server error during verification." });
    }
});
// ##################################################################
// ##### END OF VERIFY ROUTE #####
// ##################################################################


// --- SOURCE LEDGER ROUTE ---
app.get('/api/sources', async (req, res) => {
    try {
        const sources = await Source.find().sort({ reliabilityScore: -1 });
        res.json(sources);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching reliability ledger.' });
    }
});


// --- NEWS FETCHING ROUTE ---
const normalizeGNewsArticle = (article) => ({ 
    source: { name: article.source.name }, 
    title: article.title, 
    description: article.description, 
    url: article.url, 
    urlToImage: article.image, 
    publishedAt: article.publishedAt, 
    content: article.content ? article.content.substring(0, 200) + "..." : "" // Truncate content
});

app.get("/news", async (req, res) => {
    const { lang = "en", category = "general", filter = "international", city } = req.query; // Use req.query
    const apiKey = process.env.GNEWS_API_KEY;
    try {
        let articles = [];
        if (filter === 'local') {
            const dbArticles = await Article.find().sort({ createdAt: -1 }).populate('author', 'email');
            articles = dbArticles
                .filter(article => article.author) // Only include articles that have an author
                .map(article => ({
                    _id: article.id,
                    authorId: article.author._id,
                    isLocal: true,
                    title: article.title,
                    description: article.content.substring(0, 200) + '...',
                    url: null, // Local articles don't have an external URL
                    urlToImage: null, // Local articles don't have an image
                    source: { name: article.author.email || 'Local News' }, 
                    publishedAt: article.createdAt,
                    verdict: article.verdict // Pass the verdict object to the frontend
                }));
        } else {
            // Fetch from GNews
            if (!apiKey) return res.status(500).json({ success: false, message: "GNews API key not configured." });
            
            let url;
            const topic = (category === 'top') ? 'general' : category;

            if (filter === 'national') {
                url = `https://gnews.io/api/v4/top-headlines?apikey=${apiKey}&lang=en&country=in&topic=${topic}`;
            } else if (city && filter === 'city') {
                url = `https://gnews.io/api/v4/search?q=${city}&country=in&lang=en&apikey=${apiKey}`;
            } else {
                // Default to international
                url = `https://gnews.io/api/v4/top-headlines?apikey=${apiKey}&lang=${lang}&topic=${topic}`;
            }

            const response = await axios.get(url);
            if (response.data.articles) {
                articles = response.data.articles.map(article => ({
                    ...normalizeGNewsArticle(article),
                    isLocal: false,
                    verdict: { status: 'Pending' } // GNews articles are not verified by default
                }));
            }
        }
        res.status(200).json({ success: true, data: { articles } });
    } catch (error) {
        console.error("API request error:", error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: "Failed to fetch data." });
    }
});


// ##################################################################
// ##### NEW DATABASE CONNECTION AND SERVER START LOGIC #####
// ##################################################################
const PORT = process.env.PORT || 3001;
if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL is not defined in .env file.");
    process.exit(1); // Stop the server
}

mongoose.connect(process.env.DATABASE_URL)
  .then(() => {
    console.log('Database connected successfully!');
    // Start the server ONLY after the database is connected
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1); // Stop the server
  });

// --- FIX 3: REMOVED ALL THE DUPLICATE CODE FROM THE END OF THE FILE ---
// (The file was pasted twice, which would cause a server crash)