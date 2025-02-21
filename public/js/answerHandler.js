$("form").on("submit", function(event){
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
			} else {
				unlockFormFields();
				resetFormFields();
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


// Use event delegation becase to accommodate elements added to the DOM dynamically
// $(document).on("submit", function(event){
// 	event.preventDefault(); //prevent default action
// 	// const destUrl = $(this).attr("action"); //get form action url
// 	const destUrl = "https://webhook.site/1dfc56cf-8e6b-4332-bcdf-85f29abccc8a";
// 	// const formMethod = $(this).attr("method"); //get form GET/POST method
// 	const formMethod = "POST"
// 	// const formData = $(this).serialize(); //Encode form elements for submission
	
// 	// Add canvas to formData
// 	const answerCanvas = document.getElementById('answerCanvas');
// 	const answerField = document.getElementById('answerField');
// 	// const serverCanvas = document.getElementById('serverCanvas');
// 	// const ctx = answerCanvas.getContext('2d');
// 	// const ctx2 = serverCanvas.getContext('2d');
// 	// const imgData = ctx.getImageData(0, 0, answerCanvas.width, answerCanvas.height);
// 	// const imgData2 = ctx2.getImageData(0, 0, serverCanvas.width, serverCanvas.height);
// 	const imgData = answerCanvas.toDataURL();
// 	// answerField.value = imgData;
// 	const formData = $(this).serialize(); //Encode form elements for submission

// 	// const imgData2 = ctx2.getImageData(0, 0, serverCanvas.width, serverCanvas.height);
// 	// formData += "answerCanvas=" + imgData;
// 	// formData += "&serverCanvas=" + imgData2;



// 	 $.ajax({
// 		 method: formMethod,
// 		 url: destUrl,
// 		 data: formData,
// 		 beforeSend: function() {
// 			lockFormFields();
// 		 },
// 		 success: function() {
// 			// $(".move-up, .move-down").attr("disabled", false)
// 			unlockFormFields();
// 		 },
// 		 error: function(err) {
// 			// showToast("Please refresh and try again", "danger", "Could not change the question's order", false);
// 			alert("That didn't work!");
// 			unlockFormFields();
// 		}
// 	 });
// });

function lockFormFields() {
	$("#answer-button").attr("disabled", true);
	$("#answerCanvas").addClass("disabled");
	// document.getElementById('answerCanvas').disabled = true;
	// document.getElementById('answer-button').disabled = true;
}

function unlockFormFields() {
	document.getElementById('answerCanvas').disabled = false;
	document.getElementById('answer-button').disabled = false;
	$("#answerCanvas").removeClass("disabled");
}

function resetFormFields() {
	// document.getElementById('answer').value = '';
	// document.getElementById('teammateAnswer').value = '';
	
	// Clear the answer canvases
	const answerCanvas = document.getElementById('answerCanvas');
	const ctx = answerCanvas.getContext('2d');
	ctx.clearRect(0, 0, answerCanvas.width, answerCanvas.height);

	const serverCanvas = document.getElementById('teammateAnswer');
	const ctx2 = serverCanvas.getContext('2d');
	ctx2.clearRect(0, 0, serverCanvas.width, serverCanvas.height);
}

