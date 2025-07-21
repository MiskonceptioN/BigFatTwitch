// Requirements
require ("dotenv").config();
const express = require("express");
const session = require('express-session')
const flash = require("express-flash");
const { createServer} = require("node:http");
const bodyParser = require("body-parser");
const axios = require("axios").default;
const { Server } = require("socket.io");
const passport = require("passport");
const twitchStrategy = require("passport-twitch-v2").Strategy;

// Expose socket.io to the rest of the app
const app = express();
const server = createServer(app);
const io = new Server(server, {connectionStateRecovery: {}});
module.exports = io;

// Mongo
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
// Prod
const mongoUri = "mongodb+srv://" + process.env.MONGODB_USER + ":" + process.env.MONGODB_PASS + "@" + process.env.MONGODB_URL + "/gameshow?retryWrites=true&w=majority";
// Dev
// const mongoUri = `mongodb://${process.env.MONGODB_URL}/gameshow?retryWrites=true&w=majority`;
const Game = require("./models/gameModel.js");
const User = require("./models/userModel.js");
const ChatLog = require("./models/chatLogModel.js");
try {mongoose.connect(mongoUri)}
catch (error) {console.error("Error connecting to MongoDB:", error)}
const db = mongoose.connection;

// Import helper functions
const { fetchTwitchChatColour, prepUserMessage } = require("./helpers");

// App config
app.set("view engine", "ejs");
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
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
				return done(null, false);
			} 
			if (user.doc.inGame) {
				// User is already in a game
				try {
					// Check if a game with that ID exists
					const game = await Game.findOne({code: user.doc.inGame}).populate({
						path: 'teams.players',
						model: User,
						// select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame',
						foreignField: 'twitchId',
					});
			
					// Redirect the user if the game doesn't exist
					if (!game) {
						return done(null, user);
					}
			
					// Check to see if the user joining the game is one of the players
					for (let i = 0; i < game.teams.length; i++) {
						const team = game.teams[i];
						for (let j = 0; j < team.players.length; j++) {
							if (team.players[j].twitchId == user.doc.twitchId) {
								// If current player in for loop is the first player in the team, set the teammate to the second player
								const teammate = team.players[j == 0 ? 1 : 0];

								// Update the user document to include the teammate info
								user.doc = {
									...user.doc._doc,
									teammate,
									teamId: team._id,
									teamIndex: i,
								};
							}
						}
					}
				} catch (error) {
					console.error(error);
					return done(null, user);
				}
			}

			const updateUser = await User.updateOne({twitchId: profile.id}, {
				lastLogin: new Date().toISOString(),
				displayName: profile.displayName,
				profileImageUrl: profile.profileImageUrl,
				broadcasterType: profile.broadcaster_type,
				twitchChatColour: await fetchTwitchChatColour(profile.id)
			});

			return done(null, user);
		} else {
			console.log(`No user found with twitchId ${profile.id}`);
			return done(null, false);
		}
	} catch (error) {
		return done(error, false);
	}
}));
passport.serializeUser(function(user, done) {
	try {
		if (!user) throw new Error("User not found during serialization");
		done(null, user);
	} catch (error) {
		done(error);
	}
});
passport.deserializeUser(function(user, done) {
	try {
		if (!user || !user.doc) throw new Error("User or user.doc not found");
		done(null, user.doc);
	} catch (error) {
		done(error);
	}
});
app.use(passport.initialize());
app.use(passport.session());

