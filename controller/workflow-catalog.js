$(function () {
    
    const user = JSON.parse($('#workflow-catalog-user').val());
    const pageSize = 20;
    let pageIndex = 1;
    let activeFilter = { search: '', visibility: '' };
    let recordsById = {};
    let versionsById = {};
    let selectedWorkflow = null;

    /* initialize il controllo <confirm-delete-workflow-record> */
    var $CtlDeleteRecord = $('#container-confirm-delete-workflow-record');
    $CtlDeleteRecord.confirmDelete({ LanguageContext: user.LanguageContext });
    $CtlDeleteRecord.bind('onconfirm', function () {
        const id = $CtlDeleteRecord.data('pendingDeleteId');
        if (!id) { return; }
        api({ url: '/workflow/api/records/' + encodeURIComponent(id), type: 'DELETE' })
            .done(loadRecords).fail(showError);
        $CtlDeleteRecord.confirmDelete.hide($CtlDeleteRecord);
    });

    /* initialize il controllo <confirm-delete-workflow-version> */
    var $CtlDeleteVersion = $('#container-confirm-delete-workflow-version');
    $CtlDeleteVersion.confirmDelete({ LanguageContext: user.LanguageContext });
    $CtlDeleteVersion.bind('onconfirm', function () {
        const versionId = $CtlDeleteVersion.data('pendingDeleteId');
        if (!versionId) { return; }
        api({ url: '/workflow/api/versions/' + encodeURIComponent(versionId), type: 'DELETE' })
            .done(loadVersions).fail(showError);
        $CtlDeleteVersion.confirmDelete.hide($CtlDeleteVersion);
    });
    const $descriptionControl = $('.workflow-description-control');
    $descriptionControl.multiLanguageTextBox({
        Title: null,
        Label: text('description'),
        Id: 'WorkflowDescription',
        LanguageContext: user.LanguageContext,
        languages: [
            { code: 'IT', title: 'Italiano' },
            { code: 'GB', title: 'English' },
            { code: 'ES', title: 'Español' },
            { code: 'CN', title: '中文' }
        ],
        modalToBody: true
    });
    const $descriptionEditorModal = $descriptionControl.data('mltextbox').$cultureModal;
    const $descriptionInput = $descriptionControl.find('#txt-culture-edit-WorkflowDescription');
    const descriptionMaxLength = 1000;
    $descriptionInput.prop('required', false);
    $descriptionEditorModal.find('.lang-input').removeAttr('required');
    $descriptionInput.attr('maxlength', descriptionMaxLength);
    $descriptionControl.find('.label-title-WorkflowDescription')
        .addClass('processi-required-label workflow-required-label');

    function updateDescriptionValidity() {
        const currentDescription = (
            $descriptionEditorModal.find('#text-WorkflowDescription_' + user.LanguageContext).val() ||
            $descriptionInput.val() ||
            ''
        ).trim();
        const anyDescription = $descriptionEditorModal.find('.lang-input').filter(function () {
            return ($(this).val() || '').trim().length > 0;
        }).length > 0;
        const isValid = (currentDescription.length > 0 || anyDescription) && currentDescription.length <= descriptionMaxLength;
        $descriptionInput
            .toggleClass('is-invalid', !isValid)
            .toggleClass('is-valid', isValid);
        return isValid;
    }

    $descriptionControl.on('valueChanged.workflow-edit-required', updateDescriptionValidity);
    $descriptionInput.on('input.workflow-edit-required change.workflow-edit-required', updateDescriptionValidity);
    $descriptionEditorModal.on('input.workflow-edit-required change.workflow-edit-required', '.lang-input', function () {
        updateDescriptionValidity();
    });
    updateDescriptionValidity();
    function text(key) {
        const labels = {
            IT: {
                edit: 'Modifica', versions: 'Versioni', delete: 'Elimina', visible: 'Visibile', hidden: 'Nascosto',
                deleteWorkflow: 'Eliminare il workflow e tutte le versioni collegate?', confirmDeleteVersion: 'Eliminare questa versione?',
                descriptionRequired: 'Inserisci almeno una descrizione.', error: 'Errore durante il caricamento dei dati.',
                previous: 'Precedente', next: 'Successiva', page: 'Pagina', of: 'di', total: 'Record totali',
                visibility: 'Visibilità', version: 'Versione', newWorkflow: 'Nuovo workflow', editWorkflow: 'Modifica workflow',
                description: 'Descrizione', id: 'ID', actions: 'Azioni',
                hideVersion: 'Nascondi versione', showVersion: 'Rendi visibile', delete: 'Elimina',
            },
            GB: {
                edit: 'Edit', versions: 'Versions', delete: 'Delete', visible: 'Visible', hidden: 'Hidden',
                deleteWorkflow: 'Delete this workflow and all its linked versions?', confirmDeleteVersion: 'Delete this version?',
                descriptionRequired: 'Enter at least one description.', error: 'An error occurred while loading the data.',
                previous: 'Previous', next: 'Next', page: 'Page', of: 'of', total: 'Total records',
                visibility: 'Visibility', version: 'Version', newWorkflow: 'New workflow', editWorkflow: 'Edit workflow',
                description: 'Description', id: 'ID', actions: 'Actions',
                hideVersion: 'Hide version', showVersion: 'Make visible', delete: 'Delete',
            },
            ES: {
                edit: 'Modificar', versions: 'Versiones', delete: 'Eliminar', visible: 'Visible', hidden: 'Oculto',
                deleteWorkflow: '¿Eliminar este workflow y todas sus versiones?', confirmDeleteVersion: '¿Eliminar esta versión?',
                descriptionRequired: 'Introduce al menos una descripción.', error: 'Se produjo un error al cargar los datos.',
                previous: 'Anterior', next: 'Siguiente', page: 'Página', of: 'de', total: 'Registros totales',
                visibility: 'Visibilidad', version: 'Versión', newWorkflow: 'Nuevo workflow', editWorkflow: 'Modificar workflow',
                description: 'Descripción', id: 'ID', actions: 'Acciones',
                hideVersion: 'Ocultar versión', showVersion: 'Hacer visible', delete: 'Eliminar',
            },
            CN: {
                edit: '修改', versions: '管理版本', delete: '删除', visible: '可见', hidden: '隐藏',
                deleteWorkflow: '删除此工作流及其所有关联版本？', confirmDeleteVersion: '删除此版本？',
                descriptionRequired: '请至少输入一个描述。', error: '加载数据时发生错误。',
                previous: '上一页', next: '下一页', page: '页', of: '/', total: '记录总数',
                visibility: '可见性', version: '版本', newWorkflow: '新建工作流', editWorkflow: '修改工作流',
                description: '描述', id: 'ID', actions: '操作',
                hideVersion: '隐藏版本', showVersion: '设为可见', delete: '删除',
            }
        };
        return (labels[user.LanguageContext] || labels.GB)[key];
    }

    function api(options) {
        return $.ajax($.extend({ dataType: 'json' }, options)).then(function (result) {
            if (!result || result.status !== 'OK') {
                return $.Deferred().reject(result && result.error ? result.error : { message: text('error') }).promise();
            }
            return result.data;
        });
    }

    function showError(error) {
        const responseError = error && error.responseJSON && error.responseJSON.error;
        const details = responseError || error;
        const message = details && (details.message || details.error)
            ? (details.message || details.error)
            : (error && error.responseText) || text('error');
        ShowError(typeof message === 'string' ? message : JSON.stringify(message), 'workflow-catalog');
    }

    function dateText(value) {
        if (!value) {
            return '';
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        const pad = function (part) {
            return String(part).padStart(2, '0');
        };
        return pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + '/' + date.getFullYear() +
            ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
    }

    function versionDateText(value) {
        if (!value) {
            return '';
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        const pad = function (part) {
            return String(part).padStart(2, '0');
        };
        return pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + '/' + date.getFullYear() +
            ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
    }

    function visibilityText(isVisible) {
        return isVisible ? text('visible') : text('hidden');
    }

    function renderRecords(rows) {
        const $rows = $('.workflow-catalog-rows').empty();
        recordsById = {};
        rows.forEach(function (record) {
            const id = Number(record.IDWorkflow);
            recordsById[id] = record;
            const $row = $('<tr>');
            $('<td>').text(id).appendTo($row);
            $('<td>').text(record.Description || '').appendTo($row);
            $('<td>').text(dateText(record.DataIstanza)).appendTo($row);
            $('<td>').text(visibilityText(record.IsVisible)).appendTo($row);

            const $actions = $('<td>', { class: 'text-end text-nowrap' });
            $('<button>', {
                type: 'button',
                class: 'btn btn-light bi bi-three-dots-vertical rounded-circle forms-context-menu-trigger',
                'data-bs-toggle': 'dropdown',
                'aria-expanded': 'false',
                'aria-label': text('actions')
            }).appendTo($actions);
            const $menuItems = $('<ul>', {
                class: 'dropdown-menu dropdown-menu-end forms-context-menu app-context-menu'
            });
            $('<li>').append(
                $('<div>', { class: 'forms-context-menu-heading app-context-menu-heading' }).append(
                    $('<b>').text(text('id') + ': ' + id)
                )
            ).appendTo($menuItems);
            $('<li>').append($('<hr>', { class: 'dropdown-divider' })).appendTo($menuItems);
            [
                { className: 'workflow-record-versions', icon: 'bi-stickies', label: text('versions') },
                { className: 'workflow-record-edit', icon: 'bi-pencil', label: text('edit') },
                { className: 'workflow-record-delete', icon: 'bi-trash', label: text('delete') }
            ].forEach(function (action) {
                const $action = $('<span>', {
                    class: 'dropdown-item forms-context-menu-action ' + action.className
                }).attr('data-workflow-id', id).append(
                    $('<i>', { class: 'bi ' + action.icon, 'aria-hidden': 'true' }),
                    document.createTextNode(' ' + action.label)
                );
                $('<li>').append($action).appendTo($menuItems);
            });
            $actions.append($menuItems);
            $actions.appendTo($row);
            $rows.append($row);
        });
        $('.workflow-catalog-empty').toggleClass('d-none', rows.length > 0);
    }

    function renderPager(totalRecord) {
        const pageCount = Math.max(1, Math.ceil(totalRecord / pageSize));
        const $pager = $('.workflow-catalog-pager').empty();
        if (totalRecord === 0) {
            return;
        }
        const $previous = $('<button>', {
            type: 'button',
            class: 'btn btn-sm btn-light me-2 workflow-page-previous',
            text: text('previous'),
            disabled: pageIndex <= 1
        });
        const $next = $('<button>', {
            type: 'button',
            class: 'btn btn-sm btn-light ms-2 workflow-page-next',
            text: text('next'),
            disabled: pageIndex >= pageCount
        });
        const $label = $('<span>').text(
            text('page') + ' ' + pageIndex + ' ' + text('of') + ' ' + pageCount + ' · ' +
            totalRecord + ' ' + text('total')
        );
        $pager.append($previous, $label, $next);
    }

    function loadRecords() {
        $('#workflow-catalog-loading').removeClass('d-none');
        return api({
            url: '/workflow/api/records',
            type: 'GET',
            data: {
                pageIndex: pageIndex,
                pageSize: pageSize,
                search: activeFilter.search,
                visibility: activeFilter.visibility
            }
        }).done(function (result) {
            const totalRecord = Number(result.totalRecord) || 0;
            const pageCount = Math.max(1, Math.ceil(totalRecord / pageSize));
            if (pageIndex > pageCount) {
                pageIndex = pageCount;
                loadRecords();
                return;
            }
            renderRecords(result.rows || []);
            renderPager(totalRecord);
        }).fail(showError).always(function () {
            $('#workflow-catalog-loading').addClass('d-none');
        });
    }

    function clearEditor() {
        $('#workflow-editor-id').val('');
        $('.workflow-description-control').multiLanguageTextBox('load', {
            IT: '', GB: '', ES: '', CN: ''
        });
        $('#workflow-editor-visible').prop('checked', true);
        updateDescriptionValidity();
    }

    function openEditor(record) {
        clearEditor();
        if (record) {
            $('#workflow-editor-id').val(record.IDWorkflow);
            $('.workflow-description-control').multiLanguageTextBox('load', {
                IT: record.Description_IT || '',
                GB: record.Description_GB || '',
                ES: record.Description_ES || '',
                CN: record.Description_CN || ''
            });
            $('#workflow-editor-visible').prop('checked', record.IsVisible === true || record.IsVisible === 1);
            $('.workflow-editor-title').text(text('editWorkflow'));
            updateDescriptionValidity();
        } else {
            $('.workflow-editor-title').text(text('newWorkflow'));
            updateDescriptionValidity();
        }
        $('#workflow-catalog-editor').modal('show');
    }

    function readDescriptions() {
        const control = $('.workflow-description-control').data('mltextbox');
        control.refreshValues();
        const values = control.value;
        const descriptions = {
            IT: String(values.IT || '').trim(),
            GB: String(values.GB || '').trim(),
            ES: String(values.ES || '').trim(),
            CN: String(values.CN || '').trim(),
            DE: ''
        };
        const record = recordsById[Number($('#workflow-editor-id').val())];
        if (record) {
            descriptions.DE = record.Description_DE || '';
        }
        return descriptions;
    }

    function saveWorkflow() {
        if (!updateDescriptionValidity()) {
            $descriptionInput.trigger('focus');
            return;
        }
        const descriptions = readDescriptions();
        if (!Object.keys(descriptions).some(function (language) { return descriptions[language]; })) {
            ShowError(text('descriptionRequired'), 'workflow-catalog');
            $descriptionInput.trigger('focus');
            return;
        }

        const id = $('#workflow-editor-id').val();
        const options = {
            url: id ? '/workflow/api/records/' + encodeURIComponent(id) : '/workflow/api/records',
            type: id ? 'PUT' : 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                descriptions: descriptions,
                isVisible: $('#workflow-editor-visible').prop('checked')
            })
        };
        api(options).done(function () {
            $('#workflow-catalog-editor').modal('hide');
            loadRecords();
        }).fail(showError);
    }

    function workflowTitle(record) {
        return record.Description || record.Description_IT || record.Description_GB || ('#' + record.IDWorkflow);
    }

    function renderVersions(versions) {
        const $rows = $('.workflow-version-rows').empty();
        versionsById = {};
        versions.forEach(function (version) {
            const id = Number(version.IDVersioneWorkflow);
            versionsById[id] = version;
            const $row = $('<tr>');
            $('<td>').append(
                $('<i>', {
                    class: 'bi bi-circle-fill ' + (version.IsValid ? 'text-success' : 'text-danger')
                })
            ).appendTo($row);
            $('<td>').text(version.Numero).appendTo($row);
            $('<td>', { class: 'd-none d-md-table-cell' }).text(versionDateText(version.DataRegistrazione)).appendTo($row);
            $('<td>', { class: 'd-none d-md-table-cell' }).text(versionDateText(version.DataUltimaModifica)).appendTo($row);

            const $actions = $('<td>', { class: 'text-end text-nowrap' });
            $('<button>', {
                type: 'button',
                class: 'btn btn-light bi bi-three-dots-vertical rounded-circle forms-context-menu-trigger',
                'data-bs-toggle': 'dropdown',
                'aria-expanded': 'false',
                'aria-label': text('actions')
            }).appendTo($actions);
            const $menuItems = $('<ul>', {
                class: 'dropdown-menu dropdown-menu-end forms-context-menu app-context-menu'
            });
            $('<li>').append(
                $('<div>', { class: 'forms-context-menu-heading app-context-menu-heading' }).append(
                    $('<b>').text(text('id') + ': ' + id)
                )
            ).appendTo($menuItems);
            $('<li>').append($('<hr>', { class: 'dropdown-divider' })).appendTo($menuItems);
            const visibilityAction = $('<span>', {
                class: 'dropdown-item forms-context-menu-action workflow-version-visibility'
            }).attr({
                'data-version-id': id,
                'data-visible': version.IsVisible ? '1' : '0'
            }).append(
                $('<i>', { class: 'bi ' + (version.IsVisible ? 'bi-eye-slash' : 'bi-eye'), 'aria-hidden': 'true' }),
                document.createTextNode(' ' + text(version.IsVisible ? 'hideVersion' : 'showVersion'))
            );
            $('<li>').append(visibilityAction).appendTo($menuItems);
            const editAction = $('<span>', {
                class: 'dropdown-item forms-context-menu-action workflow-version-edit'
            }).attr('data-version-id', id).append(
                $('<i>', { class: 'bi bi-pencil', 'aria-hidden': 'true' }),
                document.createTextNode(' ' + text('edit'))
            );
            $('<li>').append(editAction).appendTo($menuItems);
            const deleteAction = $('<span>', {
                class: 'dropdown-item forms-context-menu-action workflow-version-delete'
            }).attr('data-version-id', id).append(
                $('<i>', { class: 'bi bi-trash', 'aria-hidden': 'true' }),
                document.createTextNode(' ' + text('delete'))
            );
            $('<li>').append(deleteAction).appendTo($menuItems);
            $actions.append($menuItems);
            $actions.appendTo($row);
            $rows.append($row);
        });
        $('.workflow-version-empty').toggleClass('d-none', versions.length > 0);
    }

    function loadVersions() {
        if (!selectedWorkflow) {
            return;
        }
        api({
            url: '/workflow/api/records/' + encodeURIComponent(selectedWorkflow.IDWorkflow) + '/versions',
            type: 'GET'
        }).done(renderVersions).fail(showError);
    }

    $('.workflow-catalog-search').on('click', function () {
        activeFilter = {
            search: $('#workflow-search').val().trim(),
            visibility: $('#workflow-visibility-filter').val()
        };
        pageIndex = 1;
        loadRecords();
    });

    $('#workflow-search').on('keydown', function (event) {
        if (event.key === 'Enter') {
            $('.workflow-catalog-search').trigger('click');
        }
    });

    $('.btn-filter-close').on('click', function () {
        $('.dynamic-forms-layout').addClass('filter-hidden');
    });
    $('.btn-filter-open').on('click', function () {
        $('.dynamic-forms-layout').removeClass('filter-hidden');
    });

    $('.workflow-catalog-create').on('click', function () {
        openEditor(null);
    });
    $('.workflow-editor-save').on('click', saveWorkflow);

    $('.workflow-catalog-rows').on('click', '.workflow-record-edit', function () {
        openEditor(recordsById[Number($(this).attr('data-workflow-id'))]);
    });
    $('.workflow-catalog-rows').on('click', '.workflow-record-versions', function () {
        selectedWorkflow = recordsById[Number($(this).attr('data-workflow-id'))];
        if (!selectedWorkflow) {
            ShowError(text('error'), 'workflow-catalog');
            return;
        }
        $('.workflow-version-workflow-name').text(' - ' + workflowTitle(selectedWorkflow));
        $('#workflow-versions-modal').modal('show');
        loadVersions();
    });
    $('.workflow-catalog-rows').on('click', '.workflow-record-delete', function () {
        const id = Number($(this).attr('data-workflow-id'));
        $CtlDeleteRecord.data('pendingDeleteId', id);
        $CtlDeleteRecord.confirmDelete.show($CtlDeleteRecord);
    });
    $('.workflow-catalog-pager').on('click', '.workflow-page-previous', function () {
        if (pageIndex > 1) {
            pageIndex -= 1;
            loadRecords();
        }
    });
    $('.workflow-catalog-pager').on('click', '.workflow-page-next', function () {
        pageIndex += 1;
        loadRecords();
    });
    $('.workflow-version-create').on('click', function () {
        if (!selectedWorkflow) {
            return;
        }
        api({
            url: '/workflow/api/records/' + encodeURIComponent(selectedWorkflow.IDWorkflow) + '/versions',
            type: 'POST'
        }).done(loadVersions).fail(showError);
    });
    $('.workflow-version-rows').on('click', '.workflow-version-visibility', function () {
        const $button = $(this);
        const visible = $button.attr('data-visible') !== '1';
        api({
            url: '/workflow/api/versions/' + encodeURIComponent($button.attr('data-version-id')),
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ isVisible: visible })
        }).done(loadVersions).fail(showError);
    });
    $('.workflow-version-rows').on('click', '.workflow-version-edit', function () {
        const version = versionsById[Number($(this).attr('data-version-id'))];
        if (!selectedWorkflow || !version) {
            ShowError(text('error'), 'workflow-catalog');
            return;
        }
        $('.workflow-version-editor-frame')
            .attr('src', '/workflow-editor?versionId=' + encodeURIComponent(version.IDVersioneWorkflow));
        $('#workflow-version-editor-modal').modal('show');
    });
    $('#workflow-version-editor-modal').on('hidden.bs.modal', function () {
        $('.workflow-version-editor-frame').attr('src', 'about:blank');
        if ($('#workflow-versions-modal').hasClass('show')) {
            $('body').addClass('modal-open');
        }
    });
    $('#workflow-versions-modal').on('hidden.bs.modal', function () {
        $('#workflow-version-editor-modal').modal('hide');
    });
    window.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'workflow-version-editor-closed') {
            $('#workflow-version-editor-modal').modal('hide');
            loadVersions();
        }
    });
    $('.workflow-version-rows').on('click', '.workflow-version-delete', function () {
        $CtlDeleteVersion.data('pendingDeleteId', $(this).attr('data-version-id'));
        $CtlDeleteVersion.confirmDelete.show($CtlDeleteVersion);
    });

    loadRecords();
});
