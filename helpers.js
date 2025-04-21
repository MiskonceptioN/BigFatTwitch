const Game = require("./models/gameModel.js");
const axios = require("axios");
const cheerio = require('cheerio');

const checkAuthenticated = (req, res, next) => {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect("/login");
};

/**
 * Asynchronously checks for a currently running game.
 *
 * This function queries the database to find a game with the status "in-progress".
 * If a game is found, it returns the game object. If an error occurs during the
 * query, it logs the error to the console.
 *
 * @returns {Promise<Object|null>} A promise that resolves to the currently running game object, or null if no game is found.
 */
const checkForRunningGame = async () => {
	let currentlyRunningGame;
	try {currentlyRunningGame = await Game.findOne({ status: "in-progress" })}
		catch (error) {console.error("Error finding currently running game:", error)}
	return currentlyRunningGame;
};

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

async function fetchTwitchChatColour (uid) {
	// Get Twitch Access Token
	const params = new URLSearchParams();
	params.append("client_id", process.env.TWITCH_CLIENT_ID);
	params.append("client_secret", process.env.TWITCH_CLIENT_SECRET);
	params.append("grant_type", "client_credentials");

	const result = await axios.post("https://id.twitch.tv/oauth2/token", params);
	const accessToken = result.data.access_token;
	const colorResult = await axios.get("https://api.twitch.tv/helix/chat/color?user_id=" + uid, {
		headers: {
			"Authorization": `Bearer ${accessToken}`,
			"Client-Id": process.env.TWITCH_CLIENT_ID
		}
	})
	const userInfo = colorResult.data.data[0];
	return userInfo.color;
}

async function saveSession(req) {
	await new Promise((resolve, reject) => {
		req.session.save(err => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

async function fetchFromAPI(url) {
	try {
		const response = await axios.get(url);
		const $ = cheerio.load(response.data);

		// First check for text, then img src, then return empty string if all else fails
		let returnString = $("p").text();
		if (returnString === undefined) {returnString = $("img").attr("src")}
		if (returnString === undefined) {returnString = ""}

		return returnString;

	} catch (error) {
		console.error("Error fetching data from API:", error);
		return "";
	}
}

module.exports = {
	checkAuthenticated, checkForRunningGame, generateGameCode, createErrorHTML, fetchTwitchChatColour, saveSession, fetchFromAPI
};
