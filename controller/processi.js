$(function () {
    function getMenuErrorMessage(error) {
        if (error && typeof error === 'object') {
            return error.message || JSON.stringify(error);
        }
        if (typeof error === 'string') {
            try {
                var parsedError = JSON.parse(error);
                return parsedError.message || error;
            } catch (parseError) {
                return error;
            }
        }
        return 'Impossibile caricare il menu.';
    }

    laodMenuChild = function (IdProcesso, templateMenuParentString, templateMenuChildString) {
        try {
            return $.ajax({
                url: "/menu-child/" + IdProcesso,
                type: "GET",
                data: {},
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(
                        getMenuErrorMessage(response.error),
                        response.error.sender
                    );
                    response.data = [];
                } else if (response.status != "OK" || !Array.isArray(response.data)) {
                    ShowError('Risposta non valida durante il caricamento del menu.', 'laodMenuChild');
                    response.data = [];
                }
            }).fail(function (xhr, status, errorThrown) {
                ShowError(xhr.responseText || errorThrown || 'Impossibile caricare il menu.', 'laodMenuChild');
            }).always(function (xhr, status) {
            });
        } catch (err) {
            ShowError(getMenuErrorMessage(err), 'laodMenuChild');
        }
    }
    loadMenuEach = function (childmenu, templateMenu, templateMenuParentString, templateMenuChildString, firstInit) {
        var IDProcesso;
        if (firstInit) {
            var menu = childmenu;
            IDProcesso = menu.IDProcesso;
            $('.tempMenu').append(
                ejs.render(templateMenu, { menu })
            );
        } else {
            IDProcesso = childmenu.IDProcesso;
            $('.tempMenu').append(
                ejs.render(templateMenu, { childmenu })
            );
        }
        $.when(
            laodMenuChild(IDProcesso, templateMenuParentString, templateMenuChildString)
        ).then(function (response, textStatus, jqXHR) {
            var childProcesses = response && Array.isArray(response.data)
                ? response.data
                : [];
            if (childProcesses.length === 0) {
                if (firstInit) {
                    $('.menu').append($('.tempMenu').html());
                }
                $('.tempMenu').empty();
                return;
            }

            if (childProcesses.length == 1) {
                var childmenu = childProcesses[0];
                $('#dropdown-' + IDProcesso).append('<ul class="dropdown-menu dropdown-menu-' + IDProcesso + '"></ul>');
                if (childmenu.IsProcess && childmenu.IDModello != null && childmenu.IDVersione != null) {
                    childmenu.PageUrl = 'dynamic-forms/' + childmenu.IDProcesso;
                    templateMenu = templateMenuChildString;
                    $('.dropdown-menu-' + IDProcesso).append(
                        ejs.render(templateMenuChildString, { childmenu })
                    );
                } else if (eval(childmenu.CountChildProcess) > 0) {
                    templateMenu = templateMenuParentString;
                    $('.dropdown-menu-' + IDProcesso).append(
                        ejs.render(templateMenuParentString, { childmenu })
                    );
                } else {
                    templateMenu = templateMenuChildString;
                    $('.dropdown-menu-' + IDProcesso).append(
                        ejs.render(templateMenuChildString, { childmenu })
                    );
                }
                if (firstInit) {
                    $('.menu').append(
                        $('.tempMenu').html()
                    )
                    firstInit = false;
                    loadMenuEach(childmenu, templateMenu, templateMenuParentString, templateMenuChildString, firstInit);
                }
                $('.tempMenu').empty();

                
            } else {
                $('#dropdown-' + IDProcesso).append('<ul class="dropdown-menu dropdown-menu-' + IDProcesso + '"></ul>');
                $.each(childProcesses, function (key, childmenu) {
                    if (childmenu.IsProcess && childmenu.IDModello != null && childmenu.IDVersione != null) {
                        childmenu.PageUrl = 'dynamic-forms/' + childmenu.IDProcesso;
                        templateMenu = templateMenuChildString;
                        $('.dropdown-menu-' + IDProcesso).append(
                            ejs.render(templateMenuChildString, { childmenu })
                        );
                    } else if (eval(childmenu.CountChildProcess) > 0) {
                        templateMenu = templateMenuParentString;
                        $('.dropdown-menu-' + IDProcesso).append(
                            ejs.render(templateMenuParentString, { childmenu })
                        );
                    } else {
                        templateMenu = templateMenuChildString;
                        $('.dropdown-menu-' + IDProcesso).append(
                            ejs.render(templateMenuChildString, { childmenu })
                        );
                    }
                    if (firstInit) {
                        $('.menu').append(
                            $('.tempMenu').html()
                        );
                        firstInit = false;
                        loadMenuEach(childmenu, templateMenu, templateMenuParentString, templateMenuChildString, firstInit);
                    } else {
                        loadMenuEach(childmenu, templateMenu, templateMenuParentString, templateMenuChildString, false);
                    }
                    $('.tempMenu').empty();
                });
            }

        })
    }
    laodMenu = function () {
        try {
            $.ajax({
                url: "/menu",
                type: "GET",
                data: {},
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(
                        getMenuErrorMessage(response.error),
                        response.error.sender
                    );
                } else if (response.status == "OK") {
                    $.when(
                        $.get("../template/menu-header.ejs?" + Date.now(),
                            function (templateMenuHeaderString) {
                            })
                    ).then(function (templateMenuHeaderString, textStatus, jqXHR) {
                        $.when(
                            $.get("../template/menu-parent.ejs?" + Date.now(),
                                function (templateMenuParentString) {
                                })
                        ).then(function (templateMenuParentString, textStatus, jqXHR) {
                            $.when(
                                $.get("../template/menu-child.ejs?" + Date.now(),
                                    function (templateMenuChildString) {
                                    })
                            ).then(function (templateMenuChildString, textStatus, jqXHR) {
                                /* Per ogni menu principale */
                                $.each(response.data, function (key, menu) {
                                    //console.log("IDProcesso Header: " + menu.IDProcesso)
                                    loadMenuEach(menu, templateMenuHeaderString, templateMenuParentString, templateMenuChildString, true);
                                });
                            });
                        });
                    });

                }
            }).fail(function (xhr, status, errorThrown) {
            }).always(function (xhr, status) {

            });
        } catch (err) {
            ShowError(err);
        }
    };
    laodMenu();
});