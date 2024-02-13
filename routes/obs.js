const express = require("express");
const router = express.Router();
const { checkAuthenticated } = require("../helpers");

// Pull in socket.io
const io = require('../app');

const Game = require("../models/gameModel.js");
const User = require("../models/userModel.js");
const Question = require("../models/questionModel.js");

router.get("/", checkAuthenticated, (req, res) => {
	const failureMessage = req.flash("error")[0]; // Retrieve the flash message
	const successMessage = req.flash("success")[0]; // Retrieve the flash message
	if (req.user.role == "admin") {res.render("admin", {user: req.user, failureMessage, successMessage})}
	else {res.render("game", {user: req.user, failureMessage, successMessage})}
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

module.exports = router;