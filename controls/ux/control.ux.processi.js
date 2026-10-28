(function ($) {
    /* Questo controllo utente consente di cercare e selezionare un processo di sistema */
    $.fn.processi = function (options) {
        var options = $.extend({
            IDProcesso: null,
            IDProcessoParent: null,
            Descrizione: null,
            onselect: null,
            onworkflow: null,
            dataUrl: null,
            selectionEnabled: true,
            contextMenu: null,
        }, options);

        var plugin = $(this);
        $.fn.processi.draw = function () {

            var options = JSON.parse(plugin.attr('data-options'));

        };
        $.fn.processi.load = function (IDProcesso) {

            var options = JSON.parse(plugin.attr('data-options'));
            if (!plugin.find('.processi-list').length) {
                plugin.data('processi-pending-load', { IDProcesso: IDProcesso });
                return;
            }

            var url = options.dataUrl
                ? options.dataUrl + (IDProcesso == null ? '' : '/' + IDProcesso)
                : "/processi/" + IDProcesso;

            $.ajax({
                url: url,
                type: "GET",
                data: {},
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(
                        response.error.message,
                        response.error.sender
                    );
                } else if (response.status == "OK") {

                    //plugin.find('.processi-list').empty();

                    $.get("/controls/ui/control.ui.processo.ejs?" + Date.now()).done(function (templateString) {
                        $.each(response.data, function (key, processo) {

                            var partialToRender = ejs.render(templateString, {
                                processo,
                                contextMenu: options.contextMenu
                            });

                            if (Number.isInteger(IDProcesso)) {
                                plugin.find('.processo-' + IDProcesso + '-container').append(partialToRender);
                                var mleft = $('.processo-' + IDProcesso + '-container').css('text-indent');
                                mleft = eval(mleft.replace('px', '')) + 7;
                                plugin.find('.processo-' + processo.IDProc + '-container').css("text-indent", mleft);

                            } else {
                                plugin.find('.processi-list').append(partialToRender);
                            }

                            /* raise plugin event */
                            plugin.find('.btn-processo-' + processo.IDProc).click(function (e) {
                                var processOptions = JSON.parse(plugin.attr('data-options'));

                                if (processOptions.contextMenu && $(e.target).closest('.processo-context-dropdown').length) {
                                    return;
                                }

                                if (processOptions.selectionEnabled !== false) {
                                    /* set pluging attribute */
                                    processOptions.IDProcesso = processo.IDProc
                                    processOptions.Descrizione = processo.Description;
                                    /* re-store plugin attribute option */
                                    plugin.attr('data-options', JSON.stringify(processOptions));

                                    /* raise event */
                                    $(this).trigger("onselect");

                                    if (processo.HasWorkflow == 1) {
                                        $(this).trigger("onworkflow");
                                    }
                                }

                                if ($(this).parent().parent().find('div[class*=-container]').length > 0) {
                                    $(this).parent().parent().find('div[class*=-container]').remove();
                                } else {
                                    plugin.processi.load(processo.IDProc);
                                }
                                
                            });
                        });

                    }).fail(function (xhr, status, errorThrown) {
                        ShowError(errorThrown || status, "processi.row-template");
                    });
                }
            }).fail(function (xhr, status, errorThrown) {
                ShowError(errorThrown || status, "processi.load");
            }).always(function (xhr, status) {

            });
        }

        return this.each(function () {

            /* store first plugin attribute options */
            plugin.attr('data-options', JSON.stringify(options));

            /* initialize plugin instance */
            plugin.html($.fn.processi.draw());

            /* load plugin template */
            $.get("/controls/ui/control.ui.processi.html", function (response) {
                /* render plugin template */
                renderTemplate(response);
            }).fail(function (xhr, status, errorThrown) {
                ShowError(errorThrown || status, "processi.template");
            });
            function renderTemplate(response) {
                /* fill plugin template */
                plugin.html($(response).html());

                /* get plugin attribute options */
                var options = JSON.parse(plugin.attr('data-options'));

                plugin.processi.draw();
                var pendingLoad = plugin.data('processi-pending-load');
                if (pendingLoad) {
                    plugin.removeData('processi-pending-load');
                    plugin.processi.load(pendingLoad.IDProcesso);
                }

                /* raise plugin event */
                //plugin.find('a.btn-select').click(function (e) {
                //    /* get plugin attribute option */
                //    var options = JSON.parse(plugin.attr('data-options'));

                //    /* set pluging attribute */
                //    //options.pageIndex += 1;
                //    /* re-store plugin attribute option */
                //    plugin.attr('data-options', JSON.stringify(options));

                //    //plugin.find('input.pageIndex').val(options.pageIndex);

                //    /* raise event */
                //    $(this).trigger("onselect");
                //});
            };
            return plugin;
        });
    };
}(jQuery));