$(function () {

    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
    const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));

    $('.btn-filter-close').click(function () {
        $('.filtro-container').hide();
        $('.result-container').removeClass('col-xs-10 px-3').addClass('col-xs-12');
    });
    $('.btn-filter-open').click(function () {
        $('.filtro-container').show();
        $('.result-container').removeClass().addClass('p-0 h-100 px-3 result-container col-xs-10');
        $(this).blur();
    });

    loadArtworkOrdini = function (pageSize, pageIndex) {

        $('.spinner-border').show();

        $('.result-ordini-container').empty();

        $.ajax({
            url: "/artwork-ordine/ordini",
            type: "POST",
            data: {
                pageIndex: pageIndex,
                pageSize: pageSize,
            },
        }).done(function (response, status, pageSize) {

            /* Retrieve POST param data */;
            var param = QueryStringToJSON($(this)[0].data);

            //console.log("response: " + JSON.stringify(response));

            if (response.status == "ERR") {
                ShowError(
                    response.error.message,
                    response.error.sender
                );
            } else if (response.status == "OK") {

                //console.log(JSON.parse(JSON.parse(JSON.parse(JSON.stringify(response)).data).resultdata));

                if (JSON.parse(JSON.parse(JSON.stringify(response)).data).resultdata.length == 0) {
                    TotalRecord = 0
                } else {
                    TotalRecord = JSON.parse(JSON.parse(JSON.stringify(response)).data).TotalRecord;
                }

                $.when(
                    $.get("../template/artwork/artwork-ordine-row.ejs?" + Date.now(),
                        function (templateString) {
                        })
                ).then(function (templateString, textStatus, jqXHR) {
                    var LanguageContext = $('#LanguageContext').val();
                    $.each(JSON.parse(JSON.parse(JSON.parse(JSON.stringify(response)).data).resultdata), function (key, ordine) {
                        
                        var partialToRender = ejs.render(templateString, { ordine, LanguageContext });

                        $('.result-ordini-container').append(partialToRender)

                        var user = JSON.parse($('#user').val());

                        /* inizializza il gestore del workflow */
                        $('.result-ordini-container').find('.container-workflow-' + ordine.IdRecord).workflow({
                            IdProfiloUtente: user.IDProfiloUtenteDefault,
                            IdRecord: ordine.IdRecord,
                            IdProcesso: 71,
                            IdModelloIstanza: ordine.IDModelloIstanza,
                            LanguageContext: $('#LanguageContext').val()
                        });

                        $('.result-ordini-container').find('.container-workflow-' + ordine.IdRecord).bind(
                            "onpreview", function (e, sender) {

                                var optionsWorkflow = JSON.parse($(this).attr('data-options'));

                                /* inizializza il controllo Model */
                                var ArtwordOrdine = $('.model');

                                /* Imposta le proprietà di default del plug-in <Model> */
                                ArtwordOrdine.model({
                                    IDModello: 31,
                                    IDVersione: 68,
                                    IDModelloIstanza: optionsWorkflow.IdModelloIstanza,
                                    Mode: "preview",
                                    user: $('.model').data('user')
                                });
                                $('.ordine-idrecord-color').html('<i class="bi bi-circle-fill bullet-stato-processo" style="color: ' + ordine.ColoreStato + '" />');
                                $('.ordine-idrecord').html(ordine.IdRecord);
                                $('.ordine-mode').html(sender);
                                $('.ordine-reference').show();

                                $.when(
                                    /* Renderizza il plug-in <Model> */
                                    ArtwordOrdine.model.load()
                                ).then(function () {
                                    $('#container-processo').modal('show');
                                });
                            });

                        $('.result-ordini-container').find('.container-workflow-' + ordine.IdRecord).bind(
                            "onedit", function (e, sender) {

                                var optionsWorkflow = JSON.parse($(this).attr('data-options'));

                                /* inizializza il controllo Model */
                                var ArtwordOrdine = $('.model');

                                ArtwordOrdine.bind("onload", function () {                                        
                                });

                                /* Imposta le proprietà di default del plug-in <Model> */
                                ArtwordOrdine.model({
                                    IDModello: 31,
                                    IDVersione: 68,
                                    IDModelloIstanza: optionsWorkflow.IdModelloIstanza,
                                    Mode: "edit",
                                    user: $('.model').data('user')
                                });
                                $('.ordine-idrecord-color').html('<i class="bi bi-circle-fill bullet-stato-processo" style="color: ' + ordine.ColoreStato + '" />');
                                $('.ordine-idrecord').html(ordine.IdRecord);
                                $('.ordine-mode').html(sender);
                                $('.ordine-reference').show();

                                $.when(
                                    /* Renderizza il plug-in <Model> */
                                    ArtwordOrdine.model.load()
                                ).then(function () {
                                    $('#container-processo').modal('show');
                                });
                        });

                        $('.result-ordini-container').find('.container-workflow-' + ordine.IdRecord).bind(
                            "ondelete", function (e, sender) {

                                var optionsWorkflow = JSON.parse($(this).attr('data-options'));

                                $.when(
                                    deleteArtworkOrdine(optionsWorkflow)
                                ).then(function (response, textStatus, jqXHR) {

                                    if (JSON.parse(response).status == "OK") {

                                        $('#confirm-action-' + optionsWorkflow.IdRecord).modal('hide');

                                        /* Ricarica la lista aggiornata delle richieste */
                                        loadArtworkOrdini(
                                            JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageSize, 1
                                        );
                                    } else {
                                        ShowError(JSON.parse(response).error);
                                    }
                                });


                            });

                        $('.result-ordini-container').find('.container-workflow-' + ordine.IdRecord).bind(
                            "onhistory", function () {

                                var optionsWorkflow = JSON.parse($(this).attr('data-options'));

                                /* inizializza il controllo Model */
                                var ArtworkHistory = $('.history');

                                /* Imposta le proprietà di default del plug-in <WorkflowHistory> */
                                ArtworkHistory.workflowhistory({
                                    IdRecord: ordine.IdRecord,
                                    IdProcesso: 71,
                                    LanguageContext: $('.history').data('user').LanguageContext,
                                    user: $('.history').data('user')
                                });
                                $('.history-idrecord-color').html('<i class="bi bi-circle-fill bullet-stato-processo" style="color: ' + ordine.ColoreStato + '" />');
                                $('.history-idrecord').html(ordine.IdRecord);
                                $('.ordine-reference').show();

                                $.when(
                                    /* Renderizza il plug-in <WorkflowHistory> */
                                    ArtworkHistory.workflowhistory.loadHistory(ArtworkHistory)
                                ).then(function () {
                                    $('#container-history').modal('show');
                                });

                            });

                    });
                });
            }

            /* Inizio gestione paginazione */
            var pagerArtworkOrdine = $('.artwork-ordine-pager');
            var options = JSON.parse(pagerArtworkOrdine.attr('data-options'));
            options.pageIndex = eval(param.pageIndex);
            options.pageSize = param.pageSize;
            if (Number.isInteger(Math.round(eval(TotalRecord) / eval(param.pageSize)))) {
                options.totalPage = Math.round(eval(TotalRecord) / eval(param.pageSize));
            } else {
                options.totalPage = Math.round((eval(TotalRecord) / eval(param.pageSize)) + 1);
            }
            options.totalRecord = TotalRecord;
            pagerArtworkOrdine.attr('data-options', JSON.stringify(options));
            pagerArtworkOrdine.paging.draw($('.artwork-ordine-pager'));
            pagerArtworkOrdine.find('.spinner-border').hide();
            /* Fine gestione paginazione */

        }).fail(function (xhr, status, errorThrown) {
        });
    }
    saveProcessTransition = function (IDModelloIstanza) {
        return $.ajax({
            type: "POST",
            url: "/artwork-ordine/" + IDModelloIstanza,
            data: {},
            async: false
        }).responseText
    }

    deleteArtworkOrdine = function (optionsWorkflow) {
        return $.ajax({
            type: "DELETE",
            url: "/artwork-ordine/" + optionsWorkflow.IdRecord,
            data: {
                IDModelloIstanza: optionsWorkflow.IDModelloIstanza,
                IDProcesso: 71,
            },
            async: false
        }).responseText
    }

    /* inizializza il controllo Model */
    var ArtwordOrdine = $('.model');

    ArtwordOrdine.bind(
        "onsave", function () {

            // Recupero IDModelloIstanza from {Model}
            var optionsArtwordOrdine = JSON.parse($(this).attr('data-options'));

            $.when(
                saveProcessTransition(optionsArtwordOrdine.IDModelloIstanza)
            ).then(function (response, textStatus, jqXHR) {

                if (JSON.parse(response).status == "OK") {
                    $('#container-processo').modal('hide');

                    /* Ricarica la lista aggiornata delle richieste */
                    loadArtworkOrdini(
                        JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageSize, 1
                    );
                } else {
                    ShowError(JSON.parse(response).error);
                }
            });
    });

    /* inizializza il controllo filtro */
    var ControlFiltroOrdini = $('#filtro-ordini-container');

    /* Imposta le proprietà di default del plug-in <FiltroProcessi> */
    ControlFiltroOrdini.filtroprocessi({
        IdProfiloUtente: null,
        IdProcesso: null,
        ProcessLabelId: $('.process-label-id').html(),
        LanguageContext: $('#LanguageContext').val()
    });

    /* inizializza il controllo action-button-nuovo */
    var user = JSON.parse($('#user').val());

    var ControlActionButtonInserimento = $('.action-button-inserimento');
    ControlActionButtonInserimento.actionbutton({
        ActionType: 'primary',
        ActionName: 'Inserimento',
        IDProfiloUtente: user.IDProfiloUtenteDefault,
        IDProcesso: 71,
        LanguageContext: $('#LanguageContext').val()
    }).bind("onclick", function (e, sender) {

        /* inizializza il controllo Model */
        var ArtwordOrdine = $('.model');
        ArtwordOrdine.bind("onload", function () {
        });

        /* Imposta le proprietà di default del plug-in <Model> */
        ArtwordOrdine.model({
            IDModello: 31,
            IDVersione: 68,
            IDModelloIstanza: null,
            Mode: "edit",
            user: $('.model').data('user')
        });
        $('.ordine-idrecord-color').html('<i class="bi bi-circle-fill bullet-stato-processo" style="color: lightgray;" />');
        $('.ordine-idrecord').html('');
        $('.ordine-mode').html(sender);
        $('.ordine-reference').hide();

        $.when(
            /* Renderizza il plug-in <Model> */
            ArtwordOrdine.model.load()
        ).then(function () {
            $('#container-processo').modal('show');
        });
    });

    /* inizializza il controllo pager */
    var ControlPagerArtworkOrdine = $('.artwork-ordine-pager');

    /* Imposta le proprietà di default del plug-in <Pager> */
    ControlPagerArtworkOrdine.paging({
        pageIndex: 1,
        pageSize: 12,
        LanguageContext: $('#LanguageContext').val()
    });

    /* Registra l'evento {Pagina precedente} */
    ControlPagerArtworkOrdine.bind(
        "prev", function () {
            loadArtworkOrdini(
                JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageSize,
                JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageIndex
        );
    });
    /* Registra l'evento {Pagina successiva} */
    ControlPagerArtworkOrdine.bind(
        "next", function () {
            loadArtworkOrdini(
                JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageSize,
                JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageIndex
            );
    });

    loadArtworkOrdini(JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageSize, 1);

});