const mongoose = require('mongoose');
const timestamps  = require('mongoose-timestamp');

const contestantAnswersSchema = new mongoose.Schema({
  contestantId: { type: String, required: true },
  answer: { type: String, required: true },
  points: { type: Number, default: 0 },
});

// Define the Team schema
const teamSchema = new mongoose.Schema({
  name: { type: String, default: "Team" },
  points: { type: Number, default: 0 },
  players: [{ type: String, default: [null, null], ref: 'User', foreignField: 'twitchId' }]
});

// Define the Game schema
const gameSchema = new mongoose.Schema({
  code: { type: String, required: true },
  status: { type: String, enum: ["pending", "starting", "in-progress", "played"], default: "pending" },
  maxAudience: { type: Number, default: 0 },
  winner: { type: String, default: null },
  teams: [teamSchema], 
// }, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
});

// Virtual for questions
gameSchema.virtual('questions', {
  ref: 'Question',
  localField: 'code',
  foreignField: 'game', // field in Question model
  justOne: false
});

// Virtual for rounds
gameSchema.virtual('rounds', {
  ref: 'Round',
  localField: 'code',
  foreignField: 'game', // field in answer model
  justOne: false
});

// gameSchema.plugin(timestamps);
gameSchema.set('timestamps', true);

// Create the Game model based on the schema
const Game = mongoose.model('Game', gameSchema);

// Export the Game model
module.exports = Game;
