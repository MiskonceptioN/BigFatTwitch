/*/
$("button.send-question").on("click", function(event){
	event.preventDefault(); // Prevent the form from being submitted automagically
	// $(this).parent().submit();

	const oldHtml = $(this).html();
	$(this).html('<div class="spinner-border" role="status"></div>');
	




	// const destUrl = $(this).parent().attr("action"); //get form action url
	// const formMethod = $(this).parent().attr("method"); //get form GET/POST method
	


	// Change the card colour
});
/*/

// Handle display of rounds
$(document).ready(function(){
	// Show the first round
	$(".round").first().removeClass("d-none");

	// Handle the click event
	$(".round-selector").on("click", function(){
		// Hide all rounds
		$(".round").addClass("d-none");

		// Get the round number
		const roundNumber = $(this).attr("data-round");

		// Show the selected round
		$(".round[data-round='" + roundNumber + "']").removeClass("d-none");
	});
});

let previousQuestion = null;

$("form").on("submit", function(event){
	event.preventDefault(); //prevent default action
	const destUrl = $(this).attr("action"); //get form action url
	const formMethod = $(this).attr("method"); //get form GET/POST method
	const formData = $(this).serialize(); //Encode form elements for submission

	// Grab gameCode from the form
	const gameCode = $(this).find("input[name='gameCode']").val();

	const form = $(this);
	const inputButton = $(form).find(".send-question");
	const inputButtonContent = $(inputButton).html();
	const questionID = $(form).find("input[name='questionId']").val();

    $.ajax({
        method: formMethod,
        url: destUrl,
        data: formData,
        beforeSend: function() {
			// Show loading spinner before sending the form
			$(inputButton).html('<div class="spinner-border" role="status"></div>');
        },
        success: function(msg) {
			$(form).parent().parent().addClass("bg-success");

			// Reset the button contents
			$(inputButton).html(inputButtonContent);

			// Set the previousQuestion
			if (previousQuestion !== questionID){
				disablePrevious(previousQuestion, gameCode);
				previousQuestion = questionID;
				// $(form).find("input[name='questionId']").val();
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

function disablePrevious(uid, gameId) {
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
				$(this).attr("disabled", "disabled");
			});
		
			// Set the card to be bg-secondary
			$(targetCard).removeClass().addClass("card bg-secondary");
		
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