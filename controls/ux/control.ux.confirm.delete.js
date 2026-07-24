(function ($) {
    $.fn.confirmDelete = function (myoptions) {

        let optionsConfirmDelete = $.extend({
            LanguageContext: null,
            args: null,
            onconfirm: null,
            oncancel: null,
        }, myoptions);

        var plugin = $(this);

        $.fn.confirmDelete.show = function (plugin) {
            plugin.find('.modal-confirm-delete').modal('show');
        }
        $.fn.confirmDelete.hide = function (plugin) {
            plugin.find('.modal-confirm-delete').modal('hide');
        }
        $.fn.confirmDelete.draw = function (plugin) {
            var optionConfirmDelete = JSON.parse(plugin.attr('data-options'));
        };

        /* initialize plugin instance */
        plugin.attr('data-options', JSON.stringify(optionsConfirmDelete));

        /* load plugin template */
        $.get("/controls/ui/control.ui.confirm.delete.ejs?" + Date.now(), function (response) {
            /* render plugin template */
            renderTemplate(response);
        });
        function renderTemplate(templateString) {

            var optionConfirmDelete = JSON.parse(plugin.attr('data-options'));

            var LanguageContext = optionConfirmDelete.LanguageContext;

            /* render plugin template */
            var partialToRender = ejs.render(templateString, { LanguageContext });

            /* fill plugin template */
            plugin.html(partialToRender);

            plugin.confirmDelete.draw(plugin);

            /* raise plugin event */
            plugin.find('a.btn-ok-delete').click(function (e) {

                /* raise event */
                $(this).trigger("onconfirm");
            });
            plugin.find('a.btn-cancel-delete').click(function (e) {

                /* raise event */
                $(this).trigger("oncancel");
            });
        };

        return plugin;

    };
}(jQuery));