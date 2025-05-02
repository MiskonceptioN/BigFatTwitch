const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");
// const Game = require("./gameModel.js");

// Define the Question schema
const questionSchema = new mongoose.Schema({
	game: { type: String, ref: 'Game', foreignField: 'code' }, // Reference to the game code
	round: { type: Number, required: true }, // Round number
	order: { type: Number, required: true }, // Question order within the round
	question: { type: String, required: true },
	answer: { type: String, required: true },
	// contestantAnswers: [{
	// 	contestantId: { type: String, required: true },
	// 	answer: { type: String, required: true },
	// 	points: { type: Number, default: 0 },
	// }],
	status: { type: String, enum: ["pending", "in-progress", "played"], default: "pending" },
	type: { type: String, enum: ["text", "video", "image"], default: "text" },
});

// Virtual for questions
questionSchema.virtual('contestantAnswers', [{
	ref: 'Answer',
	localField: 'id',
	foreignField: 'questionId', // field in answer model
	justOne: false
}]);

questionSchema.set('timestamps', true);

// Create the Question model based on the schema
const Question = mongoose.model("Question", questionSchema);

// Export the Question model
module.exports = Question;