const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const answersSchema = new mongoose.Schema({
	questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', foreignField: '_id', required: true }, // Reference to the question
	game: { type: String, ref: 'Game', required: true }, // Reference to the game code
	contestant: { type: String, ref: 'User', required: true, refPath: 'twitchId' }, // Reference to the contestant's Twitch ID
	answer: { type: String, required: true },
	points: { type: Number, default: 0 }, // committed/live score, set when a round's points are awarded
	manualPoints: { type: Number, default: 0 }, // quizmaster's judgement, overwritable pre-commit
	audiencePoints: { type: Number, default: 0 }, // derived from upvote/rofl votes, recomputable pre-commit
});

// Virtual for votes
answersSchema.virtual('votes', {
	ref: 'Vote',
	localField: '_id',
	foreignField: 'answerId',
	justOne: false
});

// Sum of manualPoints and audiencePoints, awaiting commit to points
answersSchema.virtual('pendingPoints').get(function () {
	return this.manualPoints + this.audiencePoints;
});

answersSchema.set('timestamps', true);
answersSchema.set('toJSON', { virtuals: true });
answersSchema.set('toObject', { virtuals: true });

const Answer = mongoose.model('Answer', answersSchema);
module.exports = Answer;