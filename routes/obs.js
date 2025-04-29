const express = require("express");
const router = express.Router();
const { checkAuthenticated } = require("../helpers");

// Pull in socket.io
const io = require('../app');

const Game = require("../models/gameModel.js");
const User = require("../models/userModel.js");
const Question = require("../models/questionModel.js");
const Points = require("../models/pointsModel.js");

router.get("/", checkAuthenticated, (req, res) => {
	const failureMessage = req.flash("error")[0]; // Retrieve the flash message
	const successMessage = req.flash("success")[0]; // Retrieve the flash message
	if (req.user.role == "admin") {res.render("admin", {user: req.user, failureMessage, successMessage})}
	else {res.render("game", {user: req.user, failureMessage, successMessage})}
});

router.get("/question", async (req, res) => {
	try {
		// Find the first Game where the Question status is "in-progress" and return just that question using an aggregate
		const foundQuestion = await Game.aggregate([
			{ $unwind: "$questions" },
			{ $match: { "questions.status": "in-progress" } },
			{ $project: { _id: 0, question: "$questions.question" } }
		]).exec();

		// Check a game was found
		if (foundQuestion === null || foundQuestion[0] === undefined || foundQuestion[0].length === 0) {
			return res.render("obs/question", {question: ""});
		}

		res.render("obs/question", {question: foundQuestion[0].question});
	} catch (error) {
		console.error(error);
		return res.render("obs/question", {question: ""});
	}
})

// DELETE THIS - DEBUGGING ONLY
router.get("/addQuestion/:code", async (req, res) => {
	const game = req.params.code.toUpperCase();
	const { question, answer, round, order } = req.query;


	if (!question || !answer || !round || !order) {
		return res.status(400).send({"message": "Missing game code, question, answer, round or order"});
	}

	try {
		// Insert the question into the database
		const newQuestion = await Question.create({ game, question, answer, round, order });
		return res.status(200).send({"message": "Question saved successfully with id: " + newQuestion.id});
	} catch (error) {
		console.error("Error saving question:", error);
		return res.status(500).send("Error saving question to the database");
	}
})

router.get("/addpoints", async (req, res) => {
	const { game, player, question, points } = req.query;

	if (!game || !player || !question || !points ) {
		return res.status(400).send({"message": "Missing game game, player, question or points"});
	}

	try {
		// Insert the points into the database
		const newPoints = await Points.create({ game, player, question, points });
		return res.status(200).send({"message": "Points saved successfully with id: " + newPoints.id});
	} catch (error) {
		console.error("Error saving points:", error);
		return res.status(500).send({"message": "Fuck you, basically"});
	}
})
// DELETE THIS - DEBUGGING ONLY

router.get("/rounds", async (req, res) => {
	try {
		const gameFromDB = await Game.findOne({ status: { $in: ["starting", "in-progress"] } }).select('code -_id');
		const gameCode = (gameFromDB) ? gameFromDB.code : null;

		// Check a game was found
		if (gameCode === null) { return res.status(500).send("No game found!") }

		try {
			const rounds = await Question.find({ game: gameCode }).sort({ round: 1, order: 1 });
			return res.status(200).send(rounds);
		} catch (error) {
			console.error("Error fetching rounds:", error);
			return res.status(500).send("Error fetching rounds from the database");
		}
	} catch (error) {
		console.error(error);
		return res.status(500).send("Couldn't handle the request. Please try again later.");
	}
});

router.get("/rounds/:roundIndex", async (req, res) => {
	const roundIndexValue = Number(req.params.roundIndex);
	if (isNaN(roundIndexValue) || roundIndexValue < 1) { return res.status(400).send("The round number must be 1 or higher") }

	try {
		const gameFromDB = await Game.findOne({ status: { $in: ["starting", "in-progress"] } }).select('code -_id');
		const gameCode = (gameFromDB) ? gameFromDB.code : null;

		// Check a game was found
		if (gameCode === null) { return res.status(500).send("No game found!") }

		try {
			const round = await Question.find({ game: gameCode, round: roundIndexValue }).sort({ round: 1, order: 1 });
			return res.status(200).send(round);
		} catch (error) {
			console.error("Error fetching round " + roundIndexValue + ":", error);
			return res.status(500).send("Error fetching round " + roundIndexValue + " from the database");
		}
	} catch (error) {
		console.error(error);
		return res.status(500).send("Couldn't handle the request. Please try again later.");
	}
});

router.get("/rounds/:roundIndex/question", async (req, res) => {
	res.status(200).send("You need to specify a question index in the URL. Example: /rounds/1/question/1");
});

