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
    loadFilterTemplate = function (DataType) {
        var templateName;
        switch (DataType) {
            /* Text */
            case "1":
                templateName = "textbox";
                break;
            /* Integer */
            case "2":
                templateName = "integer";
                break;
            /* Date */
            case "4":
                templateName = "datepicker";
                break;
        }
        return $.ajax({
            type: "GET",
            url: "/controls/ui/control.ui." + templateName + ".ejs?" + Date.now(),
            async: false
        }).responseText
    };
    loadFilter = function (user) {
        $.when(
            $.get("../model/ticket/search-filter.json?" + Date.now(),
                function (filterJSON) {
                })
        ).then(function (filterJSON, textStatus, jqXHR) {
            $.each(filterJSON, function (i, row) {
                $.when(
                    loadFilterTemplate(row.DataType)
                ).then(function (templateString, textStatus, jqXHR) {

                    $('#filtro-richieste-assistenza-container').append(
                        ejs.render(templateString, { row, user })
                    );
                    switch (row.DataType) {
                        /* Text */
                        case "1":
                            break;
                        /* Integer */
                        case "2":
                            break;
                        /* Date */
                        case "4":
                            // Verificare impostazione lingua datepicker
                            $("#control_" + row.ColumnName + "_FROM").datepicker();
                            $("#control_" + row.ColumnName + "_TO").datepicker();
                            var options = $.extend(
                                {},                                  // empty object
                                $.datepicker.regional["es"],         // fr regional
                                { dateFormat: "d MM, y" /*, ... */ } // your custom options
                            );
                            $.datepicker.setDefaults(options);

                            break;
                    }
                });
            });
        });
    }

    loadArtworkOrdini = function (pageSize, pageIndex) {

        $('.spinner-border').show();

        $('.result-richieste-assistenza-container').empty();

        $.ajax({
            url: "/richieste-assistenza/richieste",
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
                    $.get("../template/ticket/richiesta-assistenza-row.ejs?" + Date.now(),
                        function (templateString) {
                        })
                ).then(function (templateString, textStatus, jqXHR) {
                    var LanguageContext = $('#LanguageContext').val();
                    $.each(JSON.parse(JSON.parse(JSON.parse(JSON.stringify(response)).data).resultdata), function (key, row) {

                        var partialToRender = ejs.render(templateString, { row, LanguageContext });

                        $('.result-richieste-assistenza-container').append(partialToRender)

                        var user = JSON.parse($('#user').val());

                        /* inizializza il gestore del workflow */
                        $('.result-richieste-assistenza-container').find('.container-workflow-' + row.IdRecord).workflow({
                            IdProfiloUtente: user.IDProfiloUtenteDefault,
                            IdRecord: row.IdRecord,
                            IdProcesso: 76,
                            IdModelloIstanza: row.IDModelloIstanza,
                            LanguageContext: $('#LanguageContext').val()
                        });

                        $('.result-richieste-assistenza-container').find('.container-workflow-' + row.IdRecord).bind(
                            "onpreview", function (e, sender) {

                                var optionsWorkflow = JSON.parse($(this).attr('data-options'));

                                /* inizializza il controllo Model */
                                var ArtwordOrdine = $('.model');

                                /* Imposta le proprietà di default del plug-in <Model> */
                                ArtwordOrdine.model({
                                    IDModello: 32,
                                    IDVersione: 70,
                                    IDModelloIstanza: optionsWorkflow.IdModelloIstanza,
                                    Mode: "preview",
                                    user: $('.model').data('user')
                                });
                                $('.ordine-idrecord-color').html('<i class="bi bi-circle-fill bullet-stato-processo" style="color: ' + row.ColoreStato + '" />');
                                $('.ordine-idrecord').html(row.IdRecord);
                                $('.ordine-mode').html(sender);
                                $('.ordine-reference').show();

                                $.when(
                                    /* Renderizza il plug-in <Model> */
                                    ArtwordOrdine.model.load()
                                ).then(function () {
                                    $('#container-processo').modal('show');
                                });
                            });

                        $('.result-richieste-assistenza-container').find('.container-workflow-' + row.IdRecord).bind(
                            "onedit", function (e, sender) {

                                var optionsWorkflow = JSON.parse($(this).attr('data-options'));

                                /* inizializza il controllo Model */
                                var ArtwordOrdine = $('.model');

                                ArtwordOrdine.bind("onload", function () {
                                });

                                /* Imposta le proprietà di default del plug-in <Model> */
                                ArtwordOrdine.model({
                                    IDModello: 32,
                                    IDVersione: 70,
                                    IDModelloIstanza: optionsWorkflow.IdModelloIstanza,
                                    Mode: "edit",
                                    user: $('.model').data('user')
                                });
                                $('.row-idrecord-color').html('<i class="bi bi-circle-fill bullet-stato-processo" style="color: ' + row.ColoreStato + '" />');
                                $('.ordine-idrecord').html(row.IdRecord);
                                $('.ordine-mode').html(sender);
                                $('.ordine-reference').show();

                                $.when(
                                    /* Renderizza il plug-in <Model> */
                                    ArtwordOrdine.model.load()
                                ).then(function () {
                                    $('#container-processo').modal('show');
                                });
                            });

                        $('.result-richieste-assistenza-container').find('.container-workflow-' + row.IdRecord).bind(
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

                        $('.result-richieste-assistenza-container').find('.container-workflow-' + row.IdRecord).bind(
                            "onhistory", function () {

                                var optionsWorkflow = JSON.parse($(this).attr('data-options'));

                                /* inizializza il controllo Model */
                                var ArtworkHistory = $('.history');

                                /* Imposta le proprietà di default del plug-in <WorkflowHistory> */
                                ArtworkHistory.workflowhistory({
                                    IdRecord: row.IdRecord,
                                    IdProcesso: 76,
                                    LanguageContext: $('.history').data('user').LanguageContext,
                                    user: $('.history').data('user')
                                });
                                $('.history-idrecord-color').html('<i class="bi bi-circle-fill bullet-stato-processo" style="color: ' + row.ColoreStato + '" />');
                                $('.history-idrecord').html(row.IdRecord);
                                $('.ordine-reference').show();

                                $.when(
                                    /* Renderizza il plug-in <WorkflowHistory> */
                                    ArtworkHistory.workflowhistory.loadHistory(ArtworkHistory)
                                ).then(function () {
                                    $('#container-history').modal('show');
                                });

                        });

                        $('.result-richieste-assistenza-container').find('.container-workflow-' + row.IdRecord).bind(
                            "onworkflow", function (e, Note) {

                                var optionsWorkflow = JSON.parse($(this).attr('data-options'));

                                $.when(
                                    applyWorkflow(optionsWorkflow, Note)
                                ).then(function (response, textStatus, jqXHR) {

                                    if (JSON.parse(response).status == "OK") {

                                        $('#confirm-workflow-' + optionsWorkflow.IdRecord).modal('hide');

                                        /* Ricarica la lista aggiornata delle richieste */
                                        loadArtworkOrdini(
                                            JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageSize, 1
                                        );
                                    } else {
                                        ShowError(JSON.parse(response).error);
                                    }
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
            if (Number.isSafeInteger(Math.round(eval(TotalRecord) / eval(param.pageSize)))) {
                options.totalPage = Math.floor((eval(TotalRecord) / eval(param.pageSize))) + 1;
            } else {
                options.totalPage = eval(TotalRecord) / eval(param.pageSize) + 1;
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
            url: "/richiesta-assistenza/" + IDModelloIstanza,
            data: {},
            async: false
        }).responseText
    }
    deleteArtworkOrdine = function (optionsWorkflow) {
        return $.ajax({
            type: "DELETE",
            url: "/richiesta-assistenza/" + optionsWorkflow.IdRecord,
            data: {
                IDModelloIstanza: optionsWorkflow.IDModelloIstanza,
                IDProcesso: 76,
            },
            async: false
        }).responseText
    }
    applyWorkflow = function (optionsWorkflow, Note) {
        return $.ajax({
            type: "POST",
            url: "/workflow-apply/" + optionsWorkflow.IdRecord,
            data: {
                IDEventoDirezione: optionsWorkflow.IdEventoDirezione,
                IDProcesso: 76,
                Note: Note,
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

    ///* inizializza il controllo filtro */
    //var ControlFiltroOrdini = $('#filtro-richieste-assistenza-container');

    ///* Imposta le proprietà di default del plug-in <FiltroProcessi> */
    //ControlFiltroOrdini.filtroprocessi({
    //    IdProfiloUtente: null,
    //    IdProcesso: null,
    //    ProcessLabelId: $('.process-label-id').html(),
    //    LanguageContext: $('#LanguageContext').val()
    //});

    /* inizializza il controllo action-button-nuovo */
    var user = JSON.parse($('#user').val());

    var ControlActionButtonInserimento = $('.action-button-inserimento');
    ControlActionButtonInserimento.actionbutton({
        ActionType: 'primary',
        ActionName: 'Inserimento',
        IDProfiloUtente: user.IDProfiloUtenteDefault,
        IDProcesso: 76,
        LanguageContext: $('#LanguageContext').val()
    }).bind("onclick", function (e, sender) {

        /* inizializza il controllo Model */
        var ArtwordOrdine = $('.model');
        ArtwordOrdine.bind("onload", function () {
        });

        /* Imposta le proprietà di default del plug-in <Model> */
        ArtwordOrdine.model({
            IDModello: 32,
            IDVersione: 70,
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
    loadFilter(user);
    loadArtworkOrdini(JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageSize, 1);

});