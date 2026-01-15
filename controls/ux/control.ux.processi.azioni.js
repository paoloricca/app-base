(function ($) {
    /* Questo controllo utente consente di cercare e selezionare un processo di sistema */
    $.fn.processiazioni = function (options) {

        var options = $.extend({
            IDProcesso: null,
            IDProcessoAzione: null,
            IDProcessoParent: null,
            IdProfiloUtente: null,
            Toggled: null,
            ontoggle: null,
        }, options);

        var plugin = $(this);
        $.fn.processiazioni.draw = function () {

            var options = JSON.parse(plugin.attr('data-options'));

        };
        $.fn.processiazioni.load = function (IDProcesso, IdProfiloUtente) {

            var options = JSON.parse(plugin.attr('data-options'));

            $.ajax({
                url: "/processiazioni/" + IDProcesso,
                type: "POST",
                data: {
                    IdProfiloUtente: IdProfiloUtente
                },
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(
                        response.error.message,
                        response.error.sender
                    );
                } else if (response.status == "OK") {

                    plugin.find('.processi-azioni-list').empty();

                    $.when(
                        $.get("/controls/ui/control.ui.processo.azione.ejs?" + Date.now(),
                            function (templateString) {
                            })
                    ).then(function (templateString, textStatus, jqXHR) {
                        $.each(response.data, function (key, processoazione) {

                            var partialToRender = ejs.render(templateString, { processoazione });
                            plugin.find('.processi-azioni-list').append(partialToRender);

                            /* raise plugin event */
                            plugin.find('.btn-toggle-processo-azione-' + processoazione.IDProcessoAzione).click(function (e) {

                                /* get plugin attribute option */
                                var options = JSON.parse(plugin.attr('data-options'));

                                /* set pluging attribute */
                                options.IDProcesso = processoazione.IDProcesso
                                options.IDProcessoAzione = processoazione.IDProcessoAzione
                                options.Toggled = $(this).prop('checked');
                                    ;
                                /* re-store plugin attribute option */
                                plugin.attr('data-options', JSON.stringify(options));

                                /* raise plugin event */
                                $(this).trigger("ontoggle");

                            });
                        });

                    });
                }
            }).fail(function (xhr, status, errorThrown) {
            }).always(function (xhr, status) {

            });
        }
        return this.each(function () {

            /* store first plugin attribute options */
            plugin.attr('data-options', JSON.stringify(options));

            /* initialize plugin instance */
            plugin.html($.fn.processiazioni.draw());

            /* load plugin template */
            $.get("/controls/ui/control.ui.processi.azioni.html", function (response) {
                /* render plugin template */
                renderTemplate(response);
            });
            function renderTemplate(response) {
                /* fill plugin template */
                plugin.html($(response).html());

                /* get plugin attribute options */
                var options = JSON.parse(plugin.attr('data-options'));

                plugin.processiazioni.draw();
            };

            return plugin;
        });
    };
}(jQuery));