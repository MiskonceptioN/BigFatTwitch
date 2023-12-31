const mongoose = require('mongoose');
const findOrCreate = require('mongoose-findorcreate');

// Define the User schema
const userSchema = new mongoose.Schema({
  twitchId: { type: String, required: true },
  displayName: { type: String, required: true },
  profileImageUrl: { type: String },
  banned: { type: Boolean, default: false },
  level: { type: String, default: "player" },
});
userSchema.plugin(findOrCreate);

// Create the User model based on the schema
const User = mongoose.model('User', userSchema);

// Export the User model
module.exports = User;
