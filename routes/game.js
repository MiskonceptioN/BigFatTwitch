const express = require("express");
const router = express.Router();
const { checkAuthenticated, generateGameCode, createErrorHTML, saveSession, fetchFromAPI, fetchChatLog } = require("../helpers");

// Pull in socket.io
const io = require('../app');

const Game = require("../models/gameModel.js");
const User = require("../models/userModel.js");
const Answer = require("../models/answerModel.js");

router.get("/audience", checkAuthenticated, (req, res) => {
	const failureMessage = req.flash("error")[0]; // Retrieve the flash message
	const successMessage = req.flash("success")[0]; // Retrieve the flash message

	res.render("game/audience", {user: req.user, failureMessage, successMessage});
});

router.get("/in-game", checkAuthenticated, async (req, res) => {
	const failureMessage = req.flash("error")[0]; // Retrieve the flash message
	const successMessage = req.flash("success")[0]; // Retrieve the flash message

	if (req.user.inGame === "" || !req.user.inGame || req.user.inGame === undefined) {
		req.flash("error", "You're not in a game!");
		return res.redirect("/");
	}

	const gameCode = req.user.inGame;

	// Check if the game is in progress
	try {
		const game = await Game.findOne({ code: req.user.inGame, status: "in-progress" });
		if (!game) {
			req.flash("error", "The game has not started yet!");
			return res.redirect("/game/waiting-room");
		}
	} catch (error) {
		console.error(error);
		req.flash("error", "Something went wrong!");
		return res.redirect("/game/waiting-room");
	}

	// Set the current question
	let currentQuestion = "";
	try {
		const domain = req.protocol + "://" + req.get("host");
		const questionEndpoint = domain + "/obs/question";
		
		currentQuestion = await fetchFromAPI(questionEndpoint);
	} catch (error) {
		console.error(error);
	}

	const chatLog = [];
	try {
		chatLog.push(...await fetchChatLog(gameCode, req.user.teamId));
	} catch (error) {
		console.error("Error fetching chat log:", error);
	}

	res.render("game/in-game", {user: req.user, failureMessage, successMessage, currentQuestion, chatLog});
})
.post("/in-game", checkAuthenticated, async (req, res) => {
	// Insert answer into the answers table using the question ID
	const user = req.user;
	const answer = req.body.answerField;
	const questionId = req.body.questionId;

	try {
		// Add the user's answer into Game
		const addAnswer = await Answer.findOneAndUpdate(
			{
				questionId,
				game: user.inGame,
				contestant: user.twitchId
			},
			{ answer },
			{ 
				new: true, 
				upsert: true,
			}
		);

		if (addAnswer.answer !== answer) {
			console.error("Answers do not match", addAnswer);
			return res.send({
				status: "danger",
				content: "Something went wrong! Please let Danny know."
			});
		} else {
			// Add the player's answer to the User in the database
			try {await User.updateOne({twitchId: user.twitchId}, {answer: answer})}
			catch (error) {console.error(error)}

			return res.send({
				status: "success",
				content: "Answer submitted!"
			});
		}
	} catch (error) {
		console.error(error);
		return res.send({
			status: "danger",
			content: "Something went wrong! Please let Danny know."
		});
	}
});


