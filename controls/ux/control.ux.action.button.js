(function ($) {
    /* Questo controllo utente consente di inserire un control button associato alle azioni dei processi */
    $.fn.actionbutton = function (myoptions) {

        let optionsActionButton = $.extend({
            ActionType: null,
            ActionName: null,
            IDProfiloUtente: null,
            IDProcesso: null,
            LanguageContext: null,
            Description: null,
            IsVisible: null,
            onclick: null,
        }, myoptions);

        var plugin = $(this);

        $.fn.actionbutton.draw = function (plugin) {

            var optionsActionButton = JSON.parse(plugin.attr('data-options'));

            plugin.find('.btn-' + optionsActionButton.ActionName).html(optionsActionButton.Description);

            if (optionsActionButton.IsVisible == true) {
                plugin.find('.btn-' + optionsActionButton.ActionName).show();
            } else {
                plugin.find('.btn-' + optionsActionButton.ActionName).hide();
            }
        };
        $.fn.actionbutton.load = function (plugin) {

            var optionsActionButton = JSON.parse(plugin.attr('data-options'));

            /* Carica le proprietà della action */
            $.ajax({
                url: "/processiazioni" + optionsActionButton.ActionType,
                type: "POST",
                data: {
                    IdProfiloUtente: optionsActionButton.IDProfiloUtente,
                    IdProcesso: optionsActionButton.IDProcesso,
                    ActionName: optionsActionButton.ActionName,
                    LanguageContext: optionsActionButton.LanguageContext
                },
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(
                        response.error.message,
                        response.error.sender
                    );
                } else if (response.status == "OK") {

                    if (response.data != "" && response.data[0].IDProcesso != null) {
                        /* set action visibility */
                        optionsActionButton.IsVisible = true;
                        optionsActionButton.Description = response.data[0].Description;
                    } else {
                        optionsActionButton.IsVisible = false;
                        optionsActionButton.Description = "";
                    }
                    /* re-store plugin attribute option */
                    plugin.attr('data-options', JSON.stringify(optionsActionButton));

                    plugin.actionbutton.draw(plugin);
                }
            }).fail(function (xhr, status, error) {
                ShowError(
                    xhr.responseText,
                    'loadActionButton'
                );
            });
        };

        /* initialize plugin instance */
        plugin.attr('data-options', JSON.stringify(optionsActionButton));

        /* load plugin template */
        $.when(
            $.get("/controls/ui/control.ui.action.button.ejs?" + Date.now(),
                function (templateString) {
                })
        ).then(function (templateString, textStatus, jqXHR) {

            /* render plugin template */
            renderTemplate(templateString);
        });

        function renderTemplate(templateString) {

            var optionsActionButton = JSON.parse(plugin.attr('data-options'));

            var LanguageContext = optionsActionButton.LanguageContext;
            var ActionName = optionsActionButton.ActionName;

            var partialToRender = ejs.render(templateString, { LanguageContext, ActionName });

            /* fill plugin template */
            plugin.html(partialToRender);

            plugin.actionbutton.draw(plugin);

            /* raise plugin event */
            plugin.find('.btn-' + optionsActionButton.ActionName).click(function (e) {

                var optionsActionButton = JSON.parse(plugin.attr('data-options'));

                /* raise event */
                $(this).trigger("onclick", optionsActionButton.Description);
            });

            plugin.actionbutton.load(plugin);
            
        };

        return plugin;

    };
}(jQuery));