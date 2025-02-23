$("#previous-round").on("click", function(){navigateRound("previous")});
$("#next-round").on("click", function(){navigateRound("next")});

// Click handler for the reset-game-questions button
$("#reset-game-questions").on("click", function(event){
	if (confirm("Are you sure you want to reset all questions? This will reset all questions to the 'pending' state?")){
		resetQuestions();
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

$("form").on("submit", function(event){
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

function resetQuestions(){
	// Disable the button
	$("#reset-game-questions").attr("disabled", "disabled");

	// Capture data-game-code from the button
	const gameCode = $("#reset-game-questions").data("game-code");

	// Send the request to the backend
	$.ajax({
		method: "POST",
		url: "/admin/reset-game-questions/" + gameCode,
	
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