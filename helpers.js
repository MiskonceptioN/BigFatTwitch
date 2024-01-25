const Game = require("./models/gameModel.js");
const axios = require("axios");

const checkAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");
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

module.exports = {
    checkAuthenticated, generateGameCode, createErrorHTML, fetchTwitchChatColour
};
