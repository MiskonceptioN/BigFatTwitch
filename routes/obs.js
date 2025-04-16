const express = require("express");
const router = express.Router();
const { checkAuthenticated } = require("../helpers");

// Pull in socket.io
const io = require('../app');

const Game = require("../models/gameModel.js");
const User = require("../models/userModel.js");

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
		console.log({foundQuestion});
		console.log(typeof foundQuestion);
		if (foundQuestion === null || foundQuestion[0] === undefined || foundQuestion[0].length === 0) {
			return res.render("obs/question", {question: ""});
		}

		res.render("obs/question", {question: foundQuestion[0].question});
	} catch (error) {
		console.error(error);
		return res.render("obs/question", {question: ""});
	}
})

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
			select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame',
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
		return res.splayer(400).send("The player number must be 1 or higher");
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
			select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame',
			foreignField: 'twitchId'
		});

		return res.status(200).send(foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex]);
	} catch (error) {
		console.error(error);
		return res.status(500).send("Couldn't handle the request. Please try again later.");
	}
})

router.get("/teams/:teamIndex/players/:playerIndex/broadcasterType", async (req, res) => {
	// Convert teamIndex and playerIndex to number
	const teamIndexValue = Number(req.params.teamIndex);
	const playerIndexValue = Number(req.params.playerIndex);

	// Check if user input is a postive number
	if (isNaN(teamIndexValue) || teamIndexValue < 1) {
		return res.status(400).send("The team number must be 1 or higher");
	}
	if (isNaN(playerIndexValue) || playerIndexValue < 1) {
		return res.splayer(400).send("The player number must be 1 or higher");
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

		// Check the broadcasterType exists in the game
		if (foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex].broadcasterType === null) {
			return res.status(200).send("Unable to find player " + playerIndexValue + "'s broadcasterType");
		}

		// Populate the teams with the players
		// No try/catch on this, as it will return just the player IDs if it fails
		await Game.populate(foundGame, {
			path: 'teams.players',
			model: User,
			select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame',
			foreignField: 'twitchId'
		});

		return res.status(200).send(foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex].broadcasterType);
	} catch (error) {
		console.error(error);
		return res.status(500).send("Couldn't handle the request. Please try again later.");
	}
})

router.get("/teams/:teamIndex/players/:playerIndex/twitchChatColour", async (req, res) => {
	// Convert teamIndex and playerIndex to number
	const teamIndexValue = Number(req.params.teamIndex);
	const playerIndexValue = Number(req.params.playerIndex);

	// Check if user input is a postive number
	if (isNaN(teamIndexValue) || teamIndexValue < 1) {
		return res.status(400).send("The team number must be 1 or higher");
	}
	if (isNaN(playerIndexValue) || playerIndexValue < 1) {
		return res.splayer(400).send("The player number must be 1 or higher");
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

		// Check the twitchChatColour exists in the game
		if (foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex].twitchChatColour === null) {
			return res.status(200).send("Unable to find player " + playerIndexValue + "'s twitchChatColour");
		}

		// Populate the teams with the players
		// No try/catch on this, as it will return just the player IDs if it fails
		await Game.populate(foundGame, {
			path: 'teams.players',
			model: User,
			select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame',
			foreignField: 'twitchId'
		});

		return res.status(200).send(foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex].twitchChatColour);
	} catch (error) {
		console.error(error);
		return res.status(500).send("Couldn't handle the request. Please try again later.");
	}
})

router.get("/teams/:teamIndex/players/:playerIndex/customChatColour", async (req, res) => {
	// Convert teamIndex and playerIndex to number
	const teamIndexValue = Number(req.params.teamIndex);
	const playerIndexValue = Number(req.params.playerIndex);

	// Check if user input is a postive number
	if (isNaN(teamIndexValue) || teamIndexValue < 1) {
		return res.status(400).send("The team number must be 1 or higher");
	}
	if (isNaN(playerIndexValue) || playerIndexValue < 1) {
		return res.splayer(400).send("The player number must be 1 or higher");
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

		// Check the customChatColour exists in the game
		if (foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex].customChatColour === null) {
			return res.status(200).send("Unable to find player " + playerIndexValue + "'s customChatColour");
		}

		// Populate the teams with the players
		// No try/catch on this, as it will return just the player IDs if it fails
		await Game.populate(foundGame, {
			path: 'teams.players',
			model: User,
			select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame',
			foreignField: 'twitchId'
		});

		return res.status(200).send(foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex].customChatColour);
	} catch (error) {
		console.error(error);
		return res.status(500).send("Couldn't handle the request. Please try again later.");
	}
})

