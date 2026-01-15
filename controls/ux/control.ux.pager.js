(function ($) {
    $.fn.paging = function (myoptions) {

        let optionsPaging = $.extend({
            pageIndex: null,
            pageSize: null,
            totalPage: null,
            totalRecord: null,
            LanguageContext: null,
            prev: null,
            next: null,
        }, myoptions);

        var plugin = $(this);

        //console.log(plugin);
        $.fn.paging.draw = function (plugin) {

            //console.log(plugin);

            var optionsPager = JSON.parse(plugin.attr('data-options'));

            plugin.find('label.totalPage').html(optionsPager.totalPage);
            plugin.find('input.pageIndex').val(optionsPager.pageIndex);

            if (optionsPager.totalRecord != null) {
                plugin.find('.totalRecord').html(optionsPager.totalRecord);
                plugin.find('.container-totalRecord').show();
            } else {
                plugin.find('.container-totalRecord').hide();
            }
            if (optionsPager.pageIndex > 1) {
                plugin.find('a.btn-prev').show();
            } else {
                plugin.find('a.btn-prev').hide();
            }
            if (eval(optionsPager.pageIndex) < eval(optionsPager.totalPage)) {
                plugin.find('a.btn-next').show();
            } else {
                plugin.find('a.btn-next').hide();
            }
        };

        /*return this.each(function () {*/

            /* initialize plugin instance */
            plugin.attr('data-options', JSON.stringify(optionsPaging));

            //plugin.html($.fn.paging.draw());

            /* load plugin template */
            $.get("/controls/ui/control.ui.pager.ejs?" + Date.now(), function (response) {
                /* render plugin template */
                renderTemplate(response);
            });
            function renderTemplate(templateString) {

                var optionsPager = JSON.parse(plugin.attr('data-options'));

                var LanguageContext = optionsPager.LanguageContext;
                var partialToRender = ejs.render(templateString, { LanguageContext });

                /* fill plugin template */
                plugin.html(partialToRender);


                plugin.paging.draw(plugin);

                /* raise plugin event */
                plugin.find('a.btn-next').click(function (e) {
                    /* get plugin attribute option */
                    var optionsPager = JSON.parse(plugin.attr('data-options'));
                    /* set pluging attribute */
                    optionsPager.pageIndex += 1;
                    /* re-store plugin attribute option */
                    plugin.attr('data-options', JSON.stringify(optionsPager));

                    plugin.find('input.pageIndex').val(optionsPager.pageIndex);

                    plugin.find('.spinner-border').show();

                    /* raise event */
                    $(this).trigger("next");
                });
                plugin.find('a.btn-prev').click(function (e) {
                    /* get plugin attribute option */
                    var optionsPager = JSON.parse(plugin.attr('data-options'));
                    /* set pluging attribute */
                    optionsPager.pageIndex -= 1;
                    /* re-store plugin attribute option */
                    plugin.attr('data-options', JSON.stringify(optionsPager));

                    plugin.find('input.pageIndex').val(optionsPager.pageIndex);

                    plugin.find('.spinner-border').show();

                    /* raise event */
                    $(this).trigger("prev");
                });
            };
            return plugin;
        //});
    };
}(jQuery));