$(function () {
    laodMenuChild = function (IdProcesso, templateMenuParentString, templateMenuChildString) {
        try {
            return $.ajax({
                url: "/menu-child/" + IdProcesso,
                type: "GET",
                data: {},
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(
                        response.error.message,
                        response.error.sender
                    );
                } else if (response.status == "OK") {
                    response.data;
                }
            }).fail(function (xhr, status, errorThrown) {
            }).always(function (xhr, status) {

            });
        } catch (err) {
            ShowError(err);
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

            if (response.data.length == 1) {
                var childmenu = response.data[0];
                $('#dropdown-' + IDProcesso).append('<ul class="dropdown-menu dropdown-menu-' + IDProcesso + '"></ul>');
                if (eval(childmenu.CountChildProcess) > 0) {
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
                $.each(response.data, function (key, childmenu) {
                    if (eval(childmenu.CountChildProcess) > 0) {
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
                        response.error.message,
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