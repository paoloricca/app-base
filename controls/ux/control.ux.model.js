(function ($) {
    /* Questo controllo utente consente di interagire con un processo di sistema */
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
        var attributesValuesList = [];
        $.fn.model.draw = function () {
            var options = JSON.parse(plugin.attr('data-options'));

            plugin.find('.model-container').empty();
        };

        $.fn.model.load = function () {

            var options = JSON.parse(plugin.attr('data-options'));

            $.ajax({
                url: "/model-class/" + options.IDVersione,
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

                                /* Per ogni IDClasse, verifica l'esistenza di un record esistente */
                                $.when(
                                    plugin.model.getIDModelloIstanzaRecord(options.IDModelloIstanza, row.IDClasse)
                                ).then(function (IDRecord, textStatus, jqXHR) {

                                    plugin.model.loadAttributes(row.IDClasse, IDRecord)

                                });
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
                                ejs.render(templateString, { LanguageContext })
                            );

                            plugin.find('.btn-salva-attributo').click(function () {
                                plugin.model.saveAttribute();
                            });

                            plugin.find('.btn-cancel-attribute-edit').click(function () {
                                plugin.find('#container-attribute-edit').hide();
                            });

                            plugin.find('.file-type').click(function () {
                                if ($(this).prop('checked')) {
                                    $('#FileTypes').val($('#FileTypes').val() + ',' + $(this).data('type'));
                                } else {
                                    $('#FileTypes').val($('#FileTypes').val().split(',' + $(this).data('type')).join(''));
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
                                '<div class="col-xs-12 p-0 mt-2 mb-2 px-3"><a class="btn btn-primary btn-circle bi bi-plus-lg btn-new-class" data-idversione="' + options.IDVersione + '"></a></div>'
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

                    });

                });
            } catch (err) {

                ShowError(err.message, fnName);
            }
        };
        $.fn.model.loadAttributeValues = function (IDAttributo) {
            return $.ajax({
                type: "GET",
                url: "/model-class-attribute-values/" + IDAttributo,
                async: false
            }).responseText
        };
        $.fn.model.postIDModelloIstanza = function () {
            var options = JSON.parse(plugin.attr('data-options'));
            return $.ajax({
                type: "POST",
                url: "/post-idmodello-istanza",
                data: {
                    IDCliente: options.user.IdAttore,
                    IDVersione: options.IDVersione,
                },
                async: false
            }).responseText
        };
        $.fn.model.postIDModelloIstanzaRecord = function (IdRecord, IdAttributo, RecordValue) {
            var options = JSON.parse(plugin.attr('data-options'));
            return $.ajax({
                type: "POST",
                url: "/post-idmodello-istanza-record",
                data: {
                    IdRecord: IdRecord,
                    IdAttributo: IdAttributo,
                    RecordValue: RecordValue
                },
                async: false
            }).responseText
        };
        $.fn.model.postIDModelloIstanzaRecordMedia = function (IdRecord, IdAttributo, fileString) {
            var options = JSON.parse(plugin.attr('data-options'));
            var file = JSON.parse(fileString)
            //console.log("file JSON: " + file);
            //console.log(file.originalFilename);
            return $.ajax({
                type: "POST",
                url: "/post-idmodello-istanza-record-media",
                data: {
                    IdRecord: IdRecord,
                    IdAttributo: IdAttributo,
                    originalFilename: file.originalFilename,
                    newFilename: file.newFilename,
                    mimetype: file.mimetype
                },
                async: false
            }).responseText
        };
        $.fn.model.deleteIDModelloIstanzaRecordMedia = function (IdRecord, IdAttributo, filelisttodelete) {
            if (filelisttodelete != null) {
                $.each(filelisttodelete.substring(1).split('@'), function (key, filetodelete) {
                    return $.ajax({
                        type: "DELETE",
                        url: "/delete-idmodello-istanza-record-media",
                        data: {
                            filetodelete: filetodelete,
                        },
                    }).responseText
                });
            }
        };
        $.fn.model.getIDModelloIstanzaRecord = function (IDModelloIstanza, IDClasse) {
            var options = JSON.parse(plugin.attr('data-options'));
            return $.ajax({
                type: "POST",
                url: "/get-idmodello-istanza-record",
                data: {
                    IDModelloIstanza: IDModelloIstanza,
                    IDClasse: IDClasse,
                },
                async: false
            }).responseText
        };
        $.fn.model.getIDModelloIstanzaRecordValue = function (IDRecord, IDAttributo) {
            var options = JSON.parse(plugin.attr('data-options'));
            return $.ajax({
                type: "POST",
                url: "/get-idmodello-istanza-record-value",
                data: {
                    IdRecord: IDRecord,
                    IdAttributo: IDAttributo,
                },
                async: false
            }).responseText
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
                    "Description": "Nuovo", /* Nuovo */
                    "IDClasse": null,
                    "IDClasseParent": null,
                    "IDVersione": IDVersione,
                    "Visibile": true,
                    "Description_IT": "Nuovo",
                    "Description_GB": "New",
                    "Description_ES": "Nuevo",
                    "Description_CN": "新的",
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
                        ShowError(
                            response.error.message,
                            response.error.sender
                        );

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

            modal.find(".container-value-edit-culture").multiLanguageTextBox({
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

            modal.find(".container-value-edit-culture").multiLanguageTextBox("option", "Title", null);

            $.when(
                plugin.model.laodTipoDati()
            ).then(function () {

                /* Valorizza il campo <Tipo> */
                plugin.find("#IDTipoDati").val(campo.IDTipoDati);

                /* Valorizza il campo <Visibile> */
                plugin.find("#Visibile").prop("checked", campo.Visibile);

                /* Valorizza il campo <Obbligatorio> */
                plugin.find("#Obbligatorio").prop("checked", campo.Obbligatorio);

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
                    url: "/model-class-attribute/" + IdClasse,
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

                                $.when(
                                    plugin.model.getIDModelloIstanzaRecordValue(IDRecord, row.IDAttributo)
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
                                                plugin.model.loadAttributeValues(row.IDAttributo)
                                            ).then(function (AttributesValues, textStatus, jqXHR) {
                                                $.each(JSON.parse(AttributesValues).data, function (key, AttributeValue) {
                                                    plugin.find("#control_" + row.IDAttributo).append(
                                                        new Option(
                                                            AttributeValue.Description,
                                                            AttributeValue.Code)
                                                    );
                                                });
                                                plugin.find("#control_" + row.IDAttributo).val(RecordValue);
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

                        '<div class="col-xs-12 p-0 mb-2 px-3"><a class="btn btn-primary btn-circle bi bi-plus-lg btn-new-attribute" data-idclasse="' + IdClasse + '"></a></div>'
                    );

                    plugin.find('.btn-new-attribute').click(function () {
                        plugin.model.editAttribute(
                            {

                                "Description": "Nuovo", /* TODO */
                                "IDAttributo": null,
                                "IDClasse": $(this).data('idclasse'),
                                "Visibile": true,
                                "Obbligatorio": false,
                                "IDTipoDati": null,
                                "ValoreMinimo": null,
                                "Peso": null,
                                "Description_IT": "Nuovo",
                                "Description_GB": "New",
                                "Description_ES": "Nuevo",
                                "Description_CN": "新的",
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

                plugin.find('.btn-minus-plus-' + IdClasse).click(function () {
                    if ($(this).attr('class').indexOf('bi-folder-minus') > -1) {
                        plugin.find('.model-class-' + IdClasse + '-attributes').hide();
                        $(this).removeClass('bi bi-folder-minus');
                        $(this).addClass('bi bi-folder-plus');
                    } else {
                        plugin.find('.model-class-' + IdClasse + '-attributes').show();
                        $(this).removeClass('bi bi-folder-plus');
                        $(this).addClass('bi bi-folder-minus');
                    }
                });

                /* Valorizza la lista degli IDAttributo, utilizzata per la registrazione dei valori */
                $.each(response.data, function (key, row) {
                    fieldlist += '@' + row.IDAttributo;
                });

                if (options.Mode == "edit") {

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

                /* Se i dati immessi sono validi */
                if (isvalidform) {

                    /* get plugin attribute option */
                    var options = JSON.parse(plugin.attr('data-options'));

                    /* Se non esiste, creo l'identificativo di un IDModelloIstanza */
                    if (options.IDModelloIstanza == null) {
                        $.when(
                            plugin.model.postIDModelloIstanza()
                        ).then(function (IDModelloIstanza, textStatus, jqXHR) {

                            /* set plugin attribute option */
                            options.IDModelloIstanza = IDModelloIstanza;

                            /* re-store plugin attribute option */
                            plugin.attr('data-options', JSON.stringify(options));

                            /* Verifico l'esistenza di un record associato alla Classe, se non esiste lo inserisco ed estraggo l'ID */
                            $.when(
                                plugin.model.getIDModelloIstanzaRecord(IDModelloIstanza, IdClasse)
                            ).then(function (IDRecord, textStatus, jqXHR) {

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

                                    /* Salva il valore dell'attributo */
                                    $.when(
                                        plugin.model.postIDModelloIstanzaRecord(IDRecord, IDAttributo, recordValue)
                                    ).then(function (status, textStatus, jqXHR) {
                                        //console.log("postIDModelloIstanzaRecord status: " + status)
                                        if (IdTipoDati == 7) {
                                            /* Salva il riferimento dei file caricati */
                                            if (recordValue.substring(1).indexOf('@') > -1) {
                                                $.each(recordValue.substring(1).split('@'), function (key, file) {
                                                    //console.log("file stringify each: " + file);
                                                    $.when(
                                                        plugin.model.postIDModelloIstanzaRecordMedia(IDRecord, IDAttributo, file)
                                                    ).then(function (status, textStatus, jqXHR) {
                                                        //console.log("postIDModelloIstanzaRecordMedia status: " + status)
                                                    })
                                                });
                                            } else {
                                                var file = recordValue.substring(1);
                                                //console.log("file stringify alone: " + file);
                                                $.when(
                                                    plugin.model.postIDModelloIstanzaRecordMedia(IDRecord, IDAttributo, file)
                                                ).then(function (status, textStatus, jqXHR) {
                                                    //console.log("postIDModelloIstanzaRecordMedia status: " + status)
                                                })
                                            }
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
                                plugin.find('.model-class-' + IdClasse + '-container .panel-success').fadeIn('slow');
                                setTimeout(function () {
                                    plugin.find('.model-class-' + IdClasse + '-container .panel-success').fadeOut('slow');
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
                        ).then(function (IDRecord, textStatus, jqXHR) {

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

                                /* Salva il valore dell'attributo */
                                $.when(
                                    plugin.model.postIDModelloIstanzaRecord(IDRecord, IDAttributo, recordValue)
                                ).then(function (status, textStatus, jqXHR) {
                                    //console.log("postIDModelloIstanzaRecord status: " + status)
                                    if (IdTipoDati == 7) {
                                        /* Salva il riferimento dei file caricati */
                                        if (recordValue.substring(1).indexOf('@') > -1) {
                                            $.each(recordValue.substring(1).split('@'), function (key, file) {
                                                //console.log("file stringify each: " + file);
                                                $.when(
                                                    plugin.model.postIDModelloIstanzaRecordMedia(IDRecord, IDAttributo, file)
                                                ).then(function (status, textStatus, jqXHR) {
                                                    //console.log("postIDModelloIstanzaRecordMedia status: " + status)
                                                })
                                            });
                                        } else {
                                            var file = recordValue.substring(1);
                                            //console.log("file stringify alone: " + file);
                                            $.when(
                                                plugin.model.postIDModelloIstanzaRecordMedia(IDRecord, IDAttributo, file)
                                            ).then(function (status, textStatus, jqXHR) {
                                                //console.log("postIDModelloIstanzaRecordMedia status: " + status)
                                            })
                                        }
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
                            plugin.find('.model-class-' + IdClasse + '-container .panel-success').fadeIn('slow');
                            setTimeout(function () {
                                plugin.find('.model-class-' + IdClasse + '-container .panel-success').fadeOut('slow');
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