$(function() {
    $('.btn-login').click(function () {
        var isvalidform = true;
        if (!$('#Userid').val()) {
            $('#Userid').parent('.form-group').children('.invalid-feedback').removeClass('d-none');
            $('#Userid').parent('.form-group').children('.invalid-feedback').show();
            isvalidform = false;
        }
        if (!$('#Password').val()) {
            $('#Password').parent('.form-group').children('.invalid-feedback').removeClass('d-none');
            $('#Password').parent('.form-group').children('.invalid-feedback').show();
            isvalidform = false;
        }
        if (isvalidform) {
            $.ajax({
                url: "http://localhost:5000/login",
                type: "POST",
                data: {
                    Userid: $('#Userid').val(),
                    Password: $('#Password').val(),
                },
            }).done(function (response) {
                if (response.status == "ERR") {
                    var err = JSON.parse(response.error);
                    $('.pnl-errors').html(err.message);
                    $('.form-errors').show();
                    //console.log(err.name);
                    //console.log(err.stack);
                } else if (response.status == "OK") {
                    document.location.href = 'http://localhost:5000/dashboard';
                }
            }).fail(function (xhr, status, errorThrown) {
            }).always(function (xhr, status) {

            });
        }
    });
})