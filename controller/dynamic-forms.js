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
    var workflowApplying = false;
    var selectedWorkflowFiles = [];
    var originSelection = null;
    var originSelectionRequestId = 0;

    function text(key) {
        var labels = {
            IT: {
                id: 'ID', creator: 'Creato da', registrationDate: 'Data registrazione', status: 'Stato',
                actions: 'Azioni', insert: 'Inserisci', read: 'Visualizza',
                edit: 'Modifica', preview: 'Anteprima', delete: 'Elimina', from: 'Da', to: 'A',
                today: 'Oggi', yesterday: 'Ieri', lastSevenDays: '7 giorni', thisMonth: 'Questo mese',
                interval: 'Intervallo', between: 'Compreso fra', greaterOrEqual: 'Maggiore o uguale a',
                lessOrEqual: 'Minore o uguale a', exactDay: 'Giorno esatto',
                invalidRegistrationDate: 'Impostare le date richieste dal filtro.',
                currentState: 'Stato attuale',
                workflow: 'Workflow', noWorkflow: 'Nessuno stato da impostare',
                attach: 'Allega file', removeAttachment: 'Rimuovi allegato',
                tooManyAttachments: 'Sono consentiti al massimo 5 allegati.',
                previous: 'Precedente', next: 'Successiva', page: 'Pagina',
                of: 'di', total: 'Record Totali',
                error: 'Errore durante il caricamento dei dati.', invalidId: 'ID non valido.',
                recordUnavailable: 'Richiesta non trovata o non autorizzata.',
                export: 'Esporta', exportExcel: 'Esporta Excel', exportPdf: 'Esporta PDF',
                generating: 'Generazione in corso',
                exportError: 'Errore durante l\'esportazione dei dati.'
            },
            GB: {
                id: 'ID', creator: 'Created by', registrationDate: 'Registration date', status: 'Status',
                actions: 'Actions', insert: 'Add', read: 'View',
                edit: 'Edit', preview: 'Preview', delete: 'Delete', from: 'From', to: 'To',
                today: 'Today', yesterday: 'Yesterday', lastSevenDays: '7 days', thisMonth: 'This month',
                interval: 'Interval', between: 'Between', greaterOrEqual: 'Greater than or equal to',
                lessOrEqual: 'Less than or equal to', exactDay: 'Exact day',
                invalidRegistrationDate: 'Set the dates required by the filter.',
                currentState: 'Current state',
                workflow: 'Workflow', noWorkflow: 'No state available to set',
                attach: 'Attach files', removeAttachment: 'Remove attachment',
                tooManyAttachments: 'A maximum of 5 attachments is allowed.',
                previous: 'Previous', next: 'Next', page: 'Page',
                of: 'of', total: 'Total records',
                error: 'An error occurred while loading data.', invalidId: 'Invalid ID.',
                recordUnavailable: 'Request not found or access denied.',
                export: 'Export', exportExcel: 'Export Excel', exportPdf: 'Export PDF',
                generating: 'Generating file',
                exportError: 'An error occurred while exporting data.'
            },
            ES: {
                id: 'ID', creator: 'Creado por', registrationDate: 'Fecha de registro', status: 'Estado',
                actions: 'Acciones', insert: 'Añadir', read: 'Ver',
                edit: 'Modificar', preview: 'Vista previa', delete: 'Eliminar', from: 'Desde', to: 'Hasta',
                today: 'Hoy', yesterday: 'Ayer', lastSevenDays: '7 días', thisMonth: 'Este mes',
                interval: 'Intervalo', between: 'Entre', greaterOrEqual: 'Mayor o igual que',
                lessOrEqual: 'Menor o igual que', exactDay: 'Día exacto',
                invalidRegistrationDate: 'Introduzca las fechas requeridas por el filtro.',
                currentState: 'Estado actual',
                workflow: 'Flujo de trabajo', noWorkflow: 'No hay estados disponibles',
                attach: 'Adjuntar archivos', removeAttachment: 'Quitar archivo adjunto',
                tooManyAttachments: 'Se permiten como máximo 5 archivos adjuntos.',
                previous: 'Anterior', next: 'Siguiente', page: 'Página',
                of: 'de', total: 'Registros totales',
                error: 'Se produjo un error al cargar los datos.', invalidId: 'ID no válido.',
                recordUnavailable: 'Solicitud no encontrada o acceso denegado.',
                export: 'Exportar', exportExcel: 'Exportar Excel', exportPdf: 'Exportar PDF',
                generating: 'Generación en curso',
                exportError: 'Se produjo un error al exportar los datos.'
            },
            CN: {
                id: 'ID', creator: '创建者', registrationDate: '登记日期', status: '状态',
                actions: '操作', insert: '新增', read: '查看',
                edit: '修改', preview: '预览', delete: '删除', from: '从', to: '至',
                today: '今天', yesterday: '昨天', lastSevenDays: '7 天', thisMonth: '本月',
                interval: '区间', between: '介于', greaterOrEqual: '大于或等于',
                lessOrEqual: '小于或等于', exactDay: '具体日期',
                invalidRegistrationDate: '请设置筛选所需的日期。',
                currentState: '当前状态',
                workflow: '工作流', noWorkflow: '没有可设置的状态',
                attach: '添加附件', removeAttachment: '移除附件',
                tooManyAttachments: '最多允许 5 个附件。',
                previous: '上一页', next: '下一页', page: '页',
                of: '/', total: '记录总数',
                error: '加载数据时发生错误。', invalidId: 'ID 无效。',
                recordUnavailable: '找不到请求或无权访问。',
                export: '导出', exportExcel: '导出 Excel', exportPdf: '导出 PDF',
                generating: '正在生成文件',
                exportError: '导出数据时发生错误。'
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

    function datepickerOptions() {
        var locale = { IT: 'it', GB: 'en-GB', ES: 'es', CN: 'zh-CN' }[
            user.LanguageContext
        ] || 'it';
        return $.extend({}, $.datepicker.regional[locale], {
            dateFormat: 'dd/mm/yy',
            changeMonth: true,
            changeYear: true
        });
    }

    function registrationDateText(value) {
        if (!value) return '';
        var match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            return match[3] + '/' + match[2] + '/' + match[1];
        }
        var date = new Date(value);
        return Number.isNaN(date.getTime()) ? String(value) : $.datepicker.formatDate(
            datepickerOptions().dateFormat, date
        );
    }

    function requestErrorMessage(xhr) {
        var message = xhr.responseJSON && xhr.responseJSON.error
            ? (xhr.responseJSON.error.message || xhr.responseJSON.error)
            : (xhr.responseText || xhr.statusText || text('error'));
        return typeof message === 'string' ? message : JSON.stringify(message);
    }

    function requestError(xhr) {
        ShowError(requestErrorMessage(xhr), 'dynamic-forms');
    }

    function clearWorkflowError() {
        $('.dynamic-form-workflow-error').addClass('d-none').text('');
    }

    function showWorkflowError(message) {
        $('.dynamic-form-workflow-error').text(message).removeClass('d-none');
    }

    function setWorkflowApplying(applying) {
        workflowApplying = applying;
        $('.dynamic-form-workflow-loading').toggleClass('d-none', !applying);
        $('#dynamic-form-workflow-modal').attr('aria-busy', applying ? 'true' : 'false');
        $('#dynamic-form-workflow-modal .btn-close, #dynamic-form-workflow-modal [data-bs-dismiss="modal"]')
            .prop('disabled', applying);
        $('.dynamic-form-workflow-transition, .dynamic-form-workflow-note-input, .dynamic-form-workflow-apply')
            .prop('disabled', applying);
        $('.dynamic-form-workflow-files, .dynamic-form-workflow-remove-file').prop('disabled', applying);
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

    function isActionEnabled(action) {
        return action && (action.IsAuthorized === true || action.IsAuthorized === 1);
    }

    function exportActionFormat(action) {
        var identity = [action.ActionName, action.Description].map(function (value) {
            return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        });
        if (identity.some(function (value) {
            return value.indexOf('excel') !== -1 || value.indexOf('xlsx') !== -1;
        })) {
            return 'excel';
        }
        if (identity.some(function (value) {
            return value.indexOf('pdf') !== -1;
        })) {
            return 'pdf';
        }
        return null;
    }

    function exportFileName(xhr, format) {
        var disposition = xhr.getResponseHeader('Content-Disposition') || '';
        var encodedMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
        if (encodedMatch) {
            try {
                return decodeURIComponent(encodedMatch[1].replace(/^"|"$/g, ''));
            } catch (error) {
            }
        }
        var match = /filename="?([^";]+)"?/i.exec(disposition);
        return match ? match[1] : 'dynamic-forms-export.' + (format === 'pdf' ? 'pdf' : 'xlsx');
    }

    function exportButtonContent() {
        return '<i class="bi bi-download" aria-hidden="true"></i>&nbsp;&nbsp;' +
            escapeHtml(text('export'));
    }

    function setExportLoading(format, loading) {
        var $overlay = $('#dynamic-form-export-loading');
        $overlay.toggleClass('d-none', !loading)
            .attr('aria-hidden', loading ? 'false' : 'true');
        if (loading) {
            $overlay.find('.dynamic-form-export-loader')
                .removeClass('excel pdf')
                .addClass(format);
            $overlay.find('.dynamic-form-export-loader-icon')
                .removeClass('bi-file-earmark-excel bi-file-earmark-pdf')
                .addClass('bi-file-earmark-' + format);
            $overlay.find('.dynamic-form-export-loader-extension').text(
                format === 'pdf' ? 'PDF' : 'EXCEL'
            );
            $overlay.find('.dynamic-form-export-loading-text').text(text('generating'));
        }
        $('.dynamic-form-export, .dynamic-form-export-option')
            .prop('disabled', loading)
            .toggleClass('disabled', loading);
    }

    function downloadExport(format) {
        if ($('#dynamic-form-export-loading').hasClass('d-none') === false) {
            return;
        }
        setExportLoading(format, true);
        $.ajax({
            type: 'POST',
            url: apiBase + '/export/' + encodeURIComponent(format),
            data: { filter: activeFilter },
            xhrFields: { responseType: 'blob' }
        }).done(function (blob, status, xhr) {
            var url = URL.createObjectURL(blob);
            var $link = $('<a>', {
                href: url,
                download: exportFileName(xhr, format),
                class: 'd-none'
            }).appendTo('body');
            $link[0].click();
            $link.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        }).fail(function (xhr) {
            ShowError(text('exportError'), 'dynamic-form-export');
        }).always(function () {
            setExportLoading(format, false);
        });
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

    function renderWorkflowFiles() {
        var $selected = $('.dynamic-form-workflow-selected').empty();
        selectedWorkflowFiles.forEach(function (file, index) {
            var $file = $('<span>', { class: 'workflow-chat-selected-file' }).appendTo($selected);
            $('<span>').text(file.name).appendTo($file);
            $('<button>', {
                type: 'button',
                class: 'workflow-chat-remove-file dynamic-form-workflow-remove-file',
                'data-index': index,
                'aria-label': text('removeAttachment') + ': ' + file.name,
                title: text('removeAttachment')
            }).append($('<i>', { class: 'bi bi-x-lg', 'aria-hidden': 'true' })).appendTo($file);
        });
    }

    function clearWorkflowFiles() {
        selectedWorkflowFiles = [];
        $('.dynamic-form-workflow-files').val('');
        renderWorkflowFiles();
        $('.dynamic-form-workflow-file-error').prop('hidden', true).text('');
    }

    function openWorkflow(workflowRecordId, $workflowAction, requestedDirectionId) {
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
                    clearWorkflowFiles();
                    clearWorkflowError();
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

                    if (requestedDirectionId != null) {
                        var $requestedTransition = $('.dynamic-form-workflow-transition').filter(function () {
                            return String($(this).val()) === String(requestedDirectionId);
                        });
                        if (!$requestedTransition.length) {
                            throw new Error(text('recordUnavailable'));
                        }
                        $requestedTransition.prop('checked', true).trigger('change');
                    }

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
                html: '<i class="bi bi-plus-lg" aria-hidden="true"></i>&nbsp;&nbsp;' +
                    escapeHtml(insertAction.Description || text('insert'))
            }).appendTo($insert);
        }

        var exportActions = actions.filter(function (action) {
            return isActionEnabled(action) && exportActionFormat(action);
        }).filter(function (action, index, list) {
            return list.findIndex(function (item) {
                return exportActionFormat(item) === exportActionFormat(action);
            }) === index;
        });
        var $export = $('.dynamic-form-export-action').empty();
        if (exportActions.length === 1) {
            var format = exportActionFormat(exportActions[0]);
            $('<button>', {
                type: 'button',
                class: 'btn btn-success dynamic-form-export',
                html: exportButtonContent()
            }).on('click', function () {
                downloadExport(format);
            }).appendTo($export);
        } else if (exportActions.length > 1) {
            var $group = $('<div>', { class: 'btn-group' }).appendTo($export);
            var $toggle = $('<button>', {
                type: 'button',
                class: 'btn btn-success dropdown-toggle dynamic-form-export',
                'data-bs-toggle': 'dropdown',
                'aria-expanded': 'false',
                html: exportButtonContent()
            }).appendTo($group);
            var $menu = $('<ul>', { class: 'dropdown-menu dropdown-menu-end' }).appendTo($group);
            exportActions.forEach(function (action) {
                var actionFormat = exportActionFormat(action);
                $('<li>').append(
                    $('<button>', {
                        type: 'button',
                        class: 'dropdown-item dynamic-form-export-option',
                        html: '<i class="bi bi-file-earmark-' +
                            (actionFormat === 'pdf' ? 'pdf' : 'excel') +
                            '" aria-hidden="true"></i>&nbsp;&nbsp;' +
                            escapeHtml(action.Description ||
                                (actionFormat === 'pdf' ? text('exportPdf') : text('exportExcel')))
                    }).on('click', function (event) {
                        event.preventDefault();
                        downloadExport(actionFormat);
                    })
                ).appendTo($menu);
            });
        }
    }

    function renderFilters(states) {
        var $container = $('.dynamic-form-filters').empty();
        var $idWrapper = $('<div>', { class: 'mb-3 dynamic-filter-field' });
        $('<label>', { class: 'form-label', for: 'dynamic-filter-id', text: text('id') }).appendTo($idWrapper);
        $('<input>', { id: 'dynamic-filter-id', type: 'number', min: 1, max: 2147483647,
            class: 'form-control dynamic-filter-id' }).appendTo($idWrapper);
        $container.append($idWrapper);
        renderRegistrationDateFilter($container);
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

    function renderRegistrationDateFilter($container) {
        var $wrapper = $('<div>', {
            class: 'mb-3 dynamic-filter-field dynamic-registration-date-filter'
        }).appendTo($container);
        $('<label>', {
            class: 'form-label fw-bold',
            for: 'dynamic-filter-registration-date-from',
            text: text('registrationDate')
        }).appendTo($wrapper);

        var $presets = $('<div>', {
            class: 'd-flex flex-wrap gap-2 mb-2 dynamic-registration-presets'
        }).appendTo($wrapper);
        [
            ['today', 'today'], ['yesterday', 'yesterday'],
            ['lastSevenDays', 'lastSevenDays'], ['thisMonth', 'thisMonth']
        ].forEach(function (item) {
            $('<button>', {
                type: 'button',
                class: 'btn btn-outline-secondary dynamic-registration-preset',
                'data-preset': item[1],
                text: text(item[0])
            }).appendTo($presets);
        });

        var operators = [
            ['between', 'between'], ['gte', 'greaterOrEqual'],
            ['lte', 'lessOrEqual'], ['eq', 'exactDay']
        ];
        var $dropdown = $('<div>', { class: 'dropdown d-inline-block' }).appendTo($presets);
        var $dropdownButton = $('<button>', {
            id: 'dynamic-registration-interval',
            type: 'button',
            class: 'btn btn-outline-secondary dropdown-toggle',
            'data-bs-toggle': 'dropdown',
            'aria-expanded': 'false',
            text: text('interval')
        }).appendTo($dropdown);
        var $operatorMenu = $('<ul>', { class: 'dropdown-menu' }).appendTo($dropdown);
        operators.forEach(function (item) {
            $('<li>').append(
                $('<button>', {
                    type: 'button',
                    class: 'dropdown-item dynamic-registration-operator',
                    'data-operator': item[0],
                    text: text(item[1])
                })
            ).appendTo($operatorMenu);
        });

        var $dateGroup = $('<div>', { class: 'dynamic-registration-dates' }).appendTo($wrapper);
        [
            ['from', 'dynamic-filter-registration-date-from', text('from')],
            ['to', 'dynamic-filter-registration-date-to', text('to')]
        ].forEach(function (item) {
            var $group = $('<div>', { class: 'input-group' }).appendTo($dateGroup);
            $('<input>', {
                id: item[1],
                type: 'text',
                class: 'form-control dynamic-registration-date dynamic-registration-' + item[0],
                placeholder: item[2],
                'aria-label': text('registrationDate') + ' ' + item[2],
                readonly: true
            }).attr('autocomplete', 'off').datepicker(datepickerOptions()).appendTo($group);
            $('<button>', {
                type: 'button',
                class: 'btn btn-outline-secondary dynamic-registration-calendar',
                'data-target': '#' + item[1],
                'aria-label': text('registrationDate') + ' ' + item[2],
                html: '<i class="bi bi-calendar3" aria-hidden="true"></i>',
                disabled: true
            }).appendTo($group);
        });

        $wrapper.data('operator', '');
        $wrapper.on('click', '.dynamic-registration-preset', function () {
            setRegistrationPreset($(this).data('preset'));
        });
        $dropdownButton.on('click', function () {
            $(this).addClass('active');
            $('.dynamic-registration-preset').removeClass('active');
        });
        $wrapper.on('click', '.dynamic-registration-operator', function () {
            $wrapper.data('operator', String($(this).data('operator')));
            $dropdownButton.text($(this).text());
            $('.dynamic-registration-preset').removeClass('active');
            $dropdownButton.addClass('active');
            updateRegistrationDateControls();
        });
        $wrapper.on('click', '.dynamic-registration-calendar', function () {
            var $input = $($(this).data('target'));
            if (!$input.prop('readonly')) $input.datepicker('show');
        });
    }

    function startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function setRegistrationPreset(preset) {
        var today = startOfDay(new Date());
        var from = new Date(today);
        var to = new Date(today);
        if (preset === 'yesterday') {
            from.setDate(from.getDate() - 1);
            to = new Date(from);
        } else if (preset === 'lastSevenDays') {
            from.setDate(from.getDate() - 6);
        } else if (preset === 'thisMonth') {
            from = new Date(today.getFullYear(), today.getMonth(), 1);
            to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }
        $('.dynamic-registration-date-filter').data('operator', 'between');
        $('.dynamic-registration-from').datepicker('setDate', from);
        $('.dynamic-registration-to').datepicker('setDate', to);
        $('.dynamic-registration-preset').removeClass('active');
        $('.dynamic-registration-preset[data-preset="' + preset + '"]').addClass('active');
        $('#dynamic-registration-interval').text(text('interval')).removeClass('active');
        updateRegistrationDateControls(true);
    }

    function updateRegistrationDateControls(presetMode) {
        var operator = $('.dynamic-registration-date-filter').data('operator');
        var $from = $('.dynamic-registration-from');
        var $to = $('.dynamic-registration-to');
        if (presetMode === true) {
            $from.prop('readonly', true);
            $to.prop('readonly', true);
            $from.datepicker('disable');
            $to.datepicker('disable');
        } else {
            $from.prop('readonly', operator !== 'between' && operator !== 'gte' && operator !== 'eq');
            $to.prop('readonly', operator !== 'between' && operator !== 'lte');
            $from.datepicker($from.prop('readonly') ? 'disable' : 'enable');
            $to.datepicker($to.prop('readonly') ? 'disable' : 'enable');
            if (operator === 'eq') $to.val('');
        }
        $('.dynamic-registration-calendar').each(function () {
            $(this).prop('disabled', $($(this).data('target')).prop('readonly'));
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
        var instanceId = $('.dynamic-filter-id').val();
        if (instanceId) {
            if (!/^[1-9]\d*$/.test(instanceId) || Number(instanceId) > 2147483647) {
                throw new Error(text('invalidId'));
            }
            filters.push({ filterType: 'instanceId', instanceId: Number(instanceId) });
        }
        var currentStateId = $('.dynamic-filter-current-state').val();
        if (currentStateId) {
            filters.push({
                filterType: 'currentState',
                stateId: Number(currentStateId)
            });
        }
        var registrationOperator = $('.dynamic-registration-date-filter').data('operator');
        if (registrationOperator) {
            var $registrationFrom = $('.dynamic-registration-from');
            var $registrationTo = $('.dynamic-registration-to');
            var registrationFromValue = $registrationFrom.val();
            var registrationToValue = $registrationTo.val();
            var registrationFromDate = registrationFromValue ? $.datepicker.parseDate(
                datepickerOptions().dateFormat, registrationFromValue
            ) : null;
            var registrationToDate = registrationToValue ? $.datepicker.parseDate(
                datepickerOptions().dateFormat, registrationToValue
            ) : null;
            var needsFrom = registrationOperator === 'between' ||
                registrationOperator === 'gte' || registrationOperator === 'eq';
            var needsTo = registrationOperator === 'between' || registrationOperator === 'lte';
            if ((needsFrom && !$registrationFrom.val()) ||
                (needsTo && !$registrationTo.val())) {
                throw new Error(text('invalidRegistrationDate'));
            }
            if (registrationOperator === 'between' &&
                registrationFromDate > registrationToDate) {
                throw new Error(text('invalidRegistrationDate'));
            }
            filters.push({
                filterType: 'registrationDate',
                operator: registrationOperator,
                from: registrationFromDate ? $.datepicker.formatDate('yy-mm-dd', registrationFromDate) : null,
                to: registrationToDate ? $.datepicker.formatDate('yy-mm-dd', registrationToDate) : null
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
        if (match && match.CalculationError) {
            return CalculatedFieldMath.errorMessage(new Error(match.CalculationError), user.LanguageContext);
        }
        if (!match || match.Value == null) {
            return '';
        }
        return match.Value;
    }

    function renderHeading() {
        var $heading = $('.dynamic-form-records-heading').empty();
        $('<th>', { scope: 'col', text: text('id') }).appendTo($heading);
        $('<th>', { scope: 'col', text: text('creator') }).appendTo($heading);
        $('<th>', { scope: 'col', text: text('registrationDate') }).appendTo($heading);
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
            $('<td>', { text: registrationDateText(row.DataIstanza) }).appendTo($tr);
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
        return $.ajax({
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

    function openEditor(instanceId, mode, workflowRecordId) {
        startActionLoading().done(function () {
            loadEditor(instanceId, mode, workflowRecordId);
        }).fail(function (error) {
            ShowError(error.message, 'openEditor');
        });
    }

    function originText(key) {
        var labels = {
            IT: {
                select: 'Seleziona',
                selectData: 'Seleziona dati',
                filter: 'Filtra',
                loading: 'Caricamento in corso...',
                error: 'Impossibile caricare i dati.',
                conditionRequired: 'Compila il campo richiesto dalla condizione: ',
                noData: 'Nessun dato trovato'
            },
            GB: {
                select: 'Select',
                selectData: 'Select data',
                filter: 'Filter',
                loading: 'Loading...',
                error: 'Unable to load data.',
                conditionRequired: 'Complete the field required by the condition: ',
                noData: 'No data found'
            },
            ES: {
                select: 'Seleccionar',
                selectData: 'Seleccionar datos',
                filter: 'Filtrar',
                loading: 'Cargando...',
                error: 'No se pudieron cargar los datos.',
                conditionRequired: 'Complete el campo requerido por la condición: ',
                noData: 'No se encontraron datos'
            },
            CN: {
                select: '選擇',
                selectData: '選擇資料',
                filter: '篩選',
                loading: '載入中...',
                error: '無法載入資料。',
                conditionRequired: '請填寫條件要求的欄位：',
                noData: '未找到資料'
            }
        };
        return (labels[user.LanguageContext] || labels.IT)[key];
    }

    function updateOriginSelectTitle(description) {
        var title = originText('selectData');
        var descriptionText = String(description || '').trim();
        if (descriptionText) {
            title = originText('select') + ' (' + descriptionText + ')';
        }
        $('#dynamic-form-origin-select-modal .dynamic-form-origin-select-title').text(title);
    }

    function sourceValueText(value) {
        if (value == null) return '';
        if (value instanceof Date) return value.toISOString();
        return String(value);
    }

    function renderOriginSelectRows() {
        var $modal = $('#dynamic-form-origin-select-modal');
        var $body = $modal.find('.dynamic-form-origin-select-table tbody').empty();
        var columns = originSelection.columns;

        originSelection.rows.forEach(function (row, rowIndex) {
            var $row = $('<tr>', {
                class: 'dynamic-form-origin-select-row',
                tabindex: 0,
                'data-row-index': rowIndex
            });
            columns.forEach(function (column) {
                $('<td>').text(sourceValueText(row[column.name])).appendTo($row);
            });
            if (originSelection.selectedIndex === rowIndex) {
                $row.addClass('dynamic-form-origin-select-selected');
            }
            $body.append($row);
        });

        $modal.find('.dynamic-form-origin-select-confirm')
            .prop('disabled', originSelection.selectedIndex == null);
        $modal.find('.dynamic-form-origin-select-empty')
            .toggleClass('d-none', originSelection.rows.length > 0);
    }

    function renderOriginSelectTable(columns, rows) {
        var $modal = $('#dynamic-form-origin-select-modal');
        var $head = $modal.find('.dynamic-form-origin-select-table thead').empty();
        var $labels = $('<tr>').appendTo($head);
        columns.forEach(function (column) {
            var attribute = originSelection.attributes.find(function (item) {
                return Number(item.IDAttributo) === Number(column.IDAttributo);
            });
            $('<th>', {
                scope: 'col',
                text: attribute && attribute.Description || column.name
            }).appendTo($labels);
        });
        originSelection.columns = columns;
        originSelection.rows = rows;
        originSelection.selectedIndex = null;
        renderOriginSelectRows();
    }

    function openOriginSelect(classId, $container) {
        var options;
        try {
            options = JSON.parse($container.attr('data-options'));
        } catch (error) {
            ShowError(error.message, 'openOriginSelect');
            return;
        }

        var $classContainer = $container.find('.model-class-' + classId + '-container');
        var config = $classContainer.data('model-class-origin');
        var attributes = $classContainer.data('model-attributes');
        if (!config || !Array.isArray(config.columns) || !Array.isArray(attributes)) {
            ShowError('Invalid data source configuration.', 'openOriginSelect');
            return;
        }
        var $modal = $('#dynamic-form-origin-select-modal');
        originSelectionRequestId += 1;
        originSelection = {
            classId: classId,
            options: options,
            attributes: attributes,
            conditionFields: config.conditionFields || [],
            columns: config.columns,
            rows: [],
            selectedIndex: null
        };
        updateOriginSelectTitle(config.description);
        $modal.find('.dynamic-form-origin-select-error').addClass('d-none').text('');
        $modal.find('.dynamic-form-origin-select-warning').addClass('d-none');
        $modal.find('.dynamic-form-origin-select-loading').addClass('d-none');
        $modal.attr('aria-busy', 'false');
        $modal.find('.dynamic-form-origin-select-search').prop('disabled', false);
        renderOriginSelectTable(config.columns, []);
        var $filters = $modal.find('.dynamic-form-origin-select-filters').empty();
        config.columns.forEach(function (column) {
            var attribute = attributes.find(function (item) {
                return Number(item.IDAttributo) === Number(column.IDAttributo);
            });
            if (!attribute || (attribute.IsFilter !== true && attribute.IsFilter !== 1)) return;
            var id = 'dynamic-form-origin-filter-' + attribute.IDAttributo;
            var $field = $('<div>', { class: 'col-12 col-md-4' }).appendTo($filters);
            $('<label>', { class: 'form-label', for: id, text: attribute.Description || column.name })
                .appendTo($field);
            $('<input>', {
                id: id,
                type: 'search',
                class: 'form-control dynamic-form-origin-select-filter',
                'data-id-attributo': attribute.IDAttributo
            }).appendTo($field);
        });
        $modal.find('.dynamic-form-origin-select-empty').addClass('d-none');
        $modal.find('.dynamic-form-origin-select-confirm').prop('disabled', true);
        $modal.modal('show');
    }

    function searchOriginRows() {
        if (!originSelection) return;
        var $modal = $('#dynamic-form-origin-select-modal');
        var selection = originSelection;
        var requestId = ++originSelectionRequestId;
        var filters = $modal.find('.dynamic-form-origin-select-filter').map(function () {
            return {
                IDAttributo: Number($(this).attr('data-id-attributo')),
                value: String($(this).val() || '')
            };
        }).get().filter(function (filter) { return filter.value !== ''; });
        selection.rows = [];
        selection.selectedIndex = null;
        $modal.find('.dynamic-form-origin-select-table tbody').empty();
        $modal.find('.dynamic-form-origin-select-confirm, .dynamic-form-origin-select-search')
            .prop('disabled', true);
        $modal.find('.dynamic-form-origin-select-error').addClass('d-none').text('');
        $modal.find('.dynamic-form-origin-select-warning').addClass('d-none');
        $modal.find('.dynamic-form-origin-select-empty').addClass('d-none');
        var $editor = $('.container-dynamic-form-edit');
        var conditionValues = [];
        var seenFields = Object.create(null);
        for (var index = 0; index < selection.conditionFields.length; index += 1) {
            var field = selection.conditionFields[index];
            var id = Number(field.IDAttributo);
            if (seenFields[id]) continue;
            seenFields[id] = true;
            var $radio = $editor.find('input[name="control_' + id + '"]:checked');
            var $control = $editor.find('#control_' + id);
            var value = $radio.length ? $radio.val() : $control.val();
            if ($control.is('select') && value != null && String(value).trim()) {
                value = $control.find('option:selected').text();
            }
            if (value == null || !String(value).trim()) {
                $modal.find('.dynamic-form-origin-select-error')
                    .text(originText('conditionRequired') + (field.Description || id))
                    .removeClass('d-none');
                $modal.find('.dynamic-form-origin-select-search').prop('disabled', false);
                return;
            }
            conditionValues.push({ IDAttributo: id, value: String(value) });
        }
        $modal.find('.dynamic-form-origin-select-loading').removeClass('d-none');
        $modal.attr('aria-busy', 'true');

        $.ajax({
            type: 'POST',
            url: apiBase + '/class-origin/' + selection.classId + '/rows',
            data: {
                workflowRecordId: selection.options.WorkflowRecordId || '',
                action: selection.options.ActionName,
                filters: JSON.stringify(filters),
                conditionValues: JSON.stringify(conditionValues)
            },
            dataType: 'json'
        }).done(function (response) {
            try {
                if (requestId !== originSelectionRequestId || originSelection !== selection) return;
                var result = unwrap(response);
                if (!result || !Array.isArray(result.columns) || !Array.isArray(result.rows)) {
                    throw new Error('Invalid data source response.');
                }
                updateOriginSelectTitle(result.description);
                if (result.limitExceeded) {
                    $modal.find('.dynamic-form-origin-select-warning').removeClass('d-none');
                } else {
                    renderOriginSelectTable(result.columns, result.rows);
                }
            } catch (error) {
                $modal.find('.dynamic-form-origin-select-error')
                    .text(error.message || originText('error'))
                    .removeClass('d-none');
            }
        }).fail(function (xhr) {
            if (requestId !== originSelectionRequestId || originSelection !== selection) return;
            $modal.find('.dynamic-form-origin-select-error')
                .text(requestErrorMessage(xhr) || originText('error'))
                .removeClass('d-none');
        }).always(function () {
            if (requestId !== originSelectionRequestId || originSelection !== selection) return;
            $modal.find('.dynamic-form-origin-select-loading').addClass('d-none');
            $modal.find('.dynamic-form-origin-select-search').prop('disabled', false);
            $modal.attr('aria-busy', 'false');
        });
    }

    function applyOriginSelection() {
        if (!originSelection || originSelection.selectedIndex == null) return;
        var $container = $('.container-dynamic-form-edit');
        var $classContainer = $container.find(
            '.model-class-' + originSelection.classId + '-container'
        );
        var row = originSelection.rows[originSelection.selectedIndex];
        var attributes = $classContainer.data('model-attributes') || [];

        originSelection.columns.forEach(function (column) {
            var attribute = attributes.find(function (item) {
                return Number(item.IDAttributo) === Number(column.IDAttributo);
            });
            var value = row[column.name];
            var valueText = sourceValueText(value);
            var attributeId = Number(column.IDAttributo);
            if (Number(attribute && attribute.IDTipoDati) === 5) {
                if (/^(true|yes)$/i.test(valueText)) valueText = '1';
                if (/^(false|no)$/i.test(valueText)) valueText = '0';
                $classContainer.find('input[name="control_' + attributeId + '"]')
                    .prop('checked', false)
                    .filter(function () {
                        return this.value === valueText;
                    })
                    .prop('checked', true);
                return;
            }
            if (Number(attribute && attribute.IDTipoDati) === 4 && valueText) {
                valueText = valueText.slice(0, 10);
            }
            var $control = $classContainer.find('#control_' + attributeId);
            if ($control.length) {
                $control.val(valueText).trigger('change');
            }
        });
        $('#dynamic-form-origin-select-modal').modal('hide');
    }

    function loadEditor(instanceId, mode, workflowRecordId) {
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
        $container.on('click.dynamicForms', '.model-class-origin-select', function () {
            openOriginSelect(Number($(this).data('idclasse')), $container);
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
            ActionName: mode === 'edit' ? 'Modifica' :
                (mode === 'view' ? 'Visualizza' : (mode === 'preview' ? 'Anteprima' : 'Inserimento')),
            ReadOnly: mode === 'view' || mode === 'preview',
            WorkflowRecordId: workflowRecordId || null,
            WorkflowProfileId: user.IDProfiloUtenteDefault,
            WorkflowGroupId: user.IdGruppoOperativoDefault,
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
                    openEditor(instanceId, 'view', workflowRecordId);
                }
                break;
            case 'anteprima':
                if (isAuthorizedForState(actionName, workflowRecordId, authorizedActionIds)) {
                    openEditor(instanceId, 'preview', workflowRecordId);
                }
                break;
            case 'modifica':
                if (isAuthorizedForState(actionName, workflowRecordId, authorizedActionIds)) {
                    openEditor(instanceId, 'edit', workflowRecordId);
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
        var tooltip = bootstrap.Tooltip.getInstance(this);
        if (tooltip) tooltip.hide();
        $(this).blur();
        $('.dynamic-forms-layout').addClass('filter-hidden');
    });
    $('.btn-filter-open').on('click', function () {
        var tooltip = bootstrap.Tooltip.getInstance(this);
        if (tooltip) tooltip.hide();
        $('.dynamic-forms-layout').removeClass('filter-hidden');
        $(this).blur();
    });
    $('.dynamic-form-search').on('click', function () {
        try {
            activeFilter = collectFilter();
            pageIndex = 1;
            loadRecords();
        } catch (error) {
            ShowError(error.message, 'dynamic-forms');
        }
    });
    $(document).on('workflow-chat-open-history', function (_, target) {
        if (target && Number(target.process) === IdProcesso) openHistory(target.record, target.record);
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
        clearWorkflowError();
        var requiresNote = workflowNoteRequired($(this).attr('data-note-required'));
        var $noteContainer = $('.dynamic-form-workflow-note');
        var $note = $('.dynamic-form-workflow-note-input');
        $noteContainer.toggleClass('d-none', !requiresNote);
        $note.prop('required', requiresNote);
        if (!requiresNote) {
            $note.data('validation-attempted', false);
            clearWorkflowFiles();
        }
        updateWorkflowNoteValidity($note);
        $('.dynamic-form-workflow-apply').prop('disabled', false);
    });
    $('#dynamic-form-origin-select-modal')
        .on('submit', '.dynamic-form-origin-select-search-form', function (event) {
            event.preventDefault();
            searchOriginRows();
        })
        .on('click', '.dynamic-form-origin-select-row', function () {
            originSelection.selectedIndex = Number($(this).data('row-index'));
            renderOriginSelectRows();
        })
        .on('keydown', '.dynamic-form-origin-select-row', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                originSelection.selectedIndex = Number($(this).data('row-index'));
                renderOriginSelectRows();
            }
        })
        .on('click', '.dynamic-form-origin-select-confirm', applyOriginSelection)
        .on('hidden.bs.modal', function () {
            originSelection = null;
            originSelectionRequestId += 1;
        });
    $('.dynamic-form-workflow-note-input').on('input', function () {
        updateWorkflowNoteValidity($(this));
    });
    $('.dynamic-form-workflow-attach-label').text(text('attach'));
    $('.dynamic-form-workflow-files').on('change', function () {
        var files = Array.from(this.files || []);
        this.value = '';
        var $error = $('.dynamic-form-workflow-file-error');
        if (selectedWorkflowFiles.length + files.length > 5) {
            $error.text(text('tooManyAttachments')).prop('hidden', false);
            return;
        }
        $error.prop('hidden', true).text('');
        selectedWorkflowFiles.push.apply(selectedWorkflowFiles, files);
        renderWorkflowFiles();
    });
    $('.dynamic-form-workflow-selected').on('click', '.dynamic-form-workflow-remove-file', function () {
        selectedWorkflowFiles.splice(Number($(this).attr('data-index')), 1);
        $('.dynamic-form-workflow-file-error').prop('hidden', true).text('');
        renderWorkflowFiles();
    });
    $('#dynamic-form-workflow-modal').on('hide.bs.modal', function (event) {
        if (workflowApplying) event.preventDefault();
    });
    $('#dynamic-form-workflow-modal').on('hidden.bs.modal', function () {
        clearWorkflowFiles();
    });
    $('.dynamic-form-workflow-apply').on('click', function () {
        if (workflowApplying) return;
        clearWorkflowError();
        var workflowRecordId = $(this).data('workflow-record-id');
        var $selected = $('.dynamic-form-workflow-transition:checked');
        var $note = $('.dynamic-form-workflow-note-input');
        if (!workflowRecordId || !$selected.length) {
            return;
        }
        var requiresNote = workflowNoteRequired($selected.attr('data-note-required'));
        var note = requiresNote ? $note.val() : '';
        $note.prop('required', requiresNote);
        $note.data('validation-attempted', true);
        if (!updateWorkflowNoteValidity($note, true)) {
            $note.trigger('focus');
            return;
        }

        setWorkflowApplying(true);
        var succeeded = false;
        var payload = new FormData();
        payload.append('IDEventoDirezione', $selected.val());
        payload.append('IDProcesso', IdProcesso);
        payload.append('Note', note || '');
        payload.append('PostNoteAsMessage', 'true');
        if (requiresNote) {
            selectedWorkflowFiles.forEach(function (file) { payload.append('files', file); });
        }
        $.ajax({
            type: 'POST',
            url: '/workflow-apply/' + encodeURIComponent(workflowRecordId),
            data: payload,
            processData: false,
            contentType: false
        }).done(function (response) {
            try {
                unwrap(response);
                succeeded = true;
            } catch (error) {
                showWorkflowError(error.message);
            }
        }).fail(function (xhr) {
            showWorkflowError(requestErrorMessage(xhr));
        }).always(function () {
            setWorkflowApplying(false);
            if (succeeded) {
                $('#dynamic-form-workflow-modal').modal('hide');
                loadRecords();
            }
        });
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
            var url = new URL(window.location.href);
            var target = url.searchParams.get('chatRecord');
            var requestedRecordId = url.searchParams.get('recordId');
            var requestedDirectionId = url.searchParams.get('directionId');
            var requestedStateId = url.searchParams.get('stateId');
            if (target !== null) {
                url.searchParams.delete('chatRecord');
                window.history.replaceState(null, '', url.pathname + url.search + url.hash);
                if (!/^[1-9]\d*$/.test(target) || Number(target) > 2147483647) {
                    throw new Error(text('invalidId'));
                }
                $('.dynamic-filter-id').val(target);
                activeFilter = collectFilter();
                loadRecords().done(function (response) {
                    try {
                        var result = unwrap(response);
                        var row = (result.rows || []).find(function (item) {
                            return Number(item.WorkflowRecordId) === Number(target);
                        });
                        if (!row || !isAuthorizedForState('VisualizzaStoria', row.WorkflowRecordId,
                            workflowAuthorizedActionIds(row) || [])) {
                            throw new Error(text('recordUnavailable'));
                        }
                        openHistory(row.WorkflowRecordId, row.IDModelloIstanza);
                    } catch (error) {
                        ShowError(error.message, 'openHistory');
                    }
                });
            } else if (requestedRecordId !== null) {
                if (!/^[1-9]\d*$/.test(requestedRecordId) ||
                    Number(requestedRecordId) > 2147483647 ||
                    (requestedDirectionId !== null &&
                        (!/^[1-9]\d*$/.test(requestedDirectionId) ||
                            Number(requestedDirectionId) > 2147483647))) {
                    throw new Error(text('invalidId'));
                }
                $('.dynamic-filter-id').val(requestedRecordId);
                activeFilter = collectFilter();
                url.searchParams.delete('recordId');
                url.searchParams.delete('directionId');
                window.history.replaceState(null, '', url.pathname + url.search + url.hash);
                loadRecords().done(function (response) {
                    try {
                        var result = unwrap(response);
                        var row = (result.rows || []).find(function (item) {
                            return Number(item.IDModelloIstanza) === Number(requestedRecordId);
                        });
                        if (!row || !(row.CanSwitchState === true || row.CanSwitchState === 1)) {
                            throw new Error(text('recordUnavailable'));
                        }
                        var $workflowAction = $('.dynamic-form-workflow-action').filter(function () {
                            return String($(this).attr('data-workflow-record-id')) ===
                                String(row.WorkflowRecordId);
                        }).first();
                        if (!$workflowAction.length) {
                            throw new Error(text('recordUnavailable'));
                        }
                        openWorkflow(row.WorkflowRecordId, $workflowAction, requestedDirectionId);
                    } catch (error) {
                        ShowError(error.message, 'openAssignedWorkflow');
                    }
                });
            } else if (requestedDirectionId !== null) {
                throw new Error(text('invalidId'));
            } else {
                if (requestedStateId !== null) {
                    if (!/^[1-9]\d*$/.test(requestedStateId) ||
                        Number(requestedStateId) > 2147483647 ||
                        !states.some(function (state) {
                            return Number(state.IDEventoTransizione) === Number(requestedStateId);
                        })) {
                        throw new Error(text('invalidId'));
                    }
                    $('.dynamic-filter-current-state').val(requestedStateId);
                    activeFilter = collectFilter();
                }
                loadRecords();
            }
        } catch (error) {
            ShowError(error.message, 'dynamic-forms');
        }
    }).fail(requestError);
});
