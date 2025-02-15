$(function () {
    $('#logout').click(function () {
        $.ajax({
            url: "http://localhost:5000/logout",
            type: "POST",
        }).done(function (response) {
            if (response.status == "ERR") {
                var err = JSON.parse(response.error);
                $('#errorContainer').append(err.sender + ': ' + err.message);
            } else {
                //$.each(JSON.parse(response.data), function (key, item) {
                //    $('#container').append(item.Title + '<br>');
                //});
                document.location.href = "http://localhost:5000/login";
            }
        }).fail(function (xhr, status, errorThrown) {
            //console.log( "Error: " + errorThrown );
            //console.log( "Status: " + status );
            //console.dir( xhr );
        }).always(function (xhr, status) {

        });
    });
})
$(document).ready(function () {
    $('[data-toggle="tooltip"]').tooltip();
});