router.get("/teams/:teamIndex/players/:playerIndex/twitchId", async (req, res) => {
	// Convert teamIndex and playerIndex to number
	const teamIndexValue = Number(req.params.teamIndex);
	const playerIndexValue = Number(req.params.playerIndex);

	// Check if user input is a postive number
	if (isNaN(teamIndexValue) || teamIndexValue < 1) {
		return res.status(400).send("The team number must be 1 or higher");
	}
	if (isNaN(playerIndexValue) || playerIndexValue < 1) {
		return res.splayer(400).send("The player number must be 1 or higher");
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

		// Check the twitchId exists in the game
		if (foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex].twitchId === null) {
			return res.status(200).send("Unable to find player " + playerIndexValue + "'s twitchId");
		}

		// Populate the teams with the players
		// No try/catch on this, as it will return just the player IDs if it fails
		await Game.populate(foundGame, {
			path: 'teams.players',
			model: User,
			select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame',
			foreignField: 'twitchId'
		});

		return res.status(200).send(foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex].twitchId);
	} catch (error) {
		console.error(error);
		return res.status(500).send("Couldn't handle the request. Please try again later.");
	}
})

router.get("/teams/:teamIndex/players/:playerIndex/displayName", async (req, res) => {
	// Convert teamIndex and playerIndex to number
	const teamIndexValue = Number(req.params.teamIndex);
	const playerIndexValue = Number(req.params.playerIndex);

	// Check if user input is a postive number
	if (isNaN(teamIndexValue) || teamIndexValue < 1) {
		return res.status(400).send("The team number must be 1 or higher");
	}
	if (isNaN(playerIndexValue) || playerIndexValue < 1) {
		return res.splayer(400).send("The player number must be 1 or higher");
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

		// Check the displayName exists in the game
		if (foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex].displayName === null) {
			return res.status(200).send("Unable to find player " + playerIndexValue + "'s displayName");
		}

		// Populate the teams with the players
		// No try/catch on this, as it will return just the player IDs if it fails
		await Game.populate(foundGame, {
			path: 'teams.players',
			model: User,
			select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame',
			foreignField: 'twitchId'
		});

		return res.status(200).send(foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex].displayName);
	} catch (error) {
		console.error(error);
		return res.status(500).send("Couldn't handle the request. Please try again later.");
	}
})

router.get("/teams/:teamIndex/players/:playerIndex/profileImage", async (req, res) => {
	// Convert teamIndex and playerIndex to number
	const teamIndexValue = Number(req.params.teamIndex);
	const playerIndexValue = Number(req.params.playerIndex);

	// Check if user input is a postive number
	if (isNaN(teamIndexValue) || teamIndexValue < 1) {
		return res.status(400).send("The team number must be 1 or higher");
	}
	if (isNaN(playerIndexValue) || playerIndexValue < 1) {
		return res.splayer(400).send("The player number must be 1 or higher");
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

		// Check the profileImageUrl exists in the game
		if (foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex].profileImageUrl === null) {
			return res.status(200).send("Unable to find player " + playerIndexValue + "'s profileImageUrl");
		}

		// Populate the teams with the players
		// No try/catch on this, as it will return just the player IDs if it fails
		await Game.populate(foundGame, {
			path: 'teams.players',
			model: User,
			select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame',
			foreignField: 'twitchId'
		});

		return res.status(200).send('<img src="' + foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex].profileImageUrl + '" alt="Player ' + playerIndexValue + '\'s profile image">');
	} catch (error) {
		console.error(error);
		return res.status(500).send("Couldn't handle the request. Please try again later.");
	}
})

router.get("/teams/:teamIndex/players/:playerIndex/profileImageUrl", async (req, res) => {
	// Convert teamIndex and playerIndex to number
	const teamIndexValue = Number(req.params.teamIndex);
	const playerIndexValue = Number(req.params.playerIndex);

	// Check if user input is a postive number
	if (isNaN(teamIndexValue) || teamIndexValue < 1) {
		return res.status(400).send("The team number must be 1 or higher");
	}
	if (isNaN(playerIndexValue) || playerIndexValue < 1) {
		return res.splayer(400).send("The player number must be 1 or higher");
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

		// Check the profileImageUrl exists in the game
		if (foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex].profileImageUrl === null) {
			return res.status(200).send("Unable to find player " + playerIndexValue + "'s profileImageUrl");
		}

		// Populate the teams with the players
		// No try/catch on this, as it will return just the player IDs if it fails
		await Game.populate(foundGame, {
			path: 'teams.players',
			model: User,
			select: '_id twitchId displayName profileImageUrl broadcasterType chatColour twitchChatColour customChatColour inGame',
			foreignField: 'twitchId'
		});

		return res.status(200).send(foundGame[0].teams[desiredTeamIndex].players[desiredPlayerIndex].profileImageUrl);
	} catch (error) {
		console.error(error);
		return res.status(500).send("Couldn't handle the request. Please try again later.");
	}
})

module.exports = router;