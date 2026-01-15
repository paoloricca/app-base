(function ($) {
    $.fn.workflow = function (myoptions) {

        let optionsWorkflow = $.extend({
            IdProfiloUtente: null,
            IdRecord: null,
            IdProcesso: null,
            IdModelloIstanza: null,
            LanguageContext: null,
            onpreview: null,
            ondelete: null,
            onedit: null,
            onhistory: null,
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

                                /* raise plugin event */
                                //plugin.find('.btn-processo-' + processo.IDProc).click(function (e) {

                                //    /* get plugin attribute option */
                                //    var options = JSON.parse(plugin.attr('data-options'));

                                //    /* set pluging attribute */
                                //    options.IDProcesso = processo.IDProc
                                //    options.Descrizione = processo.Description;
                                //    ;
                                //    /* re-store plugin attribute option */
                                //    plugin.attr('data-options', JSON.stringify(options));

                                //    /* raise event */
                                //    $(this).trigger("onselect");

                                //    if ($(this).parent().parent().find('div[class*=-container]').length > 0) {
                                //        $(this).parent().parent().find('div[class*=-container]').remove();
                                //    } else {
                                //        plugin.processi.load(processo.IDProc);
                                //    }

                                //});
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
            });

            /* raise plugin event */
            plugin.find('a.btn-ok-action').click(function (e) {

                plugin.find('.confirm-action .spinner-border').show();

                /* raise event */
                plugin.trigger("ondelete", plugin.find('.confirm-action').data('ActionName'));
            });

        };

        return plugin;
    };
}(jQuery));