router.get("/rounds/:roundIndex/question/:questionIndex", async (req, res) => {
	const roundIndexValue = Number(req.params.roundIndex);
	if (isNaN(roundIndexValue) || roundIndexValue < 1) { return res.status(400).send("The round number must be 1 or higher") }
	const questionIndexValue = Number(req.params.questionIndex);
	if (isNaN(questionIndexValue) || questionIndexValue < 1) { return res.status(400).send("The question number must be 1 or higher") }

	try {
		const gameFromDB = await Game.findOne({ status: { $in: ["starting", "in-progress"] } }).select('code -_id');
		const gameCode = (gameFromDB) ? gameFromDB.code : null;

		// Check a game was found
		if (gameCode === null) { return res.status(500).send("No game found!") }

		try {
			const question = await Question.find({ game: gameCode, round: roundIndexValue, order: questionIndexValue });
			return res.status(200).send(question[0]);
		} catch (error) {
			console.error("Error fetching round " + roundIndexValue + " question " + questionIndexValue + ":", error);
			return res.status(500).send("Error fetching round " + roundIndexValue + " question " + questionIndexValue + " from the database");
		}
	} catch (error) {
		console.error(error);
		return res.status(500).send("Couldn't handle the request. Please try again later.");
	}
});

router.get("/rounds/:roundIndex/question/:questionIndex/:key", async (req, res) => {
	const roundIndexValue = Number(req.params.roundIndex);
	if (isNaN(roundIndexValue) || roundIndexValue < 1) { return res.status(400).send("The round number must be 1 or higher") }
	const questionIndexValue = Number(req.params.questionIndex);
	if (isNaN(questionIndexValue) || questionIndexValue < 1) { return res.status(400).send("The question number must be 1 or higher") }
	const targetKey = String(req.params.key);
	if (targetKey.toLowerCase() == "round" || targetKey.toLowerCase() == "order" || targetKey.toLowerCase() == "__v") {
		return res.status(400).send("The target key cannot be 'round', 'order', or '__v'");
	}

	try {
		const gameFromDB = await Game.findOne({ status: { $in: ["starting", "in-progress"] } }).select('code -_id');
		const gameCode = (gameFromDB) ? gameFromDB.code : null;

		// Check a game was found
		if (gameCode === null) { return res.status(500).send("No game found!") }

		try {
			const question = await Question.find({ game: gameCode, round: roundIndexValue, order: questionIndexValue });

			// Check the targetKey exists in the game
			if (question[0][targetKey] === null || question[0][targetKey] === undefined) {
				return res.status(200).send("Unable to find question " + questionIndexValue + "'s " + targetKey);
			}

			return res.status(200).send(question[0][targetKey]);
		} catch (error) {
			console.error("Error fetching round " + roundIndexValue + " question " + questionIndexValue + ":", error);
			return res.status(500).send("Error fetching round " + roundIndexValue + " question " + questionIndexValue + " from the database");
		}
	} catch (error) {
		console.error(error);
		return res.status(500).send("Couldn't handle the request. Please try again later.");
	}
});

router.get("/teams", async (req, res) => {
	try {
		const foundGame = await Game.aggregate([
			{ $match: { status: { $in: ["starting", "in-progress"] } } }
		]).exec();
		
		// Check a game was found
		if (foundGame === null  || foundGame.length === 0) {
			return res.status(200).send("Unable to find any active games");
		}

		// Populate the teams with the players
		// No try/catch on this, as it will return just the player IDs if it fails
		await Game.populate(foundGame, {
			path: 'teams.players',
			model: User,
			select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame',
			foreignField: 'twitchId'
		});

		return res.status(200).send(foundGame[0].teams);
	} catch (error) {
		console.error(error);
		return res.status(500).send("Couldn't handle the request. Please try again later.");
	}
})

router.get("/teams/:teamIndex", async (req, res) => {
	// Convert teamIndex to number
	const teamIndexValue = Number(req.params.teamIndex);

	// Check if user input is a postive number
	if (isNaN(teamIndexValue) || teamIndexValue < 1) {
		return res.status(400).send("The team number must be 1 or higher");
	}

	// Set the desired index to be the user input minus 1
	const desiredIndex = teamIndexValue - 1;

	try {
		const foundGame = await Game.aggregate([
			{ $match: { status: { $in: ["starting", "in-progress"] } } },
		]);

		// Check a game was found
		if (foundGame === null  || foundGame.length === 0) {
			return res.status(200).send("Unable to find any active games");
		}

		// Check if foundGame is just an array with an empty object
		if ( foundGame.length === 1 && Object.keys(foundGame[0]).length === 0) {
			return res.status(200).send("Unable to find team number " + teamIndexValue + " in any active games");
		}

		// Check the team exists in the game
		if (foundGame[0].teams.length < teamIndexValue) {
			return res.status(200).send("Unable to find team number " + teamIndexValue + " in any active games");
		}

		// Populate the teams with the players
		// No try/catch on this, as it will return just the player IDs if it fails
		await Game.populate(foundGame, {
			path: 'teams.players',
			model: User,
			select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame',
			foreignField: 'twitchId'
		});

		return res.status(200).send(foundGame[0].teams[desiredIndex]);
	} catch (error) {
		console.error(error);
		return res.status(500).send(error);
	}
})

