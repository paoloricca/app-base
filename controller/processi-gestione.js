$(function () {
    var languageContext = $('#LanguageContext').val();
    var contextMenus = {
        IT: {
            actions: 'Azioni',
            edit: 'Modifica',
            customActions: 'Azioni custom',
            noCustomActions: 'Non sono disponibili azioni.',
            delete: 'Elimina',
            cancel: 'Annulla'
        },
        GB: {
            actions: 'Actions',
            edit: 'Edit',
            customActions: 'Custom actions',
            noCustomActions: 'No actions are available.',
            delete: 'Delete',
            cancel: 'Cancel'
        },
        ES: {
            actions: 'Acciones',
            edit: 'Editar',
            customActions: 'Acciones personalizadas',
            noCustomActions: 'No hay acciones disponibles.',
            delete: 'Eliminar',
            cancel: 'Cancelar'
        },
        CN: {
            actions: '操作',
            edit: '修改',
            customActions: '自定義操作',
            noCustomActions: '没有可用操作。',
            delete: '刪除',
            cancel: '取消'
        }
    };

    if (!contextMenus[languageContext]) {
        ShowError('Unsupported language context', 'processi-gestione');
        return;
    }

    var ControlProcessi = $('#processi-container');
    ControlProcessi.processi({
        dataUrl: '/processi-gestione/dati',
        selectionEnabled: false,
        contextMenu: contextMenus[languageContext]
    });

    var $customActionsModal = $('#processi-custom-actions-modal');
    var $customActionsList = $customActionsModal.find('.processi-custom-actions-list');
    var $customActionsLoading = $customActionsModal.find('.processi-custom-actions-loading');
    var $cultureControl = $('#processi-action-culture-control');
    $cultureControl.multiLanguageTextBox({
        Title: null,
        Label: '',
        Id: 'ProcessiCustomAction',
        LanguageContext: languageContext,
        languages: [
            { code: 'IT', title: 'Italiano' },
            { code: 'GB', title: 'English' },
            { code: 'ES', title: 'Español' },
            { code: 'CN', title: '中文' }
        ]
    });
    $cultureControl.find('.label-title-ProcessiCustomAction').hide();
    $cultureControl.children('.input-group').hide();
    var $cultureModal = $cultureControl.find('.container-culture-textbox-edit');
    var reopenActionsModalAfterTranslation = false;
    $cultureModal.on('hidden.bs.modal', function () {
        if (reopenActionsModalAfterTranslation) {
            reopenActionsModalAfterTranslation = false;
            bootstrap.Modal.getOrCreateInstance($customActionsModal[0]).show();
        }
    });

    function showCustomActionError(error, sender) {
        ShowError(error && error.message ? error.message : error, error && error.sender ? error.sender : sender);
    }

    function loadCustomActions(processId) {
        $customActionsList.empty();
        $customActionsLoading.show();

        $.get('/processi-gestione/' + processId + '/azioni')
            .done(function (response) {
                if (response.status === 'ERR') {
                    showCustomActionError(response.error, 'processi-gestione.loadCustomActions');
                    return;
                }

                if (!response.data.length) {
                    $('<div>', {
                        class: 'text-secondary p-2',
                        text: contextMenus[languageContext].noCustomActions
                    }).appendTo($customActionsList);
                    return;
                }

                $.get('/controls/ui/control.ui.processo.azione-custom.ejs?' + Date.now())
                    .done(function (template) {
                        response.data.forEach(function (processoAzione) {
                            $customActionsList.append(ejs.render(template, {
                                processoAzione,
                                LanguageContext: languageContext
                            }));
                        });
                    })
                    .fail(function (xhr, status, errorThrown) {
                        showCustomActionError(errorThrown || status, 'processi-gestione.customActionTemplate');
                    });
            })
            .fail(function (xhr, status, errorThrown) {
                showCustomActionError(errorThrown || status, 'processi-gestione.loadCustomActions');
            })
            .always(function () {
                $customActionsLoading.hide();
            });
    }

    ControlProcessi.on('click.processi-custom-actions', '.processi-custom-actions', function () {
        var processId = $(this).data('idprocesso');
        $customActionsModal.find('.processi-custom-actions-process-name').text(
            $(this).data('process-description')
        );
        $customActionsModal.data('idprocesso', processId);
        bootstrap.Modal.getOrCreateInstance($customActionsModal[0]).show();
        loadCustomActions(processId);
    });

    $customActionsList.on('change', '.processi-custom-action-toggle', function () {
        var toggle = this;
        var isMapped = $(toggle).prop('checked');
        var processId = $customActionsModal.data('idprocesso');
        var actionId = $(toggle).data('idazione');

        $(toggle).prop('disabled', true);
        $.ajax({
            url: '/processi-gestione/' + processId + '/azioni/' + actionId,
            type: 'PUT',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify({ IsMapped: isMapped })
        }).done(function (response) {
            if (response.status === 'ERR') {
                $(toggle).prop('checked', !isMapped);
                showCustomActionError(response.error, 'processi-gestione.setCustomAction');
            } else {
                $(toggle).closest('.d-flex').find('.processi-custom-action-translation')
                    .prop('disabled', !isMapped);
            }
        }).fail(function (xhr, status, errorThrown) {
            $(toggle).prop('checked', !isMapped);
            showCustomActionError(errorThrown || status, 'processi-gestione.setCustomAction');
        }).always(function () {
            $(toggle).prop('disabled', false);
        });
    });

    $customActionsList.on('click', '.processi-custom-action-translation', function () {
        var $button = $(this);
        var translations;
        try {
            translations = JSON.parse($button.attr('data-translations'));
        } catch (error) {
            showCustomActionError(error, 'processi-gestione.loadCustomActionTranslations');
            return;
        }

        $cultureControl.data('processId', $customActionsModal.data('idprocesso'));
        $cultureControl.data('actionId', $button.data('idazione'));
        $cultureControl.data('translationButton', $button);
        $cultureControl.multiLanguageTextBox('option', 'Label', $button.data('description'));
        $cultureControl.multiLanguageTextBox('load', translations);
        reopenActionsModalAfterTranslation = true;
        $customActionsModal.one('hidden.bs.modal', function () {
            $cultureControl.multiLanguageTextBox('show');
        });
        bootstrap.Modal.getOrCreateInstance($customActionsModal[0]).hide();
    });

    $cultureControl.find('.btn-confirm-container-culture-textbox-edit')
        .off('click')
        .on('click', function (event) {
            event.preventDefault();
            var $confirm = $(this);
            var instance = $cultureControl.data('mltextbox');
            instance.refreshValues();
            var translations = instance.getValues();
            var processId = $cultureControl.data('processId');
            var actionId = $cultureControl.data('actionId');

            if ($confirm.hasClass('disabled')) {
                return;
            }
            $confirm.addClass('disabled').attr('aria-disabled', 'true');
            $.ajax({
                url: '/processi-gestione/' + processId + '/azioni/' + actionId + '/traduzioni',
                type: 'PUT',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify({ Translations: translations })
            }).done(function (response) {
                if (response.status === 'ERR') {
                    showCustomActionError(response.error, 'processi-gestione.saveCustomActionTranslations');
                    return;
                }

                var $translationButton = $cultureControl.data('translationButton');
                $translationButton
                    .attr('data-translations', JSON.stringify(translations))
                    .data('translations', translations);
                $translationButton.closest('.d-flex').find('label')
                    .text(translations[languageContext]);
                $translationButton
                    .attr('data-description', translations[languageContext])
                    .data('description', translations[languageContext]);
                $cultureControl.multiLanguageTextBox('load', translations);
                $cultureControl.multiLanguageTextBox('hide');
            }).fail(function (xhr, status, errorThrown) {
                showCustomActionError(errorThrown || status, 'processi-gestione.saveCustomActionTranslations');
            }).always(function () {
                $confirm.removeClass('disabled').removeAttr('aria-disabled');
            });
        });

    ControlProcessi.processi.load();
});
