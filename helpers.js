const Game = require("./models/gameModel.js");

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

module.exports = {
    checkAuthenticated, generateGameCode, createErrorHTML
};