router.get("/teams/:teamIndex/name", async (req, res) => {
	// Convert teamIndex to number
	const teamIndexValue = Number(req.params.teamIndex);

	// Check if user input is a postive number
	if (isNaN(teamIndexValue) || teamIndexValue < 1) {
		return res.status(400).send("The team number must be 1 or higher");
	}

	// Set the desired index to be the user input minus 1
	const desiredIndex = teamIndexValue - 1;

	try {
		const foundGame = await Game.aggregate([
			{ $match: { status: { $in: ["starting", "in-progress"] } } },
			{ $project: { _id: 0, teamName: { $arrayElemAt: ["$teams.name", desiredIndex] }	} }
		]);

		// Check a game was found
		if (foundGame === null  || foundGame.length === 0) {
			return res.status(200).send("Unable to find any active games");
		}

		// Check if foundGame is just an array with an empty object
		if ( foundGame.length === 1 && Object.keys(foundGame[0]).length === 0) {
			return res.status(200).send("Unable to find team number " + teamIndexValue + " in any active games");
		}

		// Check if the team name is set
		if (foundGame[0].teamName === null) {
			return res.status(200).send("Unable to find team " + teamIndexValue + "'s team name");
		}

		return res.status(200).send(foundGame[0].teamName);
	} catch (error) {
		console.error(error);
		return res.status(500).send(error);
	}
})

router.get("/teams/:teamIndex/points", async (req, res) => {
	// Convert teamIndex to number
	const teamIndexValue = Number(req.params.teamIndex);

	// Check if user input is a postive number
	if (isNaN(teamIndexValue) || teamIndexValue < 1) {
		return res.status(400).send("The team number must be 1 or higher");
	}

	// Set the desired index to be the user input minus 1
	const desiredIndex = teamIndexValue - 1;

	try {
		const foundGame = await Game.aggregate([
			{ $match: { status: { $in: ["starting", "in-progress"] } } },
			{ $project: { _id: 0, points: { $arrayElemAt: ["$teams.points", desiredIndex] }	} }
		]);

		// Check a game was found
		if (foundGame === null  || foundGame.length === 0) {
			return res.status(200).send("Unable to find any active games");
		}

		// Check if foundGame is just an array with an empty object
		if ( foundGame.length === 1 && Object.keys(foundGame[0]).length === 0) {
			return res.status(200).send("Unable to find team number " + teamIndexValue + " in any active games");
		}

		// Check if the team's points exist in the table
		if (foundGame[0].points === null || foundGame[0].points === undefined) {
			return res.status(200).send("Unable to find team " + teamIndexValue + "'s points");
		}

		return res.status(200).send(foundGame[0].points.toString());
	} catch (error) {
		console.error(error);
		return res.status(500).send(error);
	}
})

router.get("/teams/:teamIndex/players", async (req, res) => {
	// Convert teamIndex to number
	const teamIndexValue = Number(req.params.teamIndex);

	// Check if user input is a postive number
	if (isNaN(teamIndexValue) || teamIndexValue < 1) {
		return res.status(400).send("The team number must be 1 or higher");
	}

	// Set the desired index to be the user input minus 1
	const desiredIndex = teamIndexValue - 1;

	try {
		const foundGame = await Game.aggregate([
			{ $match: { status: { $in: ["starting", "in-progress"] } } }
		]).exec();
		
		// Check a game was found
		if (foundGame === null  || foundGame.length === 0) {
			return res.status(200).send("Unable to find any active games");
		}

		// Check the team exists in the game
		if (foundGame[0].teams.length < teamIndexValue) {
			return res.status(200).send("Unable to find team number " + teamIndexValue + " in any active games");
		}

		// Populate the teams with the players
		// No try/catch on this, as it will return just the player IDs if it fails
		await Game.populate(foundGame, {
			path: 'teams.players',
			model: User,
			select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame answer',
			foreignField: 'twitchId'
		});

		return res.status(200).send(foundGame[0].teams[desiredIndex].players);
	} catch (error) {
		console.error(error);
		return res.status(500).send("Couldn't handle the request. Please try again later.");
	}
})

