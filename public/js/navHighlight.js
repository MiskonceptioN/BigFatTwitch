$(document).ready(function() {
	// Get current URL path and assign "active" class
	var pathname = window.location.pathname;
	$('.nav-item > a[href="'+pathname+'"]').parent().addClass("active");
});
