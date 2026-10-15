$(function () {

    user = JSON.parse($('#user').val());

    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"], [data-bs-toggle="dropdown"][data-bs-title]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
    const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));

    $('.btn-filter-apply').click(function () {
        applyFilter();
    });
    $('.btn-new-version').click(function () {
        var model = $('#container-model-versions').data('model');
        if (!model) {
            ShowError('Selezionare un form prima di creare una nuova versione.', getFnName());
            return;
        }
        $('.form-new-version-header').html($('LabelFormNewVersion').html());
        $('.form-new-version-header-sub').html(model.Description);
        $('#container-form-new-version').modal('show');
    });
    $('.btn-success-form-new-version').click(function () {

        let fnName = getFnName();
        var model = $('#container-model-versions').data('model');
        var IDModello = model ? Number(model.IDModello) : NaN;

        if (!Number.isSafeInteger(IDModello) || IDModello <= 0) {
            ShowError('Impossibile identificare il form da versionare.', fnName);
            return;
        }

        var button = $(this);
        button.prop('disabled', true);

        $.ajax({
            type: 'POST',
            url: '/post-forms-version',
            data: { IDModello: IDModello }
        }).done(function (response) {
            if (response.status === 'OK') {
                $('#container-form-new-version').one('hidden.bs.modal', function () {
                    loadFormsVersion(model);
                }).modal('hide');
            } else {
                var message = response.error && response.error.message
                    ? response.error.message
                    : JSON.stringify(response.error);
                ShowError(message, fnName);
            }
        }).fail(function (xhr) {
            ShowError(xhr.responseText || xhr.statusText, fnName);
        }).always(function () {
            button.prop('disabled', false);
        });
    });
    var CtlDeleteVersion = $('#container-confirm-delete-version').appendTo('body');
    CtlDeleteVersion.confirmDelete({
        LanguageContext: $('#LanguageContext').val(),
    });
    CtlDeleteVersion.bind('onconfirm', function () {
        var option = JSON.parse(CtlDeleteVersion.attr('data-options'));
        deleteFormsVersion(option.args.IDVersione);
    });


    $('.btn-filter-close').click(function () {
        $('.forms-layout').addClass('filter-hidden');
    });
    $('.btn-filter-open').click(function () {
        $('.forms-layout').removeClass('filter-hidden');
        $(this).blur();
    });
    updateForm = function () {

    }
    loadForm = function (IDModello, IDVersione) {

        let fnName = getFnName();

        try {

            /* inizializza il controllo Model */
            var formEdit = $('.container-form-edit');

            $('.form-header').html($('.model-header').text());

            /* Imposta le proprietà di default del plug-in <Model> */
            formEdit.model({
                IDModello: IDModello,
                IDVersione: IDVersione,
                IDModelloIstanza: null,
                Mode: "design",
                user: user
            });

            //formEdit.bind("ondesign", function () {

            //    $.when(
            //        /* Renderizza il plug-in <Model> */
            //        formEdit.model.draw()
            //    ).then(function () {

            //        /* Aggiorna il plug-in <Model> */
            //        formEdit.model.load()
            //    });

            //});

            $.when(
                /* Renderizza il plug-in <Model> */
                formEdit.model.load()
            ).then(function () {
                $('#container-form-edit').modal('show');
            });

        }
        catch (err) {

            ShowError(err.message, fnName);
        }
        
    }
    loadAttributeValues = function (IdAttributo) {

        let fnName = getFnName();

        try {

            return $.ajax({
                type: "GET",
                url: "/model-class-attribute-values/" + IdAttributo,
                async: false
            }).responseText
        } catch (err) {

            ShowError(err.message, fnName);

            return false
        }
    };
    loadFilterTemplate = function (DataType) {

        let fnName = getFnName();

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

            ShowError(err.message, fnName);

            return false
        }
    };
    loadWorkflowTransitions = function (IdProcesso) {

        let fnName = getFnName();

        try {

            return $.ajax({
                type: "GET",
                url: "/workflow-transitions/" + IdProcesso,
                async: false
            }).responseText
        }
        catch (err) {

            ShowError(err.message, fnName);

            return false
        }
    }
    loadFilter = function (user) {

        let fnName = getFnName();

        try {

            return $.when(
                $.get("../model/forms/search-filter.json?" + Date.now(),
                    function (filterJSON) {
                    })
            ).then(function (filterJSON, textStatus, jqXHR) {
                $.each(filterJSON, function (i, row) {

                    $.when(
                        loadFilterTemplate(row.DataType)
                    ).then(function (templateString, textStatus, jqXHR) {

                        $('#filtro-forms-container').append(
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

            ShowError(err.message, fnName);

            return false
        }
    }
    loadFormsVersion = function (model, pageSize, pageIndex, filter) {

        let fnName = getFnName();

        try {
            $('#container-model-versions').data('model', model);

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

                    $('.result-forms-version-container').empty();

                    $.ajax({
                        url: "/forms-version",
                        type: "POST",
                        data: {
                            IDModello: model.IDModello
                            //pageIndex: pageIndex,
                            //pageSize: pageSize,
                            //filter: filter,
                        },
                    }).done(function (response, status, pageSize) {

                        //console.log(response);

                        /* Retrieve POST param data */;
                        var param = QueryStringToJSON($(this)[0].data);

                        if (response.status == "ERR") {

                            $('.spinner-border').hide();
                            ShowError(response.error.message, response.error.sender);

                        } else if (response.status == "OK") {

                            if (JSON.parse(JSON.parse(JSON.stringify(response)).data).resultdata.length == 0) {
                                TotalRecord = 0
                            } else {
                                TotalRecord = JSON.parse(JSON.parse(JSON.stringify(response)).data).TotalRecord;
                            }
                            $.when(
                                $.get("../template/forms/forms-versions-row.ejs?" + Date.now(),
                                    function (templateString) {
                                    })
                            ).then(function (templateString, textStatus, jqXHR) {

                                var LanguageContext = $('#LanguageContext').val();

                                $.each(JSON.parse(JSON.parse(JSON.parse(JSON.stringify(response)).data).resultdata), function (key, row) {

                                    var partialToRender = ejs.render(templateString, { row, LanguageContext });

                                    $('.result-forms-version-container').append(partialToRender)

                                    var user = JSON.parse($('#user').val());

                                    $('.result-forms-version-container').find('.btn-model-edit-' + row.IDVersione).click(function () {
                                        loadForm($(this).data('idmodello'), $(this).data('idversione'));
                                    });
                                    $('.result-forms-version-container').find('.btn-model-del-' + row.IDVersione).click(function () {
                                        var option = JSON.parse(CtlDeleteVersion.attr('data-options'));
                                        option.args = { IDVersione: Number($(this).data('idversione')) };
                                        CtlDeleteVersion.attr('data-options', JSON.stringify(option));
                                        CtlDeleteVersion.confirmDelete.show(CtlDeleteVersion);
                                    });

                                });

                                $('#container-model-versions').find('.model-header').html(model.Description);
                                $('#container-model-versions').modal('show');

                            });
                        }

                        /* Inizio gestione paginazione */
                        //var pagerArtworkOrdine = $('.forms-pager');
                        //var options = JSON.parse(pagerArtworkOrdine.attr('data-options'));
                        //options.pageIndex = eval(param.pageIndex);
                        //options.pageSize = param.pageSize;
                        //if (Number.isSafeInteger(Math.round(eval(TotalRecord) / eval(param.pageSize)))) {
                        //    options.totalPage = Math.floor((eval(TotalRecord) / eval(param.pageSize))) + 1;
                        //} else {
                        //    options.totalPage = eval(TotalRecord) / eval(param.pageSize) + 1;
                        //}
                        //options.totalRecord = TotalRecord;
                        //pagerArtworkOrdine.attr('data-options', JSON.stringify(options));
                        //pagerArtworkOrdine.paging.draw($('.forms-pager'));
                        //pagerArtworkOrdine.find('.spinner-border').hide();
                        /* Fine gestione paginazione */

                    }).fail(function (xhr, status, errorThrown) {

                        //var pagerArtworkOrdine = $('.forms-pager');
                        //pagerArtworkOrdine.find('.spinner-border').hide();

                        ShowError(xhr.responseText, fnName);
                    });
                } else {
                    RedirectToLogin();
                }
            }).fail(function (xhr, status, errorThrown) {

                //var pagerArtworkOrdine = $('.forms-pager');
                //pagerArtworkOrdine.find('.spinner-border').hide();

                ShowError(xhr.responseText, fnName);
            });

        } catch (err) {

            ShowError(err.message, fnName);

            return false
        }
    }
    showDeleteVersionError = function (message, sender) {
        var systemMessage = $('#system-message').appendTo('body');
        var versionsModal = $('#container-model-versions');
        var restoreVersions = versionsModal.hasClass('show');

        var showMessage = function () {
            systemMessage.find('.pnl-sender').text(sender || 'DeleteFormsVersion');
            systemMessage.find('.pnl-errors').text(message);
            systemMessage.one('hidden.bs.modal', function () {
                if (restoreVersions) {
                    versionsModal.modal('show');
                }
            });
            systemMessage.modal('show');
        };

        var openModals = $('.modal.show').not(systemMessage);
        if (openModals.length === 0) {
            showMessage();
            return;
        }

        var remainingModals = openModals.length;
        openModals.each(function () {
            $(this).one('hidden.bs.modal', function () {
                remainingModals--;
                if (remainingModals === 0) {
                    showMessage();
                }
            });
        });
        openModals.modal('hide');
    }
    deleteFormsVersion = function (IDVersione) {
        let fnName = getFnName();

        $.ajax({
            url: '/forms-version/' + encodeURIComponent(IDVersione),
            type: 'DELETE',
        }).done(function (response) {
            if (response.status === 'OK') {
                loadFormsVersion($('#container-model-versions').data('model'));
            } else {
                showDeleteVersionError(response.error && response.error.message ? response.error.message : 'Eliminazione della versione non riuscita.', fnName);
            }
        }).fail(function (xhr) {
            showDeleteVersionError(xhr.responseText || xhr.statusText, fnName);
        });
    }
    loadForms = function (pageSize, pageIndex, filter) {

        let fnName = getFnName();

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

                    $('.result-forms-container').empty();

                    $.ajax({
                        url: "/forms",
                        type: "POST",
                        data: {
                            pageIndex: pageIndex,
                            pageSize: pageSize,
                            filter: filter,
                        },
                    }).done(function (response, status, pageSize) {

                        /* Retrieve POST param data */;
                        var param = QueryStringToJSON($(this)[0].data);

                        if (response.status == "ERR") {
                            $('.spinner-border').hide();
                            ShowError(response.error.message, response.error.sender);

                        } else if (response.status == "OK") {

                            if (JSON.parse(JSON.parse(JSON.stringify(response)).data).resultdata.length == 0) {
                                TotalRecord = 0
                            } else {
                                TotalRecord = JSON.parse(JSON.parse(JSON.stringify(response)).data).TotalRecord;
                            }
                            $.when(
                                $.get("../template/forms/forms-row.ejs?" + Date.now(),
                                    function (templateString) {
                                    })
                            ).then(function (templateString, textStatus, jqXHR) {

                                var LanguageContext = $('#LanguageContext').val();

                                $.each(JSON.parse(JSON.parse(JSON.parse(JSON.stringify(response)).data).resultdata), function (key, row) {

                                    var partialToRender = ejs.render(templateString, { row, LanguageContext });

                                    $('.result-forms-container').append(partialToRender)

                                    var user = JSON.parse($('#user').val());

                                    $('.container-form-edit-' + row.IDModello).find('.btn-model-versions').click(function () {
                                        var model = $.extend({}, row, { IDModello: Number($(this).data('idmodello')) });
                                        loadFormsVersion(model);
                                    });

                                    $('.container-form-edit-' + row.IDModello).find('.btn-model-edit').click(function () {
                                        editForm(row);
                                    });

                                });
                            });
                        }

                        /* Inizio gestione paginazione */
                        var pagerArtworkOrdine = $('.forms-pager');
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
                        pagerArtworkOrdine.paging.draw($('.forms-pager'));
                        pagerArtworkOrdine.find('.spinner-border').hide();
                        /* Fine gestione paginazione */

                    }).fail(function (xhr, status, errorThrown) {

                        var pagerArtworkOrdine = $('.forms-pager');
                        pagerArtworkOrdine.find('.spinner-border').hide();

                        ShowError(xhr.responseText, fnName);
                    });
                } else {
                    RedirectToLogin();
                }
            }).fail(function (xhr, status, errorThrown) {

                var pagerArtworkOrdine = $('.forms-pager');
                pagerArtworkOrdine.find('.spinner-border').hide();

                ShowError(xhr.responseText, fnName);
            });
        } catch (err) {

            var pagerArtworkOrdine = $('.forms-pager');
            pagerArtworkOrdine.find('.spinner-border').hide();

            ShowError(err.message, fnName);
        }
    }
    applyFilter = function () {

        let fnName = getFnName();

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
                        $.get("../model/forms/search-filter.json?" + Date.now(),
                            function (filterJSON) {
                            })
                    ).then(function (filterJSON, textStatus, jqXHR) {
                        var QueryFilter = "";
                        $.each(filterJSON, function (i, row) {
                            switch (row.DataType) {
                                /* Text */
                                case "1":
                                    if ($("#control_" + row.ColumnName).val() != "") {
                                        QueryFilter += " AND " + row.ColumnName + " like '%" + $("#control_" + row.ColumnName).val() + "%'";
                                    }
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
                        console.log(QueryFilter);
                        loadForms(
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

            ShowError(err.message, fnName);

        }
    }
    /* inizializza il controllo pager */
    var ControlPagerArtworkOrdine = $('.forms-pager');

    /* Imposta le proprietà di default del plug-in <Pager> */
    ControlPagerArtworkOrdine.paging({
        pageIndex: 1,
        pageSize: 15,
        LanguageContext: $('#LanguageContext').val()
    });

    /* Registra l'evento {Pagina precedente} */
    ControlPagerArtworkOrdine.bind(
        "prev", function () {
            loadForms(
                JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageSize,
                JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageIndex
            );
        });
    /* Registra l'evento {Pagina successiva} */
    ControlPagerArtworkOrdine.bind(
        "next", function () {
            loadForms(
                JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageSize,
                JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageIndex
            );
    });
    editForm = function (model) {

        let fnName = getFnName();

        try {
            $('.form-new-header').html($('LabelFormEdit').html());
            $(".container-control-model-culture-textbox").multiLanguageTextBox({
                Title: null,
                Label: $('TitoloForm').html(),
                Id: 'DescrizioneForm',
                LanguageContext: user.LanguageContext,
                languages: [
                    { code: "IT", title: "Italiano" },
                    { code: "GB", title: "English" },
                    { code: "ES", title: "Spain" },
                    { code: "CN", title: "Cinese" }
                ]
            });

            $(".container-control-model-culture-textbox").multiLanguageTextBox("option", "Title", null);
            $(".container-control-model-culture-textbox").multiLanguageTextBox("load", {
                Title: null,
                IT: model.Description_IT,
                GB: model.Description_GB,
                ES: model.Description_ES,
                CN: model.Description_CN
            });

            $('#txt-model-idmodello').val(model.IDModello);
            $('#txt-model-codice').val(model.Codice);

            $('#container-form-new').modal('show');
        }

        catch (err) {

            ShowError(err.message, fnName);
        }

    }
    $('.btn-success-form-new').click(function () {

        let fnName = getFnName();

        try {

            /* Convalida i dati immessi dall'utente */
            var isvalidform = true;

            const forms = document.querySelectorAll('#frm-model-new .form-control')
            Array.from(forms).forEach(form => {

                if (form.offsetParent != null && !form.checkValidity()) {
                    isvalidform = false;
                }
            });

            /* Se i dati immessi sono validi */
            if (isvalidform) {

                const CtlTxtModelCulture = $(".container-control-model-culture-textbox").data("mltextbox");

                $.ajax({
                    type: "POST",
                    url: "/post-model",
                    data: {
                        IDModello: $('#txt-model-idmodello').val(),
                        Description_IT: CtlTxtModelCulture.value.IT,
                        Description_GB: CtlTxtModelCulture.value.GB,
                        Description_ES: CtlTxtModelCulture.value.ES,
                        Description_CN: CtlTxtModelCulture.value.CN,
                        Codice: $('#txt-model-codice').val(),
                    },
                    async: false
                }).done(function (response) {

                    if (response == "OK") {

                        $('#container-form-new').modal('hide');

                        loadForms(JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageSize, 1);

                    } else {

                        ShowError(JSON.parse(response).error, fnName);

                    }
                });

            }

        }

        catch (err) {

            ShowError(err.message, fnName);
        }
    });

    /* inizializza il controllo action-button-nuovo */
    var ControlActionButtonInserimento = $('.action-button-inserimento');
    ControlActionButtonInserimento.actionbutton({
        ActionType: 'primary',
        ActionName: 'Inserimento',
        IDProfiloUtente: user.IDProfiloUtenteDefault,
        IDProcesso: 19,
        LanguageContext: $('#LanguageContext').val()
    }).bind("onclick", function (e, sender) {

        let fnName = getFnName();

        try {

            $.ajax({
                url: '/checksession',
                type: "GET",
                data: {},
            }).done(function (res) {
                if (JSON.parse(JSON.stringify(res)).status == "OK") {

                    $(".container-control-model-culture-textbox").multiLanguageTextBox({
                        Title: null,
                        Label: $('TitoloForm').html(),
                        Id: 'DescrizioneForm',
                        LanguageContext: user.LanguageContext,
                        languages: [
                            { code: "IT", title: "Italiano" },
                            { code: "GB", title: "English" },
                            { code: "ES", title: "Spain" },
                            { code: "CN", title: "Cinese" }
                        ]
                    });

                    $(".container-control-model-culture-textbox").multiLanguageTextBox("option", "Title", null);
                    $(".container-control-model-culture-textbox").multiLanguageTextBox("load", {
                        Title: null,
                        IT: '',
                        GB: '',
                        ES: '',
                        CN: ''
                    });
                    $('.form-new-header').html($('LabelFormNew').html());
                    $('#container-form-new').modal('show');

                } else {
                    RedirectToLogin();
                }
            });

        } catch (err) {

            ShowError(err.message, fnName);

            return false
        }

    });

    if ($('#checkConn').val() == "true") {
        $.when(
            loadFilter(user)
        ).then(function () {
            loadForms(JSON.parse(ControlPagerArtworkOrdine.attr('data-options')).pageSize, 1);
        });
    } else {
        $('.spinner-border').hide();
        ShowErrorConn($('#LanguageContext').val());
    }

    $("#container-model-versions").on("hidden.bs.modal", function () {
        $('div.modal-backdrop').removeClass('modal-backdrop');
    });

});