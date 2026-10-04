// Navigation and utility button handlers
const defaultImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAANSURBVBhXY2BgYGAAAAAFAAGKM+MAAAAAAElFTkSuQmCC";
$("#previous-round").on("click", function(){navigateRound("previous")});
$("#next-round").on("click", function(){navigateRound("next")});
$("#finalise-points").on("click", function(){finalisePoints()});
$("#blank-answers").on("click", function(){sendEmptyAnswers()});

// Control the phase selector buttons
$("#question-phase-button").click(function() {
	$(this).removeClass("btn-secondary").addClass("btn-primary");
	$("#scoring-phase-button").removeClass("btn-primary").addClass("btn-secondary");

	// Disable dark mode
	$("html").attr("data-bs-theme", "light");

	
	$(".phase-question").removeClass("d-none");
	$(".phase-scoring").addClass("d-none");
});
$("#scoring-phase-button").click(function() {
	$(this).removeClass("btn-secondary").addClass("btn-primary");
	$("#question-phase-button").removeClass("btn-primary").addClass("btn-secondary");

	// Enable dark mode
	$("html").attr("data-bs-theme", "dark");

	$(".phase-scoring").removeClass("d-none");
	$(".phase-question").addClass("d-none");
});

// Click handler for the reset-round-questions button
$("#reset-round-questions").on("click", function(event){
	const roundNumber = $(".current-round").data("round");

	if (confirm("Are you sure you want to reset all questions for round " + roundNumber + "?\nThis will reset all questions to the 'pending' state?")){
		resetQuestions(roundNumber);
	}
});
// Click handler for the reset-game-questions button
$("#reset-game-questions").on("click", function(event){
	if (confirm("Are you sure you want to reset ALL questions for EVERY round?\nThis will reset all questions to the 'pending' state?")){
		resetQuestions("all");
	}
});

// Click handler for the reset-game-questions button
$("#end-game").on("click", function(event){
	if (confirm("Are you sure you want to set this game to 'pending' state?")){
		endGame();
	}
});

// Click handler for the end-round button
$("#end-round").on("click", function(event){
	const allCards = $(".current-round .card");
	const allCardsValid = allCards.toArray().every(card => {
		return $(card).hasClass("bg-success") || $(card).hasClass("bg-secondary");
	});

	if (!allCardsValid) {
		// Thanks Endergamer... muh true bebbeh... Not Cezz
		if (!confirm("Not all questions have been asked!\nAre you sure you want to end the round?")){return}
	} else {
		if (!confirm("Are you sure you want to end the round?")){return}
	}
	endRound();
});

// Click handler for the start round button
$("#start-round").on("click", function(event){
	const currentRoundNumber = $(".current-round").data("round");
	navigateRound(currentRoundNumber);
});

// Click handler for the restart round button
$("#restart-round").on("click", function(event){
	if (!confirm("Are you sure you want to restart the round?")){return}
	const currentRoundNumber = $(".current-round").data("round");

	restartRound(currentRoundNumber)
});

// Manage team review section
$(".review-team-selector").on("click", function() {
	// Remove the active class from all buttons and add it to the clicked button
	const targetTeam = $(this).data("target-team");
	$(".review-team-selector").removeClass("btn-success").addClass("btn-primary");
	$(this).removeClass("btn-primary").addClass("btn-success");

	// Show all review panels if "All teams" is clicked, otherwise show the selected team's review panel
	if ($(this).attr("id") === "review-all-teams") {
		$("#answer-review-panel > .admin-background").removeClass("d-none");
	} else {
		$("#answer-review-panel > .admin-background").addClass("d-none");
		$("#team-" + targetTeam + "-review").removeClass("d-none");
	}
});

// Click handler for the lock/unlock canvas buttons
$("#lock-canvas").on("click", async function(event){sendCanvasState("lock")});
$("#unlock-canvas").on("click", async function(event){sendCanvasState("unlock")});

