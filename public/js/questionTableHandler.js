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
    const thisOrderSpan = row.find(".order");
    const currentOrderNumber = Number(thisOrderSpan.text());
    const adjacentRow = direction === "up" ? row.prev() : row.next();

    if (adjacentRow.length > 0) {
        const adjacentOrderSpan = adjacentRow.find(".order");
        const adjacentOrderNumber = Number(adjacentOrderSpan.text());
        thisOrderSpan.text(direction === "up" ? currentOrderNumber - 1 : currentOrderNumber + 1);
        adjacentOrderSpan.text(direction === "up" ? adjacentOrderNumber + 1 : adjacentOrderNumber - 1);
        direction === "up" ? row.insertBefore(adjacentRow) : row.insertAfter(adjacentRow);
    }
}

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
