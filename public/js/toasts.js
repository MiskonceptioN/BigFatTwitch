function showToast(message, bootstrapClass = "secondary", title = false, dismissable = true) {
	// Identify parts of the toast
	const toastTarget = document.getElementById("live-toast");

	// Create the instance
	const toastInstance = bootstrap.Toast.getOrCreateInstance(toastTarget);

	// Set the toast's default state
	$(toastTarget).removeClass().addClass("toast"); // No additional classes
	$(toastTarget).find(".toast-header").addClass("d-none"); // No header
	$(toastTarget).find(".toast-header .btn-close").addClass("d-none"); // No header close button
	$(toastTarget).find(".toast-body .btn-close").addClass("d-none"); // No body close button
	$(toastTarget).find(".toast-progress").addClass("d-none");  // Hide the progress bar
	toastInstance._config.autohide = false; // Don't auto-hide
	
	// Prepare the toast's parameters
	$(toastTarget).addClass("text-bg-" + bootstrapClass); // Style with Bootstrap classes

	// Set the header if there's a title
	if (title) {
		$(toastTarget).find(".toast-header").removeClass("d-none");
		$(toastTarget).find(".toast-title").text(title);
	}

	// Set the message
	$(toastTarget).find(".message-content").text(message);
	
	if (dismissable) {
		// Put the close button on the header or the body, depending on if there is a header
		if (title) {
			$(toastTarget).find(".toast-header .btn-close").removeClass("d-none");
		} else {
			$(toastTarget).find(".toast-body .btn-close").removeClass("d-none");
		}

		// If the button should be auto-dismissed after X milliseconds
		if (typeof dismissable === "number") {
			const duration = dismissable;
			let durationCounter = duration;

			toastInstance._config.autohide = true;
			toastInstance._config.delay = duration;

			$(toastTarget).find(".toast-progress").removeClass("d-none");  // Hide the progress bar

			const timer = setInterval(() => {
				if (durationCounter >= 0) {
					const percentage = (durationCounter/duration)*100;
					$(toastTarget).find(".toast-progress").css("width", percentage+"%")
					durationCounter = durationCounter-10;
				} else {
					clearInterval(timer);
				}
			},10);
		}
	}

	toastInstance.show();
}