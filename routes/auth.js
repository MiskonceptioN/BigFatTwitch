const express = require("express");
const router = express.Router();
const passport = require("passport");

router.get("/twitch", passport.authenticate("twitch"));
router.get('/twitch/callback', passport.authenticate("twitch", {
		failureRedirect: "/login",
		failureFlash: "Unable to log in"
	}),
	function (req, res) {
		// Successful authentication, redirect to a different route
		res.redirect("/profile");
	}
	);

module.exports = router;