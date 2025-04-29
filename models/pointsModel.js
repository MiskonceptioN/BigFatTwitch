const mongoose = require('mongoose');

const pointsSchema = new mongoose.Schema({
    game: { type: String, ref: 'Game', foreignField: 'code', required: true }, // Reference to the game
    player: { type: String, ref: 'User', foreignField: 'twitchId', required: true }, // Reference to the player
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true }, // Reference to the question
    points: { type: Number, default: 0 }, // Points awarded for this question
});

const Points = mongoose.model('Points', pointsSchema);
module.exports = Points;