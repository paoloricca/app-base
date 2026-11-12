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
            description: 'Descrizione'
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
            description: 'Description'
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
            description: 'Descripción'
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
            description: '描述'
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
    var $processEditForm = $processEditModal.find('#processi-edit-form');
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
    var $descriptionInput = $descriptionControl.find('#txt-culture-edit-ProcessiDescription');
    var descriptionMaxLength = languageContext === 'IT' ? 30 : 50;
    $descriptionInput.prop('required', false);
    $descriptionEditorModal.find('.lang-input').removeAttr('required');
    $descriptionEditorModal.find('#text-ProcessiDescription_IT').attr('maxlength', 30);
    $descriptionEditorModal.find('.lang-input:not([data-lang="IT"])').attr('maxlength', 50);
    $descriptionInput.attr('maxlength', descriptionMaxLength);
    $descriptionControl.find('.label-title-ProcessiDescription')
        .addClass('processi-required-label');
    function updateDescriptionValidity() {
        var currentDescription = $descriptionEditorModal
            .find('#text-ProcessiDescription_' + languageContext).val() || '';
        var isValid = currentDescription.trim().length > 0 &&
            currentDescription.trim().length <= descriptionMaxLength;
        $descriptionInput
            .toggleClass('is-invalid', !isValid)
            .toggleClass('is-valid', isValid);
        return isValid;
    }
    $descriptionControl.on('valueChanged.processi-edit-required', updateDescriptionValidity);
    $descriptionInput.on('input.processi-edit-required change.processi-edit-required', updateDescriptionValidity);
    $descriptionEditorModal.on('input.processi-edit-required', '.lang-input', function () {
        updateDescriptionValidity();
    });
    updateDescriptionValidity();
    $processEditModal.find('#processi-edit-parent').on(
        'change.processi-edit-required',
        function () {
            if (this.checkValidity()) {
                $(this).removeClass('is-invalid');
            }
        }
    );
    var $processSwitch = $processEditModal.find('#processi-edit-IsProcess');
    var $modelFields = $processEditModal.find('.processi-edit-model-fields');
    var $modelSelect = $processEditModal.find('#processi-edit-model');
    var $versionSelect = $processEditModal.find('#processi-edit-version');
    var processModelsLoaded = false;
    var processModelsLoading = false;
    var processVersionRequestId = 0;
    var processSelectorText = {
        IT: {
            selectVersion: 'Seleziona una versione',
            loading: 'Caricamento...',
            noVersions: 'Nessuna versione disponibile',
            emptyVersionDate: 'Vuota',
            versionWithoutFields: 'La versione selezionata non contiene campi collegati. Seleziona una versione con campi collegati prima di salvare.'
        },
        GB: {
            selectVersion: 'Select a version',
            loading: 'Loading...',
            noVersions: 'No versions available',
            emptyVersionDate: 'Empty',
            versionWithoutFields: 'The selected version has no linked fields. Select a version with linked fields before saving.'
        },
        ES: {
            selectVersion: 'Seleccione una versión',
            loading: 'Cargando...',
            noVersions: 'No hay versiones disponibles',
            emptyVersionDate: 'Vacía',
            versionWithoutFields: 'La versión seleccionada no tiene campos vinculados. Seleccione una versión con campos vinculados antes de guardar.'
        },
        CN: {
            selectVersion: '选择版本',
            loading: '正在加载...',
            noVersions: '没有可用版本',
            emptyVersionDate: '空',
            versionWithoutFields: '所选版本没有关联字段。请先选择包含关联字段的版本，然后再保存。'
        }
    }[languageContext];

    function updateProcessModelValidity() {
        var isRequired = $processSwitch.prop('checked');
        var hasModel = !!$modelSelect.val();
        var hasVersion = !!$versionSelect.val() && !$versionSelect.prop('disabled');

        $modelSelect.prop('required', isRequired)
            .toggleClass('is-invalid', isRequired && !hasModel)
            .toggleClass('is-valid', isRequired && hasModel);
        $versionSelect.prop('required', isRequired)
            .toggleClass('is-invalid', isRequired && !hasVersion)
            .toggleClass('is-valid', isRequired && hasVersion);
        $modelFields.find('label[for="processi-edit-model"], label[for="processi-edit-version"]')
            .toggleClass('processi-required-label', isRequired);

        return !isRequired || (hasModel && hasVersion);
    }

    function setVersionPlaceholder(text) {
        $versionSelect.empty().append($('<option>', {
            value: '',
            text: text || processSelectorText.selectVersion
        }));
    }

    function loadProcessVersions(modelId, selectedVersionId) {
        var requestId = ++processVersionRequestId;
        setVersionPlaceholder(processSelectorText.loading);
        $versionSelect.prop('disabled', true);
        updateProcessModelValidity();
        if (!modelId) {
            setVersionPlaceholder();
            updateProcessModelValidity();
            return;
        }

        $.get('/processi-gestione/modelli/' + encodeURIComponent(modelId) + '/versioni')
            .done(function (response) {
                if (requestId !== processVersionRequestId ||
                    String($modelSelect.val() || '') !== String(modelId)) {
                    return;
                }
                if (!response || response.status !== 'OK') {
                    showCustomActionError(
                        response && response.error ? response.error : 'Invalid versions response',
                        'processi-gestione.loadModelVersions'
                    );
                    setVersionPlaceholder();
                    updateProcessModelValidity();
                    return;
                }

                setVersionPlaceholder(
                    response.data.length ? processSelectorText.selectVersion : processSelectorText.noVersions
                );
                response.data.forEach(function (version) {
                    var dateLabel = processSelectorText.emptyVersionDate;
                    var $option;
                    if (version.DataVersione) {
                        var date = new Date(version.DataVersione);
                        if (!isNaN(date.getTime())) {
                            var locales = { IT: 'it-IT', GB: 'en-GB', ES: 'es-ES', CN: 'zh-CN' };
                            dateLabel = ' (' + new Intl.DateTimeFormat(
                                locales[languageContext],
                                { dateStyle: 'short', timeStyle: 'short' }
                            ).format(date) + ')';
                        } else {
                            dateLabel = ' (' + processSelectorText.emptyVersionDate + ')';
                        }
                    } else {
                        dateLabel = ' (' + processSelectorText.emptyVersionDate + ')';
                    }
                    $option = $('<option>', {
                        value: version.IDVersione,
                        text: version.Numero + dateLabel
                    }).data('dataIstanza', version.DataIstanza);
                    $versionSelect.append($option);
                });
                $versionSelect.prop('disabled', !response.data.length);
                if (selectedVersionId != null) {
                    $versionSelect.val(String(selectedVersionId));
                }
                updateProcessModelValidity();
            })
            .fail(function (xhr, status, errorThrown) {
                if (requestId !== processVersionRequestId) {
                    return;
                }
                showCustomActionError(errorThrown || status, 'processi-gestione.loadModelVersions');
                setVersionPlaceholder();
                updateProcessModelValidity();
            });
    }

    function loadProcessModels(selectedModelId, selectedVersionId) {
        if (selectedModelId !== undefined) {
            $modelSelect.data('selectedModel', selectedModelId);
        }
        if (selectedVersionId !== undefined) {
            $versionSelect.data('selectedVersion', selectedVersionId);
        }

        if (processModelsLoaded) {
            var modelId = $modelSelect.data('selectedModel');
            var versionId = $versionSelect.data('selectedVersion');
            $modelSelect.val(modelId == null ? '' : String(modelId));
            loadProcessVersions(modelId, versionId);
            return;
        }
        if (processModelsLoading) {
            return;
        }

        processModelsLoading = true;
        $modelSelect.prop('disabled', true);
        $.get('/processi-gestione/modelli')
            .done(function (response) {
                if (!response || response.status !== 'OK') {
                    showCustomActionError(
                        response && response.error ? response.error : 'Invalid models response',
                        'processi-gestione.loadModels'
                    );
                    return;
                }

                response.data.forEach(function (model) {
                    $modelSelect.append($('<option>', {
                        value: model.IDModello,
                        text: model.IDModello + ' - ' + (model.Description || '')
                    }));
                });
                processModelsLoaded = true;
                var modelId = $modelSelect.data('selectedModel');
                var versionId = $versionSelect.data('selectedVersion');
                $modelSelect.val(modelId == null ? '' : String(modelId));
                loadProcessVersions(modelId, versionId);
                updateProcessModelValidity();
            })
            .fail(function (xhr, status, errorThrown) {
                showCustomActionError(errorThrown || status, 'processi-gestione.loadModels');
            })
            .always(function () {
                processModelsLoading = false;
                $modelSelect.prop('disabled', false);
                updateProcessModelValidity();
            });
    }

    $processSwitch.on('change.processi-models', function () {
        $modelFields.toggle(this.checked);
        updateProcessModelValidity();
        if (this.checked) {
            loadProcessModels();
        } else {
            $modelSelect.prop('required', false).removeClass('is-valid is-invalid');
            $versionSelect.prop('required', false).removeClass('is-valid is-invalid');
            $modelFields.find('label').removeClass('processi-required-label');
        }
    });
    $modelSelect.on('change.processi-models', function () {
        $modelSelect.data('selectedModel', this.value || null);
        $versionSelect.removeData('selectedVersion');
        updateProcessModelValidity();
        loadProcessVersions(this.value, null);
    });
    $versionSelect.on('change.processi-models', updateProcessModelValidity);
    updateProcessModelValidity();

    var $workflowSwitch = $processEditModal.find('#processi-edit-HasWorkflow');
    var $workflowFields = $processEditModal.find('.processi-edit-workflow-fields');
    var $workflowSelect = $processEditModal.find('#processi-edit-workflow');
    var $workflowVersionSelect = $processEditModal.find('#processi-edit-workflow-version');
    var workflowsLoaded = false;
    var workflowsLoading = false;
    var workflowVersionRequestId = 0;

    function updateWorkflowValidity() {
        var isRequired = $workflowSwitch.prop('checked');
        var hasWorkflow = !!$workflowSelect.val();
        var hasVersion = !!$workflowVersionSelect.val() && !$workflowVersionSelect.prop('disabled');

        $workflowSelect.prop('required', isRequired)
            .toggleClass('is-invalid', isRequired && !hasWorkflow)
            .toggleClass('is-valid', isRequired && hasWorkflow);
        $workflowVersionSelect.prop('required', isRequired)
            .toggleClass('is-invalid', isRequired && !hasVersion)
            .toggleClass('is-valid', isRequired && hasVersion);
        $workflowFields.find('label').toggleClass('processi-required-label', isRequired);

        return !isRequired || (hasWorkflow && hasVersion);
    }

    function setWorkflowVersionPlaceholder(text) {
        $workflowVersionSelect.empty().append($('<option>', {
            value: '',
            text: text || processSelectorText.selectVersion
        }));
    }

    function workflowVersionLabel(version) {
        var date = version.DataVersione ? new Date(version.DataVersione) : null;
        if (!date || isNaN(date.getTime())) {
            return version.Numero + ' (' + processSelectorText.emptyVersionDate + ')';
        }
        var locales = { IT: 'it-IT', GB: 'en-GB', ES: 'es-ES', CN: 'zh-CN' };
        return version.Numero + ' (' + new Intl.DateTimeFormat(
            locales[languageContext],
            { dateStyle: 'short', timeStyle: 'short' }
        ).format(date) + ')';
    }

    function loadWorkflowVersions(workflowId, selectedVersionId) {
        var requestId = ++workflowVersionRequestId;
        setWorkflowVersionPlaceholder(workflowId ? processSelectorText.loading : null);
        $workflowVersionSelect.prop('disabled', true);
        updateWorkflowValidity();
        if (!workflowId) {
            return;
        }

        $.get('/processi-gestione/workflow/' + encodeURIComponent(workflowId) + '/versioni')
            .done(function (response) {
                if (requestId !== workflowVersionRequestId) {
                    return;
                }
                if (!response || response.status !== 'OK') {
                    showCustomActionError(
                        response && response.error ? response.error : 'Invalid versions response',
                        'processi-gestione.loadWorkflowVersions'
                    );
                    setWorkflowVersionPlaceholder();
                    updateWorkflowValidity();
                    return;
                }

                setWorkflowVersionPlaceholder(
                    response.data.length ? processSelectorText.selectVersion : processSelectorText.noVersions
                );
                response.data.forEach(function (version) {
                    $workflowVersionSelect.append($('<option>', {
                        value: version.IDVersioneWorkflow,
                        text: workflowVersionLabel(version)
                    }));
                });
                $workflowVersionSelect.prop('disabled', !response.data.length);
                if (selectedVersionId != null) {
                    $workflowVersionSelect.val(String(selectedVersionId));
                }
                updateWorkflowValidity();
            })
            .fail(function (xhr, status, errorThrown) {
                if (requestId !== workflowVersionRequestId) {
                    return;
                }
                showCustomActionError(errorThrown || status, 'processi-gestione.loadWorkflowVersions');
                setWorkflowVersionPlaceholder();
                updateWorkflowValidity();
            });
    }

    function applySelectedWorkflow() {
        var workflowId = $workflowSelect.data('selectedWorkflow');
        $workflowSelect.val(workflowId == null ? '' : String(workflowId));
        loadWorkflowVersions(
            $workflowSelect.val() || null,
            $workflowVersionSelect.data('selectedVersion')
        );
    }

    function loadWorkflows() {
        if (workflowsLoaded) {
            applySelectedWorkflow();
            return;
        }
        if (workflowsLoading) {
            return;
        }

        workflowsLoading = true;
        $workflowSelect.prop('disabled', true);
        $.get('/processi-gestione/workflow')
            .done(function (response) {
                if (!response || response.status !== 'OK') {
                    showCustomActionError(
                        response && response.error ? response.error : 'Invalid workflows response',
                        'processi-gestione.loadWorkflows'
                    );
                    return;
                }

                response.data.forEach(function (workflow) {
                    $workflowSelect.append($('<option>', {
                        value: workflow.IDWorkflow,
                        text: workflow.IDWorkflow + ' - ' + (workflow.Description || '')
                    }));
                });
                workflowsLoaded = true;
                applySelectedWorkflow();
            })
            .fail(function (xhr, status, errorThrown) {
                showCustomActionError(errorThrown || status, 'processi-gestione.loadWorkflows');
            })
            .always(function () {
                workflowsLoading = false;
                $workflowSelect.prop('disabled', false);
                updateWorkflowValidity();
            });
    }

    $workflowSwitch.on('change.processi-workflow', function () {
        $workflowFields.toggle(this.checked);
        updateWorkflowValidity();
        if (this.checked) {
            loadWorkflows();
        } else {
            $workflowSelect.prop('required', false).removeClass('is-valid is-invalid');
            $workflowVersionSelect.prop('required', false).removeClass('is-valid is-invalid');
            $workflowFields.find('label').removeClass('processi-required-label');
        }
    });
    $workflowSelect.on('change.processi-workflow', function () {
        $workflowSelect.data('selectedWorkflow', this.value || null);
        $workflowVersionSelect.removeData('selectedVersion');
        loadWorkflowVersions(this.value || null, null);
    });
    $workflowVersionSelect.on('change.processi-workflow', updateWorkflowValidity);

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
            ControlProcessi.processi.load(null, ControlProcessi);
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
                $parentSelect.prop('required', false).removeClass('is-invalid');
                $processEditModal.find('.processi-edit-parent-label').removeClass('processi-required-label');
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
                var processIsEnabled = process.IsProcess === true ||
                    process.IsProcess === 1 || process.IsProcess === '1';
                processVersionRequestId++;
                $modelSelect.data('selectedModel', process.IDModello);
                $versionSelect.data('selectedVersion', process.IDVersione);
                $modelSelect.val(
                    processModelsLoaded && process.IDModello != null
                        ? String(process.IDModello)
                        : ''
                );
                setVersionPlaceholder();
                $versionSelect.prop('disabled', true);
                $processSwitch.trigger('change');
                if (!processIsEnabled && process.IDModello != null) {
                    loadProcessModels(process.IDModello, process.IDVersione);
                }
                workflowVersionRequestId++;
                $workflowSelect.data('selectedWorkflow', process.IDWorkflow);
                $workflowVersionSelect.data('selectedVersion', process.IDVersioneWorkflow);
                $workflowSelect.val('');
                setWorkflowVersionPlaceholder();
                $workflowVersionSelect.prop('disabled', true);
                $workflowSwitch.trigger('change');
                $descriptionControl.multiLanguageTextBox('load', {
                    IT: process.Text_IT || process.Descrizione || '',
                    GB: process.Text_GB || '',
                    ES: process.Text_ES || '',
                    CN: process.Text_CN || ''
                });
                updateDescriptionValidity();
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
        $parentSelect.prop('required', true).removeClass('is-invalid');
        $processEditModal.find('.processi-edit-parent-label').addClass('processi-required-label');
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
        updateDescriptionValidity();
        $processEditModal.find(
            '#processi-edit-page-url, #processi-edit-page-url-vendor, #processi-edit-parameters,' +
            ' #processi-edit-image-url, #processi-edit-order, #processi-edit-linked-object,' +
            ' #processi-edit-object-name, #processi-edit-object-pk, #processi-edit-object-fk'
        ).val('');
        $processEditModal.find('.processi-edit-bit').prop('checked', false);
        processVersionRequestId++;
        $modelSelect.removeData('selectedModel').val('');
        $versionSelect.removeData('selectedVersion');
        setVersionPlaceholder();
        $versionSelect.prop('disabled', true);
        $modelFields.hide();
        $processSwitch.trigger('change');
        workflowVersionRequestId++;
        $workflowSelect.removeData('selectedWorkflow').val('');
        $workflowVersionSelect.removeData('selectedVersion');
        setWorkflowVersionPlaceholder();
        $workflowVersionSelect.prop('disabled', true);
        $workflowFields.hide();
        $workflowSwitch.trigger('change');
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

    $processEditForm.on('submit', function (event) {
        event.preventDefault();
        var $saveButton = $processEditModal.find('.processi-edit-save');
        var descriptionInstance = $descriptionControl.data('mltextbox');
        descriptionInstance.refreshValues();
        var descriptions = descriptionInstance.getValues();
        if (!updateDescriptionValidity()) {
            bootstrap.Tab.getOrCreateInstance(
                $descriptionEditorModal.find(
                    '#tabs_ProcessiDescription_' + languageContext
                )[0]
            ).show();
            return;
        }

        if (!updateProcessModelValidity()) {
            $modelFields.find('.is-invalid:enabled').first().trigger('focus');
            return;
        }

        if (!updateWorkflowValidity()) {
            $workflowFields.find('.is-invalid:enabled').first().trigger('focus');
            return;
        }

        if ($processSwitch.prop('checked') && $versionSelect.val()) {
            var selectedVersionHasFields = $versionSelect.find(':selected').data('dataIstanza');
            if (selectedVersionHasFields == null || selectedVersionHasFields === '') {
                ShowError(
                    processSelectorText.versionWithoutFields,
                    'processi-gestione.saveProcess'
                );
                return;
            }
        }

        var $parentSelect = $processEditModal.find('#processi-edit-parent');
        if ($processEditModal.data('mode') === 'create' && !$parentSelect.val()) {
            $parentSelect.addClass('is-invalid');
            $parentSelect.trigger('focus');
            return;
        }

        if (!this.checkValidity()) {
            $(this).find(':invalid').first().addClass('is-invalid').trigger('focus');
            return;
        }

        var process = {
            IDProcessoParent: $processEditModal.find('#processi-edit-parent').val(),
            IDModello: $modelSelect.val() || null,
            IDVersione: $versionSelect.val() || null,
            IDWorkflow: $workflowSwitch.prop('checked') ? $workflowSelect.val() || null : null,
            IDVersioneWorkflow: $workflowSwitch.prop('checked') ? $workflowVersionSelect.val() || null : null,
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
                    ControlProcessi.processi.load(parentId, ControlProcessi);
                } else {
                    ControlProcessi.find('.processi-list').empty();
                    ControlProcessi.processi.load(null, ControlProcessi);
                }
            } else {
                ControlProcessi.find('.processi-list').empty();
                ControlProcessi.processi.load(null, ControlProcessi);
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

    ControlProcessi.processi.load(null, ControlProcessi);
});
