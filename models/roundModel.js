const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const roundsSchema = new mongoose.Schema({
	game: { type: String, ref: 'Game', refPath: 'code', required: true }, // Reference to the game code
	roundNumber: { type: Number, required: true },
	heading: { type: String, default: "", },
	subheading: { type: String, default: "" },
});
roundsSchema.set('timestamps', true);

const Round = mongoose.model('Round', roundsSchema);
module.exports = Round;