(function ($) {
    $.fn.filtroprocessi = function (myoptions) {

        let optionsFiltroProcessi = $.extend({
            IdProfiloUtente: null,
            IdProcesso: null,
            ProcessLabelId: null,
            LanguageContext: null,
            onselect: null,
        }, myoptions);

        var plugin = $(this);

        //console.log(plugin);
        $.fn.filtroprocessi.draw = function (plugin) {

            //console.log(plugin);

            var optionsFiltroProcessi = JSON.parse(plugin.attr('data-options'));

        };

        /*return this.each(function () {*/

        /* initialize plugin instance */
        plugin.attr('data-options', JSON.stringify(optionsFiltroProcessi));

        /* load plugin template */
        $.get("/controls/ui/control.ui.processi.filter.ejs?" + Date.now(), function (response) {
            /* render plugin template */
            renderTemplate(response);
        });
        function renderTemplate(templateString) {

            var optionsFiltroProcessi = JSON.parse(plugin.attr('data-options'));
            var LanguageContext = optionsFiltroProcessi.LanguageContext;
            var ProcessLabelId = optionsFiltroProcessi.ProcessLabelId;
            var partialToRender = ejs.render(templateString, { LanguageContext, ProcessLabelId });

            /* fill plugin template */
            plugin.html(partialToRender);


            plugin.filtroprocessi.draw(plugin);

            /* raise plugin event */
            //plugin.find('a.btn-next').click(function (e) {
            //    /* get plugin attribute option */
            //    var optionsFiltroProcessi = JSON.parse(plugin.attr('data-options'));
            //    /* set pluging attribute */
            //    optionsFiltroProcessi.pageIndex += 1;
            //    /* re-store plugin attribute option */
            //    plugin.attr('data-options', JSON.stringify(optionsFiltroProcessi));

            //    plugin.find('input.pageIndex').val(optionsFiltroProcessi.pageIndex);

            //    /* raise event */
            //    $(this).trigger("next");
            //});
            //plugin.find('a.btn-prev').click(function (e) {
            //    /* get plugin attribute option */
            //    var optionsFiltroProcessi = JSON.parse(plugin.attr('data-options'));
            //    /* set pluging attribute */
            //    optionsFiltroProcessi.pageIndex -= 1;
            //    /* re-store plugin attribute option */
            //    plugin.attr('data-options', JSON.stringify(optionsFiltroProcessi));

            //    plugin.find('input.pageIndex').val(optionsFiltroProcessi.pageIndex);

            //    /* raise event */
            //    $(this).trigger("prev");
            //});
        };
        return plugin;
        //});
    };
}(jQuery));