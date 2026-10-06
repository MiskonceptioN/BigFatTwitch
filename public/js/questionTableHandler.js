// Use event delegation becase to accommodate elements added to the DOM dynamically
$(document).on("submit", "form.question-up, form.question-down", function(event){
	event.preventDefault(); //prevent default action
	const destUrl = $(this).attr("action"); //get form action url
	const formMethod = $(this).attr("method"); //get form GET/POST method
	const formData = $(this).serialize(); //Encode form elements for submission

	 $.ajax({
		 method: formMethod,
		 url: destUrl,
		 data: formData,
		 beforeSend: function() {
			$(".move-up, .move-down").attr("disabled", true)
		 },
		 success: function() {
			$(".move-up, .move-down").attr("disabled", false)
		 },
		 error: function(err) {
			showToast("Please refresh and try again", "danger", "Could not change the question's order", false);
		}
	 });
});

// Use event delegation becase to accommodate elements added to the DOM dynamically
$(document).on("mouseenter focus", "button.btn-tiny", function(){
	$(this).addClass("btn-primary");
	$(this).removeClass("btn-secondary");
});
$(document).on("mouseleave blur", "button.btn-tiny", function(){
	$(this).addClass("btn-secondary");
	$(this).removeClass("btn-primary");
});

$(document).on("click", ".move-up", function () {
	updateOrder($(this).parents("tr:first"), "up");
});

$(document).on("click", ".move-down", function () {
	updateOrder($(this).parents("tr:first"), "down");
});

// Handle question deletion
$(document).on("mouseenter focus", ".delete-question", function(){
	const targetRow = $(this).closest('tr');
	$(targetRow).addClass("table-danger");
	$(this).addClass("text-danger");
});
$(document).on("mouseleave blur", ".delete-question", function(){
	const targetRow = $(this).closest('tr');
	$(targetRow).removeClass("table-danger");
	$(this).removeClass("text-danger");
});
$(document).on("click", ".delete-question", function(){
	const questionId = $(this).data("question-id");
	deleteQuestion(questionId, $(this));
});

function deleteQuestion(questionId, $button) {
	const questionText = $button.closest('tr').find('.question').text();
	if (!confirm("Are you sure you want to delete the following question?\n" + `"${questionText}"`)) return;

	const oldButtonContent = $button.html();
	$.ajax({
		method: "POST",
		url: window.location.href + "/delete-question",
		data: {questionId},
		beforeSend: function() {
			$button.html('<div class="spinner-border spinner-border-sm" role="status"></div>');
		},
		success: function(response) {
			if (response.status !== "success") {
				showToast("Please refresh and try again", "danger", "Could not delete the question", false);
				console.error("Failed to delete question:", response.content);
				$button.html(oldButtonContent);
				return;
			}

			// If there are no remaining questions in the round, delete the round
			// Count the number of rows in the table for this round
			const remainingQuestions = $button.closest('tbody').find('tr');
			if (remainingQuestions.length === 1) {
				$button.closest('span.question-table-container').remove();
			} else {
				// Otherwise, just delete the row
				$button.closest('tr').remove();
				
				// For any rows below, decrease their order number by 1
				const rowsBelow = $button.closest('tr').nextAll();
				rowsBelow.each(function() {
					const orderSpan = $(this).find('.order');
					const orderNumber = Number(orderSpan.text());
					orderSpan.text(orderNumber - 1);
				});
			}
		},
		error: function(err) {
			showToast("Please refresh and try again", "danger", "Could not delete the question", false);
			console.error("Failed to update question order", err);
			$button.html(oldButtonContent);
		}
	 });
}

function updateOrder(row, direction) {
	const moveUpForm = row.find("form.question-up");
	const moveDownForm = row.find("form.question-down");
	const thisOrderSpan = row.find(".order");
	const currentOrderNumber = Number(thisOrderSpan.text());
	const adjacentRow = direction === "up" ? row.prev() : row.next();
	const adjacentRowMoveUpForm = adjacentRow.find("form.question-up");
	const adjacentRowMoveDownForm = adjacentRow.find("form.question-down");

	if (adjacentRow.length > 0) {
		const adjacentOrderSpan = adjacentRow.find(".order");
		const adjacentOrderNumber = Number(adjacentOrderSpan.text());
		thisOrderSpan.text(direction === "up" ? currentOrderNumber - 1 : currentOrderNumber + 1);
		adjacentOrderSpan.text(direction === "up" ? adjacentOrderNumber + 1 : adjacentOrderNumber - 1);
		if (direction === "up") {
			moveUpForm.submit();
			adjacentRowMoveDownForm.submit();
			row.insertBefore(adjacentRow);
		} else {
			moveDownForm.submit();
			adjacentRowMoveUpForm.submit();
			row.insertAfter(adjacentRow);
		}
		flashRow(row);
	}
}

function flashRow(el){
	$(el).css({
		"transition": "opacity 0s ease",
		"opacity": "0"
	})
	setTimeout(() => {
		$(el).css({
			"transition": "opacity 1s ease",
			"opacity": "1"
		})
	}, "0");	  
}