// Click handler for the lock/unlock submit buttons
$("#lock-submit-button").on("click", async function(event){sendSubmitState("lock")});
$("#unlock-submit-button").on("click", async function(event){sendSubmitState("unlock")});

// Click handler for the user logout buttons
$(".logout-button").on("click", function(event){
	const playerId = $(this).data("player-id");
	const gameCode = $(this).data("game-code");
	if (confirm("Are you sure you want to log out this user? "+ playerId + " " + gameCode)){
		logOutUser(playerId, gameCode);
	}
});

// Handle display of rounds
$(document).ready(function(){
	// Show the first round
	$(".round").first().removeClass("d-none").addClass("current-round");

	// Handle the click event
	$(".round-selector").on("click", function(){
		// Hide all rounds
		$(".round").addClass("d-none").removeClass("current-round");

		// Get the round number
		const roundNumber = $(this).attr("data-round");

		// Show the selected round
		$(".round[data-round='" + roundNumber + "']").removeClass("d-none").addClass("current-round");

		// Disable the previous round button if the first round is selected
		if (roundNumber === "1") $("#previous-round").prop("disabled", true);
		else $("#previous-round").prop("disabled", false);

		// Disable the next round button if the last round is selected
		if (roundNumber === $(".round-selector").length.toString()) $("#next-round").prop("disabled", true);
		else $("#next-round").prop("disabled", false);
	});
});

let previousQuestion = null;

$("form.send-question").on("submit", function(event){
	event.preventDefault(); //prevent default action
	const destUrl = $(this).attr("action"); //get form action url
	const formMethod = $(this).attr("method"); //get form GET/POST method
	// const formData = $(this).serialize(); //Encode form elements for submission
	// Grab gameCode from the form
	const gameCode = $(this).find("input[name='gameCode']").val();

	const form = $(this);
	const inputButton = $(form).find(".send-question");
	const inputButtonContent = $(inputButton).html();
	const questionId = $(this).find('input[name="questionId"]').val();
	const question = $(this).find('input[name="sendQuestion"]').val();
	const roundNumber = $(form).find("input[name='roundNumber']").val();
	const $navButton = $("#round-nav").find("button[data-round='" + roundNumber + "']");
	const roundType = $navButton.parent().data('round-type');
	$.ajax({
		method: formMethod,
		url: destUrl,
		data: JSON.stringify({questionId, roundNumber, gameCode, sendQuestion: question}),
		contentType: "application/json",
		beforeSend: function() {
			// Show loading spinner before sending the form
			$(inputButton).html('<div class="spinner-border" role="status"></div>');
		},
		success: function(msg) {
			$(form).parent().parent().addClass("bg-success");

			// Hide the interstitial if it's visible
			socket.emit("show interstitial", false);

			// Re-enable and empty all the point forms, removing any instance of .is-valid
			resetPointForms();
			// Reset the canvas states
			resetCanvases();

			// Reset the button contents
			$(inputButton).html(inputButtonContent);

			// Set the previousQuestion
			if (previousQuestion !== questionId){
				updatePrevious(previousQuestion, gameCode);
				previousQuestion = questionId;
			}

			// Update the save button with the question ID
			$("#save-answers").data("question-id", questionId);

			// Rearrange #round-nav
			// if all questions have been played


			// if it's the first question in a new round
			if (roundType !== "in-progress"){
				// Style the button as in-progress
				$navButton.removeClass("btn-secondary").removeClass("btn-primary").addClass("btn-success");
		
				// Move the button to the "in-progress" section of the nav
				$navButton.detach().appendTo('[data-round-type="in-progress"]');
			}
		
		},
		error: function(err) {
			// Log and show error message
			console.log("Request failed", err);
			$("#loading").removeClass("d-flex").addClass("d-none");
			$("#message").removeClass().addClass("alert").addClass("alert-danger").html("Request failed with status " + err.status);
			$("#message").collapse("show");

			// Reset the button contents
			$(inputButton).html(inputButtonContent);
		}
	});
});

