const express = require("express");
const router = express.Router();
const { checkAuthenticated, generateGameCode } = require("../helpers");

const User = require("../models/userModel.js");
const Game = require("../models/gameModel.js");
const Question = require("../models/questionModel.js");

router.get("/gameManagement", checkAuthenticated, async function(req, res){
		if (req.user.role == "admin") {
			const failureMessage = req.flash("error")[0]; // Retrieve the flash message
			const successMessage = req.flash("success")[0]; // Retrieve the flash message
			const allGamesResult = await Game.find({}).sort({createdAt: "asc"});
			res.render("admin_game_management", {user: req.user, allGames: allGamesResult, failureMessage, successMessage});
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
				  
				res.render("admin_game_management_single_game", {user: req.user,  questionsByRound, game: result, failureMessage, successMessage});
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

router.get("/teams", checkAuthenticated, async function(req, res){
	if (req.user.role == "admin") {
		const failureMessage = req.flash("error")[0]; // Retrieve the flash message
		const successMessage = req.flash("success")[0]; // Retrieve the flash message
		const allUsersResult = await User.find({}).collation({ locale: 'en', strength: 2 }).sort({ displayName: 1 }); // Sort case-insensitive
		const allGamesResult = await Game.find({ status: { $not: { $eq: "complete" } } }).sort({order: "asc"});
		res.render("admin_teams", {user: req.user, allUsers: allUsersResult, allGames: allGamesResult, failureMessage, successMessage});
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
			res.render("admin_users", {user: req.user, allUsers: allUsersResult,  failureMessage, successMessage});
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


module.exports = router;