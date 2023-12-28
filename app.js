// Requirements
require ("dotenv").config();
const express = require("express");
// const session = require('express-session')
const { createServer} = require("node:http");
const bodyParser = require("body-parser");
const axios = require("axios").default;
const fs = require("fs");
const { Server } = require("socket.io");

const passport = require("passport");
const twitchStrategy = require("passport-twitch").Strategy;
const app = express();
const server = createServer(app);
const io = new Server(server, {
	connectionStateRecovery: {}
});

// App config
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(express.static("public"));

// Passport
// app.use(passport.initialize());
// app.use(passport.session());
passport.use(new twitchStrategy({
	clientID: process.env.TWITCH_CLIENT_ID,
	clientSecret: process.env.TWITCH_CLIENT_SECRET,
	callbackURL: process.env.TWITCH_CALLBACK_URL,
	// scope: "user_read"
},
	function(accessToken, refreshToken, profile, done) {
		console.log({profile});
		return done();
	// User.findOrCreate({ twitchId: profile.id }, function (err, user) {
	// 	return done(err, user);
	// });
}
));
app.get("/auth/twitch", passport.authenticate("twitch"));
app.get("/auth/twitch/callback", passport.authenticate("twitch", { failureRedirect: "/" }), function(req, res) {
	// Successful authentication, redirect home.
	res.redirect("/loggedin");
});


// Socket.io listening
io.on('connection', (socket) => {
	console.log('a user connected');
	socket.on('disconnect', () => {
		console.log('user disconnected');
	});
	socket.on('chat message', (msg) => {
		console.log('message: ' + msg);
		io.emit('chat message', msg);
	});
});


// Routes
app.route("/")
	.get(function(req, res){
		res.render("index");
	});

app.route("/game")
	.get(function(req, res){
		res.render("game");
	});

app.route("/login")
	.get(function(req, res){
		res.render("login");
	});

app.route("/logout")
	.get(function(req, res){
		req.logout(function(err) {
			if (err) { return next(err); }
			res.redirect('/');
		  });
	});

app.route("/secure", passport.authenticate("twitch"), {
	failureRedirect: '/login',
	failureMessage: true
}).get(function(req, res){
	res.render("secure", {user: "Blop"});
});



app.route("/exampleAjaxPOST")
	.post(function(req, res){
		setTimeout(function(){
			res.send({status: "success", content: "POST successful"});
		}, 500); // 500ms delay to accommodate boostrap .collapse() - plus it looks cooler this way
	});

// Fire up the server
server.listen(3000, function(){
	console.log("Server listening on http://localhost:3000");
});
