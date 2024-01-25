const express = require("express");
const router = express.Router();
const { checkAuthenticated } = require("../helpers");

const User = require("../models/userModel.js");

router.get("/", checkAuthenticated, (req, res) => {
	if (req.user.role == "admin") {res.render("admin", {user: req.user})}
	else {res.render("game", {user: req.user})}
});

router.get("/game", checkAuthenticated, (req, res) => {
	res.render("game", {user: req.user});
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
	const chatColour = req.body.chat_color;
	const bio = req.body.bio;
	const showBroadcasterType = (req.body["show-broadcaster-type"]) ? true : false;

	console.log({userID, chatColour, bio, showBroadcasterType});

	// if (req.user.role == "admin") {
		// const newBanState = (req.body.banstate === "false") ? 1 : 0;


		try {
			const result = await User.updateOne({ _id: userID }, {
				bio: bio,
				chatColour: chatColour,
				showBroadcasterType: showBroadcasterType
			});
			res.send({status: "success", content: "Preferences updated"});
			console.log(req.session.passport.user.doc);
			req.session.passport.user.doc = {
				...req.session.passport.user.doc, 
				bio,
				chatColour,
				showBroadcasterType
			};
			// req.session.passport.user.doc.bio="replaced manually";
			req.session.save();

			// console.log(result);
		} catch (error) {
			res.send({status: "danger", content: "Shit is fucked yo"});
			console.error(error);
		}
		console.log(req.session.passport.user);

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