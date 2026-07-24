$(function () {

    let cy;

    $("#toolbar .btn").on("click", function () {

        $("#toolbar .btn").removeClass("btn-primary")
            .addClass("btn-dark");

        $(this).removeClass("btn-dark")
            .addClass("btn-primary");

    });

    /* inizializza il controllo processi */
    var ControlProcessi = $('#processi-container');

    /* Imposta le proprietà di default del plug-in <Pager> */
    ControlProcessi.processi({
    });

    ControlProcessi.bind(
        "onselect", function () {

            /* Imposta le proprietà di default del plug-in */
            ControlWorkflowNodeStates.workflowNodeStates({
                IdProcesso: JSON.parse(ControlProcessi.attr('data-options')).IDProcesso,
                IdEventoTransizione: null,
                LanguageContext: $('#LanguageContext').val()
            });
    });

    /* Registra l'evento {onselect} per caricare la lista delle autorizzazioni */
    ControlProcessi.bind(
        "onworkflow", function () {

            $.when(
                initializeWorkflow(
                    JSON.parse(ControlProcessi.attr('data-options')).IDProcesso
                )
            ).then(function () {
                $('#container-workflow').modal('show');
            });
    });

    /* Renderizza il plug-in <processi> */
    ControlProcessi.processi.load();


    $('.btn-cancel-context-menu-node').click(function () {
        $('#context-menu-node').hide();
    });

    /* initialize il controllo <confirm-delete-workflow-link> */
    var CtlDeleteLink = $('#container-confirm-delete-workflow-link');

    /* Imposta le proprietà di default del plug-in */
    CtlDeleteLink.confirmDelete({
        LanguageContext: $('#LanguageContext').val(),
    });

    /* Registra l'evento {onconfirm} del plug-in */
    CtlDeleteLink.bind("onconfirm", function () {

        var option = JSON.parse(CtlDeleteLink.attr('data-options'));

        $.when(
            deleteWorkflowLink(option.args.IdEventoTransizione)
        ).then(function () {
            $('#context-menu-link').hide();
            CtlDeleteLink.confirmDelete.hide(CtlDeleteLink);
        });
    });

    /* initialize il controllo <confirm-delete-workflow-state> */
    var CtlDeleteState = $('#container-confirm-delete-workflow-state');

    /* Imposta le proprietà di default del plug-in */
    CtlDeleteState.confirmDelete({
        LanguageContext: $('#LanguageContext').val(),
    });

    /* Registra l'evento {onconfirm} del plug-in */
    CtlDeleteState.bind("onconfirm", function () {

        var option = JSON.parse(CtlDeleteState.attr('data-options'));

        $.when(
            deleteWorkflowState(option.args.IdEventoTransizione)
        ).then(function () {
            $('#context-menu-node').hide();
            CtlDeleteState.confirmDelete.hide(CtlDeleteState);
        });
    });

    /* Evento click che elimina uno stato selezionato */
    $('.workflow-del-node').click(function () {
        /* get plugin attribute option */
        var option = JSON.parse(CtlDeleteState.attr('data-options'));
        /* set plugin args option */
        option.args = { IdEventoTransizione: $('#context-menu-node').find('#IdEventoTransizione').val() };
        /* re-store plugin attribute option */
        CtlDeleteState.attr('data-options', JSON.stringify(option));
        /* open plugin */
        CtlDeleteState.confirmDelete.show(CtlDeleteState);
    });

    /* Evento click che elimina il collegamento di uno stato */
    $('.workflow-del-link').click(function () {
        /* get plugin attribute option */
        var option = JSON.parse(CtlDeleteLink.attr('data-options'));
        /* set plugin args option */
        option.args = { IDEventoDirezione: $('#context-menu-link').find('#IDEventoDirezione').val() };
        /* re-store plugin attribute option */
        CtlDeleteLink.attr('data-options', JSON.stringify(option));
        /* open plugin */
        CtlDeleteLink.confirmDelete.show(CtlDeleteLink);
    });

    $(".container-control-culture-textbox-codice").multiLanguageTextBox({
        Title: '',
        Label: $('LabelCodice').html(),
        Id: 'Codice',
        LanguageContext: $('#LanguageContext').val(),
        languages: [
            { code: "IT", title: "Italiano" },
            { code: "GB", title: "English" },
            { code: "ES", title: "Spain" },
            { code: "CN", title: "Cinese" }

        ]
    });

    $(".container-control-culture-textbox-descrizione").multiLanguageTextBox({
        Title: '',
        Label: $('LabelDescrizione').html(),
        Id: 'Descrizione',
        LanguageContext: $('#LanguageContext').val(),
        languages: [
            { code: "IT", title: "Italiano" },
            { code: "GB", title: "English" },
            { code: "ES", title: "Spain" },
            { code: "CN", title: "Cinese" }
        ]
    });

    /* Evento click che modifica il collegamento di uno stato */
    $('.workflow-set-link').click(function () {
        $('.container-workflow-set-link-header').html(
            $('#context-menu-link').find('#DescDirezione').val()
        );
        $('#container-workflow-set-link').modal('show');

        var transition = JSON.parse($('#context-menu-link').find('.transition').val());

        $('#rb-is-available-note').prop('checked', transition.IsAvailableNote);
        $('#rb-required-confirmation').prop('checked', transition.RequiredConfirmation);

        $(".container-control-culture-textbox-codice").multiLanguageTextBox("option", "Title",
            $('#context-menu-link').find('#DescDirezione').val());
        $(".container-control-culture-textbox-codice").multiLanguageTextBox("load", {
            IT: transition.Code_IT,
            GB: transition.Code_GB,
            ES: transition.Code_ES,
            CN: transition.Code_CN
        });

        $(".container-control-culture-textbox-descrizione").multiLanguageTextBox("option", "Title",
            $('#context-menu-link').find('#DescDirezione').val());
        $(".container-control-culture-textbox-descrizione").multiLanguageTextBox("load", {
            Title: $('#context-menu-link').find('#DescDirezione').val(),
            IT: transition.Text_IT,
            GB: transition.Text_GB,
            ES: transition.Text_ES,
            CN: transition.Text_CN
        });

    });

    $('.btn-cancel-context-menu-link').click(function () {
        $('#context-menu-link').hide();
    });
    /* Imposta l'owner dello stato selezionato */
    $('.workflow-set-owner').click(function () {

        loadNodeWorkflowOwner(JSON.parse(ControlProcessi.attr('data-options')).IDProcesso)
    });

    $('.btn-workflow-states-new').click(function () {

        newNodeWorkflow(JSON.parse(ControlProcessi.attr('data-options')).IDProcesso);

        var ControlWorkflowNodeLink = $('.control-workflow-node-link');
        ControlWorkflowNodeLink.workflowNodeStates.clear(ControlWorkflowNodeLink);
        ControlWorkflowNodeLink.workflowNodeStates.loadStates(ControlWorkflowNodeLink);
    });

    /* Imposta le autorizzazioni dello stato selezionato */
    $('.workflow-set-auth').click(function () {
        //==========================================
        // Imposta il title del container
        //==========================================
        $('.container-workflow-set-auth-header').html(
            $('#context-menu-node').find('#DescTransizione').val()
        );
        ControlAuthGruppiOperativi.gruppioperativi.clear(ControlAuthGruppiOperativi);
        ControlAuthProfiliUtente.profiliutente.clear(ControlAuthProfiliUtente);
        ControlAuthProcessiAzioni.processiazioni.clear(ControlAuthProcessiAzioni);
        ControlAuthGruppiOperativi.gruppioperativi.load(ControlAuthGruppiOperativi, 0);
        $('#container-workflow-set-auth').modal('show');
    });
    $('.workflow-set-rel').click(function () {
        var ControlWorkflowNodeLink = $('.control-workflow-node-link');
        ControlWorkflowNodeLink.workflowNodeStates.clear(ControlWorkflowNodeLink);
        $('.container-workflow-node-link-header').html(
            $('#context-menu-node').find('#DescTransizione').val()
        )
        $('#container-workflow-node-link').modal('show');
    });
    $('.workflow-set-node').click(function () {

        var transition = JSON.parse($('#context-menu-node').find('.node').val());

        $(".container-control-workflow-set-node-codice").multiLanguageTextBox({
            Title: '',
            Label: $('LabelCodice').html(),
            Id: 'CodiceNode',
            LanguageContext: $('#LanguageContext').val(),
            languages: [
                { code: "IT", title: "Italiano" },
                { code: "GB", title: "English" },
                { code: "ES", title: "Spain" },
                { code: "CN", title: "Cinese" }

            ]
        });

        $(".container-control-workflow-set-node-codice").multiLanguageTextBox("option", "Title",
            $('#context-menu-node').find('#DescTransizione').val());
        $(".container-control-workflow-set-node-codice").multiLanguageTextBox("load", {
            IT: transition.Code_IT,
            GB: transition.Code_GB,
            ES: transition.Code_ES,
            CN: transition.Code_CN
        });

        $(".container-control-workflow-set-node-descrizione").multiLanguageTextBox({
            Title: '',
            Label: $('LabelDescrizione').html(),
            Id: 'DescrizioneNode',
            LanguageContext: $('#LanguageContext').val(),
            languages: [
                { code: "IT", title: "Italiano" },
                { code: "GB", title: "English" },
                { code: "ES", title: "Spain" },
                { code: "CN", title: "Cinese" }
            ]
        });

        $(".container-control-workflow-set-node-descrizione").multiLanguageTextBox("option", "Title",
            $('#context-menu-node').find('#DescTransizione').val());
        $(".container-control-workflow-set-node-descrizione").multiLanguageTextBox("load", {
            IT: transition.Text_IT,
            GB: transition.Text_GB,
            ES: transition.Text_ES,
            CN: transition.Text_CN
        });


        $('.container-workflow-set-node-header').html(
            $('#context-menu-node').find('#DescTransizione').val()
        )
        $('#container-workflow-set-node').modal('show');
    });

    $('.bi-gear-is-admin-ownwer-selected-node').click(function () {

        var plugin = $('.control-workflow-node-states');

        /* get plugin attribute options */
        var options = JSON.parse(plugin.attr('data-options'));
        options.Sender = 'bi-gear-is-admin-ownwer-selected-node';

        if ($('#IsAdminOwnerSelectedNode_Id').val() != "") {
            options.SelectedState = $('#IsAdminOwnerSelectedNode_Id').val();
        } else {
            options.SelectedState = null;
        }

        /* re-store plugin attribute option */
        plugin.attr('data-options', JSON.stringify(options));

        plugin.workflowNodeStates.loadStates(plugin);

        $('#container-workflow-node-states').modal('show');
    });
    $('.bi-gear-is-ownwer-selected-node').click(function () {

        var plugin = $('.control-workflow-node-states');

        /* get plugin attribute options */
        var options = JSON.parse(plugin.attr('data-options'));
        options.Sender = 'bi-gear-is-ownwer-selected-node';

        if ($('#IsOwnerSelectedNode_Id').val() != "") {
            options.SelectedState = $('#IsOwnerSelectedNode_Id').val();
        } else {
            options.SelectedState = null;
        }

        /* re-store plugin attribute option */
        plugin.attr('data-options', JSON.stringify(options));

        plugin.workflowNodeStates.loadStates(plugin);

        $('#container-workflow-node-states').modal('show');
    });
    $('.bi-gear-is-creator-selected-node').click(function () {

        var plugin = $('.control-workflow-node-states');

        /* get plugin attribute options */
        var options = JSON.parse(plugin.attr('data-options'));
        options.Sender = 'bi-gear-is-creator-selected-node';

        if ($('#IsCreatorSelectedNode_Id').val() != "") {
            options.SelectedState = $('#IsCreatorSelectedNode_Id').val();
        } else {
            options.SelectedState = null;
        }

        /* re-store plugin attribute option */
        plugin.attr('data-options', JSON.stringify(options));

        plugin.workflowNodeStates.loadStates(plugin);

        $('#container-workflow-node-states').modal('show');
    });
    $('.bi-gear-is-selected-profile').click(function () {

        //var plugin = $('.control-workflow-node-states');

        /* get plugin attribute options */
        //var options = JSON.parse(plugin.attr('data-options'));
        //options.Sender = 'bi-gear-is-creator-selected-node';

        //if ($('#IsCreatorSelectedNode_Id').val() != "") {
        //    options.SelectedState = $('#IsCreatorSelectedNode_Id').val();
        //} else {
        //    options.SelectedState = null;
        //}

        ///* re-store plugin attribute option */
        //plugin.attr('data-options', JSON.stringify(options));

        //plugin.workflowNodeStates.loadStates(plugin);

        /* Initialize gruppi-operativi */
        ControlGruppiOperativi.gruppioperativi.clear(ControlGruppiOperativi);
        ControlProfiliUtente.profiliutente.clear(ControlProfiliUtente);
        ControlGruppiOperativi.gruppioperativi.load(ControlGruppiOperativi, 0);

        $('#container-workflow-set-profilo-utente').modal('show');


    });

    $('.btn-confirm-container-workflow-set-node').click(function () {

        /* Questa funzione modifica la descrizione del nodo selezionato */

        var IdEventoTransizione = $('#context-menu-node').find('#IdEventoTransizione').val();
        const CtlTxtCodice = $(".container-control-workflow-set-node-codice").data("mltextbox");
        const CtlTxtDescrizione = $(".container-control-workflow-set-node-descrizione").data("mltextbox");

        setNodeWorkflowState(
            IdEventoTransizione,
            CtlTxtCodice.value.IT,
            CtlTxtCodice.value.GB,
            CtlTxtCodice.value.ES,
            CtlTxtCodice.value.CN,
            CtlTxtDescrizione.value.IT,
            CtlTxtDescrizione.value.GB,
            CtlTxtDescrizione.value.ES,
            CtlTxtDescrizione.value.CN
        );

    });
    $('.btn-confirm-container-workflow-set-link').click(function () {
        
        /* Questa funzione conferma e imposta il collegamento selezionato */

        var IdEventoDirezione = $('#context-menu-link').find('#IDEventoDirezione').val();
        const CtlTxtCodice = $(".container-control-culture-textbox-codice").data("mltextbox");
        const CtlTxtDescrizione = $(".container-control-culture-textbox-descrizione").data("mltextbox");

        setNodeWorkflowLink(
            IdEventoDirezione,
            CtlTxtCodice.value.IT,
            CtlTxtCodice.value.GB,
            CtlTxtCodice.value.ES,
            CtlTxtCodice.value.CN,
            CtlTxtDescrizione.value.IT,
            CtlTxtDescrizione.value.GB,
            CtlTxtDescrizione.value.ES,
            CtlTxtDescrizione.value.CN,
            $('#rb-is-available-note').prop('checked'),
            $('#rb-required-confirmation').prop('checked')
        );

    });
    $('.btn-confirm-container-workflow-set-owner').click(function () {

        /* Questa funzione conferma e imposta l'owner selezionato */

        if ($('#container-workflow-set-owner').find('.form-check-input:checked').length == 0) {
            /* TODO: visualizza il messaggio di errore */

        } else {

            var IsCreator = $('#rb-IsCreator').prop('checked');
            var IsAdminOwnerSelectedNode = $('#rb-IsAdminOwnerSelectedNode').prop('checked');
            var IsAdminOfCreator = $('#rb-IsAdminOfCreator').prop('checked');
            var IsOwnerSelectedNode = $('#rb-IsOwnerSelectedNode').prop('checked');
            var IsCreatorSelectedNode = $('#rb-IsCreatorSelectedNode').prop('checked');
            var IsSelectedProfile = $('#rb-IsSelectedProfile').prop('checked');
            var IsUsersFromAdminProfileCreator = $('#rb-IsUsersFromAdminProfileCreator').prop('checked');


            if ($('#rb-IsAdminOwnerSelectedNode').prop('checked') &&
                $('#IsAdminOwnerSelectedNode_Id').val() == '') {
                /* TODO: visualizza il messaggio di errore */
                return false;
            } else {
                if ($('#rb-IsAdminOwnerSelectedNode').prop('checked') &&
                    $('#IsAdminOwnerSelectedNode_Id').val() != '') {
                    IsAdminOwnerSelectedNode = $('#IsAdminOwnerSelectedNode_Id').val();
                }
            }
            if ($('#rb-IsOwnerSelectedNode').prop('checked') &&
                $('#IsOwnerSelectedNode_Id').val() == '') {
                /* TODO: visualizza il messaggio di errore */
                return false;
            } else {
                if ($('#rb-IsOwnerSelectedNode').prop('checked') &&
                    $('#IsOwnerSelectedNode_Id').val() != '') {
                    IsOwnerSelectedNode = $('#IsOwnerSelectedNode_Id').val();
                }
            }
            if ($('#rb-IsCreatorSelectedNode').prop('checked') &&
                $('#IsCreatorSelectedNode_Id').val() == '') {
                /* TODO: visualizza il messaggio di errore */
                return false;
            } else {
                if ($('#rb-IsCreatorSelectedNode').prop('checked') &&
                    $('#IsCreatorSelectedNode_Id').val() != '') {
                    IsCreatorSelectedNode = $('#IsCreatorSelectedNode_Id').val();
                }
            }
            if ($('#rb-IsSelectedProfile').prop('checked') &&
                $('#IsSelectedProfile_Id').val() == '') {
                /* TODO: visualizza il messaggio di errore */
                return false;
            } else {
                if ($('#rb-IsSelectedProfile').prop('checked') &&
                    $('#IsSelectedProfile_Id').val() != '') {
                    IsSelectedProfile = $('#IsSelectedProfile_Id').val();
                }
            }

            setNodeWorkflowOwner(
                IsCreator,
                IsAdminOwnerSelectedNode,
                IsAdminOfCreator,
                IsOwnerSelectedNode,
                IsCreatorSelectedNode,
                IsSelectedProfile,
                IsUsersFromAdminProfileCreator,
            )
        }
    });
    $('#container-workflow-set-owner').find('.form-check-input').click(function () {
        clearNodeWorkflowOwner($(this));
    });
    loadNodeInfo = function () {
        try {

        }
        catch (err) {
            ShowError(err.message, "loadNodeInfo");
        }
    }
    deleteWorkflowLink = function (IdEventoDirezione) {
        try {
            $('.spinner-workflow').show();
            $.ajax({
                url: "/workflow-del-link/" + IdEventoDirezione,
                type: "DELETE",
                data: {},
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(response.error.message, response.error.sender);
                } else if (response.status == "OK") {

                    initializeWorkflow(JSON.parse(ControlProcessi.attr('data-options')).IDProcesso)
                }
                $('.spinner-workflow').hide();
            }).fail(function (xhr, status, errorThrown) {
                $('.spinner-workflow').hide();
                ShowError(errorThrown, "deleteWorkflowLink")
            });
        }
        catch (err) {
            ShowError(err.message, "deleteWorkflowLink");
        }
    }
    deleteWorkflowState = function (IdEventoTransizione) {
        try {
            $('.spinner-workflow').show();
            $.ajax({
                url: "/workflow-del-state/" + IdEventoTransizione,
                type: "DELETE",
                data: {},
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(response.error.message, response.error.sender);
                } else if (response.status == "OK") {

                    initializeWorkflow(JSON.parse(ControlProcessi.attr('data-options')).IDProcesso)
                }
                $('.spinner-workflow').hide();
            }).fail(function (xhr, status, errorThrown) {
                $('.spinner-workflow').hide();
                ShowError(errorThrown, "deleteWorkflowState")
            });
        }
        catch (err) {
            ShowError(err.message, "deleteWorkflowState");
        }
    }
    toggleAuthProcessoAzione = function (IdGruppoOperativo, IdProfiloUtente, IdProcesso, IdProcessoAzione, IdEventoTransizione, Toggled) {
        try {
            $.ajax({
                url: "/eventi-transizioni-azioni",
                type: "POST",
                data: {
                    IdGruppoOperativo: IdGruppoOperativo,
                    IdProfiloUtente: IdProfiloUtente,
                    IdProcesso: IdProcesso,
                    IdProcessoAzione: IdProcessoAzione,
                    IdEventoTransizione: IdEventoTransizione,
                    Toggled: Toggled
                }
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(
                        response.error.message,
                        response.error.sender
                    );
                } else if (response.status == "OK") {

                }
            }).fail(function (xhr, status, errorThrown) {
            }).always(function (xhr, status) {
            });
        }
        catch (err) {
            ShowError(err.message, "toggleAuthProcessoAzione");
        }
    }
    newNodeWorkflow = function (IdProcesso) {
        try {
            $('.spinner-workflow').show();
            $.ajax({
                url: "/workflow-new-node/" + IdProcesso,
                type: "POST",
                data: {},
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(response.error.message, response.error.sender);
                } else if (response.status == "OK") {

                    initializeWorkflow(JSON.parse(ControlProcessi.attr('data-options')).IDProcesso)
                }
                $('.spinner-workflow').hide();
            }).fail(function (xhr, status, errorThrown) {
                $('.spinner-workflow').hide();
                ShowError(errorThrown, "updateNodePosition")
            });
        }
        catch (err) {
            ShowError(err.message, "newNodeWorkflow");
        }
    }
    linkNodeWorkflow = function (IdTransizioneEnd) {
        try {
            $('.spinner-workflow').show();
            $.ajax({
                url: "/workflow-link-node",
                type: "POST",
                data: {
                    IdTransizioneStart: $('#context-menu-node').find('#IdEventoTransizione').val(),
                    IdTransizioneEnd: IdTransizioneEnd 
                },
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(response.error.message, response.error.sender);
                } else if (response.status == "OK") {
                    $('#container-workflow-node-link').modal('hide');
                    $('#context-menu-node').hide();
                    initializeWorkflow(JSON.parse(ControlProcessi.attr('data-options')).IDProcesso);
                }
                $('.spinner-workflow').hide();
            }).fail(function (xhr, status, errorThrown) {
                $('.spinner-workflow').hide();
                ShowError(errorThrown, "updateNodePosition")
            });
        }
        catch (err) {
            ShowError(err.message, "newNodeWorkflow");
        }
    }
    setNodeWorkflowState = function (IdEventoTransizione, Code_IT, Code_GB, Code_ES, Code_CN, Text_IT, Text_GB, Text_ES, Text_CN) {
        try {
            $('.spinner-workflow-set-node').show();

            $.ajax({
                url: "/workflow-node-set/" + IdEventoTransizione,
                type: "PUT",
                data: {
                    Code_IT: Code_IT,
                    Code_GB: Code_GB,
                    Code_ES: Code_ES,
                    Code_CN: Code_CN,
                    Text_IT: Text_IT,
                    Text_GB: Text_GB,
                    Text_ES: Text_ES,
                    Text_CN: Text_CN,
                },
            }).done(function (response) {

                if (response.status == "ERR") {
                    $('.spinner-workflow-set-node').hide();
                    ShowError(response.error.message, response.error.sender);

                } else if (response.status == "OK") {
                    $('.spinner-workflow-set-node').hide();
                    $('#container-workflow-set-node').modal('hide');
                    $('#context-menu-node').hide();
                    ControlWorkflowNodeLink.workflowNodeStates.clear(ControlWorkflowNodeLink);
                    ControlWorkflowNodeLink.workflowNodeStates.loadStates(ControlWorkflowNodeLink);
                    initializeWorkflow(JSON.parse(ControlProcessi.attr('data-options')).IDProcesso);
                }
            }).fail(function (xhr, status, errorThrown) {
                $('.spinner-workflow-set-node').hide();
                ShowError(errorThrown, "setNodeWorkflowState")
            });
        }
        catch (err) {
            ShowError(err.message, "setNodeWorkflowState");
        }
    }
    setNodeWorkflowLink = function (IdEventoDirezione, Code_IT, Code_GB, Code_ES, Code_CN, Text_IT, Text_GB, Text_ES, Text_CN, IsAvailableNote, RequiredConfirmation) {
        try {
            $('.spinner-node-workflow-link').show();

            $.ajax({
                url: "/workflow-node-link/" + IdEventoDirezione,
                type: "POST",
                data: {
                    Code_IT: Code_IT,
                    Code_GB: Code_GB,
                    Code_ES: Code_ES,
                    Code_CN: Code_CN,
                    Text_IT: Text_IT,
                    Text_GB: Text_GB,
                    Text_ES: Text_ES,
                    Text_CN: Text_CN,
                    IsAvailableNote: IsAvailableNote,
                    RequiredConfirmation: RequiredConfirmation
                },
            }).done(function (response) {

                if (response.status == "ERR") {
                    $('.spinner-node-workflow-link').hide();
                    ShowError(response.error.message, response.error.sender);

                } else if (response.status == "OK") {
                    $('.spinner-node-workflow-link').hide();
                    $('#container-workflow-set-link').modal('hide');
                    $('#context-menu-link').hide();

                    initializeWorkflow(JSON.parse(ControlProcessi.attr('data-options')).IDProcesso);
                }
            }).fail(function (xhr, status, errorThrown) {
                $('.spinner-node-workflow-link').hide();
                ShowError(errorThrown, "setNodeWorkflowLink")
            });
        }
        catch (err) {
            ShowError(err.message, "setNodeWorkflowLink");
        }
    }
    setNodeWorkflowOwner = function (
        IsCreator,
        IsAdminOwnerSelectedNode,
        IsAdminOfCreator,
        IsOwnerSelectedNode,
        IsCreatorSelectedNode,
        IsSelectedProfile,
        IsUsersFromAdminProfileCreator,
        IdEventoTransizione
    ) {
        try {
            $('.spinner-node-workflow-owner').show();

            $.ajax({
                url: "/workflow-node-owner/" + $('#context-menu-node').find('#IdEventoTransizione').val(),
                type: "POST",
                data: {
                    IsCreator: IsCreator,
                    IsAdminOwnerSelectedNode: IsAdminOwnerSelectedNode,
                    IsAdminOfCreator: IsAdminOfCreator,
                    IsOwnerSelectedNode: IsOwnerSelectedNode,
                    IsCreatorSelectedNode: IsCreatorSelectedNode,
                    IsSelectedProfile: IsSelectedProfile,
                    IsUsersFromAdminProfileCreator: IsUsersFromAdminProfileCreator,
                    IdEventoTransizione: IdEventoTransizione,
                },
            }).done(function (response) {

                if (response.status == "ERR") {
                    $('.spinner-node-workflow-owner').hide();
                    ShowError(response.error.message, response.error.sender);

                } else if (response.status == "OK") {
                    $('.spinner-node-workflow-owner').hide();
                    $('#container-workflow-set-owner').modal('hide');
                    $('#context-menu-node').hide();

                    initializeWorkflow(JSON.parse(ControlProcessi.attr('data-options')).IDProcesso);
                }
            }).fail(function (xhr, status, errorThrown) {
                $('.spinner-node-workflow-owner').hide();
                ShowError(errorThrown, "setNodeWorkflowOwner")
            });
        }
        catch (err) {
            ShowError(err.message, "setNodeWorkflowOwner");
        }
    }
    clearNodeWorkflowOwner = function (sender) {
        try {
            if (sender != null && sender.prop('checked')) {
                $('#container-workflow-set-owner').find('.form-check-input').prop('checked', false);
                sender.prop('checked', true);
            } else {
                $('#container-workflow-set-owner').find('.form-check-input').prop('checked', false);
            }
            $('#IsOwnerSelectedNode_Id').val('');
            $('#IsOwnerSelectedNode_Desc').empty();
            $('#IsAdminOwnerSelectedNode_Id').val('');
            $('#IsAdminOwnerSelectedNode_Desc').empty();
            $('#IsCreatorSelectedNode_Id').val('');
            $('#IsCreatorSelectedNode_Desc').empty();
            $('#IsSelectedProfile_Id').val('');
            $('#IsSelectedProfile_Desc').empty();
        }
        catch (err) {
            ShowError(err.message, "clearNodeWorkflowOwner");
        }
    }
    loadNodeWorkflowOwner = function () {

        $('.spinner-node-workflow-owner').show();

        try {
            //==========================================
            // Imposta il title del container
            //==========================================
            $('.container-workflow-set-owner-header').html(
                $('#context-menu-node').find('#DescTransizione').val()
            );

            $.ajax({
                url: "/workflow-node-owner/" + $('#context-menu-node').find('#IdEventoTransizione').val(),
                type: "GET",
                data: {},
            }).done(function (response) {

                clearNodeWorkflowOwner();

                if (response.status == "ERR") {
                    //$('.spinner-border').hide();
                    ShowError(response.error.message, response.error.sender);

                } else if (response.status == "OK") {
                    if (response.data == "") {

                    } else {

                        var data = (response.data[0]);

                        if (data.IsCreator != null) {
                            $('#rb-IsCreator').prop("checked", true);
                        }
                        if (data.IsAdminOfCreator != null) {
                            $('#rb-IsAdminOfCreator').prop("checked", true);
                        }

                        if (data.IsOwnerSelectedNode != null) {
                            $('#rb-IsOwnerSelectedNode').prop("checked", true);
                            $('#IsOwnerSelectedNode_Id').val(
                                data.IsOwnerSelectedNode_Id
                            )
                            $('#IsOwnerSelectedNode_Desc').html(
                                ' (' + data.IsOwnerSelectedNode_Desc + ')'
                            )
                        }
                        if (data.IsAdminOwnerSelectedNode != null) {
                            $('#rb-IsAdminOwnerSelectedNode').prop("checked", true);
                            $('#IsAdminOwnerSelectedNode_Id').val(
                                data.IsAdminOwnerSelectedNode_Id
                            )
                            $('#IsAdminOwnerSelectedNode_Desc').html(
                                ' (' + data.IsAdminOwnerSelectedNode_Desc + ')'
                            )
                        }
                        if (data.IsCreatorSelectedNode != null) {
                            $('#rb-IsCreatorSelectedNode').prop("checked", true);
                            $('#IsCreatorSelectedNode_Id').val(
                                data.IsCreatorSelectedNode_Id
                            )
                            $('#IsCreatorSelectedNode_Desc').html(
                                ' (' + data.IsCreatorSelectedNode_Desc + ')'
                            )
                        }
                        if (data.IsSelectedProfile != null) {
                            $('#rb-IsSelectedProfile').prop("checked", true);
                            $('#IsSelectedProfile_Id').val(
                                data.IsSelectedProfile_Id
                            )
                            $('#IsSelectedProfile_Desc').html(
                                ' (' + data.IsSelectedProfile_Desc + ')'
                            )
                        }
                        if (data.IsUsersFromAdminProfileCreator != null) {
                            $('#rb-IsUsersFromAdminProfileCreator').prop("checked", true);
                        }
                    }
                };
                $('#container-workflow-set-owner').modal('show');

                $('.spinner-node-workflow-owner').hide();

            });
        }
        catch (err) {
            $('.spinner-node-workflow-owner').hide();
            ShowError(err.message, "loadNodeWorkflowOwner");
        }
    }
    showContextMenuNode = function (XPos, YPos, node) {


        $('#context-menu-link').hide();
        const menu = document.getElementById("context-menu-node");
        const menuHeader = $('.context-menu-node-header');
        $('#context-menu-node').find('.node').val(JSON.stringify(node.state));
        $('#context-menu-node').find('#IdEventoTransizione').val(node.id);
        $('#context-menu-node').find('#DescTransizione').val(node.desc);
        menuHeader.html('<i class="bi bi-bezier2 x2"></i> ' + node.desc);
        menu.style.left = XPos + "px";
        menu.style.top = YPos + "px";
        menu.style.display = "block";
    }
    showContextMenuLink = function (XPos, YPos, node) {

        $('#context-menu-node').hide();
        const menu = document.getElementById("context-menu-link");
        const menuHeader = $('.context-menu-link-header');
        $('#context-menu-link').find('.transition').val(JSON.stringify(node.transition));
        $('#context-menu-link').find('#IDEventoDirezione').val(node.ideventodirezione);
        $('#context-menu-link').find('#DescDirezione').val(node.label);
        menuHeader.html('<i class="bi bi-bezier2 x2"></i> ' + node.label);
        menu.style.left = XPos + "px";
        menu.style.top = YPos + "px";
        menu.style.display = "block";
    }
    updateNodePosition = function (IdEventoTransizione, XPos, YPos) {
        try {
            $('.spinner-workflow').show();
            $.ajax({
                url: "/workflow-update-node-position/" + IdEventoTransizione,
                type: "PUT",
                data: {
                    XPos: XPos,
                    YPos: YPos
                },
            }).done(function (response) {

                if (response.status == "ERR") {
                    $('.spinner-workflow').hide();
                    ShowError(response.error.message, response.error.sender);

                } else if (response.status == "OK") {
                    $('.spinner-workflow').hide();
                }
            }).fail(function (xhr, status, errorThrown) {
                $('.spinner-workflow').hide();
                ShowError(errorThrown, "updateNodePosition")
            });
        }
        catch (err) {
            ShowError(err.message, "updateNodePosition");
        }
    }
    initializeWorkflow = function (IdProcesso) {
        $('.spinner-workflow').show();
        try {
            $.ajax({
                url: "/workflow/" + IdProcesso,
                type: "POST",
                data: {},
            }).done(function (response) {

                if (response.status == "ERR") {
                    //$('.spinner-border').hide();
                    ShowError(response.error.message, response.error.sender);

                } else if (response.status == "OK") {

                    var states = JSON.parse(JSON.parse(JSON.parse(JSON.stringify(response)).data).states);
                    var transitions = JSON.parse(JSON.parse(JSON.parse(JSON.stringify(response)).data).transitions);
                    //console.log(states);
                    //console.log(transitions);

                    //=========================
                    // JSON
                    //=========================

                    const machine = {

                        "states": states,
                        "transitions": transitions

                    };


                    //=========================
                    // Costruzione elementi
                    //=========================

                    const elements = [];

                    // nodi

                    machine.states.forEach(state => {

                        elements.push({

                            data: {
                                id: state.id,
                                label: state.label,
                                desc: state.desc,
                                state: state
                            },

                        });

                    });

                    // archi

                    machine.transitions.forEach(t => {

                        elements.push({

                            data: {
                                id: t.id,
                                source: t.from,
                                target: t.to,
                                label: t.event,
                                ideventodirezione: t.IDEventoDirezione,
                                transition: t
                            }

                        });

                    });


                    //=========================
                    // Cytoscape
                    //=========================

                    cy = cytoscape({

                        container: document.getElementById('cy'),
                        elements,
                        selectionType: 'single',
                        style: [

                            {
                                selector: 'node',
                                style: {
                                    'label': 'data(label)',
                                    'text-valign': 'center',
                                    'text-halign': 'center',
                                    'background-color': '#3498db',
                                    'color': 'white',
                                    'font-size': '12px',
                                    'width': '90px',
                                    'height': '45px',
                                    'border-width': 2,
                                    'border-color': '#21618c',
                                    'shape': 'round-rectangle'
                                }
                            },
                            {
                                selector: 'node:selected',
                                style: {
                                    'background-color': '#e74c3c',
                                    'border-width': 4,
                                    'border-color': '#c0392b'
                                }
                            },
                            {
                                selector: 'edge:selected',
                                style: {
                                    'line-color': '#ff0000',
                                    'target-arrow-color': '#ff0000',
                                    'width': 5,
                                    'label': 'data(label)',
                                    'color': '#ff0000',
                                    'font-weight': 'bold'
                                }
                            },
                            {
                                selector: 'edge',
                                style: {

                                    'curve-style': 'bezier',
                                    'width': 3,
                                    'target-arrow-color': '#888',
                                    'target-arrow-shape': 'triangle',
                                    'arrow-scale': 1.3,
                                    'label': 'data(label)',
                                    'font-size': '13px',
                                    'text-background-color': 'white',
                                    'text-background-opacity': 1,
                                    'text-background-padding': '3px',
                                    'text-rotation': 'autorotate'
                                }
                            }

                        ],

                        layout: {
                            name: 'breadthfirst',
                            directed: true,
                            padding: 0
                        }

                    });


                    //=========================
                    // Eventi
                    //=========================

                    cy.on('select', 'node', function (evt) {
                        //console.log("Selezionato-id:", evt.target._private.data.id);
                        //console.log("Selezionato-id:", evt.target._private.data.label);
                        //console.log("Selezionato-label:", evt.target.label());

                        // const node = e.target;
                        // node.connectedEdges().addClass('highlight');

                    });
                    cy.on('tap', function (e) {

                        if (e.target === cy) {
                            cy.elements().unselect();
                            $('#context-menu-node').hide();
                            $('#context-menu-link').hide();
                        }

                    });
                    cy.on('tap', 'node', function (evt) {
                        //console.log("Nodo selezionato:", evt.target.id());
                        cy.elements().unselect();
                        $('#context-menu-node').hide();
                        $('#context-menu-link').hide();

                    });
                    cy.on('unselect', 'node', function (evt) {
                        // const node = e.target;
                        // node.connectedEdges().removeClass('highlight');
                        //console.log("Nodo deselezionato:", evt.target.id());

                    });
                    cy.on('select', 'edge', function (e) {
                        //console.log("Transizione selezionata:", e.target.id());
                        $('#context-menu-node').hide();
                        $('#context-menu-link').hide();
                    });
                    cy.on("drag", "node", (e) => {
                        const p = e.renderedPosition;
                        const tooltip = document.getElementById("tooltip");
                        tooltip.innerHTML = "<b>" + e.target._private.data.desc + "</b>";
                        tooltip.style.left = (p.x + 4) + "px";
                        tooltip.style.top = (p.y + 4) + "px";
                        tooltip.style.display = "block";
                    });
                    cy.on('dragfree', 'node', (e) => {
                        const node = e.target;
                        //console.log(node.id());
                        //console.log(node.position().x);
                        //console.log(node.position().y);
                        $.when(
                            updateNodePosition(
                                node.id(),
                                node.position().x,
                                node.position().y
                            )
                        ).then(function () {
                        });
                    });
                    cy.on('grab', 'node', function (e) {
                        e.target.style({
                            //'background-color': '#f39c12'
                        });
                    });
                    cy.on('free', 'node', function (e) {
                        e.target.style({
                            //'background-color': '#3498db'
                        });
                    });
                    cy.on("mouseover", "node", e => {
                        const p = e.renderedPosition;
                        const tooltip = document.getElementById("tooltip");
                        tooltip.innerHTML = "<b>" + e.target._private.data.desc + "</b>";
                        tooltip.style.left = (p.x + 4) + "px";
                        tooltip.style.top = (p.y + 4) + "px";
                        tooltip.style.display = "block";
                    });
                    cy.on("mousemove", "node", e => {

                        const p = e.renderedPosition;
                        tooltip.style.left = (p.x + 14) + "px";
                        tooltip.style.top = (p.y + 14) + "px";

                    });
                    cy.on("mouseout", "node", () => {

                        tooltip.style.display = "none";

                    });
                    cy.on('cxttap', 'node', function (e) {

                        e.originalEvent.preventDefault();

                        const node = e.target;

                        cy.elements().unselect();

                        e.target.select();

                        //console.log("Nodo:", node.id());

                        const selectedNode = cy.$('node:selected');

                        //if (selectedNode.length) {
                            showContextMenuNode(
                                e.originalEvent.pageX - 75,
                                e.originalEvent.pageY - 100,
                                e.target._private.data
                            );
                        //}

                    });

                    cy.on('cxttap', 'edge', function (e) {

                        e.originalEvent.preventDefault();

                        const link = e.target;
                        //console.log(e.target._private.data);
                        //console.log("Nodo:", node.id());
                        cy.elements().unselect();

                        e.target.select();

                        const selectedNode = cy.$('edge:selected');

                        //if (selectedNode.length) {
                            showContextMenuLink(
                                e.originalEvent.pageX - 75,
                                e.originalEvent.pageY - 100,
                                e.target._private.data
                            );
                        //}

                    });

                    machine.states.forEach(state => {

                        const node = cy.getElementById(state.id);
                        node.position({
                            x: Math.round(state.x),
                            y: Math.round(state.y)
                        });
                        node.style({
                            //'background-color': state.HexColor
                        });

                    });

                    $('.spinner-workflow').hide();

                    cy.fit(cy.elements(), 30);

                    $('.workflow-download').click(function () {
                        const a = document.createElement("a");
                        a.href = cy.jpg({
                            full: true,
                            scale: 2
                        });
                        a.download = "workflow.png";
                        a.click();
                    });
                    $('.workflow-stampa').click(function () {
                        const img = cy.png({
                            full: true,
                            scale: 1
                        });

                        const win = window.open("", "_blank");

                        win.document.write(`
                            <html>
                            <head>
                                <title>Stampa workflow</title>
                            </head>
                            <body style="margin:0">
                                <img src="${img}" style="width:100%; position:absolute; top:50%; margin-top:-25%;">
                                <script>
                                    window.onload = function () {
                                        window.print();
                                    };

                                    window.onafterprint = function () {
                                        window.close();
                                    };
                                <\/script>
                            </body>
                            </html>
                            `);

                        win.document.close();
                    });

                }
            });
        }
        catch (err) {
            $('.spinner-workflow').hide();
            ShowError(err.message, "initializeWorkflow");
        }
    }

    /* inizializza il controllo <profili-utente-auth> */
    var ControlAuthProfiliUtente = $('#auth-profili-utente-container');

    /* Imposta le proprietà di default del plug-in <profili-utente-auth> */
    ControlAuthProfiliUtente.profiliutente({
        IDGruppoOperativo: null,
    });

    /* Registra l'evento {onselect} del plug-in <profili-utente-auth> */
    ControlAuthProfiliUtente.bind("onselect", function () {
        var option = JSON.parse(ControlAuthProfiliUtente.attr('data-options'));

        /* read plugin attribute option */
        var ControlAuthProcessiAzioni = $('#auth-autorizzazioni-container');
        var optionAuthProcessiAzioni = JSON.parse(ControlAuthProcessiAzioni.attr('data-options'));
        optionAuthProcessiAzioni.IDProcesso = JSON.parse(ControlProcessi.attr('data-options')).IDProcesso;
        optionAuthProcessiAzioni.IdProfiloUtente = option.IDProfiloUtente;
        optionAuthProcessiAzioni.IdEventoTransizione = $('#context-menu-node #IdEventoTransizione').val();
        
        /* re-store plugin attribute option */
        ControlAuthProcessiAzioni.attr('data-options', JSON.stringify(optionAuthProcessiAzioni));

        $('.auth-autorizzazioni-text').html(' (' + option.Descrizione + ')');
        ControlAuthProcessiAzioni.processiazioni.loadFromWorkflowState();

    });

    /* inizializza il controllo <gruppi-operativi-auth> */
    var ControlAuthGruppiOperativi = $('#auth-gruppi-operativi-container');

    /* Imposta le proprietà di default del plug-in <gruppi-operativi-auth> */
    ControlAuthGruppiOperativi.gruppioperativi({
        IDGruppoOperativo: null,
        IDGruppoOperativoParent: null,
        Descrizione: null,
    });

    /* Registra l'evento {onselect} del plug-in <gruppi-operativi-auth> */
    ControlAuthGruppiOperativi.bind("onselect", function () {
        var option = JSON.parse(ControlAuthGruppiOperativi.attr('data-options'));

        /* Caricare la lista dei profili utente in base a {option.IDGruppoOperativo} */
        $('.auth-profili-utente-text').html(' (' + option.Descrizione + ')');
        ControlAuthProfiliUtente.profiliutente.load(ControlAuthProfiliUtente, option.IDGruppoOperativo);

    });


    /* inizializza il controllo <profili-utente> */
    var ControlProfiliUtente = $('#profili-utente-container');

    /* Imposta le proprietà di default del plug-in <profili-utente> */
    ControlProfiliUtente.profiliutente({
        IDGruppoOperativo: null,
    });
    /* Registra l'evento {onselect} del plug-in <profili-utente> */
    ControlProfiliUtente.bind("onselect", function () {
        var option = JSON.parse(ControlProfiliUtente.attr('data-options'));

        clearNodeWorkflowOwner();

        $('#rb-IsSelectedProfile').prop('checked', true);
        $('#IsSelectedProfile_Id').val(option.IDProfiloUtente);
        $('#IsSelectedProfile_Desc').html(' (' + option.Descrizione + ')');

        $('#container-workflow-set-profilo-utente').modal('hide');

    });

    /* inizializza il controllo <gruppi-operativi> */
    var ControlGruppiOperativi = $('#gruppi-operativi-container');

    /* Imposta le proprietà di default del plug-in <gruppi-operativi> */
    ControlGruppiOperativi.gruppioperativi({
        IDGruppoOperativo: null,
        IDGruppoOperativoParent: null,
        Descrizione: null,
    });

    /* Registra l'evento {onselect} del plug-in <gruppi-operativi> */
    ControlGruppiOperativi.bind("onselect", function () {
        var option = JSON.parse(ControlGruppiOperativi.attr('data-options'));

        /* Caricare la lista dei profili utente in base a {option.IDGruppoOperativo} */
        $('.profili-utente-text').html(' (' + option.Descrizione + ')');
        ControlProfiliUtente.profiliutente.load(ControlProfiliUtente, option.IDGruppoOperativo);

    });

    /* inizializza il controllo processi azioni */
    var ControlAuthProcessiAzioni = $('#auth-autorizzazioni-container');

    /* Imposta le proprietà di default del plug-in <Pager> */
    ControlAuthProcessiAzioni.processiazioni({
    });

    /* Registra l'evento {ontoggle} per aggiornare il valore dell'autorizzazione selezionata */
    ControlAuthProcessiAzioni.bind(
        "ontoggle", function () {

        var optionsAuthGruppiOperativi = JSON.parse(ControlAuthGruppiOperativi.attr('data-options'));
        var options = JSON.parse(ControlAuthProcessiAzioni.attr('data-options'));

        toggleAuthProcessoAzione(
            optionsAuthGruppiOperativi.IDGruppoOperativo,
            options.IdProfiloUtente,
            options.IDProcesso,
            options.IDProcessoAzione,
            $('#context-menu-node').find('#IdEventoTransizione').val(),
            options.Toggled
        );
    });

    /* inizializza il controllo workflow-node-link */
    var ControlWorkflowNodeLink = $('.control-workflow-node-link');

    /* Imposta le proprietà di default del plug-in */
    ControlWorkflowNodeLink.workflowNodeStates({
        IdProcesso: JSON.parse(ControlProcessi.attr('data-options')).IDProcesso,
        IdEventoTransizione: null,
        LanguageContext: $('#LanguageContext').val()
    });

    ControlWorkflowNodeLink.workflowNodeStates.loadStates(ControlWorkflowNodeLink);

    /* Registra l'evento {onselect} */
    ControlWorkflowNodeLink.bind("onselect", function () {

        var option = JSON.parse(ControlWorkflowNodeLink.attr('data-options'));

        linkNodeWorkflow(option.SelectedState);

    });


    /* inizializza il controllo workflow-node-states */
    var ControlWorkflowNodeStates = $('.control-workflow-node-states');

    /* Registra l'evento {onselect} */
    ControlWorkflowNodeStates.bind("onselect", function () {

        var option = JSON.parse(ControlWorkflowNodeStates.attr('data-options'));

        clearNodeWorkflowOwner();

        if (option.Sender == 'bi-gear-is-admin-ownwer-selected-node') {
            $('#rb-IsAdminOwnerSelectedNode').prop('checked', true);
            $('#IsAdminOwnerSelectedNode_Id').val(option.SelectedState);
            $('#IsAdminOwnerSelectedNode_Desc').html(' (' + option.SelectedText + ')');
        }
        if (option.Sender == 'bi-gear-is-ownwer-selected-node') {
            $('#rb-IsOwnerSelectedNode').prop('checked', true);
            $('#IsOwnerSelectedNode_Id').val(option.SelectedState);
            $('#IsOwnerSelectedNode_Desc').html(' (' + option.SelectedText + ')');
        }
        if (option.Sender == 'bi-gear-is-creator-selected-node') {
            $('#rb-IsCreatorSelectedNode').prop('checked', true);
            $('#IsCreatorSelectedNode_Id').val(option.SelectedState);
            $('#IsCreatorSelectedNode_Desc').html(' (' + option.SelectedText + ')');
        }
        
        $('#container-workflow-node-states').modal('hide');

    });

});
