$("i.edit-game").on("mouseenter", function(){
	$(this).addClass("text-success");
});
$("i.edit-game").on("mouseleave", function(){
	$(this).removeClass("text-success");
});

$("i.delete-game").on("click", function(){
	let gameId = $(this).closest("form").attr("action");
	gameId = gameId.substr(Math.max(0, gameId.length - 4));
	if (confirm("Are you sure you want to delete game " + gameId + "?")) $(this).closest('form').submit();
});
$("i.delete-game").on("mouseenter", function(){
	const targetRow = $(this).closest('tr');
	$(targetRow).addClass("table-danger");
	$(this).addClass("text-danger");
});
$("i.delete-game").on("mouseleave", function(){
	const targetRow = $(this).closest('tr');
	$(targetRow).removeClass("table-danger");
	$(this).removeClass("text-danger");
});
// $("form").on("submit", function(event){
// 	event.preventDefault(); //prevent default action
// 	const destUrl = $(this).attr("action"); //get form action url
// 	const formMethod = $(this).attr("method"); //get form GET/POST method
// 	const formData = $(this).serialize(); //Encode form elements for submission

//     $.ajax({
//         method: formMethod,
//         url: destUrl,
//         data: formData,
//         beforeSend: function() {
//             console.log("Sending request...");
// 			$("#loading").removeClass("d-none").addClass("d-flex");
// 			$("#message").collapse("hide");
//         },
//         success: function(msg) {
// 			console.log("Request sent");
// 			$("#loading").removeClass("d-flex").addClass("d-none");
// 			$("#message").removeClass().addClass("alert").addClass("alert-" + msg.status).html(msg.content);
// 			$("#message").collapse("show");
//         },
//         error: function(err) {
// 			console.log("Request failed");
//             console.log(err);
// 			$("#loading").removeClass("d-flex").addClass("d-none");
// 			$("#message").removeClass().addClass("alert").addClass("alert-danger").html("Request failed with status " + err.status);
// 			$("#message").collapse("show");
//         }
//     });
// });
