$(function () {
    $('#select-container ul li').click(function () {
        $(this).prependTo($(this).parent());
        document.location.href = '/login/' + $(this).attr('class');
    });
    var el = $('.' + $('#LanguageContext').val());
    $('.' + $('#LanguageContext').val()).prependTo($(el).parent());

    $('.btn-login').click(function () {
        //var isvalidform = true;
        //if (!$('#Userid').val()) {
        //    $('#Userid').parent('.form-group').children('.invalid-feedback').removeClass('d-none');
        //    $('#Userid').parent('.form-group').children('.invalid-feedback').show();
        //    isvalidform = false;
        //}
        //if (!$('#Password').val()) {
        //    $('#Password').parent('.form-group').children('.invalid-feedback').removeClass('d-none');
        //    $('#Password').parent('.form-group').children('.invalid-feedback').show();
        //    isvalidform = false;
        //}
        //if (isvalidform) {
        //    $.ajax({
        //        url: "/login",
        //        type: "POST",
        //        data: {
        //            LanguageContext: $('#LanguageContext').val(),
        //            Userid: $('#Userid').val(),
        //            Password: $('#Password').val(),
        //        },
        //    }).done(function (response) {
        //        if (response.status == "ERR") {
        //            ShowError(
        //                response.error.message,
        //                response.error.sender
        //            );
        //        } else if (response.status == "OK") {
        //            document.location.href = '/dashboard';
        //        }
        //    }).fail(function (xhr, status, errorThrown) {
        //    }).always(function (xhr, status) {

        //    });
        //}
    });
})