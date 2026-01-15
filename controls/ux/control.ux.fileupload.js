(function ($) {
    $.fn.fileupload = function (options) {

        var options = $.extend({
            user: null,
            filelist: null,
            onupload: null,
            ondelete: null,
            filetodelete: null
        }, options);

        var plugin = $(this);

        $.fn.fileupload.draw = function () {

            var options = JSON.parse(plugin.attr('data-options'));
            //plugin.find('label.totalPage').html(options.totalPage);
        };
        $.fn.fileupload.DeleteFile = function (FileToDelete) {

            /* get plugin attribute option */
            var options = JSON.parse(plugin.attr('data-options'));

            var filelist = "";

            /* set pluging attribute */
            if (options.filelist.substring(1).indexOf('@') == -1) {
                options.filelist = '';
            } else {
                jQuery.each(options.filelist.substring(1).split('@'), function (i, fileString) {
                    if (fileString.indexOf(FileToDelete.data('id')) == -1) {
                        filelist += '@' + fileString;
                    }
                });
                options.filelist = filelist;
            }
            /* set file list to delete */
            options.filetodelete += '@' + FileToDelete.data('id');
            /* re-store plugin attribute option */
            plugin.attr('data-options', JSON.stringify(options));
            /* remove file from client list */
            plugin.find('#' + FileToDelete.data('id')).remove();
            /* raise event */
            plugin.trigger("ondelete");
        };

        return this.each(function () {

            /* initialize plugin instance */
            plugin.attr('data-options', JSON.stringify(options));

            plugin.html($.fn.fileupload.draw());

            /* load plugin template */
            $.get("/controls/ui/control.ui.fileupload.ejs", function (response) {
                var options = JSON.parse(plugin.attr('data-options'));
                var user = options.user
                /* render plugin template */
                var partialToRender = ejs.render(response, { user });
                renderTemplate(partialToRender);
            });
            function renderTemplate(response) {

                /* fill plugin template */
                plugin.html($(response).html());

                var options = JSON.parse(plugin.attr('data-options'));

                /* Precaricamento file */
                if (options.filelist != "") {
                    jQuery.each(options.filelist.substring(1).split('@'), function (i, fileString) {
                        var file = JSON.parse(fileString)
                        plugin.find('.file-container').append(
                            '<div id="' + file.newFilename + '" class="col-xs-12 p-0 mb-0"><i data-id="' + file.newFilename + '" data-file="' + file.newFilename + '" class="btn px-3 bi bi-trash delete-file-' + file.newFilename + '"></i><a target="_blank" href="/files/' + file.newFilename + '.' + file.fileExtension + '">' + file.originalFilename + '</a></div>'
                        );
                        plugin.find('.delete-file-' + file.newFilename).click(function () {
                            plugin.fileupload.DeleteFile($(this))
                        });
                    });
                }

                plugin.fileupload.draw();

                /* raise plugin event */
                plugin.find('#filetoupload').change(function (e) {
                    if (this.files[0] != undefined) {
                        filename = this.files[0].name;
                        plugin.find("#labelfiletoupload").html(filename);

                        /* get plugin attribute option */
                        var options = JSON.parse(plugin.attr('data-options'));

                        var data = new FormData();
                        jQuery.each(plugin.find('#filetoupload')[0].files, function (i, file) {
                            data.append('file-' + i, file);
                        });
                        $.ajax({
                            url: "/fileupload",
                            type: "POST",
                            data: data,
                            processData: false,
                            contentType: false,
                            timeout: 600000,
                            success: function (response) {
                                var file = JSON.parse(response.data);
                                console.log(file);
                                if (response.status == "ERR") {
                                    ShowError(
                                        response.error,
                                    );
                                } else {
                                    plugin.find('.file-container').append(
                                        '<div id="' + file.newFilename + '" class="col-xs-12 p-0 mb-0"><i data-id="' + file.newFilename + '" data-file="' + file.newFilename + '" class="btn px-3 bi bi-trash delete-file-' + file.newFilename + '"></i><a target="_blank" href="/files/' + file.newFilename + '.' + file.fileExtension + '">' + file.originalFilename + '</a></div>'
                                    );
                                    plugin.find('.delete-file-' + file.newFilename).click(function () {
                                        plugin.fileupload.DeleteFile($(this))
                                    });
                                    /* get plugin attribute option */
                                    var options = JSON.parse(plugin.attr('data-options'));
                                    /* set pluging attribute */
                                    if (options.filelist != null) {
                                        options.filelist += '@' + response.data;
                                    } else {
                                        options.filelist = '@' + response.data;
                                    }
                                    //console.log("options.filelist: " + options.filelist);
                                    /* re-store plugin attribute option */
                                    plugin.attr('data-options', JSON.stringify(options));

                                    plugin.find("#labelfiletoupload").html(
                                        plugin.find("#labelfiletoupload").data("default")
                                    );

                                    /* raise event */
                                    plugin.trigger("onupload");
                                }


                            },
                            error: function (e) {
                                console.log(e.responseText);
                            }
                        });
                    }
                });
            };
            return plugin;
        });
    };
}(jQuery));