$("a.resend-question").on("click", function(event){
	event.preventDefault();

	const playerId = $(this).data("player-id");
	const questionText = $(this).closest("form").find('input[name="sendQuestion"]').val();
	const questionId = $(this).closest("form").find("input[name='questionId']").val();

	socket.emit("resend question", playerId, questionText, questionId);
});

// Collect the answer data from the player canvases and save them to DB
$("#save-answers").on("click", function(event){
	if (!$(this).data("question-id")) return;

	const answerData = {
		game: $(this).data("game-code"),
		questionId: $(this).data("question-id"),
		answers: {}
	};

	$(".canvas-container").each(function(){
		let contestant = $(this).attr("id").replace("-Answer", "");
		let answer = $(this).attr("src");
		answerData.answers[contestant] = answer;
	});

	socket.emit("save answers", answerData);
});

$("form.fetch-answers").on("submit", function(event){
	event.preventDefault(); //prevent default action
	const destUrl = $(this).attr("action"); //get form action url
	const formMethod = $(this).attr("method"); //get form GET/POST method

	// Grab questionId from the form
	const questionId = $(this).find("input[name='questionId']").val();
	const questionText = $(this).closest(".card-body").find(".card-title").text();
	updateQuestionPreview(questionText, questionId);

	const form = $(this);
	const inputButton = $(form).find("button.fetch-answers");
	const inputButtonContent = $(inputButton).html();
	const sendToAudienceButton = $(form).find(".send-to-audience-button");

	$.ajax({
		method: formMethod,
		url: destUrl,
		data: JSON.stringify({questionId}),
		contentType: "application/json",

		beforeSend: function() {
			// Show loading spinner before sending the form
			$(inputButton).html('<div class="spinner-border" role="status"></div>');

			// Reset player canvases on OBS
			sendEmptyAnswers();

			// Reset all "send answers to audience" buttons
			$(".send-to-audience-button").prop("disabled", true);
		},
		success: function(msg) {
			// Reset the button contents
			$(inputButton).html(inputButtonContent);

			if (msg.status === "success") {
				// Update contestant canvases
				populateAnswers(msg.content);

				// Update the /obs/question endpoint
				socket.emit("next question", questionText, questionId);

				sendToAudienceButton.prop("disabled", false);
			} else {
				$("#message").removeClass().addClass("alert").addClass("alert-dismissible").addClass("alert-danger").html(msg.content + '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>');
				$("#message").collapse("show");
			}
		},
		error: function(err) {
			// Log and show error message
			console.log("Request failed", err);
			$("#message").removeClass().addClass("alert").addClass("alert-dismissible").addClass("alert-danger").html(err.content);
			$("#message").collapse("show");

			// Reset the button contents
			$(inputButton).html(inputButtonContent);
		}
	});
});

$("form.points-form").on("submit", function(event){
	event.preventDefault(); //prevent default action
	const destUrl = $(this).attr("action"); //get form action url
	const formMethod = $(this).attr("method"); //get form GET/POST method

	const form = $(this);
	const inputButton = $(form).find("button");
	const inputButtonContent = $(inputButton).html();

	// Grab the relevant data to be submitted
	const gameCode = $(this).find("input[name='gameCode']").val();
	const userId = $(this).find("input[name='userId']").val();
	const teamId = $(this).find("input[name='teamId']").val();
	const questionId = $("#current-question").data("question-id");
	const points = $(form).find('input[name="points"]').val();
	const pointFormID = $(form).find('input[name="pointFormID"]').val();

	$.ajax({
		method: formMethod,
		url: destUrl,
		data: JSON.stringify({gameCode, userId, teamId, questionId, points, pointFormID}),
		contentType: "application/json",

		beforeSend: function() {
			// Show loading spinner before sending the form
			$(inputButton).html('<div class="spinner-border" role="status"></div>');
			// Deselect the input
			$(form).find('input[name="points"]').blur();
		},
		success: function(msg) {
			// Reset the button contents
			$(inputButton).html(inputButtonContent);
		},
		error: function(err) {
			// Log and show error message
			console.log("Request failed", err);
			$("#loading").removeClass("d-flex").addClass("d-none");
			$("#message").removeClass().addClass("alert").addClass("alert-danger").html("Request failed with status " + err.status);
			$("#message").collapse("show");

			// Reset the button contents
			$(inputButton).html(inputButtonContent);
		}
	});
});

