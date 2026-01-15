(function ($) {
    $.fn.workflowhistory = function (myoptions) {

        let optionsWorkflowHistory = $.extend({
            IdRecord: null,
            IdProcesso: null,
            LanguageContext: null,
            user: null,
            //onpreview: null,
            //ondelete: null,
            //onedit: null,
            //onhistory: null,
        }, myoptions);

        var plugin = $(this);

        //console.log(plugin);
        $.fn.workflowhistory.draw = function (plugin) {

            //console.log(plugin);
            var optionsWorkflowHistory = JSON.parse(plugin.attr('data-options'));

        };
        $.fn.workflowhistory.loadHistory = function (plugin) {

            //console.log(plugin);
            var optionsWorkflowHistory = JSON.parse(plugin.attr('data-options'));

            /* Carica la lista di azioni disponibili */
            $.ajax({
                url: "/workflow-history/" + optionsWorkflowHistory.IdRecord,
                type: "POST",
                data: {
                    IdProcesso: optionsWorkflowHistory.IdProcesso,
                },
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(
                        response.error.message,
                        response.error.sender
                    );
                } else if (response.status == "OK") {

                    plugin.find('.container-workflow-history-' + optionsWorkflowHistory.IdRecord).empty();

                    $.when(
                        $.get("/controls/ui/control.ui.workflow.history.flow.ejs?" + Date.now(),
                            function (templateString) {
                            })
                    ).then(function (templateString, textStatus, jqXHR) {
                        if (response.data) {
                            $.each(response.data, function (key, flowhistory) {

                                var optionsWorkflowHistory = JSON.parse(plugin.attr('data-options'));
                                var LanguageContext = optionsWorkflowHistory.LanguageContext;

                                var partialToRender = ejs.render(templateString, { flowhistory, LanguageContext });

                                plugin.find('.container-workflow-history-' + optionsWorkflowHistory.IdRecord).append(partialToRender);

                                //plugin.find('.container-workflow-actions-' + optionsWorkflowHistory.IdRecord).find('.btn-action-workflow-' + action.IDProcessoAzione).click(function () {

                                //    plugin.workflow[$(this).data('actionname')](plugin);

                                //});

                            });
                        }
                    });
                }
            }).fail(function (xhr, status, error) {
                ShowError(
                    xhr.responseText,
                    'loadHistory'
                );
            });
        };

        /*return this.each(function () {*/

        /* initialize plugin instance */
        plugin.attr('data-options', JSON.stringify(optionsWorkflowHistory));


        /* load plugin template */
        $.when(
            $.get("/controls/ui/control.ui.workflow.history.ejs?" + Date.now(),
                function (templateString) {
                })
        ).then(function (templateString, textStatus, jqXHR) {

            /* render plugin template */
            renderTemplate(templateString);
        });

        function renderTemplate(templateString) {

            var optionsWorkflowHistory = JSON.parse(plugin.attr('data-options'));

            var LanguageContext = optionsWorkflowHistory.LanguageContext;
            var IdProcesso = optionsWorkflowHistory.IdProcesso;
            var IdRecord = optionsWorkflowHistory.IdRecord;
            var partialToRender = ejs.render(templateString, { LanguageContext, IdRecord });

            /* fill plugin template */
            plugin.html(partialToRender);

            // Initialize tooltips
            var tooltipTriggerList = [].slice.call(plugin.find('.btn-actions'))
            var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl)
            })

            plugin.workflowhistory.draw(plugin);

        };
        return plugin;
        //});
    };
}(jQuery));