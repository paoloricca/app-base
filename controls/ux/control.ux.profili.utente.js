(function ($) {
    /* Questo controllo utente consente di cercare e selezionare un profilo utente */
    $.fn.profiliutente = function (options) {
        var options = $.extend({
            IDGruppoOperativo: null,
            IDProfiloUtente: null,
            Descrizione: null,
            LanguageContext: null,
            onselect: null,
        }, options);

        var plugin = $(this);
        $.fn.profiliutente.draw = function () {

            var options = JSON.parse(plugin.attr('data-options'));

        };
        $.fn.profiliutente.clear = function (plugin) {
            plugin.find('.profiliutente-list').empty();
        }
        $.fn.profiliutente.load = function (plugin, IDGruppoOperativo) {

            var options = JSON.parse(plugin.attr('data-options'));

            $.ajax({
                url: "/profili-utente/" + IDGruppoOperativo,
                type: "GET",
                data: {},
            }).done(function (response) {

                plugin.find('.profiliutente-list').empty();

                if (response.status == "ERR") {
                    ShowError(
                        response.error.message,
                        response.error.sender
                    );
                } else if (response.status == "OK") {
                    $.when(
                        $.get("/controls/ui/control.ui.profilo.utente.ejs?" + Date.now(),
                            function (templateString) {
                            })
                    ).then(function (templateString, textStatus, jqXHR) {
                        $.each(response.data, function (key, profiloutente) {

                            var partialToRender = ejs.render(templateString, { profiloutente });

                            plugin.find('.profiliutente-list').append(partialToRender);

                            /* raise plugin event */
                            plugin.find('.btn-profiloutente-' + profiloutente.IDProfiloUtente).click(function (e) {

                                /* get plugin attribute option */
                                var options = JSON.parse(plugin.attr('data-options'));

                                /* set pluging attribute */
                                options.IDProfiloUtente = profiloutente.IDProfiloUtente
                                options.Descrizione = profiloutente.ProfiloUtente;

                                plugin.find('.profilo-utente a').removeClass('active');
                                plugin.find('.btn-profiloutente-' + profiloutente.IDProfiloUtente + ' a').addClass('active');

                                /* re-store plugin attribute option */
                                plugin.attr('data-options', JSON.stringify(options));

                                /* raise event */
                                $(this).trigger("onselect");

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
            plugin.html($.fn.profiliutente.draw());

            /* load plugin template */
            $.get("/controls/ui/control.ui.profili.utente.html", function (response) {
                /* render plugin template */
                renderTemplate(response);
            });
            function renderTemplate(response) {
                /* fill plugin template */
                plugin.html($(response).html());

                /* get plugin attribute options */
                var options = JSON.parse(plugin.attr('data-options'));

                plugin.profiliutente.draw();

            };
            return plugin;
        });
    };
}(jQuery));