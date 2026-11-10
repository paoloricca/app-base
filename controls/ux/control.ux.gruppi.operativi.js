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
        var loadRequest = 0;
        $.fn.gruppioperativi.draw = function () {

            var options = JSON.parse(plugin.attr('data-options'));

        };
        $.fn.gruppioperativi.clear = function (plugin) {
            ++loadRequest;
            plugin.find('.gruppioperativi-list').empty();
        }
        $.fn.gruppioperativi.load = function (plugin, IDGruppoOperativo) {

            var options = JSON.parse(plugin.attr('data-options'));
            var requestId = ++loadRequest;

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
                        if (requestId !== loadRequest) return;
                        var targetContainer = IDGruppoOperativo > 0
                            ? plugin.find('.gruppooperativo-' + IDGruppoOperativo + '-container').first()
                            : plugin.find('.gruppioperativi-list');
                        if (IDGruppoOperativo > 0) {
                            targetContainer.children('[class*="-container"]').remove();
                        } else {
                            targetContainer.empty();
                        }
                        $.each(response.data, function (key, gruppooperativo) {

                            var partialToRender = ejs.render(templateString, { gruppooperativo });

                            if (IDGruppoOperativo > 0) {
                                targetContainer.append(partialToRender);
                                var mleft = parseFloat(targetContainer.css('text-indent')) || 0;
                                mleft += 12;
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
                                    ++loadRequest;
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
                if (requestId === loadRequest) {
                    ShowError(errorThrown || status, 'gruppioperativi.load');
                }
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
                plugin.trigger('onload');

            };
            return plugin;
        });
    };
}(jQuery));