// Navigation and utility button handlers
const defaultImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAANSURBVBhXY2BgYGAAAAAFAAGKM+MAAAAAAElFTkSuQmCC";
$("#previous-round").on("click", function(){navigateRound("previous")});
$("#next-round").on("click", function(){navigateRound("next")});
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
	}
	endRound();
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
		$(".admin-background").removeClass("d-none");
	} else {
		$(".admin-background").addClass("d-none");
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

// Collect the answer data from the player canvases and save them to DB
$(".save-answer").on("click", function(event){
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
	const inputButton = $(form).find("button");
	const inputButtonContent = $(inputButton).html();
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
		},
		success: function(msg) {
			// Reset the button contents
			$(inputButton).html(inputButtonContent);

			if (msg.status === "success") {
				// Update contestant canvases
				populateAnswers(msg.content);

				// Update the /obs/question endpoint
				socket.emit("next question", questionText, questionId);
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

function updateQuestionPreview(question, questionId){
	// Update the current question display on the admin panel
	const currentQuestion = $("#current-question");
	currentQuestion.text(question);
	currentQuestion.data("question-id", questionId);
}

// Function to handle round navigation
function navigateRound(direction) {
	const currentRoundNumber = $(".current-round").data("round");
	const newRoundNumber = direction === "previous" ? currentRoundNumber - 1 : currentRoundNumber + 1;

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
	console.log("Disabling previous question for game " + gameId);

	// Set the question as played on the backend
	$.ajax({
		method: "POST",
		url: "/admin/in-game/set-question-state",
		data: JSON.stringify({gameId, questionId: uid, state: "played"}),
		contentType: "application/json",
	
		success: function() {
			const targetCard = $("#" + uid);

			// Use a jquery foreach to set all buttons within targetCard to disabled
			$(targetCard).find("button").each(function(){
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