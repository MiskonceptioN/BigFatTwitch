$("form").on("submit", function(event){
	event.preventDefault(); //prevent default action
	const destUrl = $(this).attr("action"); //get form action url
	const formMethod = $(this).attr("method"); //get form GET/POST method
	const formData = $(this).serialize(); //Encode form elements for submission

	$.ajax({
		method: formMethod,
		url: destUrl,
		data: formData,
		beforeSend: function() {
			console.log("Sending request...");
			$("#loading").removeClass("d-none").addClass("d-flex");
			$("#message").collapse("hide");
		},
		success: function(msg) {
			console.log("Request sent");
			$("#loading").removeClass("d-flex").addClass("d-none");
			$("#message").removeClass().addClass("alert").addClass("alert-" + msg.status).html(msg.content);
			$("#message").collapse("show");
		},
		error: function(err) {
			console.log("Request failed");
			console.log(err);
			$("#loading").removeClass("d-flex").addClass("d-none");
			$("#message").removeClass().addClass("alert").addClass("alert-danger").html("Request failed with status " + err.status);
			$("#message").collapse("show");
		}
	});
});
