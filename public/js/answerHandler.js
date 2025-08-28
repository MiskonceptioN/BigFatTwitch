$("#answer-form").on("submit", function(event){
	event.preventDefault(); //prevent default action

	// Check that we have a question before allowing the form to submit
	const questionText = $("#question-text").text();
	const questionId = $("#questionId").val();
	if (questionText == "" || typeof questionId === "undefined" ) {return}

	const destUrl = $(this).attr("action"); //get form action url
	const formMethod = $(this).attr("method"); //get form GET/POST method

	// Set canvas to #answerField
	const answerCanvas = document.getElementById('answerCanvas');
	const answerField = document.getElementById('answerField');
	const imgData = answerCanvas.toDataURL();
	answerField.value = imgData;

	const formData = $(this).serialize(); //Encode form elements for submission

	$.ajax({
		method: formMethod,
		url: destUrl,
		data: formData,
		beforeSend: function() {
			lockFormFields();
		},
		success: function(msg) {
			if (msg.status == "danger") {
				$("#loading").removeClass("d-flex").addClass("d-none");
				$("#message").removeClass().addClass("alert").addClass("alert-" + msg.status).html(msg.content);
				$("#message").collapse("show");
				return;
			}
		},
		error: function(err) {
			$("#loading").removeClass("d-flex").addClass("d-none");
			$("#message").removeClass().addClass("alert").addClass("alert-" + msg.status).html(msg.content);
			$("#message").collapse("show");
			console.log(err)
			unlockFormFields();
		}
	});
});


function lockFormFields() {
	lockCanvas();
	lockSubmitButton();
}

function unlockFormFields() {
	unlockCanvas();
	unlockSubmitButton();
}

function unlockCanvas() {
	document.getElementById('answerCanvas').disabled = false;
	$("#answerCanvas").removeClass("disabled");
}

function lockCanvas() {
	document.getElementById('answerCanvas').disabled = true;
	$("#answerCanvas").addClass("disabled");
}

function unlockSubmitButton() {
	document.getElementById('answer-button').disabled = false;
}

function lockSubmitButton() {
	document.getElementById('answer-button').disabled = true;
}

function resetFormFields() {
	// Clear the answer canvases
	const answerCanvas = document.getElementById('answerCanvas');
	const ctx = answerCanvas.getContext('2d');
	ctx.clearRect(0, 0, answerCanvas.width, answerCanvas.height);

	const serverCanvas = document.getElementById('teammateAnswer');
	serverCanvas.setAttribute("src", "");
}

