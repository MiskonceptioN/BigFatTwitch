const Game = require("./models/gameModel.js");
const User = require("./models/userModel.js");
const ChatLog = require("./models/chatLogModel.js");
const axios = require("axios");
const cheerio = require('cheerio');

let adminUsers = [];// Store admin users when the server starts

// Function to initialize admin users
async function initializeAdminUsers() {
	try {
		// Fetch admin users from the database
		const admins = await User.find({ role: "admin" });
		if (admins.length > 0) {
			admins.forEach(admin => {adminUsers.push(admin)});
			console.log(`Loaded ${adminUsers.length} admin users into memory`);
		} else {
			console.log("No admin users found in the database.");
		}
	} catch (error) {
		console.error("Failed to load admin users:", error);
		// Retry after a delay if failed
		setTimeout(initializeAdminUsers, 5000);
	}
}

// Initialize admin users when the module is loaded
initializeAdminUsers();

// Export getter function to access admin users
const getAdminUsers = () => [...adminUsers];

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
	try {
		const currentlyRunningGame = await Game.findOne({ status: "in-progress" });
		return currentlyRunningGame || null;
	} catch (error) {
		console.error("Error finding currently running game:", error);
		return null;
	}
};

/**
 * Sanitises a string by replacing special HTML characters with their corresponding HTML entities.
 * This helps prevent XSS (Cross-Site Scripting) attacks by escaping characters that have special meaning in HTML.
 *
 * @param {string} str - The input string to sanitise.
 * @returns {string} The sanitised string with special characters replaced by HTML entities.
 */
const sanitiseString = (str) => {
	return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/\//g, "&#x2F;");
}

function prepUserMessage(msg, user){
	let prefix, username, colour;
	const adminUsers = getAdminUsers();
	const isAdmin = adminUsers.some(admin => admin.displayName === user.displayName);
	const santisedMsg = sanitiseString(msg);
	
	if (isAdmin) {
		username = "Admin";
		colour = "red";
	} else {
		username = user.displayName;
		switch (user.chatColour) {
			case "custom":
				colour = user.customChatColour
				break;
			case "twitch":
				colour = user.twitchChatColour;
				break;
			default:
				colour = "black";
				break;
		}
	}
	
	prefix = "<span class='chat-player-name' style='color: " + colour + "'>" + username + "</span>";
	
	if (isAdmin) { return `<span class='admin-chat-message'>${prefix}: ${santisedMsg}</span>` }
	return `${prefix}: ${santisedMsg}`;
}

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
	try {
		// Check if the code already exists in the database
		const existingCode = await Game.findOne({ code: code });
		return !existingCode;
	} catch (error) {
		console.error("Error checking game code uniqueness:", error);
		return false;
	}
}

function createErrorHTML(errors) {
	if (errors.length === 1) return errors[0];
	try {
		return "The following errors occurred:<ul><li>" + errors.join("</li><li>") + "</li></ul>";
	} catch (err) {
		console.error("Error creating error HTML:", err);
		return "An unknown error occurred.";
	}
}

async function fetchTwitchChatColour (uid) {
	// Get Twitch Access Token
	const params = new URLSearchParams();
	params.append("client_id", process.env.TWITCH_CLIENT_ID);
	params.append("client_secret", process.env.TWITCH_CLIENT_SECRET);
	params.append("grant_type", "client_credentials");

	try {
		// Make a POST request to get the access token
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
	} catch (error) {
		console.error("Error fetching Twitch chat colour:", error);
		return "#000000"; // Default colour if there's an error
	}
}

async function saveSession(req) {
	try {
		await new Promise((resolve, reject) => {
			req.session.save(err => {
				if (err) {reject(err)}
				else {resolve()}
			});
		});
	} catch (error) {
		console.error("Error saving session:", error);
	}
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

async function fetchChatLog (game, room, limit = 20) {
	try {
		const databaseChatLog = await ChatLog.aggregate([
			{ $match: { game: game._id, room: room } },
			{ $sort: { createdAt: -1 } },
			{ $limit: limit },
			{
				$lookup: {
					from: "users", // The name of the User collection
					localField: "userId", // Field in ChatLog
					foreignField: "twitchId", // Field in User
					as: "user"
				}
			},
			{
				$project: {
					message: 1,
					room: 1,
					user: {
						displayName: { $arrayElemAt: ["$user.displayName", 0] },
						chatColour: { $arrayElemAt: ["$user.chatColour", 0] },
						customChatColour: { $arrayElemAt: ["$user.customChatColour", 0] },
						twitchChatColour: { $arrayElemAt: ["$user.twitchChatColour", 0] }
					}
				}
			}
		]);

		const chatLog = databaseChatLog.map(log => prepUserMessage(log.message, log.user[0]));

		return chatLog.reverse(); // Reverse the order to show the oldest messages first
	} catch (error) {
		console.error("Error fetching chat log:", error);
		return [];
	}
}

module.exports = {
	checkAuthenticated, checkForRunningGame, prepUserMessage, generateGameCode, createErrorHTML, fetchTwitchChatColour, saveSession, fetchFromAPI, fetchChatLog, getAdminUsers
};