// Socket.io listening
io.on('connection', async (socket) => {
	try {
		// Check if the user is admin or player
		const role = socket.handshake.query.role;
		const teamId = socket.handshake.query.teamId;

		// Join the room corresponding to the team ID
		(role === "admin") ? socket.join("admin") : socket.join(teamId);

		socket.on('chat message', async (msg, user) => {
			const preppedMsg = prepUserMessage(msg, user);
			const room = user.teamId;

			// Send the message to the correct team, and also to the admin
			io.to(room).emit('chat message', preppedMsg);
			io.to("admin").emit('chat message', preppedMsg, room);

			// Save the message to the database for audit purposes
			try {
				const updateUser = await ChatLog.create({
					gameId: user.inGame,
					userId: user.twitchId,
					message: msg,
					room,
				});
			} catch (error) {
				console.error("Unable to save chat message to DB:", error);
			}
		});
		socket.on('admin chat message', async (msg, user, target) => {
			const preppedMsg = prepUserMessage(msg, user);

			if (typeof target === "string") { target = [target] }
				
			target.forEach(async (team) => {
				io.to(team).emit('chat message', preppedMsg);
				io.to("admin").emit('chat message', preppedMsg, team);

				// Save the message to the database for audit purposes
				try {
					const updateUser = await ChatLog.create({
						gameId: user.inGame,
						userId: user.twitchId,
						message: msg,
						room: team,
					});
					console.log({updateUser})
				} catch (error) {
					console.error("Unable to save chat message to DB:", error);
				}
			});

		});
		socket.on('player joined', async (gameCode, user) => {
			// console.log(gameCode, user.displayName);
			console.log(user.displayName + " has joined game " + gameCode);

			try {
				// Update user's inGame status to the game code
				await User.updateOne({twitchId: user.twitchId}, {inGame: gameCode});
			} catch (error) {
				console.error("Error updating " + user.displayName + "'s inGame status:", error);
			}

			io.emit('player joined', gameCode, user);
		});
		socket.on('start game', async (gameCode) => {
			console.log("Starting game " + gameCode);
			io.emit('start game', gameCode);
		});
		socket.on('update canvas', (canvasData, userID) => {
			io.emit('update canvas', canvasData, userID);
		});
		socket.on('block points', (pointFormID, userID) => {
			io.emit('block points', pointFormID, userID);
		});
		socket.on('unblock points', (pointFormID, userID) => {
			io.emit('unblock points', pointFormID, userID);
		});
		socket.on('update points', (pointFormID, points, userID) => {
			io.emit('update points', pointFormID, points, userID);
		});
		socket.on("editing team name", (teamId, state) => {
			io.emit("editing team name", teamId, state);
		});
		socket.on("change team name", async (newName, teamId, gameCode) => {
			if (!newName || !teamId || !gameCode) {
				console.error("Missing parameters for change team name");
				console.log({newName, teamId, gameCode});
				return;
			}

			try {
				const updateTeam = await Game.updateOne(
					{ code: gameCode, "teams._id": teamId },
					{ $set: { "teams.$.name": newName } }
				);

				if (updateTeam.matchedCount === 0) { return console.error("No game found with the provided game code") }
				if (updateTeam.modifiedCount === 0) { return console.error("No team found with the provided team ID") }

				console.log("Team name updated successfully:", teamId, newName);
			} catch (error) {
				console.error("Unable to update the team name:", teamId, newName, error);
			}
			io.emit("update team name", newName, teamId);
		});
		socket.on("show interstitial", (state, heading="", subheading="") => {
			io.emit("show interstitial", state, heading, subheading);
		});
		socket.on("show point interstitial", async (uniformSelfLocator) => {
			try {
				const team1name = await axios.get(uniformSelfLocator + "/obs/teams/1/name");
				const team1points = await axios.get(uniformSelfLocator + "/obs/teams/1/points");
				const team2name = await axios.get(uniformSelfLocator + "/obs/teams/2/name");
				const team2points = await axios.get(uniformSelfLocator + "/obs/teams/2/points");
				const team3name = await axios.get(uniformSelfLocator + "/obs/teams/3/name");
				const team3points = await axios.get(uniformSelfLocator + "/obs/teams/3/points");

				const pointsData = [
					{name: team1name.data, points: team1points.data},
					{name: team2name.data, points: team2points.data},
					{name: team3name.data, points: team3points.data}
				];
				var sortedPoints = pointsData.sort((a, b) => b.points-a.points);

				io.emit("show point interstitial", 
					sortedPoints[0].name, sortedPoints[0].points,
					sortedPoints[1].name, sortedPoints[1].points,
					sortedPoints[2].name, sortedPoints[2].points, 
				);

			} catch (error) {
				console.error("Error fetching team data:", error);
			}
		});
		socket.on("next question", (questionText, questionId) => {
			io.emit("next question", questionText, questionId);
		});
		socket.on("update answer", async (imageData, playerId) => {
			try {
				updateUser = await User.updateOne(
					{ twitchId: playerId },
					{ $set: {"answer": imageData }}
				)
				if (updateUser.matchedCount === 0) { throw new Error("No user found"); }
				if (updateUser.modifiedCount === 0) { throw new Error("User found but answer was not updated") }
			} catch (error) {
				console.error("Error updating answer for player " + playerId, error);
				return;
			}
			io.emit("update answer", imageData, playerId);
		});
	} catch (error) {
		console.error("Socket.io connection error:", error);
	}
});

// Routes
app.use("/", require("./routes/index"));
app.use("/admin", require("./routes/admin"));
app.use("/auth", require("./routes/auth"));
app.use("/game", require("./routes/game"));
app.use("/obs", require("./routes/obs"));
	
app.route("/exampleAjaxPOST")
	.post(function(req, res){
		setTimeout(function(){
			res.send({status: "success", content: "POST successful"});
		}, 500); // 500ms delay to accommodate bootstrap .collapse() - plus it looks cooler this way
	});

// Fire up the server
const PORT = process.env.PORT || 3000;
const HOST = (PORT == 3000) ? "http://localhost" : "https://gameshow.dannyvalz.com";
server.listen(PORT, function(){
	console.log(`Server listening on ${HOST}:${PORT}`);
});