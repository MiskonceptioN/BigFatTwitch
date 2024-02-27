const express = require("express");
const router = express.Router();
const { checkAuthenticated } = require("../helpers");

// Pull in socket.io
const io = require('../app');

const Game = require("../models/gameModel.js");
const User = require("../models/userModel.js");
const Question = require("../models/questionModel.js");

router.get("/", checkAuthenticated, (req, res) => {
	const failureMessage = req.flash("error")[0]; // Retrieve the flash message
	const successMessage = req.flash("success")[0]; // Retrieve the flash message
	if (req.user.role == "admin") {res.render("admin", {user: req.user, failureMessage, successMessage})}
	else {res.render("game", {user: req.user, failureMessage, successMessage})}
});

router.get("/debug", async (req, res) => {
	const questions = await Question.find({});

	res.render("debug", {user: req.user, questions})
})
.post("/debug", checkAuthenticated, async function(req, res){
	// Sanitise inputs (later)
	console.log(req.body);
	if (req.body.sendQuestion) {
		setTimeout(function(){
			console.log("Sending next question...");
			io.emit("next question", req.body.sendQuestion, req.body.questionId);
			io.emit("update question", req.body.sendQuestion);
			res.send({status: "success", content: "POST successful"});
		}, 500); // 500ms delay to accommodate bootstrap .collapse() - plus it looks cooler this way
	}
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
	// If the user is ingame, remove them from the game
	if (req.user.inGame) {

		// Backend: Remove ingame status from DB
		try {await User.updateOne({twitchId: req.user.twitchId}, {inGame: ""})}
		catch (error) {console.error(error)}

		// Frontend: Update ingame status in session
		await io.emit('player left', req.user.inGame, req.user);
	}
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