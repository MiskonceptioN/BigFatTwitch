$(".edit-heading-button, .edit-subheading-button").on("click", function() {
	const currentHeading = $(this).siblings("span");
	const round = $(this).data("round");
	const headingType = $(this).siblings("span").attr("class").substring(6); // heading or subheading

	// Ask for a new heading
	let newHeading = prompt(`Enter the new ${headingType}`, currentHeading.text().trim());

	// Abandon ship if the new heading is blank or identical to the current one
	if (!newHeading) { return; }
	newHeading = newHeading.trim();
	if (newHeading == currentHeading.text().trim()) { return; }

	// Update the heading text on the page
	currentHeading.text(newHeading);
	// And in the DB
	$.ajax({
		url: `/admin/gameManagement/${$(this).data("game-code")}/update-round-heading`,
		method: "POST",
		data: {
			round: round,
			headingType: headingType,
			newHeading: newHeading
		},
		success: function(response) {
			console.log(`Successfully updated the ${headingType} for round ${round}`);
			console.log(response);
		},
		error: function(err) {
			console.error("Error updating heading", err);
		}
	});
});