$(".send-to-audience").on("click", function(event){
	event.preventDefault();
	
	const defaultImage = "data:image/png;base64,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GWzKWJLG2qQhTGFI4ZoULmkSJknCJHGsC9bF4OK6SdLpNE3NTXR2trJ+UzeX7drM7r1b2b13M1devZ7N27vo6mki35QmkWisZ5zVs2YxjImqpVMTNbyzrCWkEccTCZfRvhJBHQYG+9lzzZV0d7U2AiE4jsPE2ADV8mEcJ83UtEuhePrWE9p2QkRkdTnLW4iIiFxM7rqjpw34cq1WuXb3VVfyC+94AwmnwkP3/yO1Sj+Ok240lcnRNxgwXfSpe3DnTSFXXhJS8eDYmOGJAYPnBmDCU6p71gYkEinyTU20tbXQ0pInm42av8xUDOcLOmFo6ezJsmlbE467tDA4n5k1djNvbkEQ4tUDSqUaxekapUKNqckyxUKVaqVOvRac6Mbp+1GH0ZkqpnFMtL1E0iWRdEmnE+TyaZpbs+SbMqTSLulUgkwuSTaXJJVO4DjRZvczQXixFcAFsfDsk5N2erJuFjJtFODZh0bY/+1BKvUJXv+6V/ODb3wBrus2fubZ6wjbOXg0w/6DydPWkKpCKCKyuuiPuojIKvLC23tSxvCxIPBf3d3dyW//+k/QlPd4+L5/oF4bxXFSJwLh8YGAQskn8OGWmwIybSGHxi1TtShYzX6DMMaQz+do72inpTVPJpMm0QiBMwHqTKyFbM5l++VtjTWD8VusHHNyGig0gmm0xcTJwBb4YXQ0AqG1UQUuCoNRsxvjRFW0E4Evyr9wolq5guHvdFMGRg48NbVtcrzmLCQQGscwOVTm/s8cpl7zaG1t5nd/861s2NBDGIYYYxgZ3M8Tj/wVxrQwPJbi4X3p+GkUCEVERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERE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1XyBcCWmja7GDqPMM2VUwU5ELkgKhCJysfv3+MAyGVjhxjVnMrqM970zPnAO5gt+840vxEoEQoDPxAeWyT/GB86jz5ylqQwrEKiCMwRCVQiXRp+5ROSCpD9OInKxW6n1YwB/ssitB5bqj4FKfPD7YL7gN9/4QqzElFFW8HWwXJXaxVhIGF3uQDXX+sEZj8UHlsFyB9oLmT5zicgFSX+cRORi9x/xgWVUBX4qPrjCPriMWylsjw+co/mC33zjC7FSFcIPxgeWyTHgbfHB8+CPFrg2crkD4ZnOtxKB8Ez3dzHTlFERuWgoEIrIavD5+MAy+k/gtfHBFfJR4Cfig0uwlPWDnCH4zTe+EEvZl/Fsvh0fWCZ/D/xGfHAFfQr43fjgPJY7UJ2pYheuQFfQ5X78FzJ95hKRC5L+OInIarBS0wVnfKIRCleqgQ2N4Pnm+OASXYiBEKArPrBMVvJ18OeNjrGF+BXL7H+d4z9AHI4PLNHZtpZ4ND6wRCv539SFRp+5ROSCpD9OIrIarGQQmPGJxhTMf4hfsURPA28CXhO/YhlcqIFwpdYRrlSDoRkfAa5codfbV4GbgV+bZ6/F8+Vs00KXMxCebY/Fi5mmjIrIRUOBUERWgyngvvjgCuhrbDR/9xI2rp/xBPA/gMuAj8WvXCaXxQfO0Xh8oGGpgXCl1hEeaQTslXQMeANwNfCuRjfaxSoC/wy8EbhzAXsOzmc5p10+Hh+IeSQ+sARnmp66Gukzl4hckEx8QEREFqwFuAt4IXAH0D3PGrkqMNJYf/XZxrEvfiO5aL0e+BFgXeP33wPkYrepNMLjYCO0/mfjEBER+b5SIBQRWX49jXBYbuwpuNLrzuTC09x4HSQbQXAqfgMRERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERGRC9T/Hx8jOGwem2ilAAAAAElFTkSuQmCC";
	const blankImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAANSURBVBhXY2BgYGAAAAAFAAGKM+MAAAAAAElFTkSuQmCC";

	const question = $("#current-question").text();
	const questionId = $(this).closest("form").find("input[name='questionId']").val();
	
	const teamColour = $(this).data("team-colour");
	let teamName;
	let players;
	const answers = [];

	switch (teamColour) {
		case "red":
			teamName = teams[0].name;
			players = teams[0].players;

			answers.push($("#" + teams[0].players[0].twitchId + "-Answer").attr("src"));
			answers.push($("#" + teams[0].players[1].twitchId + "-Answer").attr("src"));

			break;
		case "green":
			teamName = teams[1].name;
			players = teams[1].players;

			answers.push($("#" + teams[1].players[0].twitchId + "-Answer").attr("src"));
			answers.push($("#" + teams[1].players[1].twitchId + "-Answer").attr("src"));

			break;
		case "blue":
			teamName = teams[2].name;
			players = teams[2].players;

			answers.push($("#" + teams[2].players[0].twitchId + "-Answer").attr("src"));
			answers.push($("#" + teams[2].players[1].twitchId + "-Answer").attr("src"));

			break;
		default:
			teamName = "Unknown Team";
			players = teams[0].players;

			answers.push(defaultImage);
			answers.push(defaultImage);
	}

	// Loop through answers and replace any instances of blankImage with defaultImage
	for (let i = 0; i < answers.length; i++) {
		if (answers[i] === blankImage) {
			answers[i] = defaultImage;
		}
	}

	socket.emit("send answers to audience", teamColour, question, questionId, teamName, players, answers);
});

