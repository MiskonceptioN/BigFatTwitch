// Requirements
require ("dotenv").config();
const express = require("express");
const session = require('express-session')
const flash = require("express-flash");
const { createServer} = require("node:http");
const bodyParser = require("body-parser");
const axios = require("axios").default;
const fs = require("fs");
const { Server } = require("socket.io");
const passport = require("passport");
const twitchStrategy = require("passport-twitch").Strategy;

// Expose socket.io to the rest of the app
const app = express();
const server = createServer(app);
const io = new Server(server, {connectionStateRecovery: {}});
module.exports = io;

// Mongo
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const mongoUri = "mongodb+srv://" + process.env.MONGODB_USER + ":" + process.env.MONGODB_PASS + "@" + process.env.MONGODB_URL + "/gameshow?retryWrites=true&w=majority";
const User = require("./models/userModel.js");
const Game = require("./models/gameModel.js");
const Question = require("./models/questionModel.js");
mongoose.connect(mongoUri);
const db = mongoose.connection;

// App config
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
	secret: 'your-secret-key', // Change this to a secure secret
	resave: false,
	saveUninitialized: true,
	store: new MongoStore({ mongoUrl: db.client.s.url })
}));
app.use(flash());

// Passport
passport.use(new twitchStrategy({
	clientID: process.env.TWITCH_CLIENT_ID,
	clientSecret: process.env.TWITCH_CLIENT_SECRET,
	callbackURL: process.env.TWITCH_CALLBACK_URL,
},
async function(accessToken, refreshToken, profile, done) {
	try {
		const user = await User.findOrCreate({twitchId: profile.id},{
			displayName: profile.displayName,
			profileImageUrl: profile.profileImageUrl,
			broadcasterType: profile.broadcaster_type,
			bio: profile.description,
			twitchChatColour: await fetchTwitchChatColour(profile.id)
		});

		if (user) {
			if (user.doc.banned) {
				// return done(null, false, {message: "Blip blip blorp"});
				return done(null, false);
			} else {
				const updateUser = await User.updateOne({twitchId: profile.id}, {
					lastLogin: new Date().toISOString(),
					displayName: profile.displayName,
					profileImageUrl: profile.profileImageUrl,
					broadcasterType: profile.broadcaster_type,
					twitchChatColour: await fetchTwitchChatColour(profile.id)
				});
				console.log(updateUser);
				return done(null, user);
			}
		} else {
			console.log(`No user found with twitchId ${profile.id}`);
			return done(null, false);
		}
	} catch (error) {
		// console.error("MongoDB connection error:", error);
		return done(error, false);
	// } finally {
	// 	await mongoose.connection.close();
	}
}));
passport.serializeUser(function(user, done) { done(null, user) });
passport.deserializeUser(function(user, done) { done(null, user.doc) });
app.use(passport.initialize());
app.use(passport.session());

// Import helper functions
const { checkAuthenticated, generateGameCode, createErrorHTML, fetchTwitchChatColour } = require("./helpers");

// Socket.io listening
io.on('connection', (socket) => {
	// console.log('a user connected');
	socket.on('disconnect', () => {
		// console.log('user disconnected');
	});
	socket.on('chat message', (msg, user) => {
		msg = prepUserMessage(msg, user);
		console.log('message: ' + msg);
		io.emit('chat message', msg);
	});
	socket.on('player joined', async (gameCode, user) => {
		// console.log(gameCode, user.displayName);
		console.log(user.displayName + " has joined game " + gameCode);

		// Update user's inGame status to the game code
		await User.updateOne({twitchId: user.twitchId}, {inGame: gameCode});

		io.emit('player joined', gameCode, user);
	});
});

function prepUserMessage(msg, user){
	const colour = user.customChatColour;
	const username = user.displayName;
	const prefix = "<span style='color: " + colour + "'>" + username + "</span>";
	return `${prefix}: ${msg}`
}

// Routes
app.use("/", require("./routes/index"));
app.use("/admin", require("./routes/admin"));
app.use("/auth", require("./routes/auth"));
app.use("/game", require("./routes/game"));
	
app.route("/exampleAjaxPOST")
	.post(function(req, res){
		setTimeout(function(){
			res.send({status: "success", content: "POST successful"});
		}, 500); // 500ms delay to accommodate bootstrap .collapse() - plus it looks cooler this way
	});

// Fire up the server
server.listen(3000, function(){
	console.log("Server listening on http://localhost:3000");
});