router.get("/teams/:teamIndex/players/:playerIndex", async (req, res) => {
	// Convert teamIndex and playerIndex to number
	const teamIndexValue = Number(req.params.teamIndex);
	const playerIndexValue = Number(req.params.playerIndex);

	// Check if user input is a postive number
	if (isNaN(teamIndexValue) || teamIndexValue < 1) {
		return res.status(400).send("The team number must be 1 or higher");
	}
	if (isNaN(playerIndexValue) || playerIndexValue < 1) {
		return res.status(400).send("The player number must be 1 or higher");
	}

	// Set the desired indices to be the user input minus 1
	const desiredTeamIndex = teamIndexValue - 1;
	const desiredPlayerIndex = playerIndexValue - 1;

	try {
		const foundGame = await Game.aggregate([
			{ $match: { status: { $in: ["starting", "in-progress"] } } }
		]).exec();
		
		// Check a game was found
		if (foundGame === null  || foundGame.length === 0) {
			return res.status(200).send("Unable to find any active games");
		}

		// Check the team exists in the game
		if (foundGame[0].teams.length < teamIndexValue) {
			return res.status(200).send("Unable to find team number " + teamIndexValue + " in any active games");
		}

		// Check the player exists in the game
		if (foundGame[0].teams[desiredTeamIndex].players.length < playerIndexValue) {
			return res.status(200).send("Unable to find player number " + playerIndexValue + " in team " + teamIndexValue);
		}

		// Populate the teams with the players
		// No try/catch on this, as it will return just the player IDs if it fails
		await Game.populate(foundGame, {
			path: 'teams.players',
			model: User,
			select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame answer',
			foreignField: 'twitchId'
		});

		return res.status(200).send(foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex]);
	} catch (error) {
		console.error(error);
		return res.status(500).send("Couldn't handle the request. Please try again later.");
	}
})

router.get("/teams/:teamIndex/players/:playerIndex/:key", async (req, res) => {
	// Convert teamIndex and playerIndex to number
	const teamIndexValue = Number(req.params.teamIndex);
	const playerIndexValue = Number(req.params.playerIndex);
	const targetKey = String(req.params.key);

	// Check if user input is a postive number
	if (isNaN(teamIndexValue) || teamIndexValue < 1) {
		return res.status(400).send("The team number must be 1 or higher");
	}
	if (isNaN(playerIndexValue) || playerIndexValue < 1) {
		return res.status(400).send("The player number must be 1 or higher");
	}

	// Set the desired indices to be the user input minus 1
	const desiredTeamIndex = teamIndexValue - 1;
	const desiredPlayerIndex = playerIndexValue - 1;

	try {
		const foundGame = await Game.aggregate([
			{ $match: { status: { $in: ["starting", "in-progress"] } } }
		]).exec();
		
		// Check a game was found
		if (foundGame === null  || foundGame.length === 0) {
			return res.status(200).send("Unable to find any active games");
		}

		// Check the team exists in the game
		if (foundGame[0].teams.length < teamIndexValue) {
			return res.status(200).send("Unable to find team number " + teamIndexValue + " in any active games");
		}

		// Check the player exists in the game
		if (foundGame[0].teams[desiredTeamIndex].players.length < playerIndexValue) {
			return res.status(200).send("Unable to find player number " + playerIndexValue + " in team " + teamIndexValue);
		}

		// Check the targetKey exists in the game
		if (foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex].targetKey === null) {
			return res.status(200).send("Unable to find player " + playerIndexValue + "'s " + targetKey);
		}

		// Populate the teams with the players
		// No try/catch on this, as it will return just the player IDs if it fails
		await Game.populate(foundGame, {
			path: 'teams.players',
			model: User,
			select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame answer',
			foreignField: 'twitchId'
		});

		// Key-specific returns
		switch (targetKey) {
			case "answer": 
				return res.status(200).send("<img src='" + foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex][targetKey] + "' alt='Answer' width='900' height='506' />");
			case "profileImage":
				return res.status(200).send('<img src="' + foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex].profileImageUrl + '" alt="Player ' + playerIndexValue + '\'s profile image" width="300" height="300">');
			default: 
				return res.status(200).send(foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex][targetKey]);
		}
	} catch (error) {
		console.error(error);
		return res.status(500).send("Couldn't handle the request. Please try again later.");
	}
})

module.exports = router;