function updateQuestionPreview(question, questionId){
	// Update the current question display on the admin panel
	const currentQuestion = $("#current-question");
	currentQuestion.text(question);
	currentQuestion.data("question-id", questionId);
}

// Function to handle round navigation
function navigateRound(direction) {
	const currentRoundNumber = $(".current-round").data("round");
	let newRoundNumber = 0;
	if (typeof(direction) == "number") {
		newRoundNumber = direction;
	} else {
		newRoundNumber = direction === "previous" ? currentRoundNumber - 1 : currentRoundNumber + 1;
	}

	// Ensure the new round number is within valid range
	if (newRoundNumber >= 1 && newRoundNumber <= $(".round").length) {
		if (confirm("Are you sure you want to move the game to round " + newRoundNumber + "?")) {
			$("#round-nav").find("button[data-round='" + newRoundNumber + "']").click();

			// Pull the headings if they exist
			let heading = $('section[data-round="' + newRoundNumber + '"]').data("heading") || "Round " + newRoundNumber
			let subheading = $('section[data-round="' + newRoundNumber + '"]').data("subheading") || "Get ready!";

			// Show the interstitial wit the headings (default or otherwise)
			socket.emit("show interstitial", true, heading, subheading);
		}
	}
}

function finalisePoints() {
	const gameCode = $("#finalise-points").data("game-code");
	const currentRoundNumber = $(".current-round").data("round");

	console.log({gameCode, currentRoundNumber});

	if (!confirm("Are you sure you want to finalise points for this round?")) return;

	const buttonContent = $("#finalise-points").html();

	$.ajax({
		method: "POST",
		url: "/admin/award-points/" + gameCode + "/" + currentRoundNumber,

		beforeSend: function() {
			$("#finalise-points").html('<div class="spinner-border" role="status"></div>');
			$("#finalise-points").attr("disabled", "disabled");
		},
		success: function(response) {
			console.log({response});
			if (response.status === "failure"){
				$("#finalise-points").html("Error - " + response.content);
				$("#finalise-points").removeClass("btn-twitch").addClass("btn-danger");
			} else {
				$("#finalise-points").html("Points saved!");
				$("#finalise-points").removeClass("btn-twitch").addClass("btn-success");
			}
		},
		error: function(err) {
			// Log error message
			console.log("Request failed", err);
			return false;
		},
		complete: function() {
			setTimeout(function() {
				$("#finalise-points").html(buttonContent);
				$("#finalise-points").removeAttr("disabled");
				$("#finalise-points").removeClass("btn-success btn-danger").addClass("btn-twitch");
			}, 2000);
		}
	});

}

async function sendCanvasState(toggle){
	// Send the request to the backend
	$.ajax({
		method: "POST",
		url: "/admin/canvas/" + toggle,

		success: function(response) {
			if (response.status === "failure"){
				console.log("Request failed: ", response.content);
				return false;
			} else {
				return true;
			}
		},
		error: function(err) {
			// Log error message
			console.log("Request failed", err);
			return false;
		}
	});
}

async function sendSubmitState(toggle){
	// Send the request to the backend
	$.ajax({
		method: "POST",
		url: "/admin/submit-button/" + toggle,

		success: function(response) {
			if (response.status === "failure"){
				console.log("Request failed: ", response.content);
				return false;
			} else {
				return true;
			}
		},
		error: function(err) {
			// Log error message
			console.log("Request failed", err);
			return false;
		}
	});
}

function resetQuestions(roundNumber){
	// Disable the button
	$("#reset-game-questions").attr("disabled", "disabled");

	// Capture data-game-code from the button
	const gameCode = $("#reset-game-questions").data("game-code");

	// Send the request to the backend
	$.ajax({
		method: "POST",
		url: "/admin/reset-game-questions/" + gameCode,
		data: JSON.stringify({roundNumber}),
		contentType: "application/json",

		success: function(response) {
			if (response.status === "failure"){
				console.log("Request failed: ", response.content);
			} else {
				// Refresh the page
				location.reload();
			}
		},
		error: function(err) {
			// Log error message
			console.log("Request failed", err);
		}
	});
}

function logOutUser(playerId, gameCode) {
	// Send POST request to the backend
	$.ajax({
		method: "POST",
		url: "/admin/in-game/log-out-user",
		data: JSON.stringify({playerId, gameCode}),
		contentType: "application/json",
	
		success: function(response) {
			if (response.status === "failure"){
				console.log("Request failed: ", response.content);
			} else {
				alert("User logged out successfully");
			}
		},
		error: function(err) {
			// Log error message
			console.log("Request failed", err);
		}
	});
}

function endGame() {
	const gameCode = $("#end-game").data("game-code");
	// Send POST request to the backend
	$.ajax({
		method: "POST",
		url: "/admin/end-game/" + gameCode,
	
		success: function(response) {
			if (response.status === "failure"){
				console.log("Request failed: ", response.content);
			} else {
				// Refresh the page
				location.reload();
			}
		},
		error: function(err) {
			// Log error message
			console.log("Request failed", err);
		}
	});
}

function updatePrevious(uid, gameId) {
	if (previousQuestion === null) return;

	// Set the question as played on the backend
	$.ajax({
		method: "POST",
		url: "/admin/in-game/set-question-state",
		data: JSON.stringify({gameId, questionId: uid, state: "played"}),
		contentType: "application/json",
	
		success: function() {
			const targetCard = $("#" + uid);

			// Use a jquery foreach to set all buttons within targetCard to disabled
			$(targetCard).find("button.send-question").each(function(){
				$(this).text("Resend question");
			});
		
			// Set the card to the "played" state
			$(targetCard).removeClass().addClass("card bg-secondary");
			$(targetCard).data("state", "played")

			// Loop through all cards in a round and check if they have all been played
			const allQuestionStates = [];
			// Find the round number from the form inside the card
			const roundNumber = $(targetCard).find("input[name='roundNumber']").val();

			$(".round[data-round='" + roundNumber + "']").find(".card").each(function(){
				allQuestionStates.push($(this).data("state"));		
			});
			const allPlayed = allQuestionStates.every( (val) => val === "played");

			if (allPlayed) {
				// Move the round button to the "played" section of the nav
				const $navButton = $("#round-nav").find("button[data-round='" + roundNumber + "']");
				$navButton.removeClass("btn-secondary").removeClass("btn-success").addClass("btn-secondary");
				$navButton.detach().appendTo('[data-round-type="played"]');
			}
		},
		error: function(err) {
			// Log and show error message
			console.log("Request failed", err);
			$("#loading").removeClass("d-flex").addClass("d-none");
			$("#message").removeClass().addClass("alert").addClass("alert-danger").html("Unable to set the previous question's state in the database");
			$("#message").collapse("show");
		}
	});
}

function populateAnswers(answers) {
	$(".canvas-container").attr("src", defaultImage); // Reset all canvases to the default image
	disablePointForm("all", true); // Disable all point forms
	$(".vote-count").text(0); // Reset all audience votes

	answers.forEach(answer => {
		let [[playerId, imageData]] = Object.entries(answer);

		// Set the image data for the player's answer
		$("#" + playerId + "-Answer").attr("src", imageData);
		// Enable the relevant player's point form
		disablePointForm("player-" + playerId + "-Points-Form", false);
		// Update the OBS endpoint with the player's answer
		socket.emit("update answer", imageData, playerId);
	});
}

function addAudienceVote(playerId, voteType) {
	const voteCountElement = $("#" + voteType + "s-" + playerId);
	let currentCount = parseInt(voteCountElement.text());
	voteCountElement.text(currentCount + 1);
}

// Set input to green with check mark when points are succesfully added
function markAsPointsAdded(pointFormID) {
	const pointForm = document.getElementById(pointFormID);
	pointForm.querySelector(".point-input").classList.add("is-valid");
}

// Allow individual point forms to be disabled/enabled
// when the point input is focused/unfocused
function disablePointForm(pointFormID, bool) {
	const target = (pointFormID === "all") ? ".points-form" : "#" + pointFormID;
	document.querySelectorAll(target).forEach(function (pointInput) {
	if (bool === true) {
			pointInput.querySelector(".point-input").setAttribute("disabled", true);
			pointInput.querySelector("button").setAttribute("disabled", true);
		} else {
			pointInput.querySelector(".point-input").removeAttribute("disabled");
			pointInput.querySelector("button").removeAttribute("disabled");
		}
	})
}

function resetPointForms() {
	disablePointForm("all", false);

	document.querySelectorAll(".point-input").forEach(function (pointInput) {
		pointInput.value="";
		pointInput.classList.remove("is-valid");
	});
}

function resetCanvases() {
	document.querySelectorAll(".canvas-container").forEach(function (canvasContainer) {
		canvasContainer.setAttribute("src", defaultImage);
	});
}

// Update the point form with the points from other admins
function updatePointAmount(pointFormID, points) {
	const pointForm = document.getElementById(pointFormID);
	pointForm.querySelector(".point-input").value = points;
}

function sendEmptyAnswers() {
	allPlayerTwitchIds.forEach(twitchId => {
		// Update the OBS endpoint with the player's answer
		socket.emit("update answer", defaultImage, twitchId);
	});
}

function restartRound(roundNumber){
	// Disable the button
	$("#restart-round").attr("disabled", "disabled");

	// Capture data-game-code from the button
	const gameCode = $("#end-round").data("game-code");

	// Send the request to the backend
	$.ajax({
		method: "POST",
		url: "/admin/restart-round/" + gameCode + "/" + roundNumber,
	
		success: function(response) {
			if (response.status === "failure"){
				console.log("Request failed: ", response.content);
			} else {
				// Refresh the cards
				// Set the data-state for each card in the current round to "pending"
				$(".current-round .card").each(function(){
					$(this).removeClass("bg-secondary").removeClass("bg-success");
					$(this).data("state", "pending");
				});

				// Move the round button back to the "in-progress" section of the nav
				const $navButton = $("#round-nav").find("button[data-round='" + roundNumber + "']");
				$navButton.removeClass("btn-secondary").removeClass("btn-success").addClass("btn-primary");
				$navButton.detach().appendTo('[data-round-type="pending"]');

				// Reenable the button
				$("#restart-round").removeAttr("disabled");
			}
		},
		error: function(err) {
			// Log error message
			console.log("Request failed", err);
		}
	});
}

function endRound(){
	// Disable the button
	$("#end-round").attr("disabled", "disabled");

	// Capture data-game-code from the button
	const gameCode = $("#end-round").data("game-code");

	// Capture the round number from .current-round
	const roundNumber = $(".current-round").data("round");

	const endRoundSubheadings = [
		"Let's see those answers!",
		"Time to review what nonsense you all came up with!",
		"How bad could those answers possibly be?",
		"Let's see if anyone actually answered correctly!",
		"Brace yourselves for some creative responses!",
		"Time to witness some questionable logic!",
		"Prepare for a wild ride through these answers!",
		"Let's find out who paid attention!",
		"Hope you're ready for some surprises!",
		"Let's see who went off the rails this round!",
		"Ready for some unexpected answers?",
		"Who spouted the most bullshit?",
		"Let's see who can recover from this round!",
		"Time to see who can salvage their score!",
		"Did anyone actually understand the questions?",
		"Let's see who guessed wildly!",
		"Time for some questionable creativity!",
		"Who will regret their answer the most?",
		"Let's see who thought outside the box!",
		"Who will surprise us this time?",
		"Let's see who played it safe!",
		"Time to reveal the wildest guesses!",
		"Who went for style over substance?",
		"Let's see who took a risk!",
		"Who will get roasted for their answer?",
		"Time to see who nailed it!",
		"Let's see who missed the mark!",
		"Time to see who shocked the crowd!",
		"Let's see who confused everyone!",
		"Who will get the sympathy points?",
		"Time to see who made history!",
		"Let's see who made us proud!",
	];
	const endRoundChosenSubheading = endRoundSubheadings[Math.floor(Math.random() * endRoundSubheadings.length)];

	// Send the "round over" message to players
	socket.emit("show interstitial", true, "Round over", endRoundChosenSubheading);

	// Send the request to the backend
	$.ajax({
		method: "POST",
		url: "/admin/end-round/" + gameCode + "/" + roundNumber,
	
		success: function(response) {
			if (response.status === "failure"){
				console.log("Request failed: ", response.content);
			} else {
				// Refresh the page
				location.reload();
			}
		},
		error: function(err) {
			// Log error message
			console.log("Request failed", err);
		}
	});
}