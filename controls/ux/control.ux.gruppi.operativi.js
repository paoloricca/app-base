(function ($) {
    /* Questo controllo utente consente di cercare e selezionare un gruppo di lavoro */
    $.fn.gruppioperativi = function (options) {
        var options = $.extend({
            IDGruppoOperativo: null,
            IDGruppoOperativoParent: null,
            Descrizione: null,
            LanguageContext: null,
            onselect: null,
        }, options);

        var plugin = $(this);
        $.fn.gruppioperativi.draw = function () {

            var options = JSON.parse(plugin.attr('data-options'));

        };
        $.fn.gruppioperativi.clear = function (plugin) {
            plugin.find('.gruppioperativi-list').empty();
        }
        $.fn.gruppioperativi.load = function (plugin, IDGruppoOperativo) {

            var options = JSON.parse(plugin.attr('data-options'));

            $.ajax({
                url: "/gruppi-operativi-list/" + IDGruppoOperativo,
                type: "GET",
                data: {},
            }).done(function (response) {

                if (response.status == "ERR") {
                    ShowError(
                        response.error.message,
                        response.error.sender
                    );
                } else if (response.status == "OK") {

                    $.when(
                        $.get("/controls/ui/control.ui.gruppo.operativo.ejs?" + Date.now(),
                            function (templateString) {
                            })
                    ).then(function (templateString, textStatus, jqXHR) {
                        $.each(response.data, function (key, gruppooperativo) {

                            var partialToRender = ejs.render(templateString, { gruppooperativo });

                            if (IDGruppoOperativo > 0) {
                                plugin.find('.gruppooperativo-' + IDGruppoOperativo + '-container').append(partialToRender);
                                var mleft = $('.gruppooperativo-' + IDGruppoOperativo + '-container').css('text-indent');
                                mleft = eval(mleft.replace('px', '')) + 12;
                                plugin.find('.gruppooperativo-' + gruppooperativo.IDGruppoOperativo + '-container').css("text-indent", mleft);

                            } else {
                                plugin.find('.gruppioperativi-list').append(partialToRender);
                            }

                            /* raise plugin event */
                            plugin.find('.btn-gruppooperativo-' + gruppooperativo.IDGruppoOperativo).click(function (e) {

                                /* get plugin attribute option */
                                var options = JSON.parse(plugin.attr('data-options'));

                                /* set pluging attribute */
                                options.IDGruppoOperativo = gruppooperativo.IDGruppoOperativo
                                options.Descrizione = gruppooperativo.Description;

                                plugin.find('.gruppo-operativo a').removeClass('active');
                                plugin.find('.btn-gruppooperativo-' + gruppooperativo.IDGruppoOperativo + ' a').addClass('active');

                                /* re-store plugin attribute option */
                                plugin.attr('data-options', JSON.stringify(options));

                                /* raise event */
                                $(this).trigger("onselect");

                                if ($(this).parent().parent().find('div[class*=-container]').length > 0) {
                                    $(this).parent().parent().find('div[class*=-container]').remove();
                                } else {
                                    plugin.find('.spinner-border-gruppi-operativi').show();
                                    plugin.gruppioperativi.load(plugin, gruppooperativo.IDGruppoOperativo);
                                }

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
            plugin.html($.fn.gruppioperativi.draw());

            /* load plugin template */
            $.get("/controls/ui/control.ui.gruppi.operativi.html", function (response) {
                /* render plugin template */
                renderTemplate(response);
            });
            function renderTemplate(response) {
                /* fill plugin template */
                plugin.html($(response).html());

                /* get plugin attribute options */
                var options = JSON.parse(plugin.attr('data-options'));

                plugin.gruppioperativi.draw();

            };
            return plugin;
        });
    };
}(jQuery));