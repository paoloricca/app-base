$(function () {

    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
    const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));

    $('.btn-filter-close').click(function () {
        $('.filtro-container').hide();
        $('.result-container').removeClass('col-lg-9 col-md-9 col-sm-9').addClass('col-lg-12 col-md-12 col-sm-12');
    });
    $('.btn-filter-open').click(function () {
        $('.filtro-container').show();
        $('.result-container').removeClass('col-lg-12 col-md-12 col-sm-12').addClass('col-lg-9 col-md-9 col-sm-9');
        $(this).blur();
    });
    $('.btn-filter-apply').click(function () {
        applyFilter();
    });
    applyFilter = function () {
        try {
            $('.spinner-border').show();
            $.ajax({
                url: '/checksession',
                type: "GET",
                data: {},
            }).done(function (res) {
                if (JSON.parse(JSON.stringify(res)).status == "CN") {
                    $('.spinner-border').hide();
                    ShowErrorConn($('#LanguageContext').val());
                }
                else if (JSON.parse(JSON.stringify(res)).status == "OK") {

                    /* Recupera i valori dei campi filtro e applica i filtri alla lista */
                    $.when(
                        $.get("../model/ticket/search-filter.json?" + Date.now(),
                            function (filterJSON) {
                            })
                    ).then(function (filterJSON, textStatus, jqXHR) {
                        var QueryFilter = "";
                        $.each(filterJSON, function (i, row) {
                            switch (row.DataType) {
                                /* Text */
                                case "1":
                                    break;
                                /* Integer */
                                case "2":
                                    if ($("#control_" + row.ColumnName).val() != "") {
                                        QueryFilter += " AND " + row.ColumnName + " = " + $("#control_" + row.ColumnName).val();
                                    }
                                    break;
                                /* Date */
                                case "4":
                                    if ($("#control_" + row.ColumnName + "_FROM").val() != "") {
                                        var dateFrom = $("#control_" + row.ColumnName + "_FROM").val().split("/");
                                        QueryFilter += " AND CAST(" + row.ColumnName + " AS DATE) >= '" + dateFrom[2] + '-' + dateFrom[1] + '-' + dateFrom[0] + "'";
                                    }
                                    if ($("#control_" + row.ColumnName + "_TO").val() != "") {
                                        var dateTo = $("#control_" + row.ColumnName + "_TO").val().split("/");
                                        QueryFilter += " AND CAST(" + row.ColumnName + " AS DATE) <= '" + dateTo[2] + '-' + dateTo[1] + '-' + dateTo[0] + "'";
                                    }
                                    break;
                                /* Combo */
                                case "6":
                                    if ($("#control_" + row.ColumnName).val() != "null") {
                                        QueryFilter += " AND " + row.ColumnName + ".Code = '" + $("#control_" + row.ColumnName).val() + "'";
                                    }
                                    break;
                                /* Combo */
                                case "-1":
                                    if ($("#control_" + row.ColumnName).val() != "") {
                                        QueryFilter += " AND " + row.ColumnName.split('_').join('.') + " <> ''";
                                    }
                                    break;
                                /* Combo */
                                case "0":
                                    if ($("#control_" + row.ColumnName).val() != "") {
                                        QueryFilter += " AND " + row.ColumnName.split('_').join('.') + " = " + $("#control_" + row.ColumnName).val();
                                    }
                                    break;
                            }

                        });
                        loadArtworkOrdini(
                            JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageSize,
                            JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageIndex,
                            QueryFilter
                        );
                    });

                } else {
                    RedirectToLogin();
                }
            });
        } catch (err) {
            $('.spinner-border').hide();
            ShowError(err.message, "applyFilter");
        }
    }
    loadFilterTemplate = function (DataType) {
        try {
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
                /* Combo */
                case "6":
                    templateName = "combo";
                    break;
                /* Combo */
                case "-1":
                    templateName = "combo";
                    break;
                case "0":
                    templateName = "combo";
                    break;
            }
            return $.ajax({
                type: "GET",
                url: "/controls/ui/control.ui." + templateName + ".ejs?" + Date.now(),
                async: false
            }).responseText
        } catch (err) {
            ShowError(err.message, "loadFilterTemplate")
            return false
        }
    };
    loadAttributeValues = function (IdAttributo) {
        try {
            return $.ajax({
                type: "GET",
                url: "/model-class-attribute-values/" + IdAttributo,
                async: false
            }).responseText
        } catch (err) {
            ShowError(err.message, "loadAttributeValues")
            return false
        }
    };
    loadWorkflowTransitions = function (IdProcesso) {
        try {
            return $.ajax({
                type: "GET",
                url: "/workflow-transitions/" + IdProcesso,
                async: false
            }).responseText
        }
        catch (err) {
            ShowError(err.message, "loadWorkflowTransitions")
            return false
        }
    }
    loadFilter = function (user) {
        try {
            return $.when(
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
                                $("#control_" + row.ColumnName).inputFilter(function (value) {
                                    return /^-?\d*$/.test(value);
                                });
                                break;
                            /* Date */
                            case "4":
                                // Verificare impostazione lingua datepicker
                                $("#control_" + row.ColumnName + "_FROM").datepicker();
                                $("#control_" + row.ColumnName + "_TO").datepicker();
                                var options = $.extend(
                                    {},
                                    $.datepicker.regional["it"],
                                    { dateFormat: "dd/mm/yy" }
                                );
                                $.datepicker.setDefaults(options);
                                break;
                            case "6":
                                $.when(
                                    loadAttributeValues(row.IdAttributo)
                                ).then(function (AttributesValues, textStatus, jqXHR) {
                                    $("#control_" + row.ColumnName).append(new Option('...', null));
                                    $.each(JSON.parse(AttributesValues).data, function (key, AttributeValue) {
                                        $("#control_" + row.ColumnName).append(
                                            new Option(
                                                AttributeValue.Description,
                                                AttributeValue.Code)
                                        );
                                    });
                                });
                                break;

                            /* Combo */
                            case "-1": case "0":

                                /* Caricamento valori lista */
                                $.when(
                                    loadWorkflowTransitions(row.IdProcesso)
                                ).then(function (WorkflowTransitions, textStatus, jqXHR) {
                                    $("#control_" + row.ColumnName).append(new Option('...', ''));
                                    $.each(JSON.parse(WorkflowTransitions).data, function (key, Transitions) {
                                        $("#control_" + row.ColumnName).append(
                                            new Option(
                                                Transitions.Description,
                                                Transitions.Code)
                                        );
                                    });
                                });
                                break;
                        }
                    });
                });
            });
        } catch (err) {
            ShowError(err.message, "loadFilter")
            return false
        }
    }
    loadDashboard = function (dashboard) {
        try {
            var arrayCount = [];
            var arrayLabel = [];
            var arrayColor = [];
            var arrayIdEventoTransizione = [];
            $.each(dashboard, function (index, item) {
                arrayCount.push(item.CountEventi);
                arrayLabel.push(item.Stato);
                arrayColor.push(item.ColoreStato);
                arrayIdEventoTransizione.push(item.IdEventoTransizione);

            });

            var data = {
                datasets: [{
                    data: arrayCount,
                    backgroundColor: arrayColor,
                }],
                labels: arrayLabel,
                IdEventoTransizione: arrayIdEventoTransizione
            };
            $('#myChart').remove();
            $('#myChart-container').append('<canvas id="myChart" width="250" height="250"></canvas>');
            var canvas = document.getElementById("myChart");
            var ctx = canvas.getContext("2d");
            
            var myNewChart = new Chart(ctx, {
                type: 'doughnut',
                data: data,
                options: {
                    onClick: function (event, elements) {
                        const clickedElement = elements[0];
                        const datasetIndex = clickedElement.index;
                        const label = data.labels[datasetIndex];
                        const IdEventoTransizione = data.IdEventoTransizione[datasetIndex];
                        const labelValue = data.datasets[0].data[datasetIndex]
                        //console.log(label);
                        //console.log(labelValue);
                        //console.log(IdEventoTransizione);
                    },
                    plugins: {
                        legend: {
                            display: true,
                            labels: {
                                generateLabels: function (chart) {
                                    return chart.data.labels.
                                        map(function (label, i) {
                                            let backgroundColor = chart.data.
                                                datasets[0].backgroundColor[i];
                                            return {
                                                text: label + ': ' + chart.data.
                                                    datasets[0].data[i],
                                                fillStyle: backgroundColor
                                            };
                                        });
                                },
                                color: '#fff',
                            }
                        },
                        datalabels: {
                            formatter: (value, ctx) => {

                                let sum = 0;
                                let dataArr = data.datasets[0].data;
                                dataArr.map(data => {
                                    sum += data;
                                });
                                let percentage = value + ' (' + (value * 100 / sum).toFixed(0) + "%" + ')';
                                return percentage;


                            },
                            color: '#fff',
                            font: {
                                size: 12,
                                weight: '600',
                                padding: 0,
                                family : 'Roboto',
                            }
                        }
                    }
                },
            });
        }
        catch (err) {
            ShowError(err.message, "loadDashboard")
        }
    }
    loadArtworkOrdini = function (pageSize, pageIndex, filter) {
        try {
            $('.spinner-border').show();
            $.ajax({
                url: '/checksession',
                type: "GET",
                data: {},
            }).done(function (res) {
                if (JSON.parse(JSON.stringify(res)).status == "CN") {
                    $('.spinner-border').hide();
                    ShowErrorConn($('#LanguageContext').val());
                }
                else if (JSON.parse(JSON.stringify(res)).status == "OK") {
                    if (filter == null) { filter = ""; }

                    $('.result-richieste-assistenza-container').empty();

                    $.ajax({
                        url: "/richieste-assistenza/richieste",
                        type: "POST",
                        data: {
                            pageIndex: pageIndex,
                            pageSize: pageSize,
                            filter: filter,
                            IdWorkedOn: $('#control_vOwnerWorked_OwnerWorked').val(),
                        },
                    }).done(function (response, status, pageSize) {

                        /* Retrieve POST param data */;
                        var param = QueryStringToJSON($(this)[0].data);

                        if (response.status == "ERR") {
                            $('.spinner-border').hide();
                            ShowError(response.error.message, response.error.sender);

                        } else if (response.status == "OK") {

                            loadDashboard(JSON.parse(JSON.parse(JSON.parse(JSON.stringify(response)).data).resultDashboard))

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

                                            try {
                                                $.ajax({
                                                    url: '/checksession',
                                                    type: "GET",
                                                    data: {},
                                                }).done(function (res) {
                                                    if (JSON.parse(JSON.stringify(res)).status == "OK") {

                                                        var optionsWorkflow = JSON.parse($('.result-richieste-assistenza-container').find('.container-workflow-' + row.IdRecord).attr('data-options'));

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

                                                    } else {
                                                        RedirectToLogin();
                                                    }
                                                });
                                            } catch (err) {
                                                ShowError(err.message, "onpreview")
                                                return false
                                            }

                                        });

                                    $('.result-richieste-assistenza-container').find('.container-workflow-' + row.IdRecord).bind(
                                        "onedit", function (e, sender) {

                                            try {

                                                $.ajax({
                                                    url: '/checksession',
                                                    type: "GET",
                                                    data: {},
                                                }).done(function (res) {
                                                    if (JSON.parse(JSON.stringify(res)).status == "OK") {

                                                        var optionsWorkflow = JSON.parse($('.result-richieste-assistenza-container').find('.container-workflow-' + row.IdRecord).attr('data-options'));

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

                                                    } else {
                                                        RedirectToLogin();
                                                    }
                                                });

                                            } catch (err) {
                                                ShowError(err.message, "onedit")
                                                return false
                                            }
                                        });

                                    $('.result-richieste-assistenza-container').find('.container-workflow-' + row.IdRecord).bind(
                                        "ondelete", function (e, sender) {
                                            try {

                                                $.ajax({
                                                    url: '/checksession',
                                                    type: "GET",
                                                    data: {},
                                                }).done(function (res) {
                                                    if (JSON.parse(JSON.stringify(res)).status == "OK") {

                                                        var optionsWorkflow = JSON.parse($('.result-richieste-assistenza-container').find('.container-workflow-' + row.IdRecord).attr('data-options'));

                                                        $.when(
                                                            deleteArtworkOrdine(optionsWorkflow)
                                                        ).then(function (response, textStatus, jqXHR) {

                                                            if (response.status == "OK") {

                                                                $('#confirm-action-' + optionsWorkflow.IdRecord).modal('hide');

                                                                /* Ricarica la lista aggiornata delle richieste */
                                                                loadArtworkOrdini(
                                                                    JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageSize, 1
                                                                );
                                                            } else {
                                                                ShowError(JSON.parse(response).error);
                                                            }
                                                        });

                                                    } else {
                                                        RedirectToLogin();
                                                    }
                                                });

                                            } catch (err) {
                                                ShowError(err.message, "ondelete")
                                                return false
                                            }
                                        });

                                    $('.result-richieste-assistenza-container').find('.container-workflow-' + row.IdRecord).bind(
                                        "onhistory", function () {
                                            try {

                                                $.ajax({
                                                    url: '/checksession',
                                                    type: "GET",
                                                    data: {},
                                                }).done(function (res) {
                                                    if (JSON.parse(JSON.stringify(res)).status == "OK") {

                                                        var optionsWorkflow = JSON.parse($('.result-richieste-assistenza-container').find('.container-workflow-' + row.IdRecord).attr('data-options'));

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

                                                    } else {
                                                        RedirectToLogin();
                                                    }
                                                });

                                            } catch (err) {
                                                ShowError(err.message, "onhistory")
                                                return false
                                            }

                                        });

                                    $('.result-richieste-assistenza-container').find('.container-workflow-' + row.IdRecord).bind(
                                        "onworkflow", function (e, Note) {

                                            var optionsWorkflow = JSON.parse($('.result-richieste-assistenza-container').find('.container-workflow-' + row.IdRecord).attr('data-options'));

                                            $.when(
                                                applyWorkflow(optionsWorkflow, Note)
                                            ).then(function (response, textStatus, jqXHR) {

                                                if (response.status == "OK") {

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
                        pagerArtworkOrdine.find('.spinner-border').hide();
                        ShowError(errorThrown, "loadArtworkOrdini")
                    });
                } else {
                    RedirectToLogin();
                }
            }).fail(function (xhr, status, errorThrown) {
                pagerArtworkOrdine.find('.spinner-border').hide();
                ShowError(errorThrown, "loadArtworkOrdini")
            });
        } catch (err) {
            pagerArtworkOrdine.find('.spinner-border').hide();
            ShowError(err.message, "loadArtworkOrdini");
        }
    }
    saveProcessTransition = function (IDModelloIstanza) {
        try {
            return $.ajax({
                url: '/checksession',
                type: "GET",
                data: {},
            }).done(function (res) {
                if (JSON.parse(JSON.stringify(res)).status == "OK") {
                    return $.ajax({
                        type: "POST",
                        url: "/richiesta-assistenza/" + IDModelloIstanza,
                        data: {},
                        async: false
                    }).responseText
                } else {
                    RedirectToLogin();
                }
            });
        } catch (err) {
            ShowError(err.message, "saveProcessTransition")
            return false
        }
    }
    deleteArtworkOrdine = function (optionsWorkflow) {
        try {
            return $.ajax({
                url: '/checksession',
                type: "GET",
                data: {},
            }).done(function (res) {
                if (JSON.parse(JSON.stringify(res)).status == "OK") {
                    return $.ajax({
                        type: "DELETE",
                        url: "/richiesta-assistenza/" + optionsWorkflow.IdRecord,
                        data: {
                            IDModelloIstanza: optionsWorkflow.IDModelloIstanza,
                            IDProcesso: 76,
                        },
                        async: false
                    }).responseText
                } else {
                    RedirectToLogin();
                }
            });
        } catch (err) {
            ShowError(err.message, "deleteArtworkOrdine")
            return false
        }
    }
    applyWorkflow = function (optionsWorkflow, Note) {
        try {
            return $.ajax({
                url: '/checksession',
                type: "GET",
                data: {},
            }).done(function (res) {
                if (JSON.parse(JSON.stringify(res)).status == "OK") {
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
                } else {
                    RedirectToLogin();
                }
            });
        } catch (err) {
            ShowError(err.message, "applyWorkflow")
            return false
        }
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

                console.log(response);

                if (response.status == "OK") {
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
        try {
            $.ajax({
                url: '/checksession',
                type: "GET",
                data: {},
            }).done(function (res) {
                if (JSON.parse(JSON.stringify(res)).status == "OK") {

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

                } else {
                    RedirectToLogin();
                }
            });

        } catch (err) {
            ShowError(err.message, "ControlActionButtonInserimento.onclick")
            return false
        }

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
    if ($('#checkConn').val() == "true") {
        $.when(
            loadFilter(user)
        ).then(function () {
            loadArtworkOrdini(JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageSize, 1);
        });
    } else {
        $('.spinner-border').hide();
        ShowErrorConn($('#LanguageContext').val());
    }

});