const mongoose = require('mongoose');
const findOrCreate = require('mongoose-findorcreate');

// Define the Team schema
const teamSchema = new mongoose.Schema({
  teamName: { type: String, required: true },
  playerOne: { type: String, required: true },
  playerTwo: { type: String, required: true },
  gameId: { type: String, default: null }, 
  points: { type: Number, default: 0 }
});
teamSchema.plugin(findOrCreate);

// Create the Team model based on the schema
const Team = mongoose.model('Team', teamSchema);

// Export the Team model
module.exports = Team;
