(function ($) {
    $.fn.workflowNodeStates = function (myoptions) {

        let optionsWorkflow = $.extend({
            IdProcesso: null,
            IdEventoTransizione: null,
            LanguageContext: null,
            Sender: null,
            SelectedState: null,
            SelectedText: null,
            onselect: null,
        }, myoptions);

        var plugin = $(this);

        //console.log(plugin);
        $.fn.workflowNodeStates.draw = function (plugin) {

            //console.log(plugin);
            var optionsWorkflow = JSON.parse(plugin.attr('data-options'));

        };
        $.fn.workflowNodeStates.clear = function (plugin) {

            //console.log(plugin);
            var optionsWorkflow = JSON.parse(plugin.attr('data-options'));
            plugin.find('.btn-confirm-container-workflow-node-states').prop('disabled', true);
            plugin.find('.node-state span').removeClass('active');
            plugin.find('.node-state').removeClass('border radius-16');

        };
        $.fn.workflowNodeStates.loadStates = function (plugin) {
            plugin.find('.spinner-workflow-node-states').show();
            var optionsWorkflow = JSON.parse(plugin.attr('data-options'));
            try {
                $.ajax({
                    url: "/workflow-node-states/" + optionsWorkflow.IdProcesso,
                    type: "GET",
                    data: {},
                }).done(function (response) {

                    plugin.find('.btn-confirm-container-workflow-node-states').prop('disabled', true);

                    if (response.status == "ERR") {
                        //$('.spinner-border').hide();
                        ShowError(response.error.message, response.error.sender);

                    } else if (response.status == "OK") {

                        plugin.find('.container-workflow-node-states').empty();

                        var optionsWorkflow = JSON.parse(plugin.attr('data-options'));

                        $.when(
                            $.get("/controls/ui/control.ui.workflow.node.state.ejs?" + Date.now(),
                                function (templateString) {
                                })
                        ).then(function (templateString, textStatus, jqXHR) {
                            if (response.data) {
                                $.each(response.data, function (key, state) {

                                    var partialToRender = ejs.render(templateString, { state, optionsWorkflow });
                                    if (optionsWorkflow.SelectedState != null) {
                                        plugin.find('.btn-confirm-container-workflow-node-states').prop('disabled', false);
                                    }

                                    plugin.find('.container-workflow-node-states').append(partialToRender);

                                    plugin.find('.container-workflow-node-states #state-' + state.IdEventoTransizione).click(function () {

                                        var optionsWorkflow = JSON.parse(plugin.attr('data-options'));

                                        plugin.find('.node-state span').removeClass('active');
                                        plugin.find('.node-state').removeClass('border radius-16');
                                        plugin.find('.btn-confirm-container-workflow-node-states').prop('disabled', false);

                                        $(this).find('span').addClass('active');
                                        $(this).addClass('border radius-16');

                                        optionsWorkflow.SelectedState = $(this).data('id');
                                        optionsWorkflow.SelectedText = $(this).data('desc');

                                        /* re-store plugin attribute option */
                                        plugin.attr('data-options', JSON.stringify(optionsWorkflow));
                                    });

                                });
                            }
                        });
                        plugin.find('.spinner-workflow-node-states').hide();
                    }
                });
            }
            catch (err) {
                plugin.find('.spinner-workflow-node-states').hide();
                ShowError(err.message, "workflowNodeStates.loadStates");
            }
        };

        /* initialize plugin instance */
        plugin.attr('data-options', JSON.stringify(optionsWorkflow));

        /* load plugin template */
        $.when(
            $.get("/controls/ui/control.ui.workflow.node.states.ejs?" + Date.now(),
                function (templateString) {
                })
        ).then(function (templateString, textStatus, jqXHR) {

            /* render plugin template */
            renderTemplate(templateString);
        });
        function renderTemplate(templateString) {

            var optionsWorkflow = JSON.parse(plugin.attr('data-options'));

            var LanguageContext = optionsWorkflow.LanguageContext;
            var partialToRender = ejs.render(templateString, { LanguageContext });

            /* fill plugin template */
            plugin.html(partialToRender);

            // Initialize tooltips

            //var tooltipTriggerList = [].slice.call(plugin.find('.btn-actions'))
            //var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            //    return new bootstrap.Tooltip(tooltipTriggerEl)
            //})

            plugin.workflowNodeStates.draw(plugin);

            //plugin.find('.btn-workflow-' + optionsWorkflow.IdRecord).click(function (e) {
            //    plugin.workflowNodeStates.loadActions(plugin);

            //    $.when(
            //        plugin.workflowNodeStates.laodHasWorkflow(plugin)
            //    ).then(function (response, textStatus, jqXHR) {
            //        plugin.find('#frmWorkflow-' + optionsWorkflow.IdRecord + ' .spinner-border').hide();

            //    });
            //});

            /* raise plugin event */

            plugin.find('.btn-confirm-container-workflow-node-states').click(function (e) {

                /* raise onselect event */
                plugin.trigger("onselect");
            });
        };

        return plugin;
    };
}(jQuery));