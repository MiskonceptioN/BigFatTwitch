// To use, add the class "searchable" to any table and make sure that table
// has an input of type "search". Then add the class "search-target" to
// and <td>s that you want to check when typing in the search box
$(document).ready(function(){
	$("table.searchable").find("input[type='search']").on("input", function() {
		var value = $(this).val().toLowerCase();
		$(".user-info tr:not(:first-child)").each(function() {
			var $row = $(this);
			var showRow = false;

			$row.find(".search-target").each(function() {
				if ($(this).text().toLowerCase().indexOf(value) > -1) {
					showRow = true;
					return false;  // Exit the loop if a match is found in this row
				}
			});

			$row.toggle(showRow);
		});
	});
});