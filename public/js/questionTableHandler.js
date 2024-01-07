$("button.btn-tiny").on("mouseenter focus", function(){
	$(this).addClass("btn-primary");
	$(this).removeClass("btn-secondary");
});
$("button.btn-tiny").on("mouseleave blur", function(){
	$(this).addClass("btn-secondary");
	$(this).removeClass("btn-primary");
});

$(".move-up").click(function () {
	updateOrder($(this).parents("tr:first"), "up");
});

$(".move-down").click(function () {
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

// $("form").on("submit", function(event){
// 	event.preventDefault(); //prevent default action
// 	const destUrl = $(this).attr("action"); //get form action url
// 	const formMethod = $(this).attr("method"); //get form GET/POST method
// 	const formData = $(this).serialize(); //Encode form elements for submission

//	 $.ajax({
//		 method: formMethod,
//		 url: destUrl,
//		 data: formData,
//		 beforeSend: function() {
//			 console.log("Sending request...");
// 			$("#loading").removeClass("d-none").addClass("d-flex");
// 			$("#message").collapse("hide");
//		 },
//		 success: function(msg) {
// 			console.log("Request sent");
// 			$("#loading").removeClass("d-flex").addClass("d-none");
// 			$("#message").removeClass().addClass("alert").addClass("alert-" + msg.status).html(msg.content);
// 			$("#message").collapse("show");
//		 },
//		 error: function(err) {
// 			console.log("Request failed");
//			 console.log(err);
// 			$("#loading").removeClass("d-flex").addClass("d-none");
// 			$("#message").removeClass().addClass("alert").addClass("alert-danger").html("Request failed with status " + err.status);
// 			$("#message").collapse("show");
//		 }
//	 });
// });
