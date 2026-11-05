$(function () {
    var user = JSON.parse($('#user').val());
    var IdProcesso = Number($('#dynamic-process-id').val());
    var process = {
        IDModello: Number($('#dynamic-model-id').val()),
        IDVersione: Number($('#dynamic-version-id').val())
    };
    var apiBase = '/dynamic-forms/' + IdProcesso + '/api';
    var pageIndex = 1;
    var pageSize = 20;
    var totalRecord = 0;
    var fields = [];
    var actions = [];
    var activeFilter = [];
    var deleteInstanceId = null;
    var editorMode = 'edit';
    var actionLoading = false;

    function text(key) {
        var labels = {
            IT: {
                id: 'ID', creator: 'Creato da', status: 'Stato', actions: 'Azioni', insert: 'Inserisci', read: 'Visualizza',
                edit: 'Modifica', preview: 'Anteprima', delete: 'Elimina', from: 'Da', to: 'A',
                currentState: 'Stato attuale',
                workflow: 'Workflow', noWorkflow: 'Nessuno stato da impostare',
                previous: 'Precedente', next: 'Successiva', page: 'Pagina',
                of: 'di', total: 'Record Totali',
                error: 'Errore durante il caricamento dei dati.'
            },
            GB: {
                id: 'ID', creator: 'Created by', status: 'Status', actions: 'Actions', insert: 'Add', read: 'View',
                edit: 'Edit', preview: 'Preview', delete: 'Delete', from: 'From', to: 'To',
                currentState: 'Current state',
                workflow: 'Workflow', noWorkflow: 'No state available to set',
                previous: 'Previous', next: 'Next', page: 'Page',
                of: 'of', total: 'Total records',
                error: 'An error occurred while loading data.'
            },
            ES: {
                id: 'ID', creator: 'Creado por', status: 'Estado', actions: 'Acciones', insert: 'Añadir', read: 'Ver',
                edit: 'Modificar', preview: 'Vista previa', delete: 'Eliminar', from: 'Desde', to: 'Hasta',
                currentState: 'Estado actual',
                workflow: 'Flujo de trabajo', noWorkflow: 'No hay estados disponibles',
                previous: 'Anterior', next: 'Siguiente', page: 'Página',
                of: 'de', total: 'Registros totales',
                error: 'Se produjo un error al cargar los datos.'
            },
            CN: {
                id: 'ID', creator: '创建者', status: '状态', actions: '操作', insert: '新增', read: '查看',
                edit: '修改', preview: '预览', delete: '删除', from: '从', to: '至',
                currentState: '当前状态',
                workflow: '工作流', noWorkflow: '没有可设置的状态',
                previous: '上一页', next: '下一页', page: '页',
                of: '/', total: '记录总数',
                error: '加载数据时发生错误。'
            }
        };
        return (labels[user.LanguageContext] || labels.GB)[key];
    }

    function escapeHtml(value) {
        return $('<div>').text(value == null ? '' : String(value)).html();
    }

    function unwrap(response) {
        if (!response || response.status !== 'OK') {
            var message = response && response.error
                ? (response.error.message || response.error)
                : text('error');
            throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
        }
        return response.data;
    }

    function requestError(xhr) {
        var message = xhr.responseJSON && xhr.responseJSON.error
            ? (xhr.responseJSON.error.message || xhr.responseJSON.error)
            : (xhr.responseText || xhr.statusText || text('error'));
        ShowError(typeof message === 'string' ? message : JSON.stringify(message), 'dynamic-forms');
    }

    function startActionLoading() {
        if (actionLoading) {
            return $.Deferred().reject(new Error('Another action is still loading.')).promise();
        }

        actionLoading = true;
        $('#dynamic-form-loading').removeClass('d-none').attr('aria-hidden', 'false');
        return $.Deferred().resolve().promise();
    }

    function finishActionLoading(modalSelector) {
        $('#dynamic-form-loading').addClass('d-none').attr('aria-hidden', 'true');
        actionLoading = false;
        if (modalSelector) {
            $(modalSelector).modal('show');
        }
        return $.Deferred().resolve().promise();
    }

    function cancelActionLoading() {
        if (!actionLoading) {
            return;
        }
        finishActionLoading(null);
    }

    function showEditorLoadError(error) {
        cancelActionLoading();
        var message = error && (error.message || error);
        ShowError(typeof message === 'string' ? message : text('error'), 'openEditor');
    }

    function getAction(name) {
        return actions.find(function (action) {
            return String(action.ActionName).toLowerCase() === name.toLowerCase();
        });
    }

    function isAuthorized(actionName) {
        var action = getAction(actionName);
        return !!action && (action.IsAuthorized === true || action.IsAuthorized === 1);
    }

    function actionIcon(actionName) {
        switch (String(actionName).toLowerCase()) {
            case 'lettura':
                return 'bi-eye';
            case 'modifica':
                return 'bi-pencil';
            case 'cancellazione':
                return 'bi-trash';
            default:
                return 'bi-lightning';
        }
    }

    function parseWorkflowAuthorizedActionIds(authorizedActions) {
        if (typeof authorizedActions === 'string') {
            authorizedActions = JSON.parse(authorizedActions);
        }
        if (authorizedActions == null) {
            return [];
        }
        if (!Array.isArray(authorizedActions)) {
            throw new Error('Invalid workflow action authorization data.');
        }

        return authorizedActions.map(function (item) {
            var actionId = Number(typeof item === 'object' ? item.IDProcessoAzione : item);
            if (!Number.isSafeInteger(actionId) || actionId < 1) {
                throw new Error('Invalid workflow action authorization data.');
            }
            return actionId;
        });
    }

    function workflowAuthorizedActionIds(row) {
        return row.WorkflowRecordId
            ? parseWorkflowAuthorizedActionIds(row.WorkflowAuthorizedActions)
            : null;
    }

    function isActionEnabledForState(action, workflowRecordId, authorizedActionIds) {
        var processAuthorized = action.IsAuthorized === true || action.IsAuthorized === 1;
        return processAuthorized && (!workflowRecordId ||
            authorizedActionIds.indexOf(Number(action.IDProcessoAzione)) !== -1);
    }

    function createActionButton(action, instanceId, workflowRecordId, authorizedActionIds) {
        var name = String(action.ActionName || '');
        var description = action.Description || name;
        var allowed = isActionEnabledForState(action, workflowRecordId, authorizedActionIds);
        var $button = $('<button>', {
            type: 'button',
            class: 'dropdown-item p-2 app-context-menu-item dynamic-form-row-action' + (allowed ? '' : ' disabled'),
            disabled: !allowed,
            'aria-disabled': allowed ? 'false' : 'true',
            tabindex: allowed ? null : -1
        }).attr({
            'data-action': name,
            'data-instance-id': instanceId,
            'data-workflow-record-id': workflowRecordId || '',
            'data-workflow-authorized-actions': JSON.stringify(authorizedActionIds)
        }).append(
            $('<i>', { class: 'bi ' + actionIcon(name), 'aria-hidden': 'true' }),
            document.createTextNode('\u00a0\u00a0' + description)
        );

        if (allowed) {
            $button.on('click', function (event) {
                event.preventDefault();
                try {
                    executeAction(
                        $(this).attr('data-action'),
                        $(this).attr('data-instance-id'),
                        $(this).attr('data-workflow-record-id'),
                        parseWorkflowAuthorizedActionIds($(this).attr('data-workflow-authorized-actions'))
                    );
                } catch (error) {
                    ShowError(error.message, 'dynamic-form-row-action');
                }
            });
        }

        return $('<li>').append($button);
    }

    function checkWorkflowAvailability($menu, workflowRecordId) {
        var $workflowAction = $menu.find('.dynamic-form-workflow-action');
        var $noWorkflow = $menu.find('.dynamic-form-no-workflow');
        $workflowAction.addClass('d-none');
        $noWorkflow.removeClass('d-none').text(text('noWorkflow'));

        if (!workflowRecordId) {
            return;
        }

        $.ajax({
            type: 'POST',
            url: '/workflow-has-transitions/' + encodeURIComponent(workflowRecordId),
            data: {
                IdProcesso: IdProcesso,
                IdProfiloUtente: user.IDProfiloUtenteDefault
            }
        }).done(function (response) {
            try {
                var result = unwrap(response);
                if (result === 'OK') {
                    $workflowAction.removeClass('d-none');
                    $noWorkflow.addClass('d-none');
                } else if (result !== 'KO') {
                    throw new Error('Invalid workflow authorization response.');
                }
            } catch (error) {
                ShowError(error.message, 'checkWorkflowAvailability');
            }
        }).fail(requestError);
    }

    function workflowNoteRequired(value) {
        return value === true || value === 1 || value === '1' || value === 'true';
    }

    function updateWorkflowNoteValidity($note, showFeedback) {
        var isRequired = $note.prop('required');
        var isValid = String($note.val() || '').trim().length > 0;
        var showStatus = isRequired && (showFeedback || $note.data('validation-attempted') === true);
        $note
            .toggleClass('is-invalid', showStatus && !isValid)
            .toggleClass('is-valid', showStatus && isValid)
            .attr('aria-invalid', showStatus && !isValid ? 'true' : 'false');
        return !isRequired || isValid;
    }

    function openWorkflow(workflowRecordId, $workflowAction) {
        if (!workflowRecordId) {
            return;
        }

        startActionLoading().done(function () {
            $.ajax({
                type: 'POST',
                url: '/workflow-transitions/' + encodeURIComponent(workflowRecordId),
                data: {
                    IdProcesso: IdProcesso,
                    IdProfiloUtente: user.IDProfiloUtenteDefault
                }
            }).done(function (response) {
                try {
                    var transitions = unwrap(response);
                    var $transitions = $('.dynamic-form-workflow-transitions').empty();
                    var $noteContainer = $('.dynamic-form-workflow-note');
                    var $note = $('.dynamic-form-workflow-note-input');
                    $('.dynamic-form-workflow-apply').prop('disabled', true);
                    $note.val('')
                        .prop('required', false)
                        .removeClass('is-valid is-invalid')
                        .attr('aria-invalid', 'false')
                        .data('validation-attempted', false);
                    $noteContainer.addClass('d-none');

                    if (transitions == null || transitions === '' ||
                        (Array.isArray(transitions) && transitions.length === 0)) {
                        var $menu = $workflowAction.closest('.processi-context-menu');
                        $workflowAction.addClass('d-none');
                        $menu.find('.dynamic-form-no-workflow').removeClass('d-none');
                        finishActionLoading(null);
                        return;
                    }
                    if (!Array.isArray(transitions)) {
                        throw new Error('Invalid workflow transition response.');
                    }

                    transitions.forEach(function (transition, index) {
                        var inputId = 'dynamic-form-transition-' + workflowRecordId + '-' + index;
                        var $input = $('<input>', {
                            type: 'radio',
                            class: 'form-check-input dynamic-form-workflow-transition',
                            name: 'dynamic-form-workflow-transition',
                            id: inputId,
                            value: transition.IDEventoDirezione
                        }).attr('data-note-required', workflowNoteRequired(transition.IsAvailableNote));
                        var $label = $('<label>', {
                            class: 'form-check-label ms-2',
                            for: inputId,
                            text: transition.Descrizione || ''
                        });
                        $('<div>', { class: 'form-check mb-2' })
                            .append($input, $label)
                            .appendTo($transitions);
                    });

                    $('.dynamic-form-workflow-apply').data('workflow-record-id', workflowRecordId);
                    finishActionLoading('#dynamic-form-workflow-modal');
                } catch (error) {
                    cancelActionLoading();
                    ShowError(error.message, 'openWorkflow');
                }
            }).fail(function (xhr) {
                cancelActionLoading();
                requestError(xhr);
            });
        }).fail(function (error) {
            ShowError(error.message, 'openWorkflow');
        });
    }

    function openHistory(workflowRecordId, instanceId) {
        if (!workflowRecordId) {
            return;
        }

        startActionLoading().done(function () {
            var $history = $('.dynamic-form-history');
            $history.workflowhistory({
                IdRecord: workflowRecordId,
                IdProcesso: IdProcesso,
                LanguageContext: user.LanguageContext,
                user: user
            });
            $('.dynamic-form-history-record-id').text(instanceId || workflowRecordId);

            $history.workflowhistory.loadHistory($history).done(function () {
                finishActionLoading('#dynamic-form-history-modal');
            }).fail(function (error) {
                cancelActionLoading();
                if (error && error.message) {
                    ShowError(error.message, 'openHistory');
                }
            });
        }).fail(function (error) {
            ShowError(error.message, 'openHistory');
        });
    }

    function renderActions() {
        var insertAction = getAction('Inserimento');
        var $insert = $('.dynamic-form-insert-action').empty();
        if (insertAction) {
            var insertAllowed = insertAction.IsAuthorized === true || insertAction.IsAuthorized === 1;
            $('<button>', {
                type: 'button',
                class: 'btn btn-primary dynamic-form-insert' + (insertAllowed ? '' : ' disabled'),
                disabled: !insertAllowed,
                text: insertAction.Description || text('insert')
            }).appendTo($insert);
        }
    }

    function renderFilters(states) {
        var $container = $('.dynamic-form-filters').empty();
        var $stateWrapper = $('<div>', { class: 'mb-3 dynamic-filter-field' });
        var $stateSelect = $('<select>', {
            id: 'dynamic-filter-current-state',
            class: 'form-select dynamic-filter-current-state'
        });
        $('<label>', {
            class: 'form-label',
            for: 'dynamic-filter-current-state',
            text: text('currentState')
        }).appendTo($stateWrapper);
        $('<option>', { value: '', text: '...' }).appendTo($stateSelect);
        (states || []).forEach(function (state) {
            $('<option>', {
                value: state.IDEventoTransizione,
                text: state.Description
            }).appendTo($stateSelect);
        });
        $stateWrapper.append($stateSelect).appendTo($container);

        fields.filter(function (field) {
            return field.IsFilter === true || field.IsFilter === 1;
        }).forEach(function (field) {
            var id = 'dynamic-filter-' + field.IDAttributo;
            var $wrapper = $('<div>', { class: 'mb-3 dynamic-filter-field' });
            $('<label>', {
                class: 'form-label',
                for: id,
                text: field.Description || ''
            }).appendTo($wrapper);

            if (Number(field.IDTipoDati) === 4) {
                var $dates = $('<div>', { class: 'd-flex gap-2' });
                $('<input>', {
                    type: 'date',
                    class: 'form-control dynamic-filter-from',
                    'data-id-attributo': field.IDAttributo,
                    placeholder: text('from'),
                    'aria-label': (field.Description || '') + ' ' + text('from')
                }).appendTo($dates);
                $('<input>', {
                    type: 'date',
                    class: 'form-control dynamic-filter-to',
                    'data-id-attributo': field.IDAttributo,
                    placeholder: text('to'),
                    'aria-label': (field.Description || '') + ' ' + text('to')
                }).appendTo($dates);
                $wrapper.append($dates);
            } else if (Number(field.IDTipoDati) === 6) {
                $('<select>', {
                    id: id,
                    class: 'form-select dynamic-filter-value',
                    'data-id-attributo': field.IDAttributo
                }).appendTo($wrapper);
                loadFilterValues(field.IDAttributo, id);
            } else {
                $('<input>', {
                    id: id,
                    type: Number(field.IDTipoDati) === 2 ? 'number' : 'text',
                    class: 'form-control dynamic-filter-value',
                    'data-id-attributo': field.IDAttributo
                }).appendTo($wrapper);
            }
            $container.append($wrapper);
        });
    }

    function loadFilterValues(IdAttributo, controlId) {
        $.getJSON(apiBase + '/model-class-attribute-values/' + IdAttributo)
            .done(function (response) {
                try {
                    var values = unwrap(response) || [];
                    var $select = $('#' + controlId);
                    $('<option>', { value: '', text: '...' }).appendTo($select);
                    values.forEach(function (value) {
                        $('<option>', {
                            value: value.Code,
                            text: value.Description
                        }).appendTo($select);
                    });
                } catch (error) {
                    ShowError(error.message, 'loadFilterValues');
                }
            })
            .fail(requestError);
    }

    function collectFilter() {
        var filters = [];
        var currentStateId = $('.dynamic-filter-current-state').val();
        if (currentStateId) {
            filters.push({
                filterType: 'currentState',
                stateId: Number(currentStateId)
            });
        }
        $('.dynamic-filter-value').each(function () {
            var value = $(this).val();
            if (value !== '' && value != null) {
                filters.push({
                    IDAttributo: Number($(this).data('id-attributo')),
                    value: value
                });
            }
        });
        $('.dynamic-filter-from').each(function () {
            var from = $(this).val();
            var $toControl = $(this).closest('.dynamic-filter-field').find('.dynamic-filter-to');
            var to = $toControl.val();
            if (from || to) {
                filters.push({
                    IDAttributo: Number($(this).data('id-attributo')),
                    from: from || null,
                    to: to || null
                });
            }
        });
        return filters;
    }

    function summaryValue(row, field) {
        var values;
        try {
            values = row.SummaryJson ? JSON.parse(row.SummaryJson) : [];
        } catch (error) {
            throw new Error('Invalid summary data returned for record ' + row.IDModelloIstanza + '.');
        }
        var match = values.find(function (value) {
            return Number(value.IDAttributo) === Number(field.IDAttributo);
        });
        if (!match || match.Value == null) {
            return '';
        }
        return match.Value;
    }

    function renderHeading() {
        var $heading = $('.dynamic-form-records-heading').empty();
        $('<th>', { scope: 'col', text: text('id') }).appendTo($heading);
        $('<th>', { scope: 'col', text: text('creator') }).appendTo($heading);
        fields.filter(function (field) {
            return field.IsSummary === true || field.IsSummary === 1;
        }).forEach(function (field) {
            $('<th>', { scope: 'col', text: field.Description || '' }).appendTo($heading);
        });
        $('<th>', { scope: 'col', text: text('status') }).appendTo($heading);
        $('<th>', { scope: 'col', class: 'text-end', text: text('actions') }).appendTo($heading);
    }

    function renderRecords(rows) {
        var $rows = $('.dynamic-form-records').empty();
        var summaryFields = fields.filter(function (field) {
            return field.IsSummary === true || field.IsSummary === 1;
        });
        rows.forEach(function (row) {
            var authorizedActionIds = workflowAuthorizedActionIds(row);
            var $tr = $('<tr>');
            $('<td>', { text: row.IDModelloIstanza }).appendTo($tr);
            $('<td>', { text: row.CreatedBy || '' }).appendTo($tr);
            summaryFields.forEach(function (field) {
                $('<td>', { text: summaryValue(row, field) }).appendTo($tr);
            });
            $('<td>', { text: row.CurrentState || '' }).appendTo($tr);

            var $menu = $('<div>', { class: 'btn-group ms-auto flex-shrink-0' });
            $('<button>', {
                type: 'button',
                class: 'btn btn-light bi bi-three-dots-vertical processi-context-trigger',
                'data-bs-toggle': 'dropdown',
                'aria-expanded': 'false',
                'aria-label': text('actions')
            }).appendTo($menu);
            var $menuItems = $('<ul>', { class: 'dropdown-menu dropdown-menu-end app-context-menu processi-context-menu' });
            $('<li>').append(
                $('<div>', { class: 'app-context-menu-heading' }).append(
                    $('<b>').text(row.IDModelloIstanza)
                )
            ).appendTo($menuItems);
            $('<li>').append($('<hr>', { class: 'dropdown-divider' })).appendTo($menuItems);
            actions.filter(function (action) {
                return String(action.ActionName).toLowerCase() !== 'inserimento' &&
                    (action.IsAuthorized === true || action.IsAuthorized === 1);
            }).forEach(function (action) {
                $menuItems.append(createActionButton(
                    action,
                    row.IDModelloIstanza,
                    row.WorkflowRecordId,
                    authorizedActionIds || []
                ));
            });
            $('<li>').append($('<hr>', { class: 'dropdown-divider' })).appendTo($menuItems);
            var $workflowAction = $('<button>', {
                type: 'button',
                class: 'dropdown-item p-2 app-context-menu-item dynamic-form-workflow-action d-none',
                'data-workflow-record-id': row.WorkflowRecordId,
                html: '<i class="bi bi-diagram-3" aria-hidden="true"></i>&nbsp;&nbsp;' + escapeHtml(text('workflow'))
            }).on('click', function (event) {
                event.preventDefault();
                openWorkflow($(this).attr('data-workflow-record-id'), $(this));
            });
            $('<li>').append($workflowAction).appendTo($menuItems);
            $('<li>').append($('<div>', {
                class: 'dropdown-item disabled p-2 app-context-menu-item text-secondary dynamic-form-no-workflow',
                'aria-disabled': 'true',
                text: text('noWorkflow')
            })).appendTo($menuItems);
            if (row.CanSwitchState === undefined) {
                checkWorkflowAvailability($menuItems, row.WorkflowRecordId);
            } else if (row.CanSwitchState === true || row.CanSwitchState === 1) {
                $workflowAction.removeClass('d-none');
                $menuItems.find('.dynamic-form-no-workflow').addClass('d-none');
            }
            $menu.append($menuItems);
            $('<td>', { class: 'text-end' }).append($menu).appendTo($tr);
            $rows.append($tr);
        });
        $('.dynamic-form-empty').toggleClass('d-none', rows.length > 0);
    }

    function renderPager() {
        var pages = Math.max(1, Math.ceil(totalRecord / pageSize));
        var $pager = $('.dynamic-form-pager').empty();
        var $previous = $('<button>', {
            type: 'button',
            class: 'btn btn-outline-secondary btn-sm me-2',
            text: text('previous'),
            disabled: pageIndex <= 1
        }).appendTo($pager);
        $('<span>', {
            class: 'align-middle',
            text: text('page') + ' ' + pageIndex + ' ' + text('of') + ' ' + pages
        }).appendTo($pager);
        var $next = $('<button>', {
            type: 'button',
            class: 'btn btn-outline-secondary btn-sm ms-2',
            text: text('next'),
            disabled: pageIndex >= pages
        }).appendTo($pager);
        $previous.on('click', function () {
            if (pageIndex > 1) {
                pageIndex--;
                loadRecords();
            }
        });
        $next.on('click', function () {
            if (pageIndex < pages) {
                pageIndex++;
                loadRecords();
            }
        });
        $('<span>', {
            class: 'float-end',
            text: text('total') + ' ' + totalRecord
        }).appendTo($pager);
    }

    function loadRecords() {
        $.ajax({
            type: 'POST',
            url: apiBase + '/records',
            data: {
                pageIndex: pageIndex,
                pageSize: pageSize,
                filter: activeFilter
            }
        }).done(function (response) {
            try {
                var result = unwrap(response);
                totalRecord = Number(result.totalRecord) || 0;
                renderRecords(result.rows || []);
                renderPager();
            } catch (error) {
                ShowError(error.message, 'loadRecords');
            }
        }).fail(requestError);
    }

    function openEditor(instanceId, mode) {
        startActionLoading().done(function () {
            loadEditor(instanceId, mode);
        }).fail(function (error) {
            ShowError(error.message, 'openEditor');
        });
    }

    function loadEditor(instanceId, mode) {
        editorMode = mode;
        var $container = $('.container-dynamic-form-edit');
        var editorShown = false;
        $container.empty();
        $('.dynamic-form-editor-title').text(mode === 'new' ? text('insert') :
            (mode === 'preview' ? text('preview') : (mode === 'view' ? text('read') : text('edit'))));
        $('.dynamic-form-editor-record-id').text(instanceId ? ' (' + instanceId + ')' : '');
        $container.off('.dynamicForms');
        $container.on('onsave.dynamicForms', function () {
            pageIndex = 1;
            loadRecords();
        });
        $container.on('onload.dynamicForms', function () {
            if (editorMode === 'view' || editorMode === 'preview') {
                $container.find(':input').not('.model-section-toggle').prop('disabled', true);
                $container.find('.btn-salva, .btn-delete, .btn-success').hide();
            }
            if (!editorShown) {
                editorShown = true;
                finishActionLoading('#dynamic-form-editor');
            }
        });
        $container.on('loaderror.dynamicForms', function (event, error) {
            showEditorLoadError(error);
        });
        $container.model({
            IDModello: process.IDModello,
            IDVersione: process.IDVersione,
            IDModelloIstanza: instanceId || null,
            Mode: 'edit',
            ReadOnly: mode === 'view' || mode === 'preview',
            user: user,
            ApiBase: apiBase
        });
        $container.model.load();
    }

    function isAuthorizedForState(actionName, workflowRecordId, authorizedActionIds) {
        var action = getAction(actionName);
        return !!action && isActionEnabledForState(action, workflowRecordId, authorizedActionIds);
    }

    function executeAction(actionName, instanceId, workflowRecordId, authorizedActionIds) {
        switch (String(actionName).toLowerCase()) {
            case 'lettura':
                if (isAuthorizedForState(actionName, workflowRecordId, authorizedActionIds)) {
                    openEditor(instanceId, 'view');
                }
                break;
            case 'anteprima':
                if (isAuthorizedForState(actionName, workflowRecordId, authorizedActionIds)) {
                    openEditor(instanceId, 'preview');
                }
                break;
            case 'modifica':
                if (isAuthorizedForState(actionName, workflowRecordId, authorizedActionIds)) {
                    openEditor(instanceId, 'edit');
                }
                break;
            case 'cancellazione':
                if (isAuthorizedForState(actionName, workflowRecordId, authorizedActionIds)) {
                    deleteInstanceId = Number(instanceId);
                    startActionLoading().done(function () {
                        finishActionLoading('#dynamic-form-delete-confirm');
                    }).fail(function (error) {
                        ShowError(error.message, 'executeAction');
                    });
                }
                break;
            case 'visualizzastoria':
                if (isAuthorizedForState(actionName, workflowRecordId, authorizedActionIds)) {
                    openHistory(workflowRecordId, instanceId);
                }
                break;
            default:
                ShowError('Unsupported process action: ' + actionName, 'executeAction');
        }
    }

    $('.btn-filter-close').on('click', function () {
        $('.dynamic-forms-layout').addClass('filter-hidden');
    });
    $('.btn-filter-open').on('click', function () {
        $('.dynamic-forms-layout').removeClass('filter-hidden');
        $(this).blur();
    });
    $('.dynamic-form-search').on('click', function () {
        activeFilter = collectFilter();
        pageIndex = 1;
        loadRecords();
    });
    $('.dynamic-form-insert-action').on('click', '.dynamic-form-insert', function () {
        if (isAuthorized('Inserimento')) {
            openEditor(null, 'new');
        }
    });
    $('.dynamic-form-records').on('show.bs.dropdown', '.btn-group', function () {
        var $group = $(this);
        var $menu = $(this).children('.processi-context-menu');
        if (!$menu.length || $menu.data('dropdownOriginalParent')) {
            return;
        }

        $group.data('contextMenu', $menu);
        $menu.data({
            dropdownOriginalParent: $menu.parent(),
            dropdownOriginalNextSibling: $menu.next()[0] || null
        });
        $menu.appendTo(document.body);
    });
    $('.dynamic-form-records').on('hidden.bs.dropdown', '.btn-group', function () {
        var $group = $(this);
        var $menu = $group.data('contextMenu');
        if (!$menu || !$menu.length) {
            return;
        }

        var originalParent = $menu.data('dropdownOriginalParent');
        if (!originalParent || !originalParent.length) {
            return;
        }

        var nextSibling = $menu.data('dropdownOriginalNextSibling');
        if (nextSibling && nextSibling.parentNode === originalParent[0]) {
            $menu.insertBefore(nextSibling);
        } else {
            $menu.appendTo(originalParent);
        }
        $menu.removeData('dropdownOriginalParent dropdownOriginalNextSibling');
        $group.removeData('contextMenu');
    });
    $('.dynamic-form-workflow-transitions').on('change', '.dynamic-form-workflow-transition', function () {
        var requiresNote = workflowNoteRequired($(this).attr('data-note-required'));
        var $noteContainer = $('.dynamic-form-workflow-note');
        var $note = $('.dynamic-form-workflow-note-input');
        $noteContainer.toggleClass('d-none', !requiresNote);
        $note.prop('required', requiresNote);
        if (!requiresNote) {
            $note.data('validation-attempted', false);
        }
        updateWorkflowNoteValidity($note);
        $('.dynamic-form-workflow-apply').prop('disabled', false);
    });
    $('.dynamic-form-workflow-note-input').on('input', function () {
        updateWorkflowNoteValidity($(this));
    });
    $('.dynamic-form-workflow-apply').on('click', function () {
        var workflowRecordId = $(this).data('workflow-record-id');
        var $selected = $('.dynamic-form-workflow-transition:checked');
        var $note = $('.dynamic-form-workflow-note-input');
        var note = $note.val();
        if (!workflowRecordId || !$selected.length) {
            return;
        }
        $note.prop('required', workflowNoteRequired($selected.attr('data-note-required')));
        $note.data('validation-attempted', true);
        if (!updateWorkflowNoteValidity($note, true)) {
            $note.trigger('focus');
            return;
        }

        $.ajax({
            type: 'POST',
            url: '/workflow-apply/' + encodeURIComponent(workflowRecordId),
            data: {
                IDEventoDirezione: $selected.val(),
                IDProcesso: IdProcesso,
                Note: note
            }
        }).done(function (response) {
            try {
                unwrap(response);
                $('#dynamic-form-workflow-modal').modal('hide');
                loadRecords();
            } catch (error) {
                ShowError(error.message, 'applyWorkflow');
            }
        }).fail(requestError);
    });
    $('.dynamic-form-delete-confirm').on('click', function () {
        if (!deleteInstanceId || !isAuthorized('Cancellazione')) {
            return;
        }
        $.ajax({
            type: 'DELETE',
            url: apiBase + '/records/' + deleteInstanceId
        }).done(function (response) {
            try {
                unwrap(response);
                $('#dynamic-form-delete-confirm').modal('hide');
                deleteInstanceId = null;
                if (pageIndex > 1 && totalRecord - 1 <= (pageIndex - 1) * pageSize) {
                    pageIndex--;
                }
                loadRecords();
            } catch (error) {
                ShowError(error.message, 'deleteInstance');
            }
        }).fail(requestError);
    });

    $.when(
        $.getJSON(apiBase + '/fields'),
        $.getJSON(apiBase + '/actions'),
        $.getJSON(apiBase + '/states')
    ).done(function (fieldsResponse, actionsResponse, statesResponse) {
        try {
            fields = unwrap(fieldsResponse[0]) || [];
            actions = unwrap(actionsResponse[0]) || [];
            var states = unwrap(statesResponse[0]) || [];
            renderFilters(states);
            renderHeading();
            renderActions();
            loadRecords();
        } catch (error) {
            ShowError(error.message, 'dynamic-forms');
        }
    }).fail(requestError);
});
