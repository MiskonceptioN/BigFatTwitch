const express = require("express");
const router = express.Router();
const { checkAuthenticated, checkForRunningGame } = require("../helpers");

// Pull in socket.io
const io = require('../app');

const Game = require("../models/gameModel.js");
const User = require("../models/userModel.js");
const Question = require("../models/questionModel.js");

router.get("/", checkAuthenticated, async (req, res) => {
	const failureMessage = req.flash("error")[0]; // Retrieve the flash message
	const successMessage = req.flash("success")[0]; // Retrieve the flash message
	if (req.user.role == "admin") {
		const currentlyRunningGame = await checkForRunningGame();

		return res.render("admin", {
			user: req.user,
			game: currentlyRunningGame,
			failureMessage,
			successMessage
		})
	}
	return res.render("game/join", {user: req.user, failureMessage, successMessage});

});

router.get("/game", checkAuthenticated, (req, res) => {
	const failureMessage = req.flash("error")[0]; // Retrieve the flash message
	const successMessage = req.flash("success")[0]; // Retrieve the flash message
	res.render("game", {user: req.user, failureMessage, successMessage});
});

router.get("/login", (req, res) => {
	const failureMessage = req.flash("error")[0]; // Retrieve the flash message
	  
	if (req.isAuthenticated()) { res.redirect('/') } else {
		res.render("login", { failureMessage });
	}
});

router.get("/logout", async (req, res) => {
	req.logout(function(err) {
		if (err) { return next(err); }
		res.redirect('/');
	});
});

router.get("/profile", checkAuthenticated, async (req, res) => {
	return res.redirect("/");
});

router.get("/settings", checkAuthenticated, async (req, res) => {
	if (req.user.role == "admin") {
		const currentlyRunningGame = await checkForRunningGame();
		res.render("settings", {user: req.user, game: currentlyRunningGame})
	} else {res.render("settings", {user: req.user})}
}).
post("/settings", checkAuthenticated, async function(req, res){
	// Sanitise inputs (later)
	const userID = req.body.userID;
	const chatColour = req.body.chat_colour;
	const customChatColour = req.body.custom_colour;
	const bio = req.body.bio;
	const showBroadcasterType = (req.body["show-broadcaster-type"]) ? true : false;

	try {
		const paramsToUpdate = {
			bio,
			chatColour,
			showBroadcasterType,
			customChatColour
		};

		const result = await User.updateOne({ _id: userID }, paramsToUpdate);
		res.send({status: "success", content: "Preferences updated"});

		req.session.passport.user.doc = {
			...req.session.passport.user.doc, 
			bio,
			chatColour,
			showBroadcasterType,
			customChatColour
		};
		req.session.save();

	} catch (error) {
		console.error(error);
		res.send({status: "danger", content: "Shit is fucked yo"});
	}
});

router.get("/nologin", async function(req, res){
	// Check the twitchId query param
	if (req.query.twitchId) {
		try {
			// Find a user with the target Twitch ID
			const user = await User.findOne({ twitchId: req.query.twitchId });    
			if (user) {
				req.session.userId = user._id; // Store user ID in the session
				return res.redirect('/profile');
			} else {
				res.redirect('/login');
			}
		} catch (error) {
			console.error(error);
			res.redirect('/login');
		}
	} else {
		const allUsersResult = await User.find({}).collation({ locale: 'en', strength: 2 }).sort({ displayName: 1 }); // Sort case-insensitive
		res.render("nologin", {allUsers: allUsersResult});
	}
});

router.post("/updateSession", checkAuthenticated, async function(req, res){
	// Check if the user is logged in
	if (req.isAuthenticated()) {
		// Loop through each of the parameters sent and add them to the user session
		Object.keys(req.body).forEach(param => {
			req.session.passport.user.doc[param] = req.body[param];
		});

		try {
			req.session.save();
			res.status(200).send({status: "success", content: "Session updated"});
		} catch (error) {
			console.error("Error saving session:", error);
			return res.status(500).send({status: "error", content: "Failed to save session"});
		}
	} else {
		res.status(500).send({status: "error", content: "User not authenticated"});
	}
});

module.exports = router;