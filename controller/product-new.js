$(function () {
    $(window).scroll(function () {
        if ($(window).scrollTop() + $(window).height() == $(document).height()) {
            $.ajax({
                url: "http://localhost:5000/product-new",
                type: "POST",
                data: {},
            }).done(function (response) {
                if (response.status == "ERR") {
                    var err = JSON.parse(response.error);
                    $('.pnl-errors').html(err.message);
                    $('.form-errors').show();
                    //console.log(err.name);
                    //console.log(err.stack);
                } else if (response.status == "OK") {
                    $.each(response.data, function (key, product) {

                        var partialBadge = '' +
                            '<h6 class="rounded" style="position:relative; width:52px !important; height:20px !important; padding:4px; padding-left:6px; margin-right:-32px; float:right; top:-26px; background-color:#5cb85c; color:#fff; text-align:center;">' +
                                'Novit&agrave;' +
                            '</h6>';

                        var partialPrezzo = '';
                        if (product.PercentualeSconto != '0.00') {
                            partialPrezzo = '' +
                                '<h3 style="color:#5cb85c;">&euro;&nbsp;' + product.PrezzoUnitarioScontato + '</h3>' +
                                '<h4>&euro;&nbsp; <span style="text-decoration: line-through;">' + product.PrezzoUnitario + '</span></h4>';
                        } else {
                            partialPrezzo = '<h3 style="color:#5cb85c;">&euro;&nbsp;' + product.PrezzoUnitario + '</h3><h4>&nbsp;</h4>';
                        }

                        var partialProduct = '' +
                        '<div class="col-lg-4 col-md-4 col-sm-6 col-xs-12">' +
                            '<div class="jumbotron" style="padding:20px; border:2px solid #5cb85c; background-color:#fff;">' +
                                '<div class="container-fluid">' +
                                    partialBadge +
                                    '<h3 class="glyphicon glyphicon-bookmark" style="position:absolute; left:30px; top:-25px; color:#5cb85c;"></h3>' +
                                    '<div class="col-lg-7 col-md-12">' +
                                        '<h4 class="text-info">' +
                                            '<a class="text-decoration-none" href="http://localhost:5000/productDetail/' + product.CodiceArticolo + '">' +
                                                '<b class="text-dark">' + product.Denominazione + '</b>' +
                                            '</a>' +
                                        '</h4>' +
                                        '<h6 class="text-muted">Articolo (' + product.QuantitaPacco + ' unit&agrave;)</h6>' +
                                        '<h6 class="text-muted">Confezione (' + product.QuantitaBox + ' unit&agrave;)</h6>' +
                                    '</div>' +
                                    '<div class="col-lg-5 col-md-12">' +
                                        '<a href="http://localhost:5000/productDetail/' + product.CodiceArticolo + '" style="color:#333;">' +
                                            '<img src="https://ik.imagekit.io/dccasa/FOTODC_AGENTI/' + product.CodiceArticolo + '.jpg" style="width:177px !important; height:177px !important;" class="img-thumbnail" />' +
                                        '</a>' +
                                    '</div>' +
                                    '<div class="col-lg-12 col-md-12 col-sm-12">' +
                                        partialPrezzo +
                                    '</div>' +
                                    '<hr style="border: 1px solid #c1c1c1;" />' +
                                    '<div class="col-lg-12 col-md-12 col-sm-12">' +
                                        '<h6>' +
                                            '<a class="btn btn-default btn-sm" href="http://localhost:5000/cart" data-toggle="tooltip" data-placement="top" title="Rimuovi dal Carrello">' +
                                                '<span class="glyphicon glyphicon-minus"></span>' +
                                            '</a>' +
                                            '<a class="btn btn-default btn-sm" style="cursor:default; padding: 5px; width: calc(53% - 10px);">' +
                                                '<b><span class="glyphicon glyphicon-shopping-cart"></span> Articolo</b>' +
                                            '</a>' +
                                            '<a class="btn btn-default btn-sm" href="http://localhost:5000/cart" data-toggle="tooltip" data-placement="top" title="Aggiungi al Carrello">' +
                                                '<span class="glyphicon glyphicon-plus"></span>' +
                                            '</a>' +
                                        '</h6>' +
                                        '<h6>' +
                                            '<a class="btn btn-default btn-sm" href="http://localhost:5000/cart" data-toggle="tooltip" data-placement="top" title="Rimuovi dal Carrello">' +
                                                '<span class="glyphicon glyphicon-minus"></span>' +
                                            '</a>' +
                                            '<a class="btn btn-default btn-sm" style="cursor:default; padding: 5px; width: calc(53% - 10px);">' +
                                                '<b><span class="glyphicon glyphicon-shopping-cart"></span> Confezione</b>' +
                                            '</a>' +
                                            '<a class="btn btn-default btn-sm" href="http://localhost:5000/cart" data-toggle="tooltip" data-placement="top" title="Aggiungi al Carrello">' +
                                                '<span class="glyphicon glyphicon-plus"></span>' +
                                            '</a>' +
                                        '</h6>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>';
                        $('.data-container').append(partialProduct);
                    });
                }
            }).fail(function (xhr, status, errorThrown) {
            }).always(function (xhr, status) {

            });
        }
    });
});