$("i.edit-game").on("mouseenter focus", function(){
	$(this).addClass("text-success");
});
$("i.edit-game").on("mouseleave blur", function(){
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
