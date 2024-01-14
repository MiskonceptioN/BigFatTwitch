const mongoose = require('mongoose');
const timestamps  = require('mongoose-timestamp');

// Define the Team schema
const teamSchema = new mongoose.Schema({
  name: { type: String, default: "Team" },
  points: { type: Number, default: 0 },
  players: { type: [Number], default: [null, null]}
});

// Define the Game schema
const gameSchema = new mongoose.Schema({
  code: { type: String, required: true },
  status: { type: String, enum: ["pending", "in-progress", "played"], default: "pending" },
  maxAudience: { type: Number, default: 0 },
  winner: { type: String, default: null },
  teams: [teamSchema], 
  // team1: { type: mongoose.Schema.Types.ObjectId, ref: "Team" }
});
// gameSchema.plugin(timestamps);
gameSchema.set('timestamps', true);

// Create the Game model based on the schema
const Game = mongoose.model('Game', gameSchema);

// Export the Game model
module.exports = Game;
