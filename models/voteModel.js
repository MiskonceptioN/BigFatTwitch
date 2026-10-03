const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const votesSchema = new mongoose.Schema({
	answerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer', required: true }, // Reference to the answer being voted on
	game: { type: String, ref: 'Game', foreignField: 'code', required: true }, // Reference to the game code
	voter: { type: String, ref: 'User', foreignField: 'twitchId', required: true }, // Twitch ID of the audience member casting the vote
	intent: { type: String, enum: ['upvote', 'rofl'], required: true },
});
votesSchema.set('timestamps', true);

// Allow at most one 'upvote' and one 'rofl' vote per audience member per answer
votesSchema.index({ answerId: 1, voter: 1, intent: 1 }, { unique: true });

// Tally upvote/rofl counts for one or more answers; returns a Map keyed by answerId string, e.g. { upvote: 3, rofl: 1 }
votesSchema.statics.getCounts = async function (answerIds) {
	const ids = Array.isArray(answerIds) ? answerIds : [answerIds];

	const results = await this.aggregate([
		{ $match: { answerId: { $in: ids } } },
		{ $group: { _id: { answerId: "$answerId", intent: "$intent" }, count: { $sum: 1 } } }
	]);

	const counts = new Map();
	for (const id of ids) counts.set(id.toString(), { upvote: 0, rofl: 0 });

	for (const { _id, count } of results) {
		counts.get(_id.answerId.toString())[_id.intent] = count;
	}

	/*/ Usage examples
	// single answer
	const counts = await Vote.getCounts(answer._id);
	const { upvote, rofl } = counts.get(answer._id.toString());

	// many answers (e.g. all answers to a question)
	const answers = await Answer.find({ questionId });
	const counts = await Vote.getCounts(answers.map(a => a._id));
	answers.forEach(a => console.log(counts.get(a._id.toString())));
	/*/

	return counts;
};

const Vote = mongoose.model('Vote', votesSchema);
module.exports = Vote;