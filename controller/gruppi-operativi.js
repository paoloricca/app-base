
$(function () {
    DeleteGruppoOperativo = function (IdGruppoOperativo) {
        $.ajax({
            url: "/gruppo-operativo/" + IdGruppoOperativo,
            type: "DELETE",
        }).done(function (response) {
            if (response.status == "ERR") {
                ShowError(
                    response.error.message,
                    response.error.sender
                );
            } else if (response.status == "OK") {
                document.location.href = '/gruppi-operativi/' + $('#idgruppooperativoparent').val();
            }
        }).fail(function (xhr, status, errorThrown) {
        }).always(function (xhr, status) {
            
        });
    }
    DeleteProfiloUtente = function (IdProfiloUtente) {

        $.ajax({
            url: "/profilo-utente/" + IdProfiloUtente,
            type: "DELETE",
        }).done(function (response) {
            if (response.status == "ERR") {
                ShowError(
                    response.error.message,
                    response.error.sender
                );
            } else if (response.status == "OK") {
                $('profili-utente-data-container').empty();
                loadProfiliUtente(
                    $('#ProfiloUtenteIDGruppoOperativo').val(),
                    $('#ProfiloUtenteIDGruppoOperativoParent').val(),
                    $('#ProfiloUtenteGruppoOperativoText').val()
                );
                $('.btn-cancel-confirm-delete-profilo-utente').trigger('click');
            }
        }).fail(function (xhr, status, errorThrown) {
        }).always(function (xhr, status) {
            
        });
    }
    loadProfiliUtente = function (IdGruppoOperativo, IdGruppoOperativoParent, GruppoOperativoText) {
        /* Load data */
        var IdGruppoOperativo = IdGruppoOperativo;
        var IdGruppoOperativoParent = IdGruppoOperativoParent;
        $('#idgruppooperativo').val(IdGruppoOperativo);
        $('#idgruppooperativoparent').val(IdGruppoOperativoParent);
        $('.gruppo-operativo-profili-utente').html(' / ' + GruppoOperativoText);
        $('#ProfiloUtenteIDGruppoOperativoParent').val(IdGruppoOperativoParent);
        $('#ProfiloUtenteIDGruppoOperativo').val(IdGruppoOperativo);
        $('#ProfiloUtenteGruppoOperativoText').val(GruppoOperativoText);
        $.ajax({
            url: "/profili-utente/" + IdGruppoOperativo,
            type: "GET",
            data: {},
        }).done(function (response) {
            if (response.status == "ERR") {
                ShowError(
                    response.error.message,
                    response.error.sender
                );
            } else if (response.status == "OK") {
                $('.profili-utente-data-container').empty();
                $.each(response.data, function (key, profiloutente) {

                    templateString = '';
                    $.get("/template/profilo-utente-list.ejs", function (templateString) {
                        var partialToRender = ejs.render(templateString, { profiloutente });
                        $('.profili-utente-data-container').append(partialToRender);
                        $('.profilo-utente-' + profiloutente.IDProfiloUtente + '-delete').click(function () {
                            $('#confirm-delete-profilo-utente').data('args', profiloutente.IDProfiloUtente);
                            $('#confirm-delete-profilo-utente').modal('show');
                        });
                        $('.profilo-utente-' + profiloutente.IDProfiloUtente + '-edit').click(function () {
                            var profiloutenteid = $(this).data('profiloutenteid');
                            var profiloutentetext = $(this).data('profiloutentetext');
                            $('#ProfiloUtenteID').val(profiloutenteid);

                            /* Load data for Selected Profilo Utente */
                            $.ajax({
                                url: "/profilo-utente/" + profiloutenteid,
                                type: "GET",
                                data: {},
                            }).done(function (response) {
                                if (response.status == "ERR") {
                                    ShowError(
                                        response.error.message,
                                        response.error.sender
                                    );
                                } else if (response.status == "OK") {
                                    $('#ProfiloUtente-Text-IT').val(response.data[0].Text_IT);
                                    $('#ProfiloUtente-Text-GB').val(response.data[0].Text_GB);
                                    $('#ProfiloUtente-rbIsPublic').prop("checked", response.data[0].IsPublic);
                                    $('#ProfiloUtente-rbIsVisible').prop("checked", response.data[0].IsVisible);
                                }
                            }).fail(function (xhr, status, errorThrown) {
                            }).always(function (xhr, status) {
                            });
                            $('.gruppo-operativo-profilo-utente').html(' / ' + $(this).data('profiloutentetext'));
                        });
                        $('.profilo-utente-' + profiloutente.IDProfiloUtente + '-risorse').click(function () {

                            var profiloutenteid = $(this).data('profiloutenteid');
                            var profiloutentetext = $(this).data('profiloutentetext');

                            $('#ProfiloUtenteID').val(profiloutenteid);

                            /* re-init page */
                            var ControlPagerProfiloUtenteRisorse = $('.profilo-utente-risorse-pager');
                            
                            /* Load data for Selected Profilo Utente */
                            loadProfiliUtenteRisorse(profiloutenteid,
                                JSON.parse(ControlPagerProfiloUtenteRisorse.attr('data-options')).pageSize, 1);

                            $('.gruppo-operativo-profilo-utente-risorse').html($(this).data('profiloutentetext'));
                        });
                        $('.profilo-utente-' + profiloutente.IDProfiloUtente + '-autorizzazioni').click(function () {
                            var profiloutenteid = $(this).data('profiloutenteid');
                            var profiloutentetext = $(this).data('profiloutentetext');
                            $('#ProfiloUtenteID').val(profiloutenteid);
                            $('.gruppo-operativo-profilo-utente-processi').html($(this).data('profiloutentetext'));
                        });
                    });
                });
            }
        }).fail(function (xhr, status, errorThrown) {
        }).always(function (xhr, status) {

        });
    }
    loadProfiliUtenteRisorse = function (profiloutenteid, pageSize, pageIndex) {

        $('.profilo-utente-risorse-container').empty();

        $.ajax({
            url: "/profili-utente-risorse-list/" + profiloutenteid,
            type: "POST",
            data: {
                pageIndex: pageIndex,
                pageSize: pageSize,
            },
        }).done(function (response, status, pageSize) {

            /* Retrieve POST param data */;
            var param = QueryStringToJSON($(this)[0].data);

            if (response.status == "ERR") {
                ShowError(
                    response.error.message,
                    response.error.sender
                );
            } else if (response.status == "OK") {
                
                if (response.data.length == 0) {
                    TotalRecord = 0
                } else {
                    TotalRecord = response.data[0].TotalRecord
                }

                $.when(
                    $.get("/controls/ui/control.ui.utente.ejs?" + Date.now(),
                        function (templateString) {
                        })
                ).then(function (templateString, textStatus, jqXHR) {
                    $.each(response.data, function (key, utente) {
                    
                        var partialToRender = ejs.render(templateString, { utente });

                        $('.profilo-utente-risorse-container').append(partialToRender)
                        $('.profilo-utente-risorse-container').find('.btn-select-' + utente.IDAccount).hide();
                        $('.profilo-utente-risorse-container').find('.btn-set-profilo-utente-default-' + utente.IDAccount).show();
                        $('.profilo-utente-risorse-container').find('.btn-unselect-' + utente.IDAccount).show();
                        $('.profilo-utente-risorse-container').find('.btn-set-profilo-utente-default-' + utente.IDAccount).click(function () {
                            $('#confirm-set-profilo-utente-default').data('args', utente.IDAccount);
                            if ($(this).prop('checked')) {
                                $('.btn-ok-confirm-set-profilo-utente-default').removeClass('btn-danger').addClass('btn-primary');
                                $('.warning').hide();
                            } else {
                                $('.btn-ok-confirm-set-profilo-utente-default').removeClass('btn-primary').addClass('btn-danger');
                                $('.warning').show();
                            }
                            $('#confirm-set-profilo-utente-default').modal('show');
                        });
                        $('.profilo-utente-risorse-container').find('.btn-unselect-' + utente.IDAccount).click(function () {
                            $('#confirm-unselect-utente').data('args', utente.IDAccount);

                            if ($('.profilo-utente-risorse-container').find('.btn-set-profilo-utente-default-' + utente.IDAccount).prop('checked')) {
                                $('.btn-ok-confirm-set-profilo-utente-default').removeClass('btn-primary').addClass('btn-danger');
                                $('.warning').show();
                            } else {
                                $('.btn-ok-confirm-set-profilo-utente-default').removeClass('btn-danger').addClass('btn-primary');
                                $('.warning').hide();
                            }

                            $('#confirm-unselect-utente').modal('show');
                        });
                    });
                });

            }
            /* Inizio gestione paginazione */
            var optionsPagerUtenteRisorse = JSON.parse(ControlPagerProfiloUtenteRisorse.attr('data-options'));
            optionsPagerUtenteRisorse.pageIndex = eval(param.pageIndex);
            optionsPagerUtenteRisorse.pageSize = param.pageSize;
            if (!Number.isSafeInteger((eval(TotalRecord) / eval(param.pageSize)))) {
                optionsPagerUtenteRisorse.totalPage = Math.round((eval(TotalRecord) / eval(param.pageSize)) + 1);
            } else {
                optionsPagerUtenteRisorse.totalPage = Math.round(eval(TotalRecord) / eval(param.pageSize));
            }
            optionsPagerUtenteRisorse.totalRecord = TotalRecord;
            ControlPagerProfiloUtenteRisorse.attr('data-options', JSON.stringify(optionsPagerUtenteRisorse));
            ControlPagerProfiloUtenteRisorse.paging.draw(ControlPagerProfiloUtenteRisorse);
            /* Fine gestione paginazione */
        }).fail(function (xhr, status, errorThrown) {
        });
    }
    collegaUtente = function (IDOwner, IDGruppoOperativo, IDProfiloUtente, IDAccount) {

        $.ajax({
            url: "/profili-utente-risorse/" + IDAccount,
            type: "POST",
            data: {
                IDOwner: IDOwner,
                IDGruppoOperativo: IDGruppoOperativo,
                IDProfiloUtente: IDProfiloUtente
            }
        }).done(function (response) {
            if (response.status == "ERR") {
                ShowError(
                    response.error.message,
                    response.error.sender
                );
            } else if (response.status == "OK") {
                var ControlPagerProfiloUtenteRisorse = $('.profilo-utente-risorse-pager');
                loadProfiliUtenteRisorse(IDProfiloUtente, 
                    JSON.parse(ControlPagerProfiloUtenteRisorse.attr('data-options')).pageSize, 1);
                $('.btn-close-utenti').trigger('click');
            }
        }).fail(function (xhr, status, errorThrown) {
        }).always(function (xhr, status) {

        });

    }
    scollegaUtente = function (IDAccount) {

        $.ajax({
            url: "/profili-utente-risorse/" + IDAccount,
            type: "DELETE",
            data: {
                IDGruppoOperativo: $('#idgruppooperativo').val(),
                IDProfiloUtente: $('#ProfiloUtenteID').val()
            }
        }).done(function (response) {
            if (response.status == "ERR") {
                ShowError(
                    response.error.message,
                    response.error.sender
                );
            } else if (response.status == "OK") {
                var ControlPagerProfiloUtenteRisorse = $('.profilo-utente-risorse-pager');
                loadProfiliUtenteRisorse($('#ProfiloUtenteID').val(), 
                JSON.parse(ControlPagerProfiloUtenteRisorse.attr('data-options')).pageSize, 1);
                $('.btn-cancel-confirm-unselect-utente').trigger('click');
            }
        }).fail(function (xhr, status, errorThrown) {
        }).always(function (xhr, status) {
        });
    }
    setProfiloUtenteDefault = function (IDAccount) {
        $.ajax({
            url: "/profili-utente-set-dafault/" + IDAccount,
            type: "post",
            data: {
                IDGruppoOperativo: $('#idgruppooperativo').val(),
                IDProfiloUtente: $('#ProfiloUtenteID').val(),
                IsDefault: $('.btn-set-profilo-utente-default-' + IDAccount).prop("checked")
            }
        }).done(function (response) {
            if (response.status == "ERR") {
                ShowError(
                    response.error.message,
                    response.error.sender
                );
            } else if (response.status == "OK") {
                $('.btn-set-profilo-utente-default-' + IDAccount).data('default', $('.btn-set-profilo-utente-default-' + IDAccount).prop("checked"));
                $('.btn-cancel-confirm-set-profilo-utente-default').trigger('click');
            }
        }).fail(function (xhr, status, errorThrown) {
        }).always(function (xhr, status) {
        });
    }
    toggleProcessoAzione = function (IdGruppoOperativo, IdProfiloUtente, IdProcesso, IdProcessoAzione, Toggled) {
        if (Toggled) {
            postType = "POST";
        } else {
            postType = "DELETE";
        }
        $.ajax({
            url: "/profiliutenteabilitazioni",
            type: postType,
            data: {
                IdGruppoOperativo: IdGruppoOperativo,
                IdProfiloUtente: IdProfiloUtente,
                IdProcesso: IdProcesso,
                IdProcessoAzione: IdProcessoAzione,
            }
        }).done(function (response) {
            if (response.status == "ERR") {
                $('#rb-processo-azione-3').prop('checked', true);
                ShowError(
                    response.error.message,
                    response.error.sender
                );
            } else if (response.status == "OK") {

            }
        }).fail(function (xhr, status, errorThrown) {
        }).always(function (xhr, status) {
        });
    }

    $('.gruppo-operativo-btn-ok').click(function () {
        
        var isvalidform = true;
        const forms = document.querySelectorAll('#gruppi-operativi-modal .form-control, #gruppi-operativi-modal .form-select')
        Array.from(forms).forEach(form => {
            if (!form.checkValidity()) {
                isvalidform = false;
            }
        })
        /* Save data */
        if (isvalidform) {
            var IdGruppoOperativo = $('#idgruppooperativo').val();
            if (IdGruppoOperativo != '') {
                requestType = "PUT";
            } else {
                requestType = "POST"
            }
            $.ajax({
                url: "/gruppo-operativo/" + IdGruppoOperativo,
                type: requestType,
                data: {
                    IdGruppoOperativoParent: $('#idgruppooperativoparent').val(),
                    Codice: $('#codice').val(),
                    Descrizione: $('#descrizione').val(),
                    Text_IT: $('#Text_IT').val(),
                    Text_GB: $('#Text_GB').val(),
                    IsPublic: $('#rbIsPublic').prop("checked"),
                    IsVisible: $('#rbIsVisible').prop("checked"),
                    Supervisor: $('#supervisor').val()
                },
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(
                        response.error.message,
                        response.error.sender
                    );
                }
                else if (response.status == "OK") {
                    $('#gruppi-operativi-modal').modal('hide');
                    document.location.href = '/gruppi-operativi/' + $('#idgruppooperativoparent').val();
                }
            })
        }        
    });
    $('.profilo-utente-btn-ok').click(function () {

        var isvalidform = true;
        const forms = document.querySelectorAll('#profilo-utente-modal .form-control, #profilo-utente-modal .form-select')
        Array.from(forms).forEach(form => {
            if (!form.checkValidity()) {
                isvalidform = false;
            }
        })
        /* Save data */
        if (isvalidform) {
            var IdProfiloUtente = $('#ProfiloUtenteID').val();
            if (IdProfiloUtente != '') {
                requestType = "PUT";
            } else {
                requestType = "POST"
            }
            $.ajax({
                url: "/profilo-utente/" + IdProfiloUtente,
                type: requestType,
                data: {
                    ProfiloUtenteIDGruppoOperativo: $('#ProfiloUtenteIDGruppoOperativo').val(),
                    Text_IT: $('#ProfiloUtente-Text-IT').val(),
                    Text_GB: $('#ProfiloUtente-Text-GB').val(),
                    IsPublic: $('#ProfiloUtente-rbIsPublic').prop("checked"),
                    IsVisible: $('#ProfiloUtente-rbIsVisible').prop("checked"),
                },
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(
                        response.error.message,
                        response.error.sender
                    );
                }
                else if (response.status == "OK") {
                    $('.btn-close-profilo-utente').trigger('click');
                    loadProfiliUtente(
                        $('#ProfiloUtenteIDGruppoOperativo').val(),
                        $('#ProfiloUtenteIDGruppoOperativoParent').val(),
                        $('#ProfiloUtenteGruppoOperativoText').val()
                    )
                }
            })
        }
    });
    $('.profilo-utente-risorse-new').click(function () {

        /* get plugin reference */
        var ControlUtenti = $('#utenti-container');     

        /* get plugin attribute option */
        var options = JSON.parse(ControlUtenti.attr('data-options'));

        /* set pluging attribute */
        options.IDGruppoOperativo = $('#idgruppooperativo').val();
        options.IDProfiloUtente = $('#ProfiloUtenteID').val();


        var ControlPagerUtenti = $('#utenti-pager');
        var optionPager = JSON.parse(ControlPagerUtenti.attr('data-options'));
        optionPager.pageIndex = 1;
        optionPager.pageSize = 6;
        ControlPagerUtenti.attr('data-options', JSON.stringify(optionPager));

        /* re-store plugin attribute option */
        ControlUtenti.attr('data-options', JSON.stringify(options));

        /* initial data loading */
        ControlUtenti.utenti.load();



    });
    $('.profili-utente-new').click(function () {
        $('#ProfiloUtenteID').val('');
        $('#ProfiloUtente-Text-IT').val('');
        $('#ProfiloUtente-Text-GB').val('');
        $('#ProfiloUtente-rbIsPublic').prop("checked", false);
        $('#ProfiloUtente-rbIsVisible').prop("checked", false);
        $('.gruppo-operativo-profilo-utente').html(' / Nuovo');
    });
    $('.gruppi-operativi-new').click(function () {
        $.ajax({
            url: "/attore-risorse/",
            type: "GET",
            data: {},
        }).done(function (response) {
            if (response.status == "ERR") {
                ShowError(
                    response.error.message,
                    response.error.sender
                );
            } else if (response.status == "OK") {
                $('#supervisor').empty();
                $('#supervisor').append('<option selected value="">&hellip;</option>')
                $.each(response.data, function (key, risorsa) {
                    if (eval(risorsa.IDAccount) == eval(supervisor)) {
                        var selected = " selected";
                    }
                    $('#supervisor').append('<option ' + selected + ' value="' + risorsa.IDAccount + '">' + risorsa.Nome + ' ' + risorsa.Cognome + '</option>')
                });
                $('#idgruppooperativo').val('');
                $('#codice').val('');
                $('#descrizione').val('');
                $('#Text_IT').val('');
                $('#Text_GB').val('');
                $('#rbIsPublic').prop("checked", false);
                $('#rbIsVisible').prop("checked", false);

                $('#gruppi-operativi-modal').modal('show');
                $('#gruppi-operativi-modal .modal-title').html('<b>Nuovo</b>');
            }
        });
    });
    $('.gruppi-operativi-profili-utente').click(function () {
        loadProfiliUtente(
            $(this).data('gruppioperativoid'),
            $(this).data('gruppioperativoparentid'),
            $(this).data('gruppioperativotext')
        )
    });
    $('.gruppi-operativi-edit').click(function () {
        /* Load data from Id */
        var IdGruppoOperativo = $(this).data('gruppioperativoid');
        var IdGruppoOperativoParent = $(this).data('gruppioperativoparentid');

        $.ajax({
            url: "/gruppo-operativo/" + IdGruppoOperativo,
            type: "GET",
            data: {},
        }).done(function (response) {
            if (response.status == "ERR") {
                ShowError(
                    response.error.message,
                    response.error.sender
                );
            } else if (response.status == "OK") {
                $('#idgruppooperativo').val(response.data[0].IDGruppoOperativo);
                $('#idgruppooperativoparent').val(response.data[0].IDGruppoOperativoParent);
                $('#codice').val(response.data[0].Codice);
                $('#descrizione').val(response.data[0].Descrizione);
                $('#Text_IT').val(response.data[0].Text_IT);
                $('#Text_GB').val(response.data[0].Text_GB);
                $('#rbIsPublic').prop("checked", response.data[0].IsPublic);
                $('#rbIsVisible').prop("checked", response.data[0].IsVisible);
                var supervisor = response.data[0].Supervisor;
                $.ajax({
                    url: "/attore-risorse/",
                    type: "GET",
                    data: {},
                }).done(function (response) {
                    if (response.status == "ERR") {
                        ShowError(
                            response.error.message,
                            response.error.sender
                        );
                    } else if (response.status == "OK") {
                        $('#supervisor').empty();
                        $('#supervisor').append('<option selected value="">&hellip;</option>')
                        $.each(response.data, function (key, risorsa) {
                            if (eval(risorsa.IDAccount) == eval(supervisor)) {
                                var selected = " selected";
                            }
                            $('#supervisor').append('<option ' + selected + ' value="' + risorsa.IDAccount + '">' + risorsa.Nome + ' ' + risorsa.Cognome + '</option>')
                        });
                    }
                }).fail(function (xhr, status, errorThrown) {
                }).always(function (xhr, status) {
                });
            }
        }).fail(function (xhr, status, errorThrown) {
        }).always(function (xhr, status) {

        });

        $('#gruppi-operativi-modal').modal('show');
        $('#gruppi-operativi-modal .modal-title').html('<b>' + $(this).data('gruppioperativotext') + '</b>');
    })

    /* initialize confirm-delete-profilo-utente */
    $.get("/view/partials/confirm-delete.ejs", function (templateString) {
        templateString = templateString.replace("confirm-delete", "confirm-delete-profilo-utente");
        var partialToRender = ejs.render(templateString);
        $('.container-confirm-delete-profilo-utente').append(partialToRender);
    });
    /* initialize confirm-unselect-utente */
    $.get("/view/partials/confirm-delete.ejs", function (templateString) {
        templateString = templateString.replace("confirm-delete", "confirm-unselect-utente");
        var partialToRender = ejs.render(templateString);
        $('.container-confirm-unselect-utente').append(partialToRender);
    });
    /* intercept button btn-cancel-confirm-delete-profilo-utente */
    $('.btn-cancel-confirm-delete-profilo-utente').click(function () {
        $('#confirm-delete-profilo-utente').modal('hide');
    });
    /* intercept button btn-ok-confirm-delete-profilo-utente */
    $('.btn-ok-confirm-delete-profilo-utente').click(function () {
        var IdProfiloUtente = $('#confirm-delete-profilo-utente').data('args');
        DeleteProfiloUtente(IdProfiloUtente);
    });
    /* intercept button btn-cancel-confirm-unselect-utente */
    $('.btn-cancel-confirm-unselect-utente').click(function () {
        $('#confirm-unselect-utente').modal('hide');
    });
    /* intercept button btn-ok-confirm-unselect-utente */
    $('.btn-ok-confirm-unselect-utente').click(function () {
        var IDAccount = $('#confirm-unselect-utente').data('args');
        scollegaUtente(IDAccount);
    });
    /* intercept button btn-ok-confirm-set-profilo-utente-default */
    $('.btn-ok-confirm-set-profilo-utente-default').click(function () {
        var IDAccount = $('#confirm-set-profilo-utente-default').data('args');
        setProfiloUtenteDefault(IDAccount);
    });
    /* restore value for pressed button btn-set-profilo-utente-default */
    $("#confirm-set-profilo-utente-default").on("hidden.bs.modal", function (event) {
        $('.btn-set-profilo-utente-default-' + $(this).data('args')).prop("checked", $('.btn-set-profilo-utente-default-' + $(this).data('args')).data('default'));
    });

    /* inizializza il controllo pager per le risorse del profilo utente selezionato */
    var ControlPagerProfiloUtenteRisorse = $('.profilo-utente-risorse-pager');

    /* Imposta le proprietà di default del plug-in */
    ControlPagerProfiloUtenteRisorse.paging({
        pageIndex: 1,
        pageSize: 6
    });
    /* Registra l'evento {Pagina precedente} */
    ControlPagerProfiloUtenteRisorse.bind(
        "prev", function () {
            loadProfiliUtenteRisorse(
                $('#ProfiloUtenteID').val(),
                JSON.parse(ControlPagerProfiloUtenteRisorse.attr('data-options')).pageSize,
                JSON.parse(ControlPagerProfiloUtenteRisorse.attr('data-options')).pageIndex
            );
    });
    /* Registra l'evento {Pagina successiva} */
    ControlPagerProfiloUtenteRisorse.bind(
        "next", function () {
            loadProfiliUtenteRisorse(
                $('#ProfiloUtenteID').val(),
                JSON.parse(ControlPagerProfiloUtenteRisorse.attr('data-options')).pageSize,
                JSON.parse(ControlPagerProfiloUtenteRisorse.attr('data-options')).pageIndex
        );
    });






    /* inizializza il controllo processi */
    var ControlProcessi = $('#processi-container');

    /* Imposta le proprietà di default del plug-in <Pager> */
    ControlProcessi.processi({
    });

    /* Registra l'evento {onselect} per caricare la lista delle autorizzazioni */
    ControlProcessi.bind(
        "onselect", function () {
            /* Renderizza il plug-in <processiazioni> */
            $('.autorizzazioni-processo-text').html('[' + JSON.parse(ControlProcessi.attr('data-options')).Descrizione + ']');
            ControlProcessiAzioni.processiazioni.load(
                JSON.parse(ControlProcessi.attr('data-options')).IDProcesso,
                $('#ProfiloUtenteID').val()
            );

        });
    /* Renderizza il plug-in <processi> */
    ControlProcessi.processi.load();


    /* inizializza il controllo processi azioni */
    var ControlProcessiAzioni = $('#autorizzazioni-container');

    /* Imposta le proprietà di default del plug-in <Pager> */
    ControlProcessiAzioni.processiazioni({
    });

    /* Registra l'evento {ontoggle} per aggiornare il valore dell'autorizzazione selezionata */
    ControlProcessiAzioni.bind(
        "ontoggle", function () {
            toggleProcessoAzione(
                $('#ProfiloUtenteIDGruppoOperativo').val(),
                $('#ProfiloUtenteID').val(),
                JSON.parse(ControlProcessiAzioni.attr('data-options')).IDProcesso,
                JSON.parse(ControlProcessiAzioni.attr('data-options')).IDProcessoAzione,
                JSON.parse(ControlProcessiAzioni.attr('data-options')).Toggled
            );
        });


    /* Inizializza il controllo <utenti> suò relativo container */
    var ControlUtenti = $('#utenti-container');

    /* Imposta le proprietà di default del plug-in <utenti> */
    ControlUtenti.utenti({
        IDAttore: $('#IDOwner').val()
    });

    /* Registra l'evento {onselect} */
    ControlUtenti.bind(
        "onselect", function () {
            collegaUtente(
                JSON.parse(ControlUtenti.attr('data-options')).IDAttore,
                JSON.parse(ControlUtenti.attr('data-options')).IDGruppoOperativo,
                JSON.parse(ControlUtenti.attr('data-options')).IDProfiloUtente,
                JSON.parse(ControlUtenti.attr('data-options')).IDAccount
            )
    });
    /* Renderizza il plug-in <utenti> */
    ControlUtenti.utenti.draw();
})


