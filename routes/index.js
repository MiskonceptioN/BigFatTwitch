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

		res.render("admin", {
			user: req.user,
			game: currentlyRunningGame,
			failureMessage,
			successMessage
		})
	}
	else {res.render("game", {user: req.user, failureMessage, successMessage})}
});

router.get("/debug", async (req, res) => {
	const currentlyRunningGame = await checkForRunningGame();

	const questions = [];
	// const questions = await Question.find({});
	// Pull all the questions from the Game model
	// const questions = await Game.find({}).sort({createdAt: -1}).limit(1).select("questions");
	const allGames = await Game.find({});
	allGames.forEach(game => {
		game.questions.forEach(question => {
			questions.push(question);
		});
	});

	console.log(questions);

	res.render("debug", {user: req.user, game: currentlyRunningGame, questions})
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

router.get("/profile", checkAuthenticated, async (req, res) => {
	if (req.user.role == "admin") {
		const currentlyRunningGame = await checkForRunningGame();
		res.render("profile", {user: req.user, game: currentlyRunningGame})
	} else res.render("profile", {user: req.user});
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

router.get("/nologin", async function(req, res){
    // Check the twitchId query param
    if (req.query.twitchId) {
        try {
            // Find a user with the target Twitch ID
            const user = await User.findOne({ twitchId: req.query.twitchId });    
            // If the user exists
            if (user) {
                req.session.userId = user._id; // Store user ID in the session
                return res.redirect('/profile');
            } else {
                // No user found with the provided Twitch ID
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

// router.get("/nologin", async function(req, res){
// 	// Check the twitchId query param
// 	if (req.query.twitchId) {
// 		try {
//             // Find a user with the target Twitch ID
//             const user = await User.findOne({ twitchId: req.query.twitchId });	
//             // If the user exists
//             if (user) {
//                 req.login(user, function(err) {
//                     if (err) {
//                         console.log(err);
//                         return res.redirect('/login');
//                     }

//                     // Redirect the user to their dashboard or another page
//                     return res.redirect('/dashboard');
//                 });
//             } else {
//                 // No user found with the provided Twitch ID
//                 res.redirect('/login');
//             }
// 		} catch (error) {
// 			console.error(error);
// 		}
// 	} else {
// 		const allUsersResult = await User.find({}).collation({ locale: 'en', strength: 2 }).sort({ displayName: 1 }); // Sort case-insensitive
// 		res.render("nologin", {allUsers: allUsersResult});
// 	}
// });

router.get("/nologin2", async function(req, res){
	if (req.user.role == "admin") {
		try {
            // Find a user with the target Twitch ID
            const result = await User.findOne({ twitchId: req.params.targetTwitchId });	
            // If the user exists
            if (result !== null) {
                // Store the current admin user's data
                const adminUser = req.session.passport.user.doc;
                // Update the session user data with the target user's data, and add adminLogin and adminUser properties
                req.session.passport.user.doc = {...result._doc, adminLogin: true, adminUser};

                // If the session user's displayName matches the target user's displayName and adminUser exists
                if (req.session.passport.user.doc.displayName === result.displayName
                    && adminUser) {
                    // Log a success message and flash a success message to the user
                    console.log("Successfully logged in as " + result.displayName + "!");
                    req.flash("success", "Logged in as " + result.displayName);
                    // Save the session
                    req.session.save();
                } else {
                    // If the displayName doesn't match or adminUser doesn't exist, flash an error message to the user
                    req.flash("error", "Unable to log in as " + result.displayName);
                }
            }
		} catch (error) {
			console.error(error);
		}
		res.redirect("/admin/users")
	} else {
		res.redirect("/login")
	}
});

module.exports = router;