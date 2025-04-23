const mongoose = require('mongoose');

// Define the ChatLog schema
const chatLogSchema = new mongoose.Schema({
    gameId: { type: String, required: true },
    userId: { type: String, required: true, ref: 'User', foreignField: 'twitchId' },
    message: { type: String, required: true },
    room: { type: String, required: true }, // room = teamId
});
chatLogSchema.set('timestamps', true);

// Create the ChatLog model based on the schema
const ChatLog = mongoose.model('ChatLog', chatLogSchema);

// Export the ChatLog model
module.exports = ChatLog;
