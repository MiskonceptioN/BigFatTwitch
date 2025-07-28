const express = require("express");
const router = express.Router();

const Game = require("../models/gameModel.js");
const User = require("../models/userModel.js");
const Question = require("../models/questionModel.js");
const Answer = require("../models/answerModel.js");

router.get("/", (req, res) => {
	res.render("obs")
});

router.get("/question", async (req, res) => {
	try {
		// Find the first in-progress Game, and grab the first in-progress question
		let foundQuestion = await Game.findOne({ status: "in-progress" })
		.populate({
			path: 'questions',
			match: { status: "in-progress" },
			options: { sort: { round: 1, order: 1, limit: 1 } }
		});

		// Check a question was found
		if (foundQuestion === null || foundQuestion.questions.length === 0 || foundQuestion.questions[0].question === null) {
			return res.render("obs/question", {question: ""});
		}

		res.render("obs/question", {question: foundQuestion.questions[0].question});
	} catch (error) {
		console.error(error);
		return res.render("obs/question", {question: ""});
	}
})

router.get("/view-answers/:questionId", async (req, res) => {
	const questionID = req.params.questionId;

	try {
		// Retrieve question from DB
		let foundQuestion = await Question.findOne({ _id: questionID })
			.populate({
				path: 'contestantAnswers',
				model: Answer,
			});

		if (!foundQuestion) {
			return res.status(404).send({ message: "Question not found" });
		}
		return res.send(foundQuestion.contestantAnswers);
	} catch (error) {
		console.error("Error retrieving question:", error);
		return res.status(500).send({"message": "Error retrieving question"});
	}
})

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
		const foundGame = await Game.findOne({ status: { $in: ["starting", "in-progress"] } });
		// Ensure a game was found
		if (!foundGame) {
			return res.status(200).send("Unable to find any active games");
		}

		const teamPlayers = foundGame.teams[desiredIndex].players;
		const allTeamPoints = await Answer.find({ game: foundGame.code, contestant: { $in: teamPlayers } });
		const teamPoints = allTeamPoints.reduce((total, answer) => {
			return total + answer.points;
		}, 0);

		return res.status(200).send(teamPoints.toString());
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
				return res.render("obs/answer", {
					answer: foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex][targetKey],
					playerTwitchID: foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex].twitchId});
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