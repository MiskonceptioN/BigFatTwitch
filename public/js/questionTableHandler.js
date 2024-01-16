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