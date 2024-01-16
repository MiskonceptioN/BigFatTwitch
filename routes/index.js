const express = require("express");
const router = express.Router();
const { checkAuthenticated } = require("../helpers");

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

module.exports = router;