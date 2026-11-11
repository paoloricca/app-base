(function ($) {
    /* Questo controllo utente consente di interagire con un processo di sistema */

    let labelNuovo = {
        Description_IT: "Nuovo",
        Description_GB: "New",
        Description_ES: "Nuevo",
        Description_CN: "新的",
        Description: null,
    }
    $.fn.model = function (options) {
        var options = $.extend({
            IDModello: null,
            IDVersione: null,
            IDModelloIstanza: null,
            Mode: null,
            user: null,
            onselect: null,
            onsave: null,
            onload: null,
            ondesign: null,
        }, options);

        var plugin = $(this);
        function toggleModelSection($header) {
            var isExpanded = $header.attr('aria-expanded') === 'true';
            var attributesId = $header.attr('aria-controls');
            var $attributes = attributesId ? plugin.find('#' + attributesId) : $();
            if (!$attributes.length) {
                return;
            }
            $attributes.toggle(!isExpanded);
            $header.attr('aria-expanded', String(!isExpanded))
                .find('.model-section-toggle')
                .html(isExpanded
                    ? '<i class="bi bi-folder-plus"></i>'
                    : '<i class="bi bi-folder-minus"></i>');
        }
        plugin.off('.modelSectionToggle');
        plugin.on('click.modelSectionToggle', '.model-section-header', function (event) {
            if ($(event.target).closest('.model-editor-menu-trigger, .model-editor-context-menu').length) {
                return;
            }
            toggleModelSection($(this));
        });
        plugin.on('keydown.modelSectionToggle', '.model-section-header', function (event) {
            if ((event.key === 'Enter' || event.key === ' ') &&
                !$(event.target).closest('.model-editor-menu-trigger, .model-editor-context-menu').length) {
                event.preventDefault();
                toggleModelSection($(this));
            }
        });
        var attributesValuesList = [];
        function modelApiUrl(options, endpoint) {
            var apiBase = options && options.ApiBase
                ? String(options.ApiBase).replace(/\/$/, '')
                : '';
            return apiBase + '/' + endpoint;
        }
        function modelApiRequest(options, endpoint, method, data) {
            var request = $.ajax({
                type: method,
                url: modelApiUrl(options, endpoint),
                data: data,
                async: false
            });
            var response = request.responseJSON;

            if (request.status < 200 || request.status >= 300 ||
                (response && response.status === "ERR")) {
                var error = response && response.error;
                var message = error && (error.message || error);
                throw new Error(typeof message === 'string'
                    ? message
                    : (request.responseText || request.statusText || "The process form request failed."));
            }

            return request.responseText;
        }

        $.fn.model.draw = function () {
            var options = JSON.parse(plugin.attr('data-options'));

            plugin.find('.model-container').empty();
        };

        $.fn.model.load = function () {

            /* al termine di tutte le chiamate nasconde i loader rimasti visibili */
            $(document).off('ajaxStop.modelLoader').on('ajaxStop.modelLoader', function () {
                plugin.find('.spinner-border').hide();
            });

            var options = JSON.parse(plugin.attr('data-options'));

            labelNuovo.Description = labelNuovo['Description_' + options.user.LanguageContext];

            $.ajax({
                url: modelApiUrl(options, "model-class/" + options.IDVersione),
                type: "GET",
                data: {},
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(
                        response.error.message,
                        response.error.sender
                    );
                } else if (response.status == "OK") {

                    plugin.find('.model-container').empty();

                    $.when(
                        $.get("/controls/ui/control.ui.model-class.ejs?" + Date.now(),
                            function (templateString) {
                            })
                    ).then(function (templateString, textStatus, jqXHR) {

                        var LanguageContext = options.user.LanguageContext;

                        $.each(response.data, function (key, row) {

                            plugin.find('.model-container').append(
                                ejs.render(templateString, { row, LanguageContext })
                            );

                            if (options.Mode == 'edit') {

                                if (options.IDModelloIstanza == null) {
                                    plugin.model.loadAttributes(row.IDClasse, null);
                                } else {
                                    /* Per ogni IDClasse, verifica l'esistenza di un record esistente */
                                    $.when(
                                        plugin.model.getIDModelloIstanzaRecord(options.IDModelloIstanza, row.IDClasse)
                                    ).then(function (IDRecord, textStatus, jqXHR) {
                                        plugin.model.loadAttributes(row.IDClasse, IDRecord)
                                    });
                                }
                            } else {

                                plugin.find('.btn-edit-class-' + row.IDClasse).show();

                                /* design mode */
                                plugin.model.loadAttributes(row.IDClasse, null);

                                plugin.find('.btn-class-' + row.IDClasse + '-edit').click(function () {
                                    plugin.model.editClass(row);
                                });
                                plugin.find('.btn-class-' + row.IDClasse + '-del').click(function () {

                                    var CtlDeleteClass = plugin.find('#confirm-delete-class');

                                    /* get plugin attribute option */
                                    var option = JSON.parse(CtlDeleteClass.attr('data-options'));
                                    /* set plugin args option */
                                    option.args = { IDClasse: $(this).data('idclasse') };
                                    /* re-store plugin attribute option */
                                    CtlDeleteClass.attr('data-options', JSON.stringify(option));
                                    /* open plugin */
                                    CtlDeleteClass.confirmDelete.show(CtlDeleteClass);
                                });
                            }

                        });

                        /* Carica il template per l'inserimento e la modifica di una sezione */
                        $.when(
                            $.get("/controls/ui/control.ui.model-class-edit.ejs?" + Date.now(),
                                function (templateString) {
                                })
                        ).then(function (templateString, textStatus, jqXHR) {

                            plugin.find('.model-container').append(
                                ejs.render(templateString, { LanguageContext })
                            );

                            plugin.find('.btn-salva-classe').click(function () {
                                plugin.model.saveClass();
                            });

                            plugin.find('.btn-cancel-class-edit').click(function () {
                                plugin.find('#container-class-edit').hide();
                            });

                            if (options.Mode == 'design') {

                                /* initialize il controllo <confirm-delete-class> */
                                var CtlDeleteClass = plugin.find('#confirm-delete-class');

                                /* Imposta le proprietà di default del plug-in */
                                CtlDeleteClass.confirmDelete({
                                    LanguageContext: LanguageContext,
                                });

                                /* Registra l'evento {onconfirm} del plug-in */
                                CtlDeleteClass.bind("onconfirm", function () {

                                    var option = JSON.parse(CtlDeleteClass.attr('data-options'));

                                    $.when(

                                        plugin.model.delClass(option.args.IDClasse)

                                    ).then(function (response) {

                                        if (response.status == 'OK') { /* raise event */

                                            plugin.model.load();
                                        }

                                    });

                                });

                            }

                        });

                        /* Carica il template per l'inserimento e la modifica di un campo */
                        $.when(
                            $.get("/controls/ui/control.ui.model-attribute-edit.ejs?" + Date.now(),
                                function (templateString) {
                                })
                        ).then(function (templateString, textStatus, jqXHR) {

                            plugin.find('.model-container').append(
                                ejs.render(templateString, { LanguageContext, user: options.user })
                            );

                            plugin.find('.btn-salva-attributo').click(function () {
                                plugin.model.saveAttribute();
                            });

                            plugin.find('.btn-cancel-attribute-edit').click(function () {
                                plugin.find('#container-attribute-edit').hide();
                            });

                            var visibilityModal = plugin.find('#container-attribute-value-visibility');
                            var visibilityGroups = visibilityModal.find('#attribute-value-visibility-groups');
                            var visibilityProfiles = visibilityModal.find('#attribute-value-visibility-profiles');
                            var selectedVisibilityGroup = null;
                            var visibilityProfilesRequest = 0;
                            var visibilityGroupsReady = false;
                            var visibilityProfilesReady = false;

                            function loadVisibilityGroups() {
                                if (visibilityGroupsReady && visibilityModal.hasClass('show')) {
                                    visibilityGroups.gruppioperativi.clear(visibilityGroups);
                                    visibilityGroups.gruppioperativi.load(visibilityGroups, 0);
                                }
                            }
                            function loadVisibilityProfiles(groupId) {
                                if (visibilityProfilesReady && groupId) {
                                    visibilityProfiles.profiliutente.load(visibilityProfiles, groupId);
                                }
                            }

                            if (options.Mode == 'design') {
                                visibilityGroups.gruppioperativi({});
                                visibilityProfiles.profiliutente({ toggleEnabled: true });
                            }

                            visibilityGroups.on('onload', function () {
                                visibilityGroupsReady = true;
                                if (visibilityModal.hasClass('show')) loadVisibilityGroups();
                            });
                            visibilityProfiles.on('onload', function () {
                                visibilityProfilesReady = true;
                                loadVisibilityProfiles(selectedVisibilityGroup);
                            });
                            visibilityGroups.on('onselect', function () {
                                var groupOptions = JSON.parse(visibilityGroups.attr('data-options'));
                                selectedVisibilityGroup = groupOptions.IDGruppoOperativo;
                                visibilityModal.find('.attribute-value-visibility-group').text(
                                    groupOptions.Descrizione ? ' (' + groupOptions.Descrizione + ')' : ''
                                );
                                visibilityProfiles.profiliutente.clear(visibilityProfiles);
                                loadVisibilityProfiles(selectedVisibilityGroup);
                            });

                            visibilityProfiles.on('onprofilesloaded', function () {
                                var valueId = visibilityModal.find('#attribute-value-visibility-id').val();
                                var groupId = selectedVisibilityGroup;
                                if (!valueId || !groupId) return;

                                var requestId = ++visibilityProfilesRequest;
                                var profileToggles = visibilityProfiles.find('.workflow-profile-toggle').prop('disabled', true);
                                $.getJSON('/model-class-attribute-value-profili/' + encodeURIComponent(valueId))
                                    .done(function (response) {
                                        if (response.status === 'ERR') {
                                            ShowError(response.error.message, response.error.sender);
                                            return;
                                        }
                                        if (requestId !== visibilityProfilesRequest ||
                                            String(groupId) !== String(selectedVisibilityGroup) ||
                                            String(valueId) !== String(visibilityModal.find('#attribute-value-visibility-id').val())) {
                                            return;
                                        }
                                        var profiles = response.data || [];
                                        visibilityProfiles.find('.workflow-profile-toggle').each(function () {
                                            var profileId = $(this).closest('.profilo-utente')
                                                .find('a[data-idprofiloutente]').data('idprofiloutente');
                                            var enabled = profiles.some(function (item) {
                                                return String(item.IDGruppoOperativo) === String(groupId) &&
                                                    String(item.IDProfiloUtente) === String(profileId);
                                            });
                                            $(this).prop('checked', enabled);
                                        });
                                    })
                                    .fail(function (xhr, status, errorThrown) {
                                        ShowError(xhr.responseText || errorThrown || status, 'loadAttributeValueProfiles');
                                    })
                                    .always(function () {
                                        profileToggles.prop('disabled', false);
                                    });
                            });

                            visibilityProfiles.on('ontoggleprofile', function (event, profile, enabled, toggle) {
                                var valueId = visibilityModal.find('#attribute-value-visibility-id').val();
                                var groupId = selectedVisibilityGroup;
                                if (!valueId || !groupId) return;

                                $(toggle).prop('disabled', true);
                                $.ajax({
                                    url: '/model-class-attribute-value-profili/' + encodeURIComponent(valueId),
                                    type: 'POST',
                                    data: {
                                        IDGruppoOperativo: groupId,
                                        IDProfiloUtente: profile.IDProfiloUtente,
                                        Enabled: enabled
                                    }
                                }).done(function (response) {
                                    if (response.status === 'ERR') {
                                        $(toggle).prop('checked', !enabled);
                                        ShowError(response.error.message, response.error.sender);
                                    }
                                }).fail(function (xhr, status, errorThrown) {
                                    $(toggle).prop('checked', !enabled);
                                    ShowError(xhr.responseText || errorThrown || status, 'saveAttributeValueProfile');
                                }).always(function () {
                                    $(toggle).prop('disabled', false);
                                });
                            });

                            plugin.off('setattributevaluevisibility').on('setattributevaluevisibility', function (event, value) {
                                var valueId = value.IDValue;
                                visibilityModal.appendTo('body');
                                visibilityModal.find('#attribute-value-visibility-id').val(valueId);
                                visibilityModal.find('.attribute-value-visibility-description').text(' / ' + value.Description);
                                visibilityModal.find('.attribute-value-visibility-group').empty();
                                visibilityGroups.gruppioperativi.clear(visibilityGroups);
                                visibilityProfiles.profiliutente.clear(visibilityProfiles);
                                selectedVisibilityGroup = null;
                                visibilityModal.modal('show');
                                var visibilityZIndex = 1065;
                                visibilityModal.css('z-index', visibilityZIndex);
                                $('.modal-backdrop').last().css('z-index', visibilityZIndex - 10);
                            });
                            visibilityModal.on('shown.bs.modal', loadVisibilityGroups);
                            visibilityModal.on('hidden.bs.modal', function () {
                                visibilityModal.css('z-index', '');
                                $('.modal-backdrop').last().css('z-index', '');
                            });

                            plugin.find('.file-type').click(function () {
                                if ($(this).prop('checked')) {
                                    $('#FileTypes').val($('#FileTypes').val() + ',' + $(this).data('type'));
                                } else {
                                    $('#FileTypes').val($('#FileTypes').val().split(',' + $(this).data('type')).join(''));
                                }
                                if (plugin.find('.file-type:checked').length > 0) {
                                    plugin.find('.tipo-file').removeClass('text-danger');
                                    plugin.find('.tipo-file-error').hide();
                                }
                            });

                            if (options.Mode == 'design') {

                                /* initialize il controllo <confirm-delete-attribute> */
                                var CtlDeleteAttribute = plugin.find('#confirm-delete-attribute');

                                /* Imposta le proprietà di default del plug-in */
                                CtlDeleteAttribute.confirmDelete({
                                    LanguageContext: LanguageContext,
                                });

                                /* Registra l'evento {onconfirm} del plug-in */
                                CtlDeleteAttribute.bind("onconfirm", function () {

                                    var option = JSON.parse(CtlDeleteAttribute.attr('data-options'));

                                    $.when(

                                        plugin.model.delAttribute(option.args.IDAttributo)

                                    ).then(function (response) {

                                        if (response.status == 'OK') { /* raise event */

                                            plugin.model.load();
                                        }

                                    });
                                });
                            }

                        });

                        if (options.Mode == 'design') {

                            plugin.find('.model-container').append(
                                '<div class="col-12 p-0 mt-2 mb-2 px-3"><a class="btn btn-primary btn-circle bi bi-plus-lg btn-new-class" data-idversione="' + options.IDVersione + '"></a></div>'
                            )
                            plugin.find('.btn-new-class').click(function () {
                                plugin.model.newClass(options.IDVersione);
                            });

                        }
                    });
                }
            }).fail(function (xhr, status, errorThrown) {

            });
        }
        $.fn.model.loadAttributeTemplate = function (IDTipoDati) {
            return $.ajax({
                type: "GET",
                url: "/controls/ui/control.ui.model-class-attribute-tipo-dati-" + IDTipoDati + ".ejs?" + Date.now(),
                async: false
            }).responseText
        };
        $.fn.model.loadAttributeValuesTemplate = function () {
            return $.ajax({
                type: "GET",
                url: "/controls/ui/control.ui.model-class-attribute-values.ejs?" + Date.now(),
                async: false
            }).responseText
        };
        $.fn.model.editAttributeValueList = function (value) {

            let fnName = getFnName();

            try {

                plugin.find('.btn-delete-lista').attr('disabled', false);

                plugin.find(".container-value-edit-culture").multiLanguageTextBox("load", {
                    Title: null,
                    IT: value.Description_IT,
                    GB: value.Description_GB,
                    ES: value.Description_ES,
                    CN: value.Description_CN
                });

            } catch (err) {

                ShowError(err.message, fnName);
            }
        }
        $.fn.model.applyAttributeValueList = function (IDValue) {

            let fnName = getFnName();

            try {

                const CtlTxtValue = $(".container-value-edit-culture").data("mltextbox");

                var options = JSON.parse(plugin.attr('data-options'));
                user = options.user;

                if (attributesValuesList == '') { attributesValuesList = []; }

                if (IDValue != "") {

                    let index = attributesValuesList.findIndex(obj => obj.IDValue === eval(IDValue));
                    attributesValuesList[index].Description = CtlTxtValue.values[options.user.LanguageContext];
                    attributesValuesList[index].Description_IT = CtlTxtValue.values.IT;
                    attributesValuesList[index].Description_GB = CtlTxtValue.values.GB;
                    attributesValuesList[index].Description_ES = CtlTxtValue.values.ES;
                    attributesValuesList[index].Description_CN = CtlTxtValue.values.CN;

                } else {

                    var newValue = {
                        "Description": CtlTxtValue.values[options.user.LanguageContext],
                        IDAttributo: plugin.find('#IDAttributo').val(),
                        IDValue: Date.now(),
                        Code: Date.now(),
                        Description_IT: CtlTxtValue.values.IT,
                        Description_GB: CtlTxtValue.values.GB,
                        Description_ES: CtlTxtValue.values.ES,
                        Description_CN: CtlTxtValue.values.CN,
                        IsVisible: "true",
                        Required: "true",
                    }

                    attributesValuesList.push(newValue);
                }

                plugin.model.loadAttributeValuesList(attributesValuesList, user);
                plugin.model.clearAttributeValueList();
                plugin.find('.btn-delete-lista').attr('disabled', true);

            } catch (err) {

                ShowError(err.message, fnName);
            }
        }
        $.fn.model.clearAttributeValueList = function () {

            let fnName = getFnName();

            try {

                plugin.find(".container-value-edit-culture").multiLanguageTextBox("load", {
                    Title: null,
                    IT: null,
                    GB: null,
                    ES: null,
                    CN: null
                });

                plugin.find('#IDValue').val('');

            } catch (err) {

                ShowError(err.message, fnName);
            }
        }
        $.fn.model.delAttributeValueList = function (IDValue) {

            let fnName = getFnName();

            try {

                var options = JSON.parse(plugin.attr('data-options'));
                user = options.user;

                let index = attributesValuesList.findIndex(obj => obj.IDValue === eval(IDValue));

                if (index !== -1) {
                    attributesValuesList.splice(index, 1);
                }

                plugin.model.loadAttributeValuesList(attributesValuesList, user);
                plugin.model.clearAttributeValueList();
                plugin.find('.btn-delete-lista').attr('disabled', true);

            } catch (err) {

                ShowError(err.message, fnName);
            }
        }
        $.fn.model.loadAttributeValuesList = function (attributesValues, user) {

            let fnName = getFnName();

            try {

                var containerValues = plugin.find('.container-attribute-edit-values-list');

                $.when(
                    plugin.model.loadAttributeValuesTemplate()
                ).then(function (templateString, textStatus, jqXHR) {

                    containerValues.empty();

                    $.each(attributesValues, function (key, value) {

                        containerValues.append(

                            ejs.render(templateString, { value, user })
                            
                        );
                        containerValues.find('.btn-value-' + value.IDValue + '-edit').click(function () {
                            plugin.find('#IDValue').val(value.IDValue);
                            containerValues.find('a').removeClass('text-dark');
                            containerValues.find('.btn-value-' + value.IDValue + '-edit .lbl-value-' + value.IDValue  + '-edit').addClass('text-dark');
                            plugin.model.editAttributeValueList(value);

                        });
                        containerValues.find('.btn-value-' + value.IDValue + '-del').click(function () {

                            plugin.find('#IDValue').val(value.IDValue);
                            containerValues.find('a').removeClass('text-dark');
                            containerValues.find('.btn-value-' + value.IDValue + '-edit .lbl-value-' + value.IDValue + '-edit').addClass('text-dark');
                            plugin.model.editAttributeValueList(value);

                        });
                        containerValues.find('.btn-value-' + value.IDValue + '-visibility').click(function (event) {
                            event.preventDefault();
                            event.stopPropagation();
                            plugin.trigger('setattributevaluevisibility', [value]);
                        });

                    });

                });
            } catch (err) {

                ShowError(err.message, fnName);
            }
        };
        $.fn.model.loadAttributeValues = function (IDAttributo, currentValue) {
            var options = JSON.parse(plugin.attr('data-options'));
            var endpoint = "model-class-attribute-values/" + IDAttributo;
            var query = [];
            if (options.ActionName) {
                query.push("action=" + encodeURIComponent(options.ActionName));
            }
            if (currentValue != null && currentValue !== '') {
                query.push("currentValue=" + encodeURIComponent(currentValue));
            }
            if (query.length) {
                endpoint += "?" + query.join("&");
            }
            return modelApiRequest(
                options,
                endpoint,
                "GET"
            );
        };
        $.fn.model.postIDModelloIstanza = function () {
            var options = JSON.parse(plugin.attr('data-options'));
            var instanceId = Number(modelApiRequest(options, "post-idmodello-istanza", "POST", {
                IDCliente: options.user.IdAttore,
                IDVersione: options.IDVersione
            }));
            if (!Number.isSafeInteger(instanceId) || instanceId <= 0) {
                throw new Error("The server returned an invalid instance ID.");
            }
            return instanceId;
        };
        $.fn.model.postIDModelloIstanzaRecord = function (IdRecord, IdAttributo, RecordValue) {
            var options = JSON.parse(plugin.attr('data-options'));
            var status = modelApiRequest(options, "post-idmodello-istanza-record", "POST", {
                IdRecord: IdRecord,
                IdAttributo: IdAttributo,
                RecordValue: RecordValue
            });
            if (status !== "OK") {
                throw new Error(status || "Unable to save the process form value.");
            }
            return status;
        };
        $.fn.model.postIDModelloIstanzaRecordMedia = function (IdRecord, IdAttributo, fileString) {
            var options = JSON.parse(plugin.attr('data-options'));
            var file = JSON.parse(fileString);
            var status = modelApiRequest(options, "post-idmodello-istanza-record-media", "POST", {
                IdRecord: IdRecord,
                IdAttributo: IdAttributo,
                originalFilename: file.originalFilename,
                newFilename: file.newFilename,
                mimetype: file.mimetype
            });
            if (status !== "OK") {
                throw new Error(status || "Unable to save the process form attachment.");
            }
            return status;
        };
        $.fn.model.deleteIDModelloIstanzaRecordMedia = function (IdRecord, IdAttributo, filelisttodelete) {
            if (filelisttodelete) {
                var options = JSON.parse(plugin.attr('data-options'));
                filelisttodelete.substring(1).split('@').filter(Boolean).forEach(function (fileToDelete) {
                    var status = modelApiRequest(options, "delete-idmodello-istanza-record-media", "DELETE", {
                        filetodelete: fileToDelete
                    });
                    if (status !== "OK") {
                        throw new Error(status || "Unable to delete the process form attachment.");
                    }
                });
            }
        };
        $.fn.model.getIDModelloIstanzaRecord = function (IDModelloIstanza, IDClasse) {
            var options = JSON.parse(plugin.attr('data-options'));
            var recordId = Number(modelApiRequest(options, "get-idmodello-istanza-record", "POST", {
                IDModelloIstanza: IDModelloIstanza,
                IDClasse: IDClasse
            }));
            if (!Number.isSafeInteger(recordId) || recordId <= 0) {
                throw new Error("The server returned an invalid class record ID.");
            }
            return recordId;
        };
        $.fn.model.getIDModelloIstanzaRecordValue = function (IDRecord, IDAttributo) {
            var options = JSON.parse(plugin.attr('data-options'));
            return modelApiRequest(options, "get-idmodello-istanza-record-value", "POST", {
                IdRecord: IDRecord,
                IdAttributo: IDAttributo
            });
        };
        $.fn.model.laodTipoDati = function () {

            let fnName = getFnName();

            try {

                var options = JSON.parse(plugin.attr('data-options'));

                return $.ajax({
                    url: "/tipo-dati",
                    type: "GET",
                    data: {},
                }).done(function (response) {

                    plugin.find(".tipo-dati").empty();

                    if (response.status == "ERR") {

                        ShowError(response.error.message, fnName);

                    } else if (response.status == "OK") {
                        $.each(JSON.parse(JSON.parse(JSON.parse(JSON.stringify(response)).data).resultdata), function (key, row) {
                            plugin.find(".tipo-dati").append(
                                new Option(
                                    row.Description,
                                    row.IDTipoDati)
                            );
                        });
                        plugin.find('.tipo-dati').change(function () {
                            attributesValuesList = [];
                            plugin.find('.container-attribute-edit-values-list').empty();
                            plugin.model.clearAttributeValueList();
                            plugin.model.switchTipoDati($(this).val());
                        });
                    }
                }).fail(function (xhr, status, errorThrown) {

                    ShowError(xhr.responseText, fnName);

                });

            } catch (err) {

                ShowError(err.message, fnName);

                return false
            }
        }
        $.fn.model.switchTipoDati = function (IDTipoDati) {

            let fnName = getFnName();

            try {

                plugin.find(".lunghezza-massima").hide();
                plugin.find(".numero-righe").hide();
                plugin.find(".btn-configura-lista").hide();
                plugin.find(".btn-delete-lista").hide();
                plugin.find(".btn-salva-lista").hide();
                plugin.find(".valore-minimo").hide();
                plugin.find(".numero-file").hide();
                plugin.find(".dimensione-file").hide();
                plugin.find(".tipo-file").hide();

                /* TESTO */
                if (IDTipoDati == 1 || IDTipoDati == 11) {

                    plugin.find(".lunghezza-massima").show();

                    if (IDTipoDati == 11) {

                        plugin.find(".numero-righe").show();
                    }
                }
                /* NUMERO */
                if (IDTipoDati == 2) {
                    plugin.find(".valore-minimo").show();
                }
                /* VALUTA */
                if (IDTipoDati == 3) {
                    plugin.find(".valore-minimo").show();
                }
                /* VALUTA */
                if (IDTipoDati == 9) {
                    plugin.find(".valore-minimo").show();
                }
                /* DATA */
                if (IDTipoDati == 4) {

                }
                /* BOOLEAN */
                if (IDTipoDati == 5) {

                }
                /* LISTA COMBINATA */
                if (IDTipoDati == 6) {

                    plugin.find(".btn-configura-lista").show();
                    plugin.find(".btn-delete-lista").show();
                    plugin.find(".btn-salva-lista").show();

                }
                /* FILE */
                if (IDTipoDati == 7) {

                    plugin.find(".tipo-file").show();
                    plugin.find(".numero-file").show();
                    plugin.find(".dimensione-file").show();

                }

            } catch (err) {

                ShowError(err.message, fnName);

            }
        }
        $.fn.model.delClass = function (IDClasse) {

            let fnName = getFnName();

            return $.ajax({
                url: "/del-class/" + IDClasse,
                type: "DELETE",
                data: {},
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(
                        response.error.message,
                        response.error.sender
                    );

                }
            }).fail(function (xhr, status, errorThrown) {

                ShowError(errorThrown, fnName)

            });

            try {

            } catch (err) {

                ShowError(err, fnName);

            }
        }
        $.fn.model.editClass = function (classe) {

            let fnName = getFnName();

            try {

                plugin.find('#IDClasse').val(classe.IDClasse);
                plugin.find('#IDVersione').val(classe.IDVersione);

                var options = JSON.parse(plugin.attr('data-options'));

                var modal = plugin.find('#container-class-edit');

                /* Inizializza il controllo per gestire la descrizione del campo */
                modal.find('.class-header').html(classe.Description);

                /* Valorizza il campo <Visibile> */
                modal.find("#class-Visibile").prop("checked", classe.Visibile);

                modal.find(".container-control-class-culture-textbox-descrizione").multiLanguageTextBox({
                    Title: null,
                    Label: $('LabelDescrizione').html(),
                    Id: 'DescrizioneClasse',
                    LanguageContext: options.user.LanguageContext,
                    languages: [
                        { code: "IT", title: "Italiano" },
                        { code: "GB", title: "English" },
                        { code: "ES", title: "Spain" },
                        { code: "CN", title: "Cinese" }
                    ]
                });

                modal.find(".container-control-class-culture-textbox-descrizione").multiLanguageTextBox("option", "Title", null);

                modal.find(".container-control-class-culture-textbox-descrizione").multiLanguageTextBox("load", {
                    Title: null,
                    IT: classe.Description_IT,
                    GB: classe.Description_GB,
                    ES: classe.Description_ES,
                    CN: classe.Description_CN
                });

                modal.show();


            } catch (err) {

                ShowError(err.message, fnName);

            }
        }
        $.fn.model.newClass = function (IDVersione) {

            let fnName = getFnName();

            try {

                plugin.find('#IDClasse').val('');
                plugin.find('#IDVersione').val(IDVersione);

                var classe = {
                    "Description": labelNuovo.Description,
                    "IDClasse": null,
                    "IDClasseParent": null,
                    "IDVersione": IDVersione,
                    "Visibile": true,
                    "Description_IT": labelNuovo.Description_IT,
                    "Description_GB": labelNuovo.Description_GB,
                    "Description_ES": labelNuovo.Description_ES,
                    "Description_CN": labelNuovo.Description_CN,
                    "NumeroCicliMin": null,
                    "NumeroCicli": null,
                    "Peso": null,
                    "Scala": null,
                    "IsQuestion": null,
                    "HelpText_IT": null,
                    "HelpText_GB": null,
                    "HelpText_ES": null,
                    "HelpText_CN": null,
                    Ordine: Date.now(),
                    "IsVisible": true
                }

                plugin.model.editClass(classe);

            } catch (err) {

                ShowError(err.message, fnName);

            }
        }
        $.fn.model.saveClass = function () {

            let fnName = getFnName();

            try {

                var options = JSON.parse(plugin.attr('data-options'));

                var IDClasse = plugin.find('#IDClasse').val();
                var IDVersione = plugin.find('#IDVersione').val();

                /* Convalida i dati immessi dall'utente */
                var isvalidform = true;
                var formSource = '#container-class-edit';
                const forms = document.querySelectorAll(formSource + ' .form-control, ' + formSource + ' .form-select, ' + formSource + ' .form-check-input ');
                Array.from(forms).forEach(form => {
                    if (form.offsetParent != null && !form.checkValidity()) {
                        isvalidform = false;
                    }
                })

                const CtlTxtDescrizione = plugin.find(".container-control-class-culture-textbox-descrizione").data("mltextbox");

                var Ordine = null;
                
                if (IDClasse == '') {
                    Ordine = Date.now();
                }

                $.ajax({
                    type: "POST",
                    url: "/post-class",
                    data: {
                        IDVersione: IDVersione,
                        IDClasse: IDClasse,
                        Visibile: plugin.find('#class-Visibile').prop('checked'),
                        Description_IT: CtlTxtDescrizione.value.IT,
                        Description_GB: CtlTxtDescrizione.value.GB,
                        Description_ES: CtlTxtDescrizione.value.ES,
                        Description_CN: CtlTxtDescrizione.value.CN,
                        Ordine: Ordine,
                    },
                    async: false
                }).done(function (response) {

                    if (response == "OK") {

                        plugin.model.load();

                    } else {

                        ShowError(JSON.parse(response).error, fnName);

                    }
                });

            } catch (err) {

                ShowError(err, fnName);

            }

        }
        $.fn.model.delAttribute = function (IDAttributo) {

            let fnName = getFnName();

            try {

                return $.ajax({
                    url: "/del-attribute/" + IDAttributo,
                    type: "DELETE",
                    data: {},
                }).done(function (response) {
                    if (response.status == "ERR") {
                        /* attende la chiusura della conferma di eliminazione prima di mostrare l'avviso */
                        var showAttributeError = function () {
                            var systemMessage = $('#system-message').appendTo('body').css('z-index', 2000);
                            systemMessage.one('shown.bs.modal', function () {
                                $('.modal-backdrop').last().css('z-index', 1990);
                            });
                            ShowError(
                                response.error.message,
                                response.error.sender
                            );
                        };
                        var openConfirm = $('.modal-confirm-delete.show');
                        if (openConfirm.length) {
                            openConfirm.one('hidden.bs.modal', showAttributeError);
                            openConfirm.modal('hide');
                        } else {
                            showAttributeError();
                        }

                    }
                }).fail(function (xhr, status, errorThrown) {

                    ShowError(errorThrown, fnName)

                });

            } catch (err) {

                ShowError(err, fnName);

            }
        }
        $.fn.model.editAttribute = function (campo) {

            var options = JSON.parse(plugin.attr('data-options'));

            var modal = plugin.find('#container-attribute-edit');

            /* Inizializza il controllo per gestire la descrizione del campo */
            modal.find('.attribute-header').html(campo.Description);
            modal.find('.tipo-file').removeClass('text-danger');
            modal.find('.tipo-file-error').hide();
            plugin.find('#container-attribute-edit-values .attribute-header').html(campo.Description);

            modal.find(".container-control-culture-textbox-descrizione").multiLanguageTextBox({
                Title: '',
                Label: $('LabelDescrizione').html(),
                Id: 'DescrizioneAttributo',
                LanguageContext: options.user.LanguageContext,
                languages: [
                    { code: "IT", title: "Italiano" },
                    { code: "GB", title: "English" },
                    { code: "ES", title: "Spain" },
                    { code: "CN", title: "Cinese" }
                ]
            });

            modal.find(".container-control-culture-textbox-descrizione").multiLanguageTextBox("option", "Title",
                $('#context-menu-link').find('#DescDirezione').val());

            modal.find(".container-control-culture-textbox-descrizione").multiLanguageTextBox("load", {
                Title: $('#context-menu-link').find('#DescDirezione').val(),
                IT: campo.Description_IT,
                GB: campo.Description_GB,
                ES: campo.Description_ES,
                CN: campo.Description_CN
            });

            plugin.find(".container-value-edit-culture").multiLanguageTextBox({
                Title: null,
                Label: null,
                Id: 'DescrizioneValue',
                LanguageContext: options.user.LanguageContext,
                languages: [
                    { code: "IT", title: "Italiano" },
                    { code: "GB", title: "English" },
                    { code: "ES", title: "Spain" },
                    { code: "CN", title: "Cinese" }
                ]
            });

            plugin.find(".container-value-edit-culture").multiLanguageTextBox("option", "Title", null);

            $.when(
                plugin.model.laodTipoDati()
            ).then(function () {

                /* Valorizza il campo <Tipo> */
                plugin.find("#IDTipoDati").val(campo.IDTipoDati);

                /* Valorizza il campo <Visibile> */
                plugin.find("#Visibile").prop("checked", campo.Visibile);

                /* Valorizza il campo <Obbligatorio> */
                plugin.find("#Obbligatorio").prop("checked", campo.Obbligatorio);

                plugin.find("#IsFilter").prop("checked", campo.IsFilter === true || campo.IsFilter === 1);
                plugin.find("#IsSummary").prop("checked", campo.IsSummary === true || campo.IsSummary === 1);

                plugin.find("#Lunghezza").val(campo.Lunghezza);

                plugin.find("#NumeroRighe").val(campo.NumeroRighe);

                plugin.find("#FileTypes").val(campo.FileTypes);

                plugin.find("#FileNumber").val(campo.FileNumber);

                plugin.find("#FileWeight").val(campo.FileWeight);

                /* TESTO */
                if (campo.IDTipoDati == 1 || campo.IDTipoDati == 11) {

                }
                /* NUMERO */
                if (campo.IDTipoDati == 2) {

                }
                /* VALUTA */
                if (campo.IDTipoDati == 3) {

                }
                /* DATA */
                if (campo.IDTipoDati == 4) {

                }
                /* BOOLEAN */
                if (campo.IDTipoDati == 5) {

                }
                /* LISTA COMBINATA */
                if (campo.IDTipoDati == 6) {

                    /* Caricamento valori lista */
                    $.when(
                        plugin.model.loadAttributeValues(campo.IDAttributo)
                    ).then(function (AttributesValues, textStatus, jqXHR) {

                        attributesValuesList = JSON.parse(AttributesValues).data;

                        plugin.model.loadAttributeValuesList(attributesValuesList, user);

                    });

                }
                /* FILE */
                if (campo.IDTipoDati == 7) {
                    $('#file-type-text').prop('checked', false);
                    $('#file-type-pdf').prop('checked', false);
                    $('#file-type-image').prop('checked', false);
                    if (campo.FileTypes != '') {
                        arFileTypes = campo.FileTypes.split(',');
                        for (i = 0; i <= arFileTypes.length; i++) {
                            $('#file-type-' + arFileTypes[i]).prop('checked', true);
                        }
                    }

                }

                plugin.model.switchTipoDati(campo.IDTipoDati);
                plugin.find('#IDClasse').val(campo.IDClasse);
                plugin.find('#IDAttributo').val(campo.IDAttributo);

                modal.show();
                plugin.find('.spinner-border').hide();

            });
            
        }
        $.fn.model.saveAttribute = function () {

            let fnName = getFnName();

            try {

                var options = JSON.parse(plugin.attr('data-options'));

                var IDClasse = plugin.find('#IDClasse').val();
                var IDAttributo = plugin.find('#IDAttributo').val();

                /* Convalida i dati immessi dall'utente */
                var isvalidform = true;
                var formSource = '#container-attribute-edit';
                const forms = document.querySelectorAll(formSource + ' .form-control, ' + formSource + ' .form-select, ' + formSource + ' .form-check-input ');
                Array.from(forms).forEach(form => {
                    if (form.offsetParent != null && !form.checkValidity()) {
                        isvalidform = false;
                    }
                })

                /* Tipo File: almeno un tipo file deve essere selezionato */
                var fileTypesMissing = plugin.find('#IDTipoDati').val() == 7 && plugin.find('.file-type:checked').length == 0;
                plugin.find('.tipo-file').toggleClass('text-danger', fileTypesMissing);
                plugin.find('.tipo-file-error').toggle(fileTypesMissing);
                if (fileTypesMissing) {
                    isvalidform = false;
                }

                if (!isvalidform) {
                    return;
                }

                const CtlTxtDescrizione = plugin.find(".container-control-culture-textbox-descrizione").data("mltextbox");

                $.ajax({
                    type: "POST",
                    url: "/post-attribute",
                    data: {
                        IDAttributo: IDAttributo,
                        IDClasse: IDClasse,
                        IDTipoDati: plugin.find('#IDTipoDati').val(),
                        ValoreMinimo: plugin.find('#ValoreMinimo').val(),
                        Visibile: plugin.find('#Visibile').prop('checked'),
                        Obbligatorio: plugin.find('#Obbligatorio').prop('checked'),
                        IsFilter: plugin.find('#IsFilter').prop('checked'),
                        IsSummary: plugin.find('#IsSummary').prop('checked'),
                        Description_IT: CtlTxtDescrizione.value.IT,
                        Description_GB: CtlTxtDescrizione.value.GB,
                        Description_ES: CtlTxtDescrizione.value.ES,
                        Description_CN: CtlTxtDescrizione.value.CN,
                        Lunghezza: plugin.find('#Lunghezza').val(),
                        LunghezzaDecimale: plugin.find('#LunghezzaDecimale').val(),
                        NumeroRighe: plugin.find('#NumeroRighe').val(),
                        Ordine: Date.now(),
                        FileTypes: plugin.find('#FileTypes').val(),
                        FileWeight: plugin.find('#FileWeight').val(),
                        FileNumber: plugin.find('#FileNumber').val(),
                        attributesValuesList: attributesValuesList,
                    },
                    async: false
                }).done(function (response) {

                    if (response == "OK") {

                        plugin.model.load();

                    } else {

                        ShowError(JSON.parse(response).error, fnName);

                    }
                });

            } catch (err) {

                ShowError(err, fnName);

            }

        }
        $.fn.model.loadAttributes = function (IdClasse, IDRecord) {

            var options = JSON.parse(plugin.attr('data-options'));
            user = options.user;

            var fieldlist = "";

            $.when(
                $.ajax({
                    url: modelApiUrl(JSON.parse(plugin.attr('data-options')), "model-class-attribute/" + IdClasse),
                    type: "GET",
                    data: {},
                }).done(function (response) {
                    if (response.status == "ERR") {
                        ShowError(
                            response.error.message,
                            response.error.sender
                        );
                    } else if (response.status == "OK") {

                        plugin.find('.model-class-' + IdClasse + '-attributes').empty();

                        $.each(response.data, function (key, row) {                            

                            /* Caricamento valori attributo */
                            var recordValue = '';

                            if (options.Mode == 'edit') {

                                $.when(IDRecord == null
                                    ? ''
                                    : plugin.model.getIDModelloIstanzaRecordValue(IDRecord, row.IDAttributo)
                                ).then(function (RecordValue, textStatus, jqXHR) {

                                    $.when(
                                        plugin.model.loadAttributeTemplate(row.IDTipoDati)
                                    ).then(function (templateString, textStatus, jqXHR) {

                                        var mode = options.Mode;

                                        plugin.find('.model-class-' + IdClasse + '-attributes').append(

                                            ejs.render(templateString, { row, mode, user })
                                        );

                                        plugin.find('.number').inputFilter(function (value) {
                                            return /^-?\d*$/.test(value);
                                        });

                                        /* TESTO */
                                        if (row.IDTipoDati == 1 || row.IDTipoDati == 11) {
                                            plugin.find("#control_" + row.IDAttributo).val(RecordValue);
                                        }

                                        /* NUMERO */
                                        if (row.IDTipoDati == 2) {
                                            plugin.find("#control_" + row.IDAttributo).val(RecordValue);
                                            plugin.find("#control_" + row.IDAttributo).inputFilter(function (value) {
                                                return /^-?\d*$/.test(value);
                                            });
                                        }
                                        /* VALUTA */
                                        if (row.IDTipoDati == 3) {
                                            plugin.find("#control_" + row.IDAttributo).val(RecordValue);
                                            plugin.find("#control_" + row.IDAttributo).inputFilter(function (value) {
                                                return /^-?\d*[.,]?\d{0,row.LunghezzaDecimale}$/.test(value);
                                            });
                                        }
                                        /* DATA */
                                        if (row.IDTipoDati == 4) {
                                            plugin.find("#control_" + row.IDAttributo).val(RecordValue);
                                            plugin.find("#control_" + row.IDAttributo).datepicker();
                                        }
                                        /* BOOLEAN */
                                        if (row.IDTipoDati == 5) {
                                            plugin.find("input[name=control_" + row.IDAttributo + "][value=" + RecordValue + "]").attr('checked', 'checked');
                                        }
                                        /* LISTA COMBINATA */
                                        if (row.IDTipoDati == 6) {

                                            /* Caricamento valori lista */
                                            $.when(
                                                plugin.model.loadAttributeValues(row.IDAttributo, RecordValue)
                                            ).then(function (AttributesValues, textStatus, jqXHR) {
                                                $.each(JSON.parse(AttributesValues).data, function (key, AttributeValue) {
                                                    plugin.find("#control_" + row.IDAttributo).append(
                                                        new Option(
                                                            AttributeValue.Description,
                                                            AttributeValue.Code)
                                                    );
                                                });
                                                var $control = plugin.find("#control_" + row.IDAttributo);
                                                $control.val(RecordValue);
                                            });
                                        }
                                        /* FILE */
                                        if (row.IDTipoDati == 7) {

                                            plugin.find("#control_" + row.IDAttributo).val(RecordValue);

                                            /* inizializza il controllo FileUpload */
                                            var ControlFileUpload = plugin.find(".control_" + row.IDAttributo);

                                            /* Imposta le proprietà di default del plug-in <FileUpload> */
                                            ControlFileUpload.fileupload({
                                                user: options.user,
                                                filelist: RecordValue,
                                                filenumber: row.FileNumber,
                                                filetypes: row.FileTypes,
                                                fileweight: row.FileWeight,
                                                readOnly: options.ReadOnly === true
                                            });

                                            /* Registra l'evento {onupload} */
                                            ControlFileUpload.bind(
                                                "onupload", function () {
                                                    var options = JSON.parse(ControlFileUpload.attr('data-options'));
                                                plugin.find("#control_" + row.IDAttributo).val(options.filelist);
                                            });

                                            /* Registra l'evento {ondelete} */
                                            ControlFileUpload.bind(
                                                "ondelete", function () {
                                                    var options = JSON.parse(ControlFileUpload.attr('data-options'));
                                                plugin.find("#control_" + row.IDAttributo).val(options.filelist);
                                            });
                                        }
                                    });
                                });
                            } else {
                                /* design mode */

                                $.when(
                                    plugin.model.loadAttributeTemplate(row.IDTipoDati)
                                ).then(function (templateString, textStatus, jqXHR) {

                                    var mode = options.Mode;

                                    plugin.find('.model-class-' + IdClasse + '-attributes').append(

                                        ejs.render(templateString, { row, mode, user })
                                    );


                                    /* TESTO */
                                    if (row.IDTipoDati == 1 || row.IDTipoDati == 11) {

                                    }

                                    /* NUMERO */
                                    if (row.IDTipoDati == 2) {
                                        plugin.find("#control_" + row.IDAttributo).inputFilter(function (value) {
                                            return /^-?\d*$/.test(value);
                                        });
                                    }
                                    /* VALUTA */
                                    if (row.IDTipoDati == 3) {
                                        plugin.find("#control_" + row.IDAttributo).inputFilter(function (value) {
                                            return /^-?\d*[.,]?\d{0,row.LunghezzaDecimale}$/.test(value);
                                        });
                                    }
                                    /* DATA */
                                    if (row.IDTipoDati == 4) {
                                        plugin.find("#control_" + row.IDAttributo).datepicker();
                                    }
                                    /* BOOLEAN */
                                    if (row.IDTipoDati == 5) {

                                    }
                                    /* LISTA COMBINATA */
                                    if (row.IDTipoDati == 6) {

                                        /* Caricamento valori lista */
                                        $.when(
                                            plugin.model.loadAttributeValues(row.IDAttributo)
                                        ).then(function (AttributesValues, textStatus, jqXHR) {
                                            $.each(JSON.parse(AttributesValues).data, function (key, AttributeValue) {
                                                plugin.find("#control_" + row.IDAttributo).append(
                                                    new Option(
                                                        AttributeValue.Description,
                                                        AttributeValue.Code)
                                                );
                                            });
                                        });
                                    }
                                    /* FILE */
                                    if (row.IDTipoDati == 7) {

                                        /* inizializza il controllo FileUpload */
                                        var ControlFileUpload = plugin.find(".control_" + row.IDAttributo);

                                        /* Imposta le proprietà di default del plug-in <FileUpload> */
                                        ControlFileUpload.fileupload({
                                            user: options.user,
                                            filelist: '',
                                            filenumber: row.FileNumber,
                                            filetypes: row.FileTypes,
                                            fileweight: row.FileWeight
                                        });

                                        /* Registra l'evento {onupload} */
                                        ControlFileUpload.bind(
                                            "onupload", function () {
                                                var options = JSON.parse(ControlFileUpload.attr('data-options'));
                                                plugin.find("#control_" + row.IDAttributo).val(options.filelist);
                                            });

                                        /* Registra l'evento {ondelete} */
                                        ControlFileUpload.bind(
                                            "ondelete", function () {
                                                var options = JSON.parse(ControlFileUpload.attr('data-options'));
                                                plugin.find("#control_" + row.IDAttributo).val(options.filelist);
                                            });
                                    }

                                    plugin.find('.btn-attribute-' + row.IDAttributo + '-edit').click(function () {

                                        plugin.model.editAttribute(row);

                                    });

                                    plugin.find('.btn-attribute-' + row.IDAttributo + '-del').click(function () {

                                        var CtlDeleteAttribute = plugin.find('#confirm-delete-attribute');

                                        /* get plugin attribute option */
                                        var option = JSON.parse(CtlDeleteAttribute.attr('data-options'));
                                        /* set plugin args option */
                                        option.args = { IDAttributo: $(this).data('idattributo') };
                                        /* re-store plugin attribute option */
                                        CtlDeleteAttribute.attr('data-options', JSON.stringify(option));
                                        /* open plugin */
                                        CtlDeleteAttribute.confirmDelete.show(CtlDeleteAttribute);

                                    });

                                });


                            }

                        });

                        plugin.find(".btn-configura-lista").click(function () {
                            $('#container-attribute-edit-values').modal('show');
                        });
                        plugin.find(".btn-salva-lista").click(function () {
                            plugin.model.applyAttributeValueList(plugin.find('#IDValue').val());
                        });

                        plugin.find(".btn-delete-lista").click(function () {
                            plugin.model.delAttributeValueList(plugin.find('#IDValue').val());
                        });
                    }
                    return fieldlist;
                }).fail(function (xhr, status, errorThrown) {

                })
            ).then(function (response) {

                if (options.Mode == 'design') {

                    plugin.find('.model-class-' + IdClasse + '-container').append(

                        '<div class="col-12 p-0 mb-2 px-3"><a class="btn btn-primary btn-circle bi bi-plus-lg btn-new-attribute" data-idclasse="' + IdClasse + '"></a></div>'
                    );

                    plugin.find('.btn-new-attribute').click(function () {
                        plugin.model.editAttribute(
                            {

                                "Description": labelNuovo.Description,
                                "IDAttributo": null,
                                "IDClasse": $(this).data('idclasse'),
                                "Visibile": true,
                                "Obbligatorio": false,
                                "IsFilter": false,
                                "IsSummary": false,
                                "IDTipoDati": null,
                                "ValoreMinimo": null,
                                "Peso": null,
                                "Description_IT": labelNuovo.Description_IT,
                                "Description_GB": labelNuovo.Description_GB,
                                "Description_ES": labelNuovo.Description_ES,
                                "Description_CN": labelNuovo.Description_CN,
                                "Description_DE": null,
                                "HelpText_IT": null,
                                "HelpText_GB": null,
                                "HelpText_DE": null,
                                "HelpText_ES": null,
                                "Lunghezza": 0,
                                "LunghezzaDecimale": null,
                                "NumeroRighe": 0,
                                "TipoValuta": "",
                                "Ordine": Date.now(),
                                "FileTypes": null,
                                "FileWeight": 0,
                                "FileValidity": null,
                                "FileNumber": 0,
                                "IsVisible": true
                            }
                        );
                    });

                }

                /* Valorizza la lista degli IDAttributo, utilizzata per la registrazione dei valori */
                $.each(response.data, function (key, row) {
                    fieldlist += '@' + row.IDAttributo;
                });

                if (options.Mode == "edit" && options.ReadOnly !== true) {

                    plugin.find('.model-class-' + IdClasse + '-container').data('fieldlist', fieldlist.substring(1));
                    $.get("/controls/ui/control.ui.button.salva.ejs?" + Date.now(), function (response) {
                        plugin.find('.model-class-' + IdClasse + '-container').append(
                            ejs.render(response, { user })
                        );
                        plugin.find('.model-class-' + IdClasse + '-container').find('.btn-salva').click(function () {
                            plugin.find('.spinner-border').show();
                            $.when(
                                plugin.model.salvaClasse(IdClasse,
                                    plugin.find('.model-class-' + IdClasse + '-container').data('fieldlist'))
                            ).then(function (response, textStatus, jqXHR) {
                                if (response) {
                                    /* raise event */
                                    plugin.trigger("onsave");
                                    plugin.find('.spinner-border').hide();
                                } else {
                                    plugin.find('.spinner-border').hide();
                                }
                            });

                        });
                    });
                }
                plugin.trigger("onload");
                plugin.find('.spinner-border').hide();
            });
        }
        $.fn.model.salvaClasse = function (IdClasse, FieldList) {
            try {
                /* Convalida i dati immessi dall'utente */
                var isvalidform = true;
                const forms = document.querySelectorAll('#frm-class-' + IdClasse + ' .form-control, #frm-class-' + IdClasse + ' .form-select')
                Array.from(forms).forEach(form => {

                    if (form.offsetParent != null && !form.checkValidity()) {
                        isvalidform = false;
                    }
                });

                var options = JSON.parse(plugin.attr('data-options'));

                if (!isvalidform) {
                    var form = document.getElementById('frm-class-' + IdClasse);
                    if (form && typeof form.reportValidity === 'function') {
                        form.reportValidity();
                    }
                    return false;
                }

                /* Se i dati immessi sono validi */
                if (isvalidform) {

                    /* get plugin attribute option */
                    var options = JSON.parse(plugin.attr('data-options'));

                    /* Se non esiste, creo l'identificativo di un IDModelloIstanza */
                    if (options.IDModelloIstanza == null) {
                        $.when(
                            plugin.model.postIDModelloIstanza()
                        ).done(function (IDModelloIstanza, textStatus, jqXHR) {

                            /* set plugin attribute option */
                            options.IDModelloIstanza = IDModelloIstanza;

                            /* re-store plugin attribute option */
                            plugin.attr('data-options', JSON.stringify(options));

                            /* Verifico l'esistenza di un record associato alla Classe, se non esiste lo inserisco ed estraggo l'ID */
                            $.when(
                                plugin.model.getIDModelloIstanzaRecord(IDModelloIstanza, IdClasse)
                            ).done(function (IDRecord, textStatus, jqXHR) {

                                $.each(FieldList.split('@'), function (key, IDAttributo) {

                                    var recordValue = '';
                                    var control = plugin.find('#control_' + IDAttributo);

                                    /* IdTipoDati = 5 */
                                    if (control.data('idtipodati') == undefined) {
                                        control = plugin.find('input[name="control_' + IDAttributo + '"]:checked');
                                    }
                                    var IdTipoDati = control.data('idtipodati');

                                    //console.log("IdTipoDati: " + IdTipoDati);

                                    /* Recupera il valore associato all'attributo */
                                    switch (IdTipoDati) {
                                        case 1: case 2: case 3: case 4: case 6: case 7: case 9: case 11:
                                            recordValue = control.val();
                                            //console.log(recordValue);
                                            break;
                                        case 5:
                                            recordValue = control.val();
                                            //console.log(recordValue);
                                            break;
                                    }
                                    recordValue = recordValue == null ? '' : String(recordValue);

                                    /* Salva il valore dell'attributo */
                                    $.when(
                                        plugin.model.postIDModelloIstanzaRecord(IDRecord, IDAttributo, recordValue)
                                    ).done(function (status, textStatus, jqXHR) {
                                        //console.log("postIDModelloIstanzaRecord status: " + status)
                                        if (IdTipoDati == 7) {
                                            var fileList = recordValue.charAt(0) === '@'
                                                ? recordValue.substring(1)
                                                : recordValue;
                                            fileList.split('@').filter(Boolean).forEach(function (file) {
                                                plugin.model.postIDModelloIstanzaRecordMedia(
                                                    IDRecord,
                                                    IDAttributo,
                                                    file
                                                );
                                            });
                                            var ControlFileUpload = plugin.find(".control_" + IDAttributo)
                                            /* Elimina i file rimossi dalla lista */
                                            plugin.model.deleteIDModelloIstanzaRecordMedia(
                                                IDRecord,
                                                IDAttributo,
                                                JSON.parse(ControlFileUpload.attr('data-options')).filetodelete
                                            )
                                        }
                                    })
                                });
                                plugin.find('.model-class-' + IdClasse + '-container .card.border-success').fadeIn('slow');
                                setTimeout(function () {
                                    plugin.find('.model-class-' + IdClasse + '-container .card.border-success').fadeOut('slow');
                                }, 3000);
                            })
                        });
                    } else {

                        /* set plugin attribute option */
                        IDModelloIstanza = options.IDModelloIstanza;

                        /* re-store plugin attribute option */
                        plugin.attr('data-options', JSON.stringify(options));

                        /* Verifico l'esistenza di un record associato alla Classe, se non esiste lo inserisco ed estraggo l'ID */
                        $.when(
                            plugin.model.getIDModelloIstanzaRecord(IDModelloIstanza, IdClasse)
                        ).done(function (IDRecord, textStatus, jqXHR) {

                            $.each(FieldList.split('@'), function (key, IDAttributo) {

                                var recordValue = '';
                                var control = plugin.find('#control_' + IDAttributo);

                                /* IdTipoDati = 5 */
                                if (control.data('idtipodati') == undefined) {
                                    control = plugin.find('input[name="control_' + IDAttributo + '"]:checked');
                                }
                                var IdTipoDati = control.data('idtipodati');

                                //console.log("IdTipoDati: " + IdTipoDati);

                                /* Recupera il valore associato all'attributo */
                                switch (IdTipoDati) {
                                    case 1: case 2: case 3: case 4: case 6: case 7: case 9: case 11:
                                        recordValue = control.val();
                                        //console.log(recordValue);
                                        break;
                                    case 5:
                                        recordValue = control.val();
                                        //console.log(recordValue);
                                        break;
                                    }
                                    recordValue = recordValue == null ? '' : String(recordValue);

                                    /* Salva il valore dell'attributo */
                                    $.when(
                                        plugin.model.postIDModelloIstanzaRecord(IDRecord, IDAttributo, recordValue)
                                    ).done(function (status, textStatus, jqXHR) {
                                        //console.log("postIDModelloIstanzaRecord status: " + status)
                                        if (IdTipoDati == 7) {
                                            var fileList = recordValue.charAt(0) === '@'
                                                ? recordValue.substring(1)
                                                : recordValue;
                                            fileList.split('@').filter(Boolean).forEach(function (file) {
                                                plugin.model.postIDModelloIstanzaRecordMedia(
                                                    IDRecord,
                                                    IDAttributo,
                                                    file
                                                );
                                            });
                                            /* Elimina i file rimossi dalla lista */
                                            var ControlFileUpload = plugin.find(".control_" + IDAttributo)
                                        plugin.model.deleteIDModelloIstanzaRecordMedia(
                                            IDRecord,
                                            IDAttributo,
                                            JSON.parse(ControlFileUpload.attr('data-options')).filetodelete
                                        )
                                    }
                                })
                            });
                            plugin.find('.model-class-' + IdClasse + '-container .card.border-success').fadeIn('slow');
                            setTimeout(function () {
                                plugin.find('.model-class-' + IdClasse + '-container .card.border-success').fadeOut('slow');
                            }, 3000);
                        })

                    }
                    return true
                } else {
                    return false
                }
            } catch (err) {
                ShowError(err.message, "model.salvaClasse")
                return false
            }
        };
        return this.each(function () {

            /* store first plugin attribute options */
            plugin.attr('data-options', JSON.stringify(options));

            /* initialize plugin instance */
            plugin.html($.fn.model.draw());

            /* load plugin template */
            $.get("/controls/ui/control.ui.model.html", function (response) {
                /* render plugin template */
                renderTemplate(response);
            });
            function renderTemplate(response) {
                /* fill plugin template */
                plugin.html($(response).html());

                /* get plugin attribute options */
                var options = JSON.parse(plugin.attr('data-options'));

                plugin.model.draw();

            };
            return plugin;
        });
    };
}(jQuery));