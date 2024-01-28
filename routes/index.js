const express = require("express");
const router = express.Router();
const { checkAuthenticated } = require("../helpers");

const Game = require("../models/gameModel.js");
const User = require("../models/userModel.js");

router.get("/", checkAuthenticated, (req, res) => {
	const failureMessage = req.flash("error")[0]; // Retrieve the flash message
	const successMessage = req.flash("success")[0]; // Retrieve the flash message
	if (req.user.role == "admin") {res.render("admin", {user: req.user, failureMessage, successMessage})}
	else {res.render("game", {user: req.user, failureMessage, successMessage})}
});

router.get("/game", checkAuthenticated, (req, res) => {
	const failureMessage = req.flash("error")[0]; // Retrieve the flash message
	const successMessage = req.flash("success")[0]; // Retrieve the flash message
	res.render("game", {user: req.user, failureMessage, successMessage});
});

router.get("/joingame", checkAuthenticated, (req, res) => {
	const failureMessage = req.flash("error")[0]; // Retrieve the flash message
	const successMessage = req.flash("success")[0]; // Retrieve the flash message

	res.render("join", {user: req.user, failureMessage, successMessage});
})
.post("/joingame", checkAuthenticated, async (req, res) => {
	const gameCode = req.body.gameCode;
	const userID = req.user._id;

	// console.log({gameCode, userID});

	try {
		const game = await Game.findOne({code: gameCode});
		if (game) {
			// send a message via socket.io to say the player has joined
			io.emit("player joined", {gameCode, userID});
			req.flash("success", "Joined game!");
			res.redirect("/joingame");

			// const player = await Player.findOne({game: game._id, user: userID});
			// if (player) {
			// 	req.flash("error", "You're already in this game!");
			// 	res.redirect("/joingame");
			// } else {
			// 	const newPlayer = new Player({
			// 		game: game._id,
			// 		user: userID,
			// 		role: "player",
			// 		alive: true,
			// 		deadAt: null,
			// 		joinedAt: Date.now()
			// 	});

			// 	const result = await newPlayer.save();
			// 	req.flash("success", "You've joined the game!");
			// 	res.redirect("/");
			// }
		} else {
			req.flash("error", "Game not found!");
			res.redirect("/joingame");
		}
	} catch (error) {
		console.error(error);
		req.flash("error", "Something went wrong!");
		res.redirect("/joingame");
	}
});

router.get("/login", (req, res) => {
	const failureMessage = req.flash("error")[0]; // Retrieve the flash message
	  
	if (req.isAuthenticated()) { res.redirect('/') } else {
		res.render("login", { failureMessage });
	}
});

router.get("/logout", (req, res) => {
	req.logout(function(err) {
		if (err) { return next(err); }
		res.redirect('/');
	  });
});

router.get("/profile", checkAuthenticated, function(req, res){
	res.render("profile", {user: req.user});
});

router.get("/settings", checkAuthenticated, function(req, res){
	res.render("settings", {user: req.user});
}).
post("/settings", checkAuthenticated, async function(req, res){
	// Sanitise inputs (later)
	const userID = req.body.userID;
	const chatColour = req.body.chat_colour;
	const customChatColour = req.body.custom_colour;
	const bio = req.body.bio;
	const showBroadcasterType = (req.body["show-broadcaster-type"]) ? true : false;

	// console.log({userID, chatColour, customChatColour, bio, showBroadcasterType});

	// if (req.user.role == "admin") {
		// const newBanState = (req.body.banstate === "false") ? 1 : 0;


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
			// req.session.passport.user.doc.bio="replaced manually";
			req.session.save();

			// console.log(result);
		} catch (error) {
			res.send({status: "danger", content: "Shit is fucked yo"});
			console.error(error);
		}

		// if (result.matchedCount !== 1) {
		// 	res.send({status: "danger", content: "User with ID " + userID + " not found!"});
		// }
		
		// // if (result.modifiedCount == 0) {
		// 	res.send({status: "success", content: JSON.stringify(req.body, 4)});
		// } else {
			// res.send({status: "failure", content: createErrorHTML(errors)});
			// }
		// res.redirect("/admin/users")
	// } else {
		// res.redirect("/login")
	// }
});

module.exports = router;