const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");
// const Game = require("./gameModel.js");

// Define the Question schema
const questionSchema = new mongoose.Schema({
	question: { type: String, required: true },
	answer: { type: String, required: true },
	contestantAnswers: { type: Object, default: {} },
	status: { type: String, enum: ["pending", "in-progress", "played"], default: "pending" },
	type: { type: String, enum: ["text", "video", "image"], default: "text" },
//	 game: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
	game: { type: "String", required: true },
	round: { type: Number, required: true },
	order: { type: Number, required: true },
//	 winner: { type: mongoose.Schema.Types.ObjectId, ref: "Team" }
});
// questionSchema.plugin(timestamps);
questionSchema.set('timestamps', true);

// Create the Question model based on the schema
const Question = mongoose.model("Question", questionSchema);

// Export the Question model
module.exports = Question;
