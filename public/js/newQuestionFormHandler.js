$("form#new-question").on("submit", function(event){
	event.preventDefault(); //prevent default action
	const order = getNewQuestionOrder($("#round").val()); // Get the target order
	$("#order").val(order);// Set the target order in the form

	const destUrl = $(this).attr("action"); //get form action url
	const formMethod = $(this).attr("method"); //get form GET/POST method
	const formData = $(this).serialize(); //Encode form elements for submission

	const question = $("#question").val();
	const answer = $("#answer").val();
	const type =  $("input[name=type]:checked").val();
	const round = $("#round").val();

	$.ajax({
		method: formMethod,
		url: destUrl,
		data: formData,
		beforeSend: function() {
			$("form input").attr("disabled", true)
		},
		success: function(response) {
			$("form input").attr("disabled", false)
			if (response.status === "failure") {
				showToast(response.content, "danger", "Could not add question '" + question + "'", 5000);
			} else {
				$(".no-content").hide();
				addQuestion(question, answer, type, round, order, response.content);
				// Blank the form
				$("#question").val("");
				$("#answer").val("");
				$("input[name=type]").prop("checked", false);
				$("#textOption").prop("checked", true);
				$("#round").val(1);
				$("#order").val(1);
			}
		},
		error: function(err) {
			$("form input").attr("disabled", false)
			showToast("An unknown error occurred. Please try again", "danger", "Could not add question '" + question + "'", 5000);
		}
	});
});

function getNewQuestionOrder(roundNumber) {
	return $("#round" + roundNumber + "questions tr").length || 1;
}

function addQuestion (question, answer, type, round = 1, order = 1, questionID) {
	let targetTable = $("#round" + round + "questions tbody");
	if (targetTable.length === 0) {
		const newSection = $(`<h3 class="text-start">Round ${round}</h3>
		<table id="round${round}questions" class="table table-striped table-hover question-info">
			<thead>
				<tr>
					<th scope="col">Question</th>
					<th scope="col">Answer</th>
					<th scope="col">Status</th>
					<th scope="col">Type</th>
					<th scope="col">Order</th>
				</tr>
			</thead>
			<tbody>
			</tbody>
		</table>`)
		$(newSection).hide();
		$("#game-questions").append(newSection);
		$(newSection).fadeIn("slow");
	}
	targetTable = $("#round" + round + "questions tbody");

	const newRow = $(`
		<tr>
			<th class="question">${question}</th>
			<td>${answer}</td>
			<td>pending</td>
			<td>${type}</td>
			<td><form method="post" class="question-up" action="/admin/gameManagement/BCKM/moveQuestion">
				<input type="hidden" name="direction" value="up">
				<input type="hidden" name="questionId" value="${questionID}">
				<button type="button" class="btn btn-secondary btn-tiny move-up">▲</button></form>
				<span class="order">${order}</span> <form method="post" class="question-down" action="/admin/gameManagement/BCKM/moveQuestion">
					<input type="hidden" name="direction" value="down">
					<input type="hidden" name="questionId" value="${questionID}"><button type="button" class="btn btn-secondary btn-tiny move-down">▼</button></form></td>
		</tr>`);
	$(newRow).hide();
	targetTable.append(newRow);
	$(newRow).fadeIn("slow");
}