router.get("/join", checkAuthenticated, (req, res) => {
	const failureMessage = req.flash("error")[0]; // Retrieve the flash message
	const successMessage = req.flash("success")[0]; // Retrieve the flash message

	res.render("game/join", {user: req.user, failureMessage, successMessage});
})
.post("/join", checkAuthenticated, async (req, res) => {
	const gameCode = req.body.gameCode.toUpperCase();
	const user = req.user;

	try {
		// Check if a game with that ID exists
		const game = await Game.findOne({code: gameCode}).populate({
			path: 'teams.players',
			model: User,
			// select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame bio',
			foreignField: 'twitchId',
		});

		// Redirect the user if the game doesn't exist
		if (!game) {
			req.flash("error", "Game not found!");
			return res.redirect("join");
		}

		// Check to see if the user joining the game is one of the players
		// for (let team of game.teams) {
		for (let i = 0; i < game.teams.length; i++) {
			const team = game.teams[i];
			// for (let player of team.players) {
			for (let j = 0; j < team.players.length; j++) {
				if (team.players[j].twitchId == user.twitchId) {
					// If current player in for loop is the first player in the team, set the teammate to the second player
					const teammate = team.players[j == 0 ? 1 : 0];

					// req.session.passport.user.doc = {
					// 	...req.session.passport.user.doc,
					// 	teammate: teammate
					// };


					// Update the session to include the game code
					req.session.passport.user.doc = {
						...req.session.passport.user.doc,
						inGame: gameCode,
						teammate,
						teamId: team._id,
						teamIndex: i,
					};
					try {await saveSession(req)}
					catch (err) {console.error('Error saving session for user ' + (req.user.displayName || req.user.twitchId) + ':', err)}

					// Update the database to include game info in the User
					try {await User.updateOne({twitchId: user.twitchId}, {inGame: gameCode, game, loggedOutOf: ""})}
					catch (error) {console.error(error)}

					// Update listening frontend pages
					io.emit("player joined", gameCode, user);
				
					return res.redirect("waiting-room");
				}
			}
		}

		req.flash("error", "Sadly, you're not a player in this game, but you can watch the fun on Twitch!");
		try {
			await saveSession(req);
		} catch (err) {
			console.error('Error saving session for user ' + (req.user.displayName || req.user.twitchId) + ':', err);
		}
		return res.redirect("/");
	} catch (error) {
		console.error(error);
		req.flash("error", "Something went wrong!");
		return res.redirect("join");
	}
});

router.get("/ltfo", checkAuthenticated, (req, res) => {
	req.flash("error", "You've been kicked from the game!");
	// Update the session to remove the game code
	req.session.passport.user.doc = {
		...req.session.passport.user.doc,
		inGame: ""
	};

	res.redirect("/");
})

router.get("/waiting-room", checkAuthenticated, async (req, res) => {
	const failureMessage = req.flash("error")[0]; // Retrieve the flash message
	const successMessage = req.flash("success")[0]; // Retrieve the flash message
	let isContestant = false;

	// Check user has inGame in their user object
	if (!req.user.inGame) {
		req.flash("error", "You're not in a game!");
		return res.redirect("join");
	}
	const gameCode = req.user.inGame;

	// Check logged in user is a player
	let game = {};
	try {
		game = await Game.findOne({code: gameCode}).populate({
			path: 'teams.players',
			model: User,
			// select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame bio',
			foreignField: 'twitchId',
		});
	} catch (error) {
		console.error("Error finding game:", error);
		req.flash("error", "Unable to find game " + gameCode);
		return res.redirect("join");
	}

	// Redirect the user if the game doesn't exist
	if (!game) {
		req.flash("error", "Game not found!");
		return res.redirect("join");
	}

	const chatLog = [];
	try {
		chatLog.push(...await fetchChatLog(gameCode, req.user.teamId));
	} catch (error) {
		console.error("Error fetching chat log:", error);
	}

	// Check to see if the user joining the game is one of the players
	for (let team of game.teams) {
		for (let player of team.players) {
			if (player.twitchId == req.user.twitchId) {
				isContestant = true;

				// Update the session to include the game code
				req.session.passport.user.doc = {
					...req.session.passport.user.doc,
					inGame: req.user.inGame
				};
				
				try {
					await saveSession(req);
					return res.render("game/waiting-room", {user: req.user, game, failureMessage, successMessage, chatLog});
				} catch (err) {
					return res.render("game/waiting-room", {user: req.user, game, failureMessage, successMessage, chatLog});
				}
			}
		}
	}

	if (!isContestant) {
		return res.redirect("/");
	}
})

module.exports = router;