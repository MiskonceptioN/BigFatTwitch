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
const User = require("./models/userModel.js");
const Game = require("./models/gameModel.js");
const Question = require("./models/questionModel.js");
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

async function generateGameCode() {
	const chars = ["B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "V", "W", "X", "Z"];
	let gameCode = "";

	do {
		gameCode = "";
		for (let i = 0; i < 4; i++) {
			gameCode += chars[Math.floor(Math.random() * chars.length)];
		}
	} while (!(await isGameCodeUnique(gameCode)));
	
	return gameCode;
}

async function isGameCodeUnique(code) {
	const existingCode = await Game.findOne({ code: code });
	return !existingCode;
}

function createErrorHTML(errors) {
	if (errors.length === 1) return errors[0];
	return "The following errors occurred:<ul><li>" + errors.join("</li><li>") + "</li></ul>";
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

app.route("/admin/gameManagement")
	.get(checkAuthenticated, async function(req, res){
		if (req.user.role == "admin") {
			const failureMessage = req.flash("error")[0]; // Retrieve the flash message
			const successMessage = req.flash("success")[0]; // Retrieve the flash message
			const allGamesResult = await Game.find({}).sort({createdAt: "asc"});
			res.render("admin_game_management", {user: req.user, allGames: allGamesResult, failureMessage, successMessage});
		} else {
			res.redirect("/login")
		}
	})
	.post(checkAuthenticated, async function(req, res){
		if (req.user.role == "admin") {
			const gameCode = await generateGameCode();

			const result = await Game.create({code: gameCode});
			
			if (result.code) {
				req.flash("success", "Created game " + result.code);
			} else {
				req.flash("error", "Unable to create a new game");
			}
			res.redirect("/admin/gameManagement")
		} else {
			res.redirect("/login")
		}
	});

app.route("/admin/gameManagement/:gameCode")
	.get(checkAuthenticated, async function(req, res){
		if (req.user.role == "admin") {
			// Fetch the game
			const result = await Game.findOne({code: req.params.gameCode});
			if (result === null) {
				req.flash("error", "Unable find game " + req.params.gameCode);
				res.redirect("/admin/gameManagement")
			} else {
				const failureMessage = req.flash("error"); // Retrieve the flash message
				const successMessage = req.flash("success")[0]; // Retrieve the flash message
				const allQuestionsResult = await Question.find({game: req.params.gameCode})//.sort([["round", "asc"], ["order","asc"]]);

				const questionsByRound = allQuestionsResult.reduce((acc, question) => {
					const round = question.round;
					if (!acc[round]) {acc[round] = []};
					acc[round].push(question); // Push the current question to the array corresponding to its round
					return acc;
				  }, {});
				  
				res.render("admin_game_management_single_game", {user: req.user,  questionsByRound, game: result, failureMessage, successMessage});
				console.log(questionsByRound);
			}
		} else {
			res.redirect("/login")
		}
	})
	.post(async function(req, res){
		if (req.user.role == "admin") {
			let errors = [];
			// Let's do some validation!
			// if (!req.body.game) {req.flash("error", "Game is required")}
			// if (!req.body.question) {req.flash("error", "Question is required")}
			// if (!req.body.answer) {req.flash("error", "Answer is required")}
			// if (req.body.round && req.body.round < 0) {req.flash("error", "The round number must be positive")}
			// if (req.body.order && req.body.order < 0) {req.flash("error", "The order number must be positive")}
			if (!req.body.game) {errors.push("Game is required")}
			if (!req.body.question) {errors.push("Question is required")}
			if (!req.body.answer) {errors.push("Answer is required")}
			if (req.body.round && req.body.round <= 0) {errors.push("The round number must be greater than zero")}
			if (req.body.order && req.body.order <= 0) {errors.push("The order number must be greater than zero")}
			// res.redirect("/admin/gameManagement/" + req.params.gameCode);

			// Try to add the question if there are no validation errors
			console.log("errors.length is " + errors.length)
			if (errors.length === 0) {
				const result = await Question.create({
					question: req.body.question,
					answer: req.body.answer,
					type: req.body.type,
					game: req.body.game,
					round: req.body.round,
					order: req.body.order,
				});
				console.log(result);
				// if (!result._id) {
				// 	errors.push("Unable to create question due to database error");
				// } else {
				// 	console.log("Question <em>&quot;" + req.body.question + "&quot;</em> added");
				// }
			}

			setTimeout(function(){
				if (errors.length > 0) {
					res.send({status: "danger", content: createErrorHTML(errors)});
				} else {
					res.send({status: "success", content: "Question <em>&quot;" + req.body.question + "&quot;</em> added"});
				}
			}, 500); // 500ms delay to accommodate bootstrap .collapse() - plus it looks cooler this way
		} else {
			res.redirect("/login")
		}
		
		// setTimeout(function(){
		// 	res.send({status: "success", content: "POST successful"});
		// }, 500); // 500ms delay to accommodate bootstrap .collapse() - plus it looks cooler this way
	});

app.route("/admin/gameManagement/delete/:gameCode")
	.post(checkAuthenticated, async function(req, res){
		if (req.user.role == "admin") {
			// Delete the game
			const result = await Game.deleteOne({code: req.params.gameCode});
			
			if (result.deletedCount == 0) {
				req.flash("error", "Unable to delete game " + req.params.gameCode);
			} else {
				req.flash("success", "Deleted game " + req.params.gameCode);
			}
			res.redirect("/admin/gameManagement")
		} else {
			res.redirect("/login")
		}
	});

app.route("/admin/users")
	.get(checkAuthenticated, async function(req, res){
		if (req.user.role == "admin") {
			const failureMessage = req.flash("error")[0]; // Retrieve the flash message
			const successMessage = req.flash("success")[0]; // Retrieve the flash message
			const allUsersResult = await User.find({}).sort({order: "asc"});
			res.render("admin_users", {user: req.user, allUsers: allUsersResult,  failureMessage, successMessage});
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
		}, 500); // 500ms delay to accommodate bootstrap .collapse() - plus it looks cooler this way
	});

// Fire up the server
server.listen(3000, function(){
	console.log("Server listening on http://localhost:3000");
});