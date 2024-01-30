const express = require("express");
const router = express.Router();
const axios = require("axios").default;
const { checkAuthenticated, generateGameCode, createErrorHTML } = require("../helpers");

const User = require("../models/userModel.js");
const Game = require("../models/gameModel.js");
const Question = require("../models/questionModel.js");

router.get("/gameManagement", checkAuthenticated, async function(req, res){
		if (req.user.role == "admin") {
			const failureMessage = req.flash("error")[0]; // Retrieve the flash message
			const successMessage = req.flash("success")[0]; // Retrieve the flash message
			const allGamesResult = await Game.find({}).sort({createdAt: "asc"});
			const aggregationResult = await Question.aggregate([{$group: {_id: '$game',total: { $sum: 1 }}}]);

			// Convert the result array to an object with game codes as keys
			const questionTotals = aggregationResult.reduce((acc, item) => {
				acc[item._id] = item.total;
				return acc;
			}, {});
			console.log(questionTotals);
			  
			res.render("admin/game/manage", {user: req.user, allGames: allGamesResult, questionTotals, failureMessage, successMessage});
		} else {
			res.redirect("/login")
		}
	})
	.post("/gameManagement", checkAuthenticated, async function(req, res){
		if (req.user.role == "admin") {
			const gameCode = await generateGameCode();

			const result = await Game.create({code: gameCode, teams: [{name: "Team One"},{name: "Team Two"},{name: "Team Three"}]});
			
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

router.get("/gameManagement/:gameCode", checkAuthenticated, async function(req, res){
		if (req.user.role == "admin") {
			// Fetch the game
			const result = await Game.findOne({code: req.params.gameCode});
			if (result === null) {
				req.flash("error", "Unable find game " + req.params.gameCode);
				res.redirect("/admin/gameManagement")
			} else {
				const failureMessage = req.flash("error"); // Retrieve the flash message
				const successMessage = req.flash("success")[0]; // Retrieve the flash message
				const allQuestionsResult = await Question.find({game: req.params.gameCode}).sort([/*["round", "asc"], */["order","asc"]]);

				const questionsByRound = allQuestionsResult.reduce((acc, question) => {
					const round = question.round;
					if (!acc[round]) {acc[round] = []};
					acc[round].push(question); // Push the current question to the array corresponding to its round
					return acc;
				  }, {});
				  
				res.render("admin/game/single_game", {user: req.user,  questionsByRound, game: result, failureMessage, successMessage});
				// console.log(questionsByRound);
			}
		} else {
			res.redirect("/login")
		}
	})
	.post("/gameManagement/:gameCode", async function(req, res){
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
				res.send({status: "success", content: result._id.toHexString()});
			} else {
				res.send({status: "failure", content: createErrorHTML(errors)});
			}
		} else {
			res.redirect("/login")
		}
		
		// setTimeout(function(){
		// 	res.send({status: "success", content: "POST successful"});
		// }, 500); // 500ms delay to accommodate bootstrap .collapse() - plus it looks cooler this way
	});

router.post("/gameManagement/:gameCode/moveQuestion", checkAuthenticated, async function(req, res){
	if (req.user.role == "admin") {
		let errors = [];
		// Let's do some validation!
		if (!req.body.questionId) {errors.push("An ID is required")}
		if (!req.body.direction) {errors.push("Direction is required")}

		// Try to add the question if there are no validation errors
		console.log("errors.length is " + errors.length)
		console.log({errors})
		console.log(req.body)
		if (errors.length === 0) {
			const amount = (req.body.direction == "up" ? -1 : 1);
			const updateQuestionResult = await Question.updateOne({ _id: req.body.questionId }, { $inc: { order: amount } });

			// res.render("admin_users", {user: req.user, allUsers: allUsersResult,  failureMessage, successMessage});
			// const result = await Question.create({
			// 	question: req.body.question,
			// 	answer: req.body.answer,
			// 	type: req.body.type,
			// 	game: req.body.game,
			// 	round: req.body.round,
			// 	order: req.body.order,
			// });
			console.log(updateQuestionResult);
			// if (!result._id) {
			// 	errors.push("Unable to create question due to database error");
			// } else {
			// 	console.log("Question <em>&quot;" + req.body.question + "&quot;</em> added");
			// }
		}

		setTimeout(function(){
			if (errors.length > 0) {
				res.send({status: "danger", content: "createErrorHTML(errors)"});
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

router.post("/gameManagement/delete/:gameCode", checkAuthenticated, async function(req, res){
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

router.get("/release-user", checkAuthenticated, function(req, res){
	if (req.user.adminLogin === true) {
		const currentUser = req.session.passport.user.doc;
		const adminUser = currentUser.adminUser;

		req.session.passport.user.doc = adminUser;

		// if displayName from session matches displayName from adminUser
		if (req.session.passport.user.doc.displayName === adminUser.displayName) {
			// Log a success message and flash a success message to the user
			console.log("Successfully logged out of " + currentUser.displayName + "!");
			req.flash("success", "Logged out of " + currentUser.displayName);
			// Save the session
			req.session.save();
		} else {
			// If the displayName doesn't match, flash an error message to the user
			req.flash("error", "Unable to log out of " + currentUser.displayName);
		}
		res.redirect("/")
	} else {
		res.redirect("/")
	}
});

router.get("/startGame", checkAuthenticated, async function(req, res){
	if (req.user.role == "admin") {
		const failureMessage = req.flash("error")[0]; // Retrieve the flash message
		const successMessage = req.flash("success")[0]; // Retrieve the flash message
		const allGamesResult = await Game.find({ status: { $not: { $eq: "complete" } } }).sort({order: "asc"});
		const aggregationResult = await Question.aggregate([{$group: {_id: '$game',total: { $sum: 1 }}}]);

		// Convert the result array to an object with game codes as keys
		const questionTotals = aggregationResult.reduce((acc, item) => {
			acc[item._id] = item.total;
			return acc;
		}, {});
	res.render("admin/startGame", {user: req.user, allGames: allGamesResult, questionTotals, failureMessage, successMessage});
	} else {
		res.redirect("/login")
	}
});

router.get("/startGame/:gameCode", checkAuthenticated, async function(req, res){
	if (req.user.role == "admin") {
		const failureMessage = req.flash("error")[0]; // Retrieve the flash message
		const successMessage = req.flash("success")[0]; // Retrieve the flash message

		try {
			const gameResult = await Game.findOne({ code: req.params.gameCode })
			.populate({
				path: 'teams.players',
				model: User,
				select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour',
				foreignField: 'twitchId',
			});

			if (gameResult !== null) {
				// Set the game's state to starting
				try {
					const updateGameStatusResult = await Game.updateOne({ code: req.params.gameCode }, { status: "starting" });
					console.log({updateGameStatusResult});
				} catch (error) {
					console.error(error);
					req.flash("error", "Unable to start game " + req.params.gameCode);
					res.redirect("/admin/startGame/");
					return;
				}

				res.render("admin/startGame/single_game", {user: req.user, game: gameResult, failureMessage, successMessage});
			} else {
				req.flash("error", "Unable to find game " + req.params.gameCode);
				res.redirect("/admin/startGame/");
			}
		} catch (error) {
			console.error(error);
			req.flash("error", "Unable to load up game " + req.params.gameCode);
			res.redirect("/admin/startGame/");
		}
	} else {
		res.redirect("/login")
	}
});

router.get("/teams", checkAuthenticated, async function(req, res){
	if (req.user.role == "admin") {
		const failureMessage = req.flash("error")[0]; // Retrieve the flash message
		const successMessage = req.flash("success")[0]; // Retrieve the flash message
		const allUsersResult = await User.find({}).collation({ locale: 'en', strength: 2 }).sort({ displayName: 1 }); // Sort case-insensitive
		const allGamesResult = await Game.find({ status: { $not: { $eq: "complete" } } }).sort({order: "asc"});
		res.render("admin/teams", {user: req.user, allUsers: allUsersResult, allGames: allGamesResult, failureMessage, successMessage});
	} else {
		res.redirect("/login")
	}
})

.post("/teams/:gameCode", checkAuthenticated, async function(req, res){
	if (req.user.role == "admin") {
		console.log(req.body)
		const updateGameResult = await Game.updateOne({ code: req.params.gameCode }, {$set: { teams: [
			{players: [req.body.Team1[0], req.body.Team1[1]]},
			{players: [req.body.Team2[0], req.body.Team2[1]]},
			{players: [req.body.Team3[0], req.body.Team3[1]]},
		] }});
		console.log(updateGameResult);

		const updatedGame = await Game.findOne({ code: req.params.gameCode });
		console.log(updatedGame);

		req.flash("success", "Everything is great");
		res.redirect("/admin/teams");
	} else {
		res.send({status: "danger", content: "You're not an admin. Bugger off"});
	}
});

router.get("/users", checkAuthenticated, async function(req, res){
		if (req.user.role == "admin") {
			const failureMessage = req.flash("error")[0]; // Retrieve the flash message
			const successMessage = req.flash("success")[0]; // Retrieve the flash message
			const allUsersResult = await User.find({}).collation({ locale: 'en', strength: 2 }).sort({ displayName: 1 }); // Sort case-insensitive
			res.render("admin/users", {user: req.user, allUsers: allUsersResult,  failureMessage, successMessage});
		} else {
			res.redirect("/login")
		}
	});

router.post("/users/add/", checkAuthenticated, async function(req, res){
	if (req.user.role == "admin") {
		const user = req.body.target_username;

		// Get Twitch Access Token
		const params = new URLSearchParams();
		params.append("client_id", process.env.TWITCH_CLIENT_ID);
		params.append("client_secret", process.env.TWITCH_CLIENT_SECRET);
		params.append("grant_type", "client_credentials");

		axios.post("https://id.twitch.tv/oauth2/token", params)
		.then(result => {
			const accessToken = result.data.access_token;
			axios.get("https://api.twitch.tv/helix/users?login=" + user, {
				headers: {
					"Authorization": `Bearer ${accessToken}`,
					"Client-Id": process.env.TWITCH_CLIENT_ID
				}
			})
				.then(response => {
					const userInfo = response.data.data[0];

					User.updateOne({ twitchId: userInfo.id }, {
						displayName: userInfo.display_name,
						profileImageUrl: userInfo.profile_image_url,
						broadcasterType: userInfo.broadcaster_type,
					}, { upsert: true })
						.then(result => {
							if (result.upsertedCount === 1) {
								req.flash("success", "Added " + userInfo.display_name + " to the database!");
							} else {
								req.flash("success", "Updated " + userInfo.display_name + "'s user info!");
							}
						})
						.catch(error => {
							req.flash("error", "Unable to add " + user + " to the database!");
							console.error(error, response.data.id);
						})
						.finally(() => {
							res.redirect("/admin/users");
						});
				})
				.catch(error => {
					req.flash("error", "Unable to fetch data from Twitch");
					console.log(error);
					res.redirect("/admin/users");
				});
		})
		.catch(error => {
			req.flash("error", "Unable to get Twitch access token!");
			console.log(error);
			res.redirect("/admin/users");
		});

	} else {
		res.redirect("/login")
	}
});

router.post("/users/ban/:targetTwitchId", checkAuthenticated, async function(req, res){
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

router.get("/users/login/:targetTwitchId", checkAuthenticated, async function(req, res){
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