$(function () {
    $('.btn-ok').click(function () {
        var isvalidform = true;
        const forms = document.querySelectorAll('.form-control, .form-select')
        Array.from(forms).forEach(form => {
            if (!form.checkValidity()) {
                isvalidform = false;
            }
        })
        if (isvalidform) {
            /* TODO: salva i dati */
        }        
    });
    $('.gruppi-operativi-edit').click(function () {
        /* Load data from Id */
        var IdGruppoOperativo = $(this).data('gruppioperativoid');

        $.ajax({
            url: "http://localhost:5000/gruppo-operativo/" + IdGruppoOperativo,
            type: "GET",
            data: {},
        }).done(function (response) {
            if (response.status == "ERR") {
                var err = JSON.parse(response.error);
                $('.pnl-errors').html(err.message);
                $('.form-errors').show();
                //console.log(err.name);
                //console.log(err.stack);
            } else if (response.status == "OK") {
                $('#codice').val(response.data[0].Codice);
                $('#descrizione').val(response.data[0].Descrizione);
                $('#Text_IT').val(response.data[0].Text_IT);
                $('#Text_GB').val(response.data[0].Text_GB);
                $('#rbIsPublic').prop("checked", response.data[0].IsPublic);
                $('#rbIsVisible').prop("checked", response.data[0].IsVisible);
                var supervisor = response.data[0].Supervisor;
                $.ajax({
                    url: "http://localhost:5000/attore-risorse/",
                    type: "GET",
                    data: {},
                }).done(function (response) {
                    if (response.status == "ERR") {
                        var err = JSON.parse(response.error);
                        $('.pnl-errors').html(err.message);
                        $('.form-errors').show();
                    } else if (response.status == "OK") {
                        $('#supervisor').empty();
                        $.each(response.data, function (key, risorsa) {
                            if (eval(risorsa.IDAccount) == eval(supervisor)) {
                                var selected = " selected";
                            }
                            $('#supervisor').append('<option ' + selected + ' value="' + risorsa.IDAccount + '">' + risorsa.Nome + ' ' + risorsa.Cognome + '</option>')
                        });
                        console.log(supervisor);
                    }
                }).fail(function (xhr, status, errorThrown) {
                }).always(function (xhr, status) {

                });



                //$.each(response.data, function (key, product) {
                //});
                //VW_ATTORI_RISORSE
            }
        }).fail(function (xhr, status, errorThrown) {
        }).always(function (xhr, status) {

        });

        $('#gruppi-operativi-modal').modal('show');
        $('#gruppi-operativi-modal .modal-title').html('<b>' + $(this).data('gruppioperativotext') + '</b>');
    })
})


