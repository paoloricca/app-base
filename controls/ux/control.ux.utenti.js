(function ($) {
    /* Questo controllo utente consente di cercare e selezionare un Utente (Persona) di sistema */
    $.fn.utenti = function (options) {
        var options = $.extend({
            IDAccount: null,
            IDAttore: null,
            IDPersona: null,
            IDGruppoOperativo: null,
            IDProfiloUtente: null,
            pageIndex: null,
            pageSize: null,
            onselect: null
        }, options);

        var plugin = $(this);
        $.fn.utenti.draw = function () {

            var options = JSON.parse(plugin.attr('data-options'));

        };
        $.fn.utenti.load = function (pageSize, pageIndex) {

            var options = JSON.parse(plugin.attr('data-options'));

            var ControlPagerUtenti = $('#utenti-pager');
            var optionPager = JSON.parse(ControlPagerUtenti.attr('data-options'));

            $.ajax({
                url: "/utenti/profilo-utente/" + options.IDProfiloUtente,
                type: "POST",
                data: {
                    pageIndex: optionPager.pageIndex,
                    pageSize: optionPager.pageSize
                },
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(
                        response.error.message,
                        response.error.sender
                    );
                } else if (response.status == "OK") {

                    /* Retrieve POST param data */;
                    var param = QueryStringToJSON($(this)[0].data);

                    if (response.data.length == 0) {
                        TotalRecord = 0
                    } else {
                        TotalRecord = response.data[0].TotalRecord
                    }

                    plugin.find('.utenti-list').empty();

                    $.each(response.data, function (key, utente) {
                        templateString = '';
                        $.get("/controls/ui/control.ui.utente.ejs", function (templateString) {
                            var partialToRender = ejs.render(templateString, { utente });
                            plugin.find('.utenti-list').append(partialToRender)

                            /* raise plugin event */
                            plugin.find('a.btn-select-' + utente.IDAccount).click(function (e) {
                                /* get plugin attribute option */
                                var options = JSON.parse(plugin.attr('data-options'));

                                /* set pluging attribute */
                                options.IDAccount = utente.IDAccount
                                    ;
                                /* re-store plugin attribute option */
                                plugin.attr('data-options', JSON.stringify(options));

                                /* raise event */
                                $(this).trigger("onselect");
                            });

                        });
                    });

                    /* Inizio gestione paginazione */
                    var ControlPagerUtenti = $('#utenti-pager');
                    var optionPager = JSON.parse(ControlPagerUtenti.attr('data-options'));

                    optionPager.pageIndex = eval(param.pageIndex);
                    optionPager.pageSize = param.pageSize;
                    if (!Number.isSafeInteger((eval(TotalRecord) / eval(param.pageSize)))) {
                        optionPager.totalPage = Math.round((eval(TotalRecord) / eval(param.pageSize)) + 1);
                    } else {
                        optionPager.totalPage = Math.round(eval(TotalRecord) / eval(param.pageSize));
                    }
                    optionPager.totalRecord = TotalRecord;
                    ControlPagerUtenti.attr('data-options', JSON.stringify(optionPager));
                    ControlPagerUtenti.paging.draw(ControlPagerUtenti);
                    /* Fine gestione paginazione */


                }
            }).fail(function (xhr, status, errorThrown) {
            }).always(function (xhr, status) {

            });
        }
        return this.each(function () {

            /* store first plugin attribute options */
            plugin.attr('data-options', JSON.stringify(options));

            /* initialize plugin instance */
            plugin.html($.fn.utenti.draw());

            /* load plugin template */
            $.get("/controls/ui/control.ui.utenti.html", function (response) {
                /* render plugin template */
                renderTemplate(response);
            });
            function renderTemplate(response) {
                /* fill plugin template */
                plugin.html($(response).html());

                /* get plugin attribute options */
                var options = JSON.parse(plugin.attr('data-options'));

                plugin.utenti.draw();

                /* inizializza il controllo pager per l'elenco delle risorse umane */
                var ControlPagerUtenti = $('#utenti-pager');

                /* Imposta le proprietà di default del plug-in */
                ControlPagerUtenti.paging({
                    pageIndex: 1,
                    pageSize: 6
                });
                /* Registra l'evento {Pagina precedente} */
                ControlPagerUtenti.bind(
                    "prev", function () {
                        plugin.utenti.load(
                            JSON.parse(ControlPagerUtenti.attr('data-options')).pageSize,
                            JSON.parse(ControlPagerUtenti.attr('data-options')).pageIndex
                        );
                    });
                /* Registra l'evento {Pagina successiva} */
                ControlPagerUtenti.bind(
                    "next", function () {
                        plugin.utenti.load(
                            JSON.parse(ControlPagerUtenti.attr('data-options')).pageSize,
                            JSON.parse(ControlPagerUtenti.attr('data-options')).pageIndex
                        );
                    });

            };
            return this;
        });
    };
}(jQuery));