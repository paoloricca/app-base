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

            var optionsWorkflowHistory = JSON.parse(plugin.attr('data-options'));
            var ready = plugin.data('workflowhistoryReady');
            if (!ready) {
                return $.Deferred().reject(new Error('Workflow history control is not initialized.')).promise();
            }

            return ready.then(function () {
                return $.ajax({
                    url: "/workflow-history/" + optionsWorkflowHistory.IdRecord,
                    type: "POST",
                    data: {
                        IdProcesso: optionsWorkflowHistory.IdProcesso,
                    },
                });
            }).then(function (response) {
                if (response.status !== "OK") {
                    var error = response.error || {};
                    ShowError(error.message || 'Unable to load workflow history.', error.sender || 'loadHistory');
                    return $.Deferred().reject(error).promise();
                }

                var $history = plugin.find('.container-workflow-history-' + optionsWorkflowHistory.IdRecord).empty();
                if (!response.data || response.data.length === 0) {
                    return plugin;
                }

                return $.get("/controls/ui/control.ui.workflow.history.flow.ejs?" + Date.now())
                    .then(function (templateString) {
                        $.each(response.data, function (key, flowhistory) {
                            var partialToRender = ejs.render(templateString, {
                                flowhistory: flowhistory,
                                LanguageContext: optionsWorkflowHistory.LanguageContext
                            });
                            $history.append(partialToRender);
                        });
                        return plugin;
                    });
            }).fail(function (xhr) {
                if (xhr && xhr.statusText) {
                    ShowError(xhr.responseText || xhr.statusText, 'loadHistory');
                }
            });
        };

        /*return this.each(function () {*/

        /* initialize plugin instance */
        plugin.attr('data-options', JSON.stringify(optionsWorkflowHistory));


        /* load plugin template */
        var ready = $.get("/controls/ui/control.ui.workflow.history.ejs?" + Date.now())
            .then(function (templateString) {
            renderTemplate(templateString);
        });
        plugin.data('workflowhistoryReady', ready);

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