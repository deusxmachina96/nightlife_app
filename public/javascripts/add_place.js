/* Uses jQuery to make AJAX POST call to /add-place
 * Depending on action attribute of the button, it sends the corresponding
 * call to either add or remove the place.
 * This sounds bad, but it enables me to let the user update it in real time.
 * UPDATE: Angular could do this much better
 */
$(document).ready(function() {
    $('.go-tonight').click(function(event) {
        var action = $(this).attr('action');
        if(action === "add_place") {
            add_place($(this).attr('id'), $('#username').attr('username'));
        } else if (action === "remove_place") {
            remove_place($(this).attr('id'), $('#username').attr('username'));
        }
    })
});

var add_place = function(place_id, username) {
    $.post('/add-place', {
        username : username,
        place_id: place_id,
        amount: 1
    }, function (data, textStatus) {
       if(textStatus === "success") {
           $("#" + place_id).text('Cancel plans')
               .attr("action", "remove_place")
               .removeClass('positive-button').addClass('negative-button')
               .siblings(".number-of-people").text(data.people_going + " people going.");
       }
    });
};

var remove_place = function(place_id, username) {
    $.post('/add-place', {
        username : username,
        place_id: place_id,
        amount: -1
    }, function (data, textStatus) {
        if(textStatus === "success") {
            $("#" + place_id).text('Go tonight')
                .attr("action", "add_place")
                .removeClass('negative-button').addClass('positive-button')
                .siblings(".number-of-people").text(data.people_going + " people going.");
        }
    });
};