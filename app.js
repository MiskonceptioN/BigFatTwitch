// Requirements
require ("dotenv").config();
const express = require("express");
const session = require('express-session')
const flash = require("express-flash");
const { createServer} = require("node:http");
const bodyParser = require("body-parser");
const axios = require("axios").default;
const fs = require("fs");
const { Server } = require("socket.io");
const passport = require("passport");
const twitchStrategy = require("passport-twitch").Strategy;
const app = express();
const server = createServer(app);
const io = new Server(server, {connectionStateRecovery: {}});

// Mongo
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const mongoUri = "mongodb+srv://" + process.env.MONGODB_USER + ":" + process.env.MONGODB_PASS + "@" + process.env.MONGODB_URL + "/gameshow?retryWrites=true&w=majority";
const User = require("./userModel.js"); // Assuming the model is in the same directory
mongoose.connect(mongoUri);
const db = mongoose.connection;

// App config
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
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
			profileImageUrl: profile.profileImageUrl
		});

		if (user) {
			if (user.doc.banned) {
				// return done(null, false, {message: "Blip blip blorp"});
				return done(null, false);
			} else {
				return done(null, user);
			}
		} else {
			console.log(`No user found with twitchId ${profile.id}`);
			return done(null, false);
		}
	} catch (error) {
		// console.error("MongoDB connection error:", error);
		return done(error, false);
	// } finally {
	// 	await mongoose.connection.close();
	}
}));
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, done) { done(null, user) });
passport.deserializeUser(function(user, done) { done(null, user.doc) });
app.use(passport.initialize());
app.use(passport.session());

// Helper functions
const checkAuthenticated = (req, res, next) => {
	if (req.isAuthenticated()) { return next() }
	res.redirect("/login")
}

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
	.get(checkAuthenticated, function(req, res){
		if (req.user.role == "admin") {
			res.render("admin", {user: req.user});
		} else {
			res.render("index", {user: req.user});
		}
	});

	app.route("/admin/users")
	.get(checkAuthenticated, async function(req, res){
		if (req.user.role == "admin") {
			const failureMessage = req.flash("error")[0]; // Retrieve the flash message
			const successMessage = req.flash("success")[0]; // Retrieve the flash message
			const allUsersResult = await User.find({}).sort({displayName: "asc"});
			res.render("admin_users", {user: req.user, allUsers: allUsersResult,  failureMessage, successMessage });
		} else {
			res.redirect("/login")
		}
	});

	app.route("/admin/users/ban/:targetTwitchId")
	.post(checkAuthenticated, async function(req, res){
		if (req.user.role == "admin") {
			const newBanState = (req.body.banstate === "false") ? 1 : 0;

			// ban the user
			const result = await User.updateOne({ twitchId: req.body.targetTwitchId }, { banned: newBanState });
			console.log(result);
			
			if (result.modifiedCount == 0) {
				req.flash("error", "Unable to update the ban state of " + req.body.targetTwitchDisplayName);
			} else {
				req.flash("success", "Updated the ban state of " + req.body.targetTwitchDisplayName);
			}
			res.redirect("/admin/users")
		} else {
			res.redirect("/login")
		}
	});

app.route("/game")
	.get(checkAuthenticated, function(req, res){
		res.render("game");
	});

app.route("/login")
	.get(function(req, res, next){
		const failureMessage = req.flash("error")[0]; // Retrieve the flash message
	  
		if (req.isAuthenticated()) { res.redirect('/') } else {
			res.render("login", { failureMessage });
		}
	});

app.route("/logout")
	.get(function(req, res){
		req.logout(function(err) {
			if (err) { return next(err); }
			res.redirect('/');
		  });
	});

// const twitchCallback = passport.authenticate('twitch', {failureRedirect: '/login'});
const passportErrorHandler = (err, req, res, next) => {
	// Here you can handle passport errors
	console.error(`Passport error: ${err.message}`);
	res.redirect('/login');
};

app.get("/auth/twitch", passport.authenticate("twitch"));
// app.get('/auth/twitch/callback', twitchCallback, passportErrorHandler);
app.get('/auth/twitch/callback', passport.authenticate("twitch", {
	failureRedirect: "/login",
	failureFlash: "Unable to log in"
}),
function (req, res) {
  // Successful authentication, redirect to a different route
  res.redirect("/secure");
}
);

// app.get("/auth/twitch/callback", passport.authenticate("twitch", { failureRedirect: "/", failureMessage: true }), function(req, res) {
// 	// Successful authentication, redirect home.
// 	res.redirect("/loggedin");
// });


app.route("/secure").get(checkAuthenticated, function(req, res){
	res.render("secure", {user: req.user});
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