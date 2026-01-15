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
            onload: null
        }, options);

        var plugin = $(this);

        $.fn.model.draw = function () {
            var options = JSON.parse(plugin.attr('data-options'));
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
                        $.each(response.data, function (key, row) {
                            var LanguageContext = options.user.LanguageContext;
                            plugin.find('.model-container').append(
                                ejs.render(templateString, { row, LanguageContext })
                            );
                            /* Per ogni IDClasse, verifica l'esistenza di un record esistente */
                            $.when(
                                plugin.model.getIDModelloIstanzaRecord(options.IDModelloIstanza, row.IDClasse)
                            ).then(function (IDRecord, textStatus, jqXHR) {
                                plugin.model.loadAttributes(row.IDClasse, IDRecord)
                            });
                        });

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
                        $.each(response.data, function (key, row) {

                            /* Caricamento valori attributo */
                            var recordValue = '';

                            $.when(
                                plugin.model.getIDModelloIstanzaRecordValue(IDRecord, row.IDAttributo)
                            ).then(function (RecordValue, textStatus, jqXHR) {

                                $.when(
                                    plugin.model.loadAttributeTemplate(row.IDTipoDati)
                                ).then(function (templateString, textStatus, jqXHR) {

                                    plugin.find('.model-class-' + IdClasse + '-container').append(
                                        ejs.render(templateString, { row })
                                    );

                                    /* NUMERO */
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
                                            filelist: RecordValue
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

                        });
                    }
                    return fieldlist;
                }).fail(function (xhr, status, errorThrown) {

                })
            ).then(function (response) {

                /* Valorizza la lista degli IDAttributo, utilizzata per la registrazione dei valori */
                $.each(response.data, function (key, row) {
                    fieldlist += '@' + row.IDAttributo;
                });

                if (options.Mode == "edit") {

                    plugin.find('.model-class-' + IdClasse + '-container').data('fieldlist', fieldlist.substring(1));
                    $.get("/controls/ui/control.ui.button.salva.ejs", function (response) {
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
                    if (!form.checkValidity()) {
                        isvalidform = false;
                    }
                })

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