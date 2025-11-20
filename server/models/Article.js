const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  // --- THIS IS THE FIX ---
  // The field name has been changed from "user" to "author"
  // to match what your server/index.js file expects.
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // --- END OF FIX ---

  title: {
    type: String,
    required: true,
  },
  content: { // Changed from description to content to match server/index.js
    type: String,
    required: true,
  },
  location: { // Added location to match server/index.js
    type: String, 
  },
  verdict: { // Added verdict object to match server/index.js
    status: {
        type: String,
        default: 'Pending'
    },
    explanation: {
        type: String,
        default: ''
    },
    reports: [
        {
            title: { type: String },
            url: { type: String },
            source: { type: String }
        }
    ]
  },
  createdAt: { // Added createdAt to match server/index.js
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Article', ArticleSchema);