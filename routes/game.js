const express = require("express");
const router = express.Router();
const { checkAuthenticated, generateGameCode, createErrorHTML } = require("../helpers");

// Pull in socket.io
const io = require('../app');

const Game = require("../models/gameModel.js");
const User = require("../models/userModel.js");

router.get("/audience", checkAuthenticated, (req, res) => {
	const failureMessage = req.flash("error")[0]; // Retrieve the flash message
	const successMessage = req.flash("success")[0]; // Retrieve the flash message

	res.render("game/audience", {user: req.user, failureMessage, successMessage});
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
			select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame',
			foreignField: 'twitchId',
		});

		// Redirect the user if the game doesn't exist
		if (!game) {
			req.flash("error", "Game not found!");
			res.redirect("join");
			return;
		}

		// Check to see if the user joining the game is one of the players
		for (let team of game.teams) {
			for (let player of team.players) {
				if (player.twitchId == user.twitchId) {
					// req.flash("success", "You have joined the game!");

					// Update the session to include the game code
					req.session.passport.user.doc = {
						...req.session.passport.user.doc,
						inGame: gameCode,
						game
					};
					// req.session.save();
					try {
						await saveSession(req);
					} catch (err) {
						console.log('Error saving session for ' + req.user + ':', err);
					}

					// Update the database to include game info in the User
					try {await User.updateOne({twitchId: user.twitchId}, {inGame: gameCode, game})}
					catch (error) {console.error(error)}

					// Update listening frontend pages
					io.emit("player joined", gameCode, user);
				
					return res.redirect("waiting-room");
				}
			}
		}

		req.flash("info", "Welcome to the audience for game " + gameCode + "!");
		res.redirect("audience");
		return;
	} catch (error) {
		console.error(error);
		req.flash("error", "Something went wrong!");
		res.redirect("join");
		return;
	}
});

router.get("/waiting-room", checkAuthenticated, (req, res) => {
	const failureMessage = req.flash("error")[0]; // Retrieve the flash message
	const successMessage = req.flash("success")[0]; // Retrieve the flash message

	res.render("game/waiting-room", {user: req.user, failureMessage, successMessage});
})

module.exports = router;