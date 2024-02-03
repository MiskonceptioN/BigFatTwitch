const mongoose = require('mongoose');
const findOrCreate = require('mongoose-findorcreate');

// Define the User schema
const userSchema = new mongoose.Schema({
  twitchId: { type: String, required: true },
  displayName: { type: String, required: true },
  lastLogin: { type: String, default: null },
  profileImageUrl: { type: String },
  banned: { type: Boolean, default: false },
  role: { type: String, default: "player" },
  broadcasterType: { type: String, default: ""},
  bio: { type: String },
  chatColour: { type: String },
  showBroadcasterType: { type: Boolean, default: true },
  twitchChatColour: {type: String, default: ""},
  customChatColour: {type: String, default: "#000000"},
  inGame: {type: String, default: ""},
});
userSchema.plugin(findOrCreate);
userSchema.set('timestamps', true);

// Create the User model based on the schema
const User = mongoose.model('User', userSchema);

// Export the User model
module.exports = User;
