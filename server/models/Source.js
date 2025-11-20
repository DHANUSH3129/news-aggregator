const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * This model tracks the historical reliability of each news source.
 * A "source" can be a local user (identified by email) or an
 * external news organization (identified by name).
 */
const SourceSchema = new Schema({
    // The unique name of the source, e.g., "user@example.com" or "BBC News"
    name: { 
        type: String, 
        required: true, 
        unique: true 
    },
    
    // The type of source
    type: { 
        type: String, 
        enum: ['Local User', 'GNews Source'], 
        required: true 
    },
    
    // Counters for each verdict type
    reliableCount: { type: Number, default: 0 },
    unreliableCount: { type: Number, default: 0 },
    misleadingCount: { type: Number, default: 0 },
    
    // The final calculated reliability score (e.g., 0-100)
    // This score is updated every time a new verdict is added.
    reliabilityScore: { type: Number, default: 50 } // Start at a neutral 50
});

module.exports = mongoose.model('Source', SourceSchema);