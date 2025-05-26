const express = require("express");
const router = express.Router();
const axios = require("axios").default;
const { checkAuthenticated, checkForRunningGame, generateGameCode, createErrorHTML, saveSession, fetchTwitchChatColour, fetchFromAPI, fetchChatLog } = require("../helpers");

const User = require("../models/userModel.js");
const Game = require("../models/gameModel.js");
const Question = require("../models/questionModel.js");
const Answer = require("../models/answerModel.js");
const Round = require("../models/roundModel.js");

// Pull in socket.io
const io = require('../app');

router.post("/canvas/:toggle", checkAuthenticated, async function(req, res){
	const lockState = req.params.toggle;
	if (lockState !== "lock" && lockState !== "unlock") {
		res.send({status: "failure", content: "Invalid lock state"});
		console.log("Invalid lock state: " + lockState);
		return;
	}

	io.emit(lockState + " canvas");
	res.send({status: "success", content: "Socket event sent"});
})

router.post("/submit-button/:toggle", checkAuthenticated, async function(req, res){
	const lockState = req.params.toggle;
	if (lockState !== "lock" && lockState !== "unlock") {
		res.send({status: "failure", content: "Invalid lock state"});
		console.log("Invalid lock state: " + lockState);
		return;
	}

	io.emit(lockState + " submit button");
	res.send({status: "success", content: "Socket event sent"});
})

router.get("/gameManagement", checkAuthenticated, async function(req, res){
		if (req.user.role == "admin") {
			const failureMessage = req.flash("error")[0]; // Retrieve the flash message
			const successMessage = req.flash("success")[0]; // Retrieve the flash message

			const allGamesResult = await Game.find({}).sort({createdAt: "asc"});
			const allQuestionsResult = await Question.find();

			const questionTotals = allGamesResult.reduce((acc, game) => {
				acc[game.code] = allQuestionsResult.filter(question => question.game === game.code).length;
				return acc;
			}, {});
			  
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
			const result = await Game.findOne({code: req.params.gameCode})
			.populate({
				path: 'questions',
				// select: '_id game question answer round order status',
				options: { sort: { round: 1, order: 1 } }
			});

			if (result === null) {
				req.flash("error", "Unable find game " + req.params.gameCode);
				res.redirect("/admin/gameManagement")
			} else {
				const failureMessage = req.flash("error"); // Retrieve the flash message
				const successMessage = req.flash("success")[0]; // Retrieve the flash message

				// Find all questions from the Game model
				const allQuestionsResult = result.questions.sort((a, b) => a.round - b.round || a.order - b.order);

				const questionsByRound = allQuestionsResult.reduce((acc, question) => {
					const round = question.round;
					if (!acc[round]) {acc[round] = []};
					acc[round].push(question); // Push the current question to the array corresponding to its round
					return acc;
				  }, {});
				  
				res.render("admin/game/single_game", {user: req.user, game: result, questionsByRound, failureMessage, successMessage});
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
				// Add a Question to the Game
				const result = await Question.create({
					game: req.body.game,
					round: req.body.round,
					order: req.body.order,
					question: req.body.question,
					answer: req.body.answer,
					type: req.body.type,
				});
				console.log(result);
				// if (!result._id) {
				// 	errors.push("Unable to create question due to database error");
				// } else {
				// 	console.log("Question <em>&quot;" + req.body.question + "&quot;</em> added");
				// }
				// res.send({status: "success", content: result._id.toHexString()});
				res.send({status: "success", content: result});
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
		const errors = [];

		// Let's do some validation!
		if (!req.body.questionId) {errors.push("An ID is required")}
		if (!req.body.direction) {errors.push("Direction is required")}

		// Try to add the question if there are no validation errors
		console.log("errors.length is " + errors.length)
		console.log({errors})
		console.log(req.body)
		if (errors.length === 0) {
			const amount = (req.body.direction == "up" ? -1 : 1);

			try {
				// Update the question order directly using its _id
				const updateQuestionResult = await Question.findByIdAndUpdate(
					req.body.questionId,
					{ $inc: { order: amount } },
				);
			} catch (error) {
				errors.push("Unable to update question order");
				console.error("Failed to update question order", error);
			}
		}

		setTimeout(function(){
			if (errors.length > 0) {
				res.send({status: "danger", content: createErrorHTML(errors)});
			} else {
				res.send({status: "success", content: "Question <em>&quot;" + req.body.questionId + "&quot;</em> order changed"});
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

router.get("/in-game", checkAuthenticated, async function(req, res){
	if (req.user.role == "admin") {
		// ADD ERROR HANDLING
		// const foundGame = await Game.findOne({ code: req.user.inGame });
		const foundGame = await Game.findOne({ status: "in-progress" })
		.populate({
			path: 'teams.players',
			model: User,
			select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame',
			foreignField: 'twitchId',
		})
		.populate({
			path: 'questions',
			options: { sort: { round: 1, order: 1 } }
		})
		.populate({
			path: 'rounds',
			options: { sort: { roundNumber: 1 } }
		});

		if (foundGame === null) {
			// Make sure the flash saves before redirecting
			req.flash("error", "Unable to find any games in the 'in-progress' state");
			await saveSession(req);

			res.redirect("/admin/startGame");
			return
		}
		const gameCode = foundGame.code;

		// Find all questions from the Game model
		const allQuestionsResult = foundGame.questions.sort((a, b) => a.round - b.round || a.order - b.order);
		

		// Pull questions from Game model instead
		// const allQuestionsResultFromGame = await Game.find({game: req.params.gameCode}).

		const questionsByRound = allQuestionsResult.reduce((acc, question) => {
			const round = question.round;
			if (!acc[round]) {acc[round] = []};
			acc[round].push(question); // Push the current question to the array corresponding to its round
			return acc;
		}, {});
		
		// Get the data for an in-progress game
		let currentQuestion = "";
	
		try {
			const domain = req.protocol + "://" + req.get("host");
			const questionEndpoint = domain + "/obs/question";
			
			currentQuestion = await fetchFromAPI(questionEndpoint);
		} catch (error) {
			console.error(error);
		}

		const [team1Chatlog, team2Chatlog, team3Chatlog] = [[], [], []];
		const [team1ID, team2ID, team3ID] = foundGame.teams.map(team => team.id);

		try {
			team1Chatlog.push(...await fetchChatLog(gameCode, team1ID));
			team2Chatlog.push(...await fetchChatLog(gameCode, team2ID));
			team3Chatlog.push(...await fetchChatLog(gameCode, team3ID));
		} catch (error) {
			console.error("Error fetching chat log:", error);
		}

		res.render("admin/in-game", {
			user: req.user,
			questionsByRound,
			game: foundGame,
			failureMessage: "",
			successMessage: "Let's fuggin' do this",
			currentQuestion,
			team1Chatlog,
			team2Chatlog,
			team3Chatlog,
		});
	} else {
		res.redirect("/login")
	}
})
.post("/in-game", checkAuthenticated, async function(req, res){
	// Sanitise inputs (later)
	// console.log(req.body);
	if (req.body.sendQuestion) {
		// Set the question status to "in-progress" in the database
		try {
			const updateQuestionResult = await Question.findByIdAndUpdate(
				req.body.questionId,
				{ $set: { "status": "in-progress" } });

			if (updateQuestionResult.status !== "in-progress"){
				console.log("Unable to update question status");
			} else {
				console.log("Updated question id " + req.body.questionId +  "'s status to in-progress");
			}
		} catch (error) {
			console.error("Failed to update question id " + req.body.questionId +  "'s status to in-progress", error);
		}

		// Send the question to the frontend
		setTimeout(function(){
			console.log("Sending next question...");
			io.emit("next question", req.body.sendQuestion, req.body.questionId);
			// io.emit("update question", req.body.sendQuestion); // Is this needed!?
			res.send({status: "success", content: "POST successful"});
		}, 500); // 500ms delay to accommodate bootstrap .collapse() - plus it looks cooler this way
	}
})
.post("/in-game/fetch-answers", checkAuthenticated, async function(req, res){
	// Sanitise inputs (later)
	if (req.body.questionId) {
		const contestantAnswers = [];
		try {
			// Find all the submitted answers for the given question ID
			let foundAnswers = await Answer.find({ questionId: req.body.questionId })

			// Check answers were found
			if (foundAnswers === null || foundAnswers.length === 0) {
				return res.send({status: "Error", content: "No answers found for question id " + req.body.questionId});
			}

			foundAnswers.forEach(a => {
				contestantAnswers.push({
					[a.contestant]: a.answer
				});
			});

		} catch (error) {
			console.error(error);
			return res.send({status: "Error", content: "Failed to fetch answers for question id " + req.body.questionId});
		}

		// Send the contestantAnswers to the frontend
		return res.send({status: "success", content: contestantAnswers});
	}
})
.post("/in-game/points", checkAuthenticated, async (req, res) => {
	// Prepare the inputs
	const userId = req.body.userId;
	const questionId = req.body.questionId;
	const points = Number(req.body.points);
	const pointFormID = req.body.pointFormID;

	try {
		const updatePoints = await Answer.updateOne({
			questionId: questionId,
			contestant: userId
		},{ $set: { points: points } });

		if (updatePoints.modifiedCount < 1) {
			res.send({
				status: "danger",
				content: "Something went wrong! Please let Danny know."
			});
			return;
		} else {
			res.send({
				status: "success",
				content: "Points added!"
			});
			io.emit('points added', pointFormID);
			return;
		}
	} catch (error) {
		res.send({
			status: "danger",
			content: "Something went wrong! Please let Danny know."
		});
		console.error(error);
		return;
	}
})
.post("/in-game/set-question-state", checkAuthenticated, async function(req, res){
	// Sanitise inputs (later)

	// Check all required params have been sent
	if (!req.body.questionId || !req.body.state || !req.body.gameId ) {
		console.log("Missing required parameters");
		console.log(req.body);
		return res.status(400).send({status: "danger", content: "Missing required parameters"});
	}

	// Update the database
		// Set the question status to "in-progress" in the database
		try {
			const updateQuestionResult = await Question.updateOne(
				{"_id": req.body.questionId},
				{ $set: { "status": req.body.state }
			});

		if (updateQuestionResult.modifiedCount !== 1){
			console.log("Unable to update question status");
			throw new Error("Unable to update question status");
		} else {
			return res.status(200).send();
		}
	} catch (error) {
		console.error("Failed to update question status to " + req.body.state, error);
		return res.status(500).send();
	}
})
.post("/in-game/log-out-user", checkAuthenticated, async function(req, res){
	// Sanitise inputs (later)

	// Check all required params have been sent
	if (!req.body.playerId || !req.body.gameCode ) {
		console.log("Missing required parameters");
		console.log(req.body);
		return res.status(400).send({status: "danger", content: "Missing required parameters"});
	}

	if (req.body.playerId === "all") {
		// Remove the in-game property from all players where inGame === req.body.gameCode
		try {
			const updatePlayerResult = await User.updateMany({ inGame
				: req.body.gameCode }, { $set: { inGame: "", loggedOutOf: req.body.gameCode } });
			if (updatePlayerResult.modifiedCount <= 0){
				console.log("Unable to update users");
				throw new Error("Unable to update users");
			} else {
				console.log("Successfully logged out all players from game " + req.body.gameCode);
				
				try {
					// If we have logged players out via the backend, log the fuckers out via the frontend.
					const affectedPlayers = await User.find({loggedOutOf: req.body.gameCode});

					affectedPlayers.forEach(player => {
						io.emit("ltfo", req.body.gameCode, player._id);
					});
				} catch (error) {
					console.log("Unable to remove `inGame` from Users");
					return res.status(500).send();
				}
				
				return res.status(200).send();
			}
		} catch (error) {
			console.error("Failed to update question status to " + req.body.state, error);
			// return res.status(500).send({status: "danger", content: "Failed to update question status to " + req.body.state + " for question ID " + req.body.questionId});
			return res.status(500).send();
		}
	} else {
		// Remove the in-game property from the player
		try {
			const updatePlayerResult = await User.updateOne({
				_id: req.body.playerId
			}, { $set: { inGame: "" } });
			if (updatePlayerResult.modifiedCount <= 0){
				console.log("Unable to update user");
				throw new Error("Unable to update user");
			} else {
				console.log("Successfully logged out user " + req.body.playerId + " from game " + req.body.gameCode);

				
				// Send a "log the fuck out of game" event to the affected user
				io.emit("ltfo", req.params.gameCode, req.body.playerId);

				
				return res.status(200).send();
				// To do: Send a logout event to the player via Socket.io
			}
		} catch (error) {
			console.error("Failed to update question status to " + req.body.state, error);
			// return res.status(500).send({status: "danger", content: "Failed to update question status to " + req.body.state + " for question ID " + req.body.questionId});
			return res.status(500).send();
		}
	}
});
	
router.get("/release-user", checkAuthenticated, async function(req, res){
	if (req.user.adminLogin === true) {
		const currentUser = req.session.passport.user.doc;
		const adminUser = currentUser.adminUser;

		req.session.passport.user.doc = adminUser;

		// if displayName from session matches displayName from adminUser
		if (req.session.passport.user.doc.displayName === adminUser.displayName) {
			// Log a success message and flash a success message to the user
			console.log("Successfully logged out of " + currentUser.displayName + "!");
			req.flash("success", "Logged out of " + currentUser.displayName);
			// Send the logout event if the player is in a game
			if (currentUser.inGame) {io.emit("player left", currentUser.inGame, currentUser)}
		} else {
			// If the displayName doesn't match, flash an error message to the user
			req.flash("error", "Unable to log out of " + currentUser.displayName);
		}

		// Save the session
		try {
			await req.session.save();
			res.redirect("/"); // Perform the redirect only after the session is successfully saved
		} catch (err) {
			console.error("Error saving session:", err);
			res.redirect("/"); // Redirect even if there's an error, or handle it differently if needed
		}
	} else {
		res.redirect("/")
	}
});

router.post("/reset-game-questions/:gameCode", checkAuthenticated, async function(req, res){
	const gameCode = req.params.gameCode;
	const roundNumber = req.body.roundNumber;

	// Todo add validation

	if (req.user.role != "admin") {
		res.send({status: "failure", content: "You're not an admin!"});
		console.log("User attempted to reset game " + gameCode + " but they're not an admin!")
		return;
	}

	try {
		const foundGame = await Game.findOne({ code: gameCode });

		if (foundGame === null) {
			console.log("Unable to find game " + gameCode);
			res.send({status: "failure", content: "Unable to find game " + gameCode});
			return;
		}
	
		try {
			const updateQuestionStatusResult = await Question.updateMany(
				{ game: gameCode },
				{ $set: { status: "pending" } }
			);

			// Check modifiedCount of updateQuestionStatusResult
			if (updateQuestionStatusResult.matchedCount === 0) {
				res.send({status: "failure", content: "No questions found for game " + gameCode});
				return;
			}
			if (updateQuestionStatusResult.modifiedCount !== updateQuestionStatusResult.matchedCount) {
				res.send({status: "failure", content: "Unable to update all questions for game " + gameCode});
				return;
			}
		
			res.send({status: "Success", content: "Successfully set round " + gameCode + "'s questions to 'pending'"});
			return; 
		} catch (error) {
			console.log("Unable to update " + gameCode + "'s questions", error);
			res.send({status: "failure", content: "Unable to update " + gameCode + "'s questions"});
		}
	} catch (error) {
		console.log("Error finding game "+ gameCode, error)
		res.send({status: "failure", content: "Unable to find game " + gameCode});
		console.error(error);
	}
});

router.post("/end-game/:gameCode", checkAuthenticated, async function(req, res){
	const gameCode = req.params.gameCode;

	if (req.user.role != "admin") {
		res.send({status: "failure", content: "You're not an admin!"});
		console.log("User attempted to reset game " + gameCode + " but they're not an admin!")
		return;
	}

	try {
		const foundGame = await Game.findOne({ code: gameCode });

		if (foundGame === null) {
			console.log("Unable to find game " + gameCode);
			res.send({status: "failure", content: "Unable to find game " + gameCode});
			return;
		}
	
		try {
			const updateGameStatusResult = await Game.updateOne({ code: gameCode }, { status: "pending" });

			// Check modifiedCount of updateGameStatusResult
			if (updateGameStatusResult.modifiedCount === 0) {
				res.send({status: "failure", content: "Unable to set game " + gameCode + " to 'pending'"});
				return res.redirect("/admin/startGame/" + gameCode);
			}

			const updateUsersResult = await User.updateMany({ inGame: gameCode }, { $set: { inGame: "", loggedOutOf: gameCode } });
			
			res.send({status: "Success", content: "Successfully reset game " + gameCode});
			return; 
		} catch (error) {
			console.log("Unable to update game " + gameCode);
			res.send({status: "failure", content: "Unable to update game " + gameCode});
			console.error(error);
		}
	} catch (error) {
		console.log("Error finding game "+ gameCode, error)
		res.send({status: "failure", content: "Unable to find game " + gameCode});
		console.error(error);
	}
});


router.post("/restart-round/:gameCode/:roundNumber", checkAuthenticated, async function(req, res){
	const { gameCode, roundNumber } = req.params;

	if (req.user.role != "admin") {
		res.send({status: "failure", content: "You're not an admin!"});
		console.log("User attempted to restart round " + roundNumber + " in " + gameCode + " but they're not an admin!")
		return;
	}

	try {
		const foundGame = await Game.findOne({ code: gameCode });

		if (foundGame === null) {
			console.log("Unable to find game " + gameCode);
			res.send({status: "failure", content: "Unable to find game " + gameCode});
			return;
		}
	
		try {
			const updateQuestionStatusResult = await Question.updateMany(
				{ game: gameCode, round: roundNumber },
				{ $set: { status: "pending" } }
			);

			// Check modifiedCount of updateQuestionStatusResult
			if (updateQuestionStatusResult.matchedCount === 0) {
				res.send({status: "failure", content: "No questions found for game " + gameCode + " in round " + roundNumber});
				return;
			}
			if (updateQuestionStatusResult.modifiedCount !== updateQuestionStatusResult.matchedCount) {
				res.send({status: "failure", content: "Unable to update all questions for game " + gameCode + " in round " + roundNumber});
				return;
			}
		
			res.send({status: "Success", content: "Successfully set round " + roundNumber + "'s questions to 'pending' for game " + gameCode});
			return; 
		} catch (error) {
			console.log("Unable to update round " + roundNumber + "'s questions for game " + gameCode, error);
			res.send({status: "failure", content: "Unable to update round " + roundNumber + "'s questions for game " + gameCode});
		}
	} catch (error) {
		console.log("Error finding game "+ gameCode, error)
		res.send({status: "failure", content: "Unable to find game " + gameCode});
	}
});

router.post("/end-round/:gameCode/:roundNumber", checkAuthenticated, async function(req, res){
	const { gameCode, roundNumber } = req.params;

	if (req.user.role != "admin") {
		res.send({status: "failure", content: "You're not an admin!"});
		console.log("User attempted to end round " + roundNumber + " in " + gameCode + " but they're not an admin!")
		return;
	}

	try {
		const foundGame = await Game.findOne({ code: gameCode });

		if (foundGame === null) {
			console.log("Unable to find game " + gameCode);
			res.send({status: "failure", content: "Unable to find game " + gameCode});
			return;
		}
	
		try {
			const updateQuestionStatusResult = await Question.updateMany(
				{ game: gameCode, round: roundNumber },
				{ $set: { status: "played" } }
			);

			// Check modifiedCount of updateQuestionStatusResult
			if (updateQuestionStatusResult.matchedCount === 0) {
				res.send({status: "failure", content: "No questions found for game " + gameCode + " in round " + roundNumber});
				return;
			}
			if (updateQuestionStatusResult.modifiedCount !== updateQuestionStatusResult.matchedCount) {
				res.send({status: "failure", content: "Unable to update all questions for game " + gameCode + " in round " + roundNumber});
				return;
			}
		
			res.send({status: "Success", content: "Successfully set round " + roundNumber + "'s questions to 'played' for game " + gameCode});
			return; 
		} catch (error) {
			console.log("Unable to update round " + roundNumber + "'s questions for game " + gameCode, error);
			res.send({status: "failure", content: "Unable to update round " + roundNumber + "'s questions for game " + gameCode});
		}
	} catch (error) {
		console.log("Error finding game "+ gameCode, error)
		res.send({status: "failure", content: "Unable to find game " + gameCode});
	}
});

router.get("/startGame", checkAuthenticated, async function(req, res){
	if (req.user.role == "admin") {
		const failureMessage = req.flash("error")[0]; // Retrieve the flash message
		const successMessage = req.flash("success")[0]; // Retrieve the flash message
		const allGamesResult = await Game.find({ status: { $not: { $eq: "complete" } } }).sort({order: "asc"}).populate({
			path: 'questions',
			select: '_id game question answer round order',
			options: { sort: { round: 1, order: 1 } }
		});
		const aggregationResult = allGamesResult.map(game => ({_id: game.code, total: game.questions.length}));
		// console.log(aggregationResult);


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
				select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame',
				foreignField: 'twitchId',
			});

			if (gameResult !== null) {
				// Set the game's state to starting
				try {
					const updateGameStatusResult = await Game.updateOne({ code: req.params.gameCode }, { status: "starting" });
					// ACTUALLY HANDLE THIS LATER, YOU DING-DONG
				} catch (error) {
					console.error(error);
					req.flash("error", "Unable to start game " + req.params.gameCode);
					res.redirect("/admin/startGame/");
					return;
				}

				// Fetch the chat logs for each team
				const [team1Chatlog, team2Chatlog, team3Chatlog] = [[], [], []];
				const [team1ID, team2ID, team3ID] = gameResult.teams.map(team => team.id);
		
				try {
					team1Chatlog.push(...await fetchChatLog(req.params.gameCode, team1ID));
					team2Chatlog.push(...await fetchChatLog(req.params.gameCode, team2ID));
					team3Chatlog.push(...await fetchChatLog(req.params.gameCode, team3ID));
				} catch (error) {
					console.error("Error fetching chat log:", error);
				}
		
				res.render("admin/startGame/single_game", {user: req.user, game: gameResult, failureMessage, successMessage, team1Chatlog, team2Chatlog, team3Chatlog});
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
})
.post("/startGame/:gameCode", checkAuthenticated, async function(req, res){
	const gameCode = req.params.gameCode;

	const foundGame = await Game.findOne({ code: gameCode });

	if (foundGame === null) {
		req.flash("error", "Unable to find game " + gameCode);
		saveSession(req);
		return res.redirect("/admin/gameManagement");
	}

	const updateGameStatusResult = await Game.updateOne({ code: gameCode }, { status: "in-progress" });

	// Check modifiedCount of updateGameStatusResult
	if (updateGameStatusResult.modifiedCount === 0) {
		req.flash("error", "Unable to start game " + gameCode);
		return res.redirect("/admin/startGame/" + gameCode);
	}

	try {
		// Update listening frontend pages
		io.emit("start game", req.params.gameCode);

		// Redirect to the in-game admin panel
		res.redirect("/admin/in-game/");
	}
	catch (error) {
		console.error(error);
		req.flash("error", "Unable to save session");
		return res.redirect("/admin/startGame/" + gameCode);
	}

});

router.get("/teams", checkAuthenticated, async function(req, res){
	if (req.user.role == "admin") {
		const failureMessage = req.flash("error")[0]; // Retrieve the flash message
		const successMessage = req.flash("success")[0]; // Retrieve the flash message
		const allUsersResult = await User.find({}).collation({ locale: 'en', strength: 2 }).sort({ displayName: 1 }); // Sort case-insensitive
		const allGamesResult = await Game.find({ status: { $not: { $eq: "complete" } } }).sort({order: "asc"});
		const currentlyRunningGame = await checkForRunningGame();
		res.render("admin/teams", {user: req.user, game: currentlyRunningGame, allUsers: allUsersResult, allGames: allGamesResult, failureMessage, successMessage});
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
			const currentlyRunningGame = await checkForRunningGame();
			res.render("admin/users", {user: req.user, allUsers: allUsersResult, game: currentlyRunningGame, failureMessage, successMessage});
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
				.then(async response => {
					const userInfo = response.data.data[0];
					userInfo.twitchChatColour = ""; // Default value

					try {
						const twitchChatColour = await fetchTwitchChatColour(userInfo.id)
						userInfo.twitchChatColour = twitchChatColour;
					}
					catch (error) {
						console.error("Unable to fetch Twitch chat colour for user " + userInfo.display_name, error);
					}

					User.updateOne({ twitchId: userInfo.id }, {
						displayName: userInfo.display_name,
						profileImageUrl: userInfo.profile_image_url,
						broadcasterType: userInfo.broadcaster_type,
						bio: userInfo.description,
						twitchChatColour: userInfo.twitchChatColour
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

router.get("/sandbox", checkAuthenticated, async function(req, res){
	if (req.user.role == "admin") {
		res.render("admin/sandbox", {
			user: req.user,
			game: typeof foundGame !== 'undefined' ? foundGame : {inProgress: true},
			failureMessage: "",
			successMessage: "Let's fuggin' do this"
		});
	} else {
		res.redirect("/login")
	}
});

module.exports = router;