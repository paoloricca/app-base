(function ($) {
    $.fn.workflow = function (myoptions) {

        let optionsWorkflow = $.extend({
            IdProfiloUtente: null,
            IdRecord: null,
            IdProcesso: null,
            IdModelloIstanza: null,
            LanguageContext: null,
            IdEventoDirezione:null,
            onpreview: null,
            ondelete: null,
            onedit: null,
            onhistory: null,
            onworkflow: null,
        }, myoptions);

        var plugin = $(this);

        //console.log(plugin);
        $.fn.workflow.draw = function (plugin) {

            //console.log(plugin);
            var optionsWorkflow = JSON.parse(plugin.attr('data-options'));

        };
        $.fn.workflow.Anteprima = function (plugin, actionName) {

            var optionsWorkflow = JSON.parse(plugin.attr('data-options'));

            /* raise event */
            plugin.trigger("onpreview", actionName);
        };
        $.fn.workflow.Modifica = function (plugin, actionName) {

            var optionsWorkflow = JSON.parse(plugin.attr('data-options'));

            /* raise event */
            plugin.trigger("onedit", actionName);
        };
        $.fn.workflow.Cancellazione = function (plugin, actionName) {

            var optionsWorkflow = JSON.parse(plugin.attr('data-options'));

            plugin.find('.confirm-action').data('IdRecord', optionsWorkflow.IdRecord)
            plugin.find('.confirm-action').data('ActionName', actionName)
            plugin.find('.confirm-action').modal('show');

        };
        $.fn.workflow.VisualizzaStoria = function (plugin) {

            var optionsWorkflow = JSON.parse(plugin.attr('data-options'));

            /* raise event */
            plugin.trigger("onhistory");
        };
        $.fn.workflow.loadActions = function (plugin) {

            //console.log(plugin);
            var optionsWorkflow = JSON.parse(plugin.attr('data-options'));

            plugin.find('#frmWorkflow-' + optionsWorkflow.IdRecord + ' .spinner-border').show();
            
            /* Carica la lista di azioni disponibili */
            $.ajax({
                url: "/workflow-action/" + optionsWorkflow.IdRecord,
                type: "POST",
                data: {
                    IdProcesso: optionsWorkflow.IdProcesso,
                    IdProfiloUtente: optionsWorkflow.IdProfiloUtente,
                },
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(
                        response.error.message,
                        response.error.sender
                    );
                } else if (response.status == "OK") {

                    plugin.find('.container-workflow-actions-' + optionsWorkflow.IdRecord).empty();

                    $.when(
                        $.get("/controls/ui/control.ui.workflow-action.ejs?" + Date.now(),
                            function (templateString) {
                            })
                    ).then(function (templateString, textStatus, jqXHR) {
                        if (response.data) {
                            $.each(response.data, function (key, action) {

                                var partialToRender = ejs.render(templateString, { action });

                                plugin.find('.container-workflow-actions-' + optionsWorkflow.IdRecord).append(partialToRender);
                                plugin.find('.container-workflow-actions-' + optionsWorkflow.IdRecord).find('.btn-action-workflow-' + action.IDProcessoAzione).click(function () {

                                    plugin.workflow[$(this).data('actionname')](plugin, action.Description);

                                });

                            });
                            plugin.find('.container-workflow-actions-' + optionsWorkflow.IdRecord).append(
                                '<li class="dropdown-item"><hr class="dropdown-divider"></li>'
                            );
                        }
                    });
                }
            }).fail(function (xhr, status, error) {
                ShowError(
                    xhr.responseText,
                    'loadActions'
                );
            });
        };
        $.fn.workflow.laodHasWorkflow = function (plugin) {
            try {
                var optionsWorkflow = JSON.parse(plugin.attr('data-options'));

                return $.ajax({
                    url: "/workflow-has-transitions/" + optionsWorkflow.IdRecord,
                    type: "POST",
                    data: {
                        IdProcesso: optionsWorkflow.IdProcesso,
                        IdProfiloUtente: optionsWorkflow.IdProfiloUtente,
                    },
                }).done(function (response) {
                    if (response.status == "ERR") {
                        ShowError(
                            response.error.message,
                            response.error.sender
                        );
                    } else if (response.data == "OK") {
                        plugin.find('.btn-imposta-workflow-' + optionsWorkflow.IdRecord).show();
                        plugin.find('.no-workflow-' + optionsWorkflow.IdRecord).hide();
                    } else if (response.data == "KO") {
                        plugin.find('.btn-imposta-workflow-' + optionsWorkflow.IdRecord).hide();
                        plugin.find('.no-workflow-' + optionsWorkflow.IdRecord).show();
                    }
                }).fail(function (xhr, status, errorThrown) {
                }).always(function (xhr, status) {

                });
            } catch (err) {
                ShowError(err);
            }
        }
        $.fn.workflow.laodWorkflowTransition = function (plugin) {
            try {
                var optionsWorkflow = JSON.parse(plugin.attr('data-options'));
                plugin.find('#confirm-workflow-' + optionsWorkflow.IdRecord).show();
                plugin.find('.confirm-workflow .spinner-border').show();
                plugin.find('#txtNote').val('');

                return $.ajax({
                    url: "/workflow-transitions/" + optionsWorkflow.IdRecord,
                    type: "POST",
                    data: {
                        IdProcesso: optionsWorkflow.IdProcesso,
                        IdProfiloUtente: optionsWorkflow.IdProfiloUtente,
                    },
                }).done(function (response) {
                    if (response.status == "ERR") {
                        ShowError(
                            response.error.message,
                            response.error.sender
                        );
                    } else if (response.status == "OK") {
                        plugin.find('.container-workflow-' + optionsWorkflow.IdRecord + '-transitions').empty();

                        $.when(
                            $.get("/controls/ui/control.ui.workflow-transition.ejs?" + Date.now(),
                                function (templateString) {
                                })
                        ).then(function (templateString, textStatus, jqXHR) {
                            if (response.data) {
                                plugin.find('.container-workflow-note-' + optionsWorkflow.IdRecord).hide();
                                $.each(response.data, function (key, transition) {

                                    var partialToRender = ejs.render(templateString, { transition });

                                    plugin.find('.container-workflow-' + optionsWorkflow.IdRecord + '-transitions').append(partialToRender);
                                    plugin.find('.container-workflow-' + optionsWorkflow.IdRecord + '-transitions').find('#transition-' + transition.IDEventoDirezione).click(function () {

                                        /* Set IdEventoDirezione */
                                        optionsWorkflow.IdEventoDirezione = transition.IDEventoDirezione;

                                        /* re-store plugin attribute option */
                                        plugin.attr('data-options', JSON.stringify(optionsWorkflow));

                                        if ($(this).data('isavailablenote')) {
                                            plugin.find('.container-workflow-note-' + optionsWorkflow.IdRecord).show();
                                        } else {
                                            plugin.find('.container-workflow-note-' + optionsWorkflow.IdRecord).hide();
                                        }

                                    });
                                });
                            }
                        });

                        return true;
                    }
                }).fail(function (xhr, status, errorThrown) {
                }).always(function (xhr, status) {

                });
            } catch (err) {
                ShowError(err);
            }
        }

        /* initialize plugin instance */
        plugin.attr('data-options', JSON.stringify(optionsWorkflow));

        /* load plugin template */
        $.when(
            $.get("/controls/ui/control.ui.workflow.ejs?" + Date.now(),
                function (templateString) {
                })
        ).then(function (templateString, textStatus, jqXHR) {

            /* render plugin template */
            renderTemplate(templateString);
        });
        function renderTemplate(templateString) {

            var optionsWorkflow = JSON.parse(plugin.attr('data-options'));

            var LanguageContext = optionsWorkflow.LanguageContext;
            var IdProcesso = optionsWorkflow.IdProcesso;
            var IdRecord = optionsWorkflow.IdRecord;
            var partialToRender = ejs.render(templateString, { LanguageContext, IdRecord });

            /* fill plugin template */
            plugin.html(partialToRender);

            // Initialize tooltips
            var tooltipTriggerList = [].slice.call(plugin.find('.btn-actions'))
            var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl)
            })

            plugin.workflow.draw(plugin);

            plugin.find('.btn-workflow-' + optionsWorkflow.IdRecord).click(function (e) {
                plugin.workflow.loadActions(plugin);

                $.when(
                    plugin.workflow.laodHasWorkflow(plugin)
                ).then(function (response, textStatus, jqXHR) {
                    plugin.find('#frmWorkflow-' + optionsWorkflow.IdRecord + ' .spinner-border').hide();

                });
            });

            /* raise plugin event */
            plugin.find('a.btn-ok-action').click(function (e) {

                plugin.find('.confirm-action .spinner-border').show();

                /* raise event */
                plugin.trigger("ondelete", plugin.find('.confirm-action').data('ActionName'));
            });
            plugin.find('a.btn-ok-workflow').click(function (e) {

                var optionsWorkflow = JSON.parse(plugin.attr('data-options'));

                //plugin.find('.confirm-action .spinner-border').show();
                //TODO: verificare che l'utente ha selezionato un nodo di worlflow

                /* Convalida i dati immessi dall'utente */
                var isvalidform = true;
                const forms = document.querySelectorAll('#frmWorkflow-' + optionsWorkflow.IdRecord + ' .form-control')
                Array.from(forms).forEach(form => {
                    if (form.offsetParent != null && !form.checkValidity()) {
                        isvalidform = false;
                    }
                })
                /* raise event */
                if (isvalidform) {                    
                    plugin.trigger("onworkflow", plugin.find('#txtNote').val());
                }
            });
            plugin.find('.btn-imposta-workflow-' + optionsWorkflow.IdRecord).click(function (e) {

                $.when(
                    plugin.workflow.laodWorkflowTransition(plugin)
                ).then(function (response, textStatus, jqXHR) {
                    plugin.find('.confirm-workflow .spinner-border').hide();
                });
            });

            plugin.find('#btn-annulla-workflow-' + optionsWorkflow.IdRecord).click(function (e) {

                plugin.find('#confirm-workflow-' + optionsWorkflow.IdRecord).hide();

            });
        };

        return plugin;
    };
}(jQuery));