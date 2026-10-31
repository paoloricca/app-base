$(function () {
    var languageContext = $('#LanguageContext').val();
    var contextMenus = {
        IT: {
            actions: 'Azioni',
            new: 'Nuovo',
            newProcessIn: 'Nuovo processo in ',
            noParent: 'Nessun processo padre',
            edit: 'Modifica',
            editProcess: 'Modifica processo',
            customActions: 'Azioni custom',
            noCustomActions: 'Non sono disponibili azioni.',
            delete: 'Elimina',
            deleteReferenceWarning: 'Non è possibile eliminare il processo perché è collegato a uno o più elementi presenti nel sistema.',
            cancel: 'Annulla',
            description: 'Descrizione',
            invalidDescription: 'La descrizione italiana è obbligatoria e deve contenere al massimo 30 caratteri.'
        },
        GB: {
            actions: 'Actions',
            new: 'New',
            newProcessIn: 'New process in ',
            noParent: 'No parent process',
            edit: 'Edit',
            editProcess: 'Edit process',
            customActions: 'Custom actions',
            noCustomActions: 'No actions are available.',
            delete: 'Delete',
            deleteReferenceWarning: 'The process cannot be deleted because it is linked to one or more items in the system.',
            cancel: 'Cancel',
            description: 'Description',
            invalidDescription: 'The Italian description is required and must be at most 30 characters.'
        },
        ES: {
            actions: 'Acciones',
            new: 'Nuevo',
            newProcessIn: 'Nuevo proceso en ',
            noParent: 'Sin proceso padre',
            edit: 'Editar',
            editProcess: 'Editar proceso',
            customActions: 'Acciones personalizadas',
            noCustomActions: 'No hay acciones disponibles.',
            delete: 'Eliminar',
            deleteReferenceWarning: 'No se puede eliminar el proceso porque está vinculado a uno o más elementos del sistema.',
            cancel: 'Cancelar',
            description: 'Descripción',
            invalidDescription: 'La descripción italiana es obligatoria y debe tener un máximo de 30 caracteres.'
        },
        CN: {
            actions: '操作',
            new: '新建',
            newProcessIn: '在此处新建流程：',
            noParent: '无父流程',
            edit: '修改',
            editProcess: '编辑流程',
            customActions: '自定義操作',
            noCustomActions: '没有可用操作。',
            delete: '刪除',
            deleteReferenceWarning: '无法删除此流程，因为它与系统中的一个或多个项目相关联。',
            cancel: '取消',
            description: '描述',
            invalidDescription: '意大利语描述为必填项，且最多为 30 个字符。'
        }
    };

    if (!contextMenus[languageContext]) {
        ShowError('Unsupported language context', 'processi-gestione');
        return;
    }

    var ControlProcessi = $('#processi-container');
    var $processDeleteModal = $('#processi-delete-modal');
    ControlProcessi.processi({
        dataUrl: '/processi-gestione/dati',
        selectionEnabled: false,
        contextMenu: contextMenus[languageContext]
    });

    var $processEditModal = $('#processi-edit-modal');
    var $processEditLoading = $processEditModal.find('.processi-edit-loading');
    var $descriptionControl = $processEditModal.find('.processi-edit-description-control');
    $descriptionControl.multiLanguageTextBox({
        Title: null,
        Label: contextMenus[languageContext].description,
        Id: 'ProcessiDescription',
        LanguageContext: languageContext,
        languages: [
            { code: 'IT', title: 'Italiano' },
            { code: 'GB', title: 'English' },
            { code: 'ES', title: 'Español' },
            { code: 'CN', title: '中文' }
        ],
        modalToBody: true
    });
    var $descriptionEditorModal = $descriptionControl.data('mltextbox').$cultureModal;
    $descriptionEditorModal.find('#text-ProcessiDescription_IT').attr('maxlength', 30);
    $descriptionEditorModal.find('.lang-input:not([data-lang="IT"])').attr('maxlength', 50);
    $descriptionEditorModal.find('#txt-culture-edit-ProcessiDescription')
        .attr('maxlength', languageContext === 'IT' ? 30 : 50);

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

    function showProcessDeleteError(error, sender) {
        var showError = function () {
            showCustomActionError(error, sender);
        };
        if ($processDeleteModal.hasClass('show')) {
            $processDeleteModal.one('hidden.bs.modal', showError);
            bootstrap.Modal.getOrCreateInstance($processDeleteModal[0]).hide();
        } else {
            showError();
        }
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

    ControlProcessi.on('click.processi-delete', '.processi-delete', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var $deleteButton = $(this);
        var dropdownButton = $deleteButton.closest('.processo-context-dropdown')
            .find('[data-bs-toggle="dropdown"]')[0];
        if (dropdownButton) {
            bootstrap.Dropdown.getOrCreateInstance(dropdownButton).hide();
        }
        $processDeleteModal.data('processId', $deleteButton.data('idprocesso'));
        $processDeleteModal.find('.processi-delete-process-description')
            .text($deleteButton.data('process-description'));
        bootstrap.Modal.getOrCreateInstance($processDeleteModal[0]).show();
    });

    $processDeleteModal.find('.processi-delete-confirm').on('click', function () {
        var $confirmButton = $(this);
        if ($confirmButton.prop('disabled')) {
            return;
        }
        $confirmButton.prop('disabled', true);
        $.ajax({
            url: '/processi-gestione/' + $processDeleteModal.data('processId'),
            type: 'DELETE'
        }).done(function (response) {
            if (response.status === 'ERR') {
                if (response.error && response.error.code === 'PROCESS_HAS_REFERENCES') {
                    showProcessDeleteError(
                        contextMenus[languageContext].deleteReferenceWarning,
                        'processi-gestione.deleteProcess'
                    );
                } else {
                    showProcessDeleteError(response.error, 'processi-gestione.deleteProcess');
                }
                return;
            }

            bootstrap.Modal.getOrCreateInstance($processDeleteModal[0]).hide();
            ControlProcessi.find('.processi-list').empty();
            ControlProcessi.processi.load();
        }).fail(function (xhr, status, errorThrown) {
            showProcessDeleteError(errorThrown || status, 'processi-gestione.deleteProcess');
        }).always(function () {
            $confirmButton.prop('disabled', false);
        });
    });

    function loadProcessForEdit(processId) {
        $processEditModal.data('mode', 'edit');
        $processEditModal.find('.processi-edit-title-label')
            .text(contextMenus[languageContext].editProcess);
        $processEditLoading.show();
        $processEditModal.find('.processi-edit-fields').hide();
        bootstrap.Modal.getOrCreateInstance($processEditModal[0]).show();
        $.when(
            $.get('/processi-gestione/' + processId),
            $.get('/processi-gestione/' + processId + '/padri')
        )
            .done(function (processResult, parentResult) {
                var processResponse = Array.isArray(processResult) ? processResult[0] : processResult;
                var parentResponse = Array.isArray(parentResult) ? parentResult[0] : parentResult;
                if (!processResponse || !parentResponse) {
                    showCustomActionError('Invalid process response', 'processi-gestione.loadProcess');
                    return;
                }
                if (processResponse.status === 'ERR') {
                    showCustomActionError(processResponse.error, 'processi-gestione.loadProcess');
                    return;
                }
                if (parentResponse.status === 'ERR') {
                    showCustomActionError(parentResponse.error, 'processi-gestione.loadProcessParents');
                    return;
                }

                var process = processResponse.data;
                $processEditModal.data('processId', process.IDProcesso);
                var $parentSelect = $processEditModal.find('#processi-edit-parent');
                $parentSelect.prop('disabled', false).empty().append($('<option>', {
                    value: '',
                    text: contextMenus[languageContext].noParent
                }));
                $parentSelect.find('option:not(:first)').remove();
                parentResponse.data.forEach(function (parent) {
                    $('<option>', {
                        value: parent.IDProcesso,
                        text: parent.IDProcesso + ' - ' + parent.Description +
                            (parent.ParentDescription ? ' (' + parent.ParentDescription + ')' : '')
                    }).appendTo($parentSelect);
                });
                $parentSelect.val(process.IDProcessoParent == null ? '' : String(process.IDProcessoParent));
                $processEditModal.find('#processi-edit-page-url').val(process.PageUrl || '');
                $processEditModal.find('#processi-edit-page-url-vendor').val(process.PageUrlVendor || '');
                $processEditModal.find('#processi-edit-parameters').val(process.Parameters || '');
                $processEditModal.find('#processi-edit-image-url').val(process.ImageUrl || '');
                $processEditModal.find('#processi-edit-order').val(process.Ordine == null ? '' : process.Ordine);
                $processEditModal.find('#processi-edit-linked-object').val(process.LinkedObject || '');
                $processEditModal.find('#processi-edit-object-name').val(process.ObjectName || '');
                $processEditModal.find('#processi-edit-object-pk').val(process.ObjectPk || '');
                $processEditModal.find('#processi-edit-object-fk').val(process.ObjectFk || '');
                $processEditModal.find('.processi-edit-bit').each(function () {
                    var value = process[$(this).data('field')];
                    $(this).prop('checked', value === true || value === 1 || value === '1');
                });
                $descriptionControl.multiLanguageTextBox('load', {
                    IT: process.Text_IT || process.Descrizione || '',
                    GB: process.Text_GB || '',
                    ES: process.Text_ES || '',
                    CN: process.Text_CN || ''
                });
                $processEditModal.find('.processi-edit-description-title').text(
                    process['Text_' + languageContext] || process.Descrizione
                );
                $processEditModal.data('initialParentId', process.IDProcessoParent);
                $processEditModal.find('.processi-edit-fields').show();
                bootstrap.Modal.getOrCreateInstance($processEditModal[0]).show();
            })
            .fail(function (xhr, status, errorThrown) {
                showCustomActionError(errorThrown || status, 'processi-gestione.loadProcess');
            })
            .always(function () {
                $processEditLoading.hide();
            });
    }

    function createProcessForParent(parentId, parentDescription, parentParentDescription) {
        var $parentSelect = $processEditModal.find('#processi-edit-parent');
        $processEditModal.data('mode', 'create').removeData('processId');
        $processEditModal.find('.processi-edit-title-label')
            .text(contextMenus[languageContext].newProcessIn);
        $processEditModal.find('.processi-edit-description-title').text(
            parentDescription + (parentParentDescription ? ' (' + parentParentDescription + ')' : '')
        );
        $parentSelect.find('option:not(:first)').remove();
        $parentSelect.append($('<option>', {
            value: parentId,
            text: parentId + ' - ' + parentDescription
        })).val(String(parentId)).prop('disabled', true);
        $descriptionControl.multiLanguageTextBox('load', {
            IT: '',
            GB: '',
            ES: '',
            CN: ''
        });
        $processEditModal.find(
            '#processi-edit-page-url, #processi-edit-page-url-vendor, #processi-edit-parameters,' +
            ' #processi-edit-image-url, #processi-edit-order, #processi-edit-linked-object,' +
            ' #processi-edit-object-name, #processi-edit-object-pk, #processi-edit-object-fk'
        ).val('');
        $processEditModal.find('.processi-edit-bit').prop('checked', false);
        $processEditModal.find('.processi-edit-fields').show();
        $processEditLoading.hide();
        bootstrap.Modal.getOrCreateInstance($processEditModal[0]).show();
    }

    $(document).on('click.processi-new', '#processi-container .processi-new', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var $newButton = $(this);
        var dropdownButton = $newButton.closest('.processo-context-dropdown')
            .find('[data-bs-toggle="dropdown"]')[0];
        if (dropdownButton) {
            bootstrap.Dropdown.getOrCreateInstance(dropdownButton).hide();
        }
        createProcessForParent(
            $newButton.data('idprocesso'),
            $newButton.data('process-description'),
            $newButton.data('parent-description')
        );
    });

    $(document).on('click.processi-edit', '#processi-container .processi-edit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var $editButton = $(this);
        var dropdownButton = $editButton.closest('.processo-context-dropdown')
            .find('[data-bs-toggle="dropdown"]')[0];
        if (dropdownButton) {
            bootstrap.Dropdown.getOrCreateInstance(dropdownButton).hide();
        }
        loadProcessForEdit($editButton.data('idprocesso'));
    });

    $processEditModal.find('.processi-edit-save').on('click', function () {
        var $saveButton = $(this);
        var descriptionInstance = $descriptionControl.data('mltextbox');
        descriptionInstance.refreshValues();
        var descriptions = descriptionInstance.getValues();
        if (!descriptions.IT || !descriptions.IT.trim() || descriptions.IT.trim().length > 30) {
            ShowError(contextMenus[languageContext].invalidDescription, 'processi-gestione.saveProcess');
            return;
        }

        var process = {
            IDProcessoParent: $processEditModal.find('#processi-edit-parent').val(),
            Descriptions: descriptions,
            PageUrl: $processEditModal.find('#processi-edit-page-url').val(),
            PageUrlVendor: $processEditModal.find('#processi-edit-page-url-vendor').val(),
            Parameters: $processEditModal.find('#processi-edit-parameters').val(),
            ImageUrl: $processEditModal.find('#processi-edit-image-url').val(),
            Ordine: $processEditModal.find('#processi-edit-order').val()
        };
        $processEditModal.find('.processi-edit-bit').each(function () {
            process[$(this).data('field')] = $(this).prop('checked');
        });
        process.LinkedObject = $processEditModal.find('#processi-edit-linked-object').val();
        process.ObjectName = $processEditModal.find('#processi-edit-object-name').val();
        process.ObjectPk = $processEditModal.find('#processi-edit-object-pk').val();
        process.ObjectFk = $processEditModal.find('#processi-edit-object-fk').val();

        if ($saveButton.prop('disabled')) {
            return;
        }
        $saveButton.prop('disabled', true);
        var isCreating = $processEditModal.data('mode') === 'create';
        $.ajax({
            url: isCreating
                ? '/processi-gestione'
                : '/processi-gestione/' + $processEditModal.data('processId'),
            type: isCreating ? 'POST' : 'PUT',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify({ Process: process })
        }).done(function (response) {
            if (response.status === 'ERR') {
                showCustomActionError(response.error, 'processi-gestione.saveProcess');
                return;
            }

            bootstrap.Modal.getOrCreateInstance($processEditModal[0]).hide();
            if (isCreating) {
                var parentId = Number(process.IDProcessoParent);
                var $parentContainer = ControlProcessi.find('.processo-' + parentId + '-container');
                if ($parentContainer.length) {
                    $parentContainer.children('[class^="processo-"][class$="-container"]').remove();
                    ControlProcessi.processi.load(parentId);
                } else {
                    ControlProcessi.find('.processi-list').empty();
                    ControlProcessi.processi.load();
                }
            } else {
                ControlProcessi.find('.processi-list').empty();
                ControlProcessi.processi.load();
            }
        }).fail(function (xhr, status, errorThrown) {
            showCustomActionError(errorThrown || status, 'processi-gestione.saveProcess');
        }).always(function () {
            $saveButton.prop('disabled', false);
        });
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
