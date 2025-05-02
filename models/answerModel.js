const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const answersSchema = new mongoose.Schema({
	questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', foreignField: '_id', required: true }, // Reference to the question
	// questionId: { type: String, ref: 'Question', foreignField: 'id', required: true }, // Reference to the question
	game: { type: String, ref: 'Game', required: true }, // Reference to the game code
	contestant: { type: String, ref: 'User', required: true, refPath: 'twitchId' }, // Reference to the contestant's Twitch ID
	answer: { type: String, required: true },
	points: { type: Number, default: 0 },
});
answersSchema.set('timestamps', true);

const Answer = mongoose.model('Answer', answersSchema);
module.exports = Answer;