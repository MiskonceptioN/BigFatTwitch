$("#previous-round").on("click", function(){navigateRound("previous")});
$("#next-round").on("click", function(){navigateRound("next")});

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
        // data: formData,
        beforeSend: function() {
			// Show loading spinner before sending the form
			$(inputButton).html('<div class="spinner-border" role="status"></div>');
        },
        success: function(msg) {
			$(form).parent().parent().addClass("bg-success");

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
				// $(form).find("input[name='questionId']").val();
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
		$("#round-nav").find("button[data-round='" + newRoundNumber + "']").click();
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
				// Refresh the page
				// location.reload();
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
	// if (previousQuestion === uid) return;

	// Set the question as played on the backend
	$.ajax({
        method: "POST",
        url: "/admin/in-game/set-question-state",
		data: JSON.stringify({gameId, questionId: uid, state: "played"}),
		contentType: "application/json",
	
        // data: formData,
        success: function() {
			const targetCard = $("#" + uid);

			// Use a jquery foreach to set all buttons within targetCard to disabled
			$(targetCard).find("button").each(function(){
				// $(this).attr("disabled", "disabled");
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

			// Reset the button contents
			// $(inputButton).html(inputButtonContent);
        }
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
	console.log({target, pointFormID});
	document.querySelectorAll(target).forEach(function (pointInput) {
	// $(target).each(function (pointInput) {
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
		canvasContainer.setAttribute("src", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAMSURBVBhXY/j//z8ABf4C/qc1gYQAAAAASUVORK5CYII=");
	});
}

// Update the point form with the points from other admins
function updatePointAmount(pointFormID, points) {
	const pointForm = document.getElementById(pointFormID);
	pointForm.querySelector(".point-input").value = points;
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