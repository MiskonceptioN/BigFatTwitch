function showToast(message, bootstrapClass = "secondary", title = false, dismissable = true) {
	// Identify parts of the toast
	const toastTarget = document.getElementById("live-toast");
	const $toastHeader = $(toastTarget).find(".toast-header");
	const $toastTitle = $(toastTarget).find(".toast-title");
	const $toastBody = $(toastTarget).find(".toast-body")
	const $toastHeaderClose = $toastHeader.find(".btn-close");
	const $toastBodyClose = $toastBody.find(".btn-close");
	const $toastProgressBar = $(toastTarget).find(".toast-progress");

	// Create the instance
	const toastInstance = bootstrap.Toast.getOrCreateInstance(toastTarget);

	// Set the toast's default state
	$(toastTarget).removeClass().addClass("toast"); // No additional classes
	$toastHeader.addClass("d-none"); // No header
	$toastHeaderClose.addClass("d-none"); // No header close button
	$toastBodyClose.addClass("d-none"); // No body close button
	$toastProgressBar.addClass("d-none");  // Hide the progress bar
	$toastBody.removeClass("has-progress-bar"); // Hide the progress bar
	toastInstance._config.autohide = false; // Don't auto-hide
	
	// Prepare the toast's parameters
	$(toastTarget).addClass("text-bg-" + bootstrapClass); // Style with Bootstrap classes

	// Set the header if there's a title
	if (title) {
		$toastHeader.removeClass("d-none");
		$toastTitle.text(title);
	}

	// Set the message
	$(toastTarget).find(".message-content").html(message);
	
	if (dismissable) {
		// Put the close button on the header or the body, depending on if there is a header
		if (title) {
			$toastHeaderClose.removeClass("d-none");
		} else {
			$toastBodyClose.removeClass("d-none");
		}

		// If the button should be auto-dismissed after X milliseconds
		if (typeof dismissable === "number") {
			const duration = dismissable;
			let durationCounter = duration;

			toastInstance._config.autohide = true;
			toastInstance._config.delay = duration;

			$toastProgressBar.removeClass("d-none"); // Show the progress bar
			$toastBody.addClass("has-progress-bar"); // Show the progress bar

			// Shrink the progress bar according to the duration
			const timer = setInterval(() => {
				if (durationCounter >= 0) {
					const percentage = (durationCounter/duration)*100;
					$toastProgressBar.css("width", percentage+"%")
					durationCounter = durationCounter-10;
				} else {
					clearInterval(timer);
				}
			},10);
		}
	}

	toastInstance.show();
}