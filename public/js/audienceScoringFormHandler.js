$("form#audience-scoring").on("submit", function(event){
	event.preventDefault(); //prevent default action

	const destUrl = $(this).attr("action"); //get form action url
	const formMethod = $(this).attr("method"); //get form GET/POST method
	const formData = $(this).serialize(); //Encode form elements for submission

	const $button = $("form#audience-scoring input[type='submit']");
	const buttonContent = $button.val();

	$.ajax({
		method: formMethod,
		url: destUrl,
		data: formData,
		beforeSend: function() {
			$("form#audience-scoring input").attr("disabled", true)
			$button.val("Saving...");
		},
		success: function(response) {
			$button.removeClass("btn-primary");
			if (response.status === "failure") {
				$button.addClass("btn-danger");
				$button.val("Failed to save scoring settings");
			} else {
				$button.addClass("btn-success");
				$button.val("Saved!");
			}
		},
		error: function(err) {
			$button.removeClass("btn-primary");
			$button.addClass("btn-danger");
			$button.val("Failed to save scoring settings");
			console.log(err);
		},
		complete: function() {
			setTimeout(function(){
				$("form#audience-scoring input").attr("disabled", false)
				$button.removeClass("btn-danger btn-success");
				$button.addClass("btn-primary");
				$button.val(buttonContent);
			}, 1000);
		}
	});
});
