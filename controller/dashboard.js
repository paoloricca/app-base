(function ($) {
    $(function () {
        var language = $('#LanguageContext').val() || 'IT';
        var pageIndex = 1;
        var pageSize = 20;
        var totalRecord = 0;
        var selectedProcessId = null;
        var selectedProcessName = '';
        var selectedStateId = null;
        var requestSequence = 0;
        var labels = {
            IT: {
                noRecords: 'Non ci sono richieste assegnate in questo processo.',
                noProcess: 'Dashboard',
                all: 'Tutte',
                error: 'Errore durante il caricamento della dashboard.',
                permanence: 'Permanenza',
                reaction: 'Reazione',
                records: 'richieste',
                viewProcess: 'Apri la dashboard operativa del processo',
                viewSummary: 'Apri il riepilogo dello stato',
                noDirections: 'Nessuna direzione disponibile',
                previous: 'Precedente',
                next: 'Successiva',
                page: 'Pagina',
                of: 'di'
            },
            GB: {
                noRecords: 'There are no assigned requests in this process.',
                noProcess: 'Dashboard',
                all: 'All',
                error: 'An error occurred while loading the dashboard.',
                permanence: 'Time in state',
                reaction: 'Reaction',
                records: 'requests',
                viewProcess: 'Open the process operations dashboard',
                viewSummary: 'Open the state summary',
                noDirections: 'No available directions',
                previous: 'Previous',
                next: 'Next',
                page: 'Page',
                of: 'of'
            },
            ES: {
                noRecords: 'No hay solicitudes asignadas en este proceso.',
                noProcess: 'Panel',
                all: 'Todas',
                error: 'Se produjo un error al cargar el panel.',
                permanence: 'Permanencia',
                reaction: 'Reacción',
                records: 'solicitudes',
                viewProcess: 'Abrir el panel operativo del proceso',
                viewSummary: 'Abrir el resumen del estado',
                noDirections: 'No hay direcciones disponibles',
                previous: 'Anterior',
                next: 'Siguiente',
                page: 'Página',
                of: 'de'
            },
            CN: {
                noRecords: '此流程没有分配给您的请求。',
                noProcess: '仪表板',
                all: '全部',
                error: '加载仪表板时发生错误。',
                permanence: '停留时间',
                reaction: '响应时间',
                records: '个请求',
                viewProcess: '打开流程运营仪表板',
                viewSummary: '查看状态摘要',
                noDirections: '没有可用方向',
                previous: '上一页',
                next: '下一页',
                page: '页',
                of: '/'
            }
        };
        var text = labels[language] || labels.IT;
        var $processPage = $('.dashboard-process-page');
        var $processHeading = $('.dashboard-process-heading');
        var $operationPage = $('.dashboard-operation-page');
        var $processCards = $('.dashboard-process-cards');
        var $title = $('.dashboard-process-title');
        var $subtitle = $('.dashboard-process-subtitle');
        var $cards = $('.dashboard-state-cards');
        var $filters = $('.dashboard-state-filters');
        var $rows = $('.dashboard-records');

        function unwrap(response) {
            if (!response || response.status !== 'OK') {
                var message = response && response.error
                    ? (response.error.message || response.error)
                    : text.error;
                throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
            }
            return response.data;
        }

        function showError(message) {
            $('.dashboard-error').text(message || text.error).removeClass('d-none');
        }

        function clearError() {
            $('.dashboard-error').addClass('d-none').text('');
        }

        function setLoading(isLoading) {
            $('.dashboard-loading').toggleClass('d-none', !isLoading);
        }

        function stateColor(value) {
            var color = String(value || '').trim();
            return /^#[0-9a-f]{3,8}$/i.test(color) ? color : null;
        }

        function formatDuration(value) {
            if (value == null || value === '') {
                return '—';
            }
            var minutes = Math.max(0, Math.round(Number(value) || 0));
            var days = Math.floor(minutes / 1440);
            var hours = Math.floor((minutes % 1440) / 60);
            var remainingMinutes = minutes % 60;
            if (language === 'CN') {
                return days + '天 ' + String(hours).padStart(2, '0') + '小时 ' +
                    String(remainingMinutes).padStart(2, '0') + '分';
            }
            var dayLabel = language === 'IT' ? 'g' : 'd';
            var hourLabel = language === 'IT' ? 'o' : 'h';
            return days + dayLabel + ' ' +
                String(hours).padStart(2, '0') + hourLabel + ' ' +
                String(remainingMinutes).padStart(2, '0') + 'm';
        }

        function renderStateCards(states) {
            $cards.empty();
            (states || []).forEach(function (state) {
                var $card = $('<article>', {
                    class: 'card dashboard-state-card'
                });
                var color = stateColor(state.CurrentStateColor);
                if (color) {
                    $card.css('border-top-color', color);
                }
                var $heading = $('<div>', { class: 'dashboard-state-card-heading' });
                var $stateName = $('<span>', { class: 'dashboard-state-label' });
                var $code = $('<span>', {
                    class: 'badge rounded-pill dashboard-state-code me-2',
                    text: state.CurrentStateCode || ''
                });
                var badgeColor = color || '#3498db';
                $code.css({ color: '#fff', backgroundColor: badgeColor, borderColor: badgeColor });
                $code.appendTo($stateName);
                $('<span>', { text: state.CurrentState || '' }).appendTo($stateName);
                $stateName.appendTo($heading);
                $('<span>', {
                    class: 'badge rounded-pill dashboard-state-count',
                    text: state.RecordCount
                }).appendTo($heading);
                $card.append($heading);
                var $metrics = $('<div>', { class: 'dashboard-state-metrics' });
                $('<div>').append(
                    $('<span>', { class: 'dashboard-state-metric-label', text: text.permanence }),
                    $('<strong>', { text: formatDuration(state.PermanenceMinutes) })
                ).appendTo($metrics);
                $('<div>').append(
                    $('<span>', { class: 'dashboard-state-metric-label', text: text.reaction }),
                    $('<strong>', { text: formatDuration(state.ReactionMinutes) })
                ).appendTo($metrics);
                $card.append($metrics);
                var $footer = $('<div>', { class: 'dashboard-state-card-footer' });
                $('<small>', {
                    class: 'dashboard-state-record-count',
                    text: state.RecordCount + ' ' + text.records
                }).appendTo($footer);
                var summaryUrl = '/dynamic-forms/' + encodeURIComponent(selectedProcessId) +
                    '?stateId=' + encodeURIComponent(state.CurrentStateId);
                $('<a>', {
                    class: 'dashboard-state-summary-link',
                    href: summaryUrl,
                    'aria-label': text.viewSummary + ': ' +
                        (state.CurrentStateCode || state.CurrentState || '')
                }).append($('<i>', { class: 'bi bi-arrow-right', 'aria-hidden': 'true' }))
                    .appendTo($footer);
                $card.append($footer);
                $cards.append($card);
            });
        }

        function appendProcessBreadcrumb($container, processPath) {
            $container.empty();
            var names = String(processPath || '').split(' / ');
            names.forEach(function (name, index) {
                if (index > 0) {
                    $container.append(document.createTextNode(' / '));
                }
                $('<span>', {
                    class: index === names.length - 1 ? 'dynamic-process-path-current' : '',
                    text: name
                }).appendTo($container);
            });
        }

        function renderCardSkeletons($container, count) {
            $container.empty();
            for (var index = 0; index < count; index++) {
                var $card = $('<article>', {
                    class: 'card dashboard-state-card dashboard-card-skeleton',
                    'aria-hidden': 'true'
                });
                $('<div>', { class: 'dashboard-skeleton-line dashboard-skeleton-heading' }).appendTo($card);
                var $metrics = $('<div>', { class: 'dashboard-state-metrics' });
                for (var metricIndex = 0; metricIndex < 2; metricIndex++) {
                    $('<div>').append(
                        $('<span>', { class: 'dashboard-skeleton-line dashboard-skeleton-label' }),
                        $('<span>', { class: 'dashboard-skeleton-line dashboard-skeleton-value' })
                    ).appendTo($metrics);
                }
                $card.append($metrics);
                $('<div>', { class: 'dashboard-skeleton-footer' }).appendTo($card);
                $container.append($card);
            }
        }

        function renderProcessCards(processes) {
            $processCards.empty();
            (processes || []).forEach(function (process) {
                var $card = $('<article>', { class: 'card dashboard-state-card dashboard-process-card' });
                var $heading = $('<div>', { class: 'dashboard-state-card-heading' });
                var $processPath = $('<span>', {
                    class: 'dashboard-state-label dynamic-process-path dashboard-process-card-path'
                }).appendTo($heading);
                appendProcessBreadcrumb($processPath, process.ProcessPath || process.ProcessDescription);
                $('<span>', {
                    class: 'badge rounded-pill dashboard-state-count',
                    text: process.RecordCount
                }).appendTo($heading);
                $card.append($heading);

                var $metrics = $('<div>', { class: 'dashboard-state-metrics' });
                $('<div>').append(
                    $('<span>', { class: 'dashboard-state-metric-label', text: text.permanence }),
                    $('<strong>', { text: formatDuration(process.PermanenceMinutes) })
                ).appendTo($metrics);
                $('<div>').append(
                    $('<span>', { class: 'dashboard-state-metric-label', text: text.reaction }),
                    $('<strong>', { text: formatDuration(process.ReactionMinutes) })
                ).appendTo($metrics);
                $card.append($metrics);

                var $footer = $('<div>', { class: 'dashboard-state-card-footer' });
                $('<small>', {
                    class: 'dashboard-state-record-count',
                    text: process.RecordCount + ' ' + text.records
                }).appendTo($footer);
                $('<button>', {
                    type: 'button',
                    class: 'dashboard-state-summary-link dashboard-process-open',
                    'data-process-id': process.IDProcesso,
                    'data-process-name': process.ProcessPath || process.ProcessDescription || '',
                    'aria-label': text.viewProcess + ': ' +
                        (process.ProcessPath || process.ProcessDescription || '')
                }).append($('<i>', { class: 'bi bi-arrow-right', 'aria-hidden': 'true' }))
                    .appendTo($footer);
                $card.append($footer);
                $processCards.append($card);
            });
        }

        function renderStateFilters(states) {
            $filters.empty();
            states = states || [];
            var allCount = states.reduce(function (total, state) {
                return total + (Number(state.RecordCount) || 0);
            }, 0);

            function appendFilter(state, isAll) {
                var stateId = isAll ? null : Number(state.CurrentStateId);
                var isSelected = isAll
                    ? selectedStateId == null
                    : Number(selectedStateId) === stateId;
                var label = isAll
                    ? text.all + ' (' + allCount + ')'
                    : (state.CurrentStateCode || state.CurrentState || '') +
                        ' (' + (Number(state.RecordCount) || 0) + ')';
                var $button = $('<button>', {
                    type: 'button',
                    class: 'btn btn-sm dashboard-state-filter' + (isSelected ? ' active' : ''),
                    text: label,
                    'aria-pressed': isSelected ? 'true' : 'false'
                }).attr('data-state-id', isAll ? '' : stateId);

                $button.addClass(isSelected ? 'btn-primary' : 'btn-outline-secondary');
                $filters.append($button);
            }

            appendFilter(null, true);
            states.forEach(function (state) {
                appendFilter(state, false);
            });
        }

        function renderRecords(records) {
            $rows.empty();
            (records || []).forEach(function (record) {
                var $row = $('<tr>');
                $('<td>', { text: '#' + record.IDModelloIstanza }).appendTo($row);
                $('<td>', { text: record.CreatedBy || '—' }).appendTo($row);
                var $stateCell = $('<td>');
                var color = stateColor(record.CurrentStateColor);
                var $stateBadge = $('<span>', {
                    class: 'badge rounded-pill dashboard-state-badge me-2',
                    text: record.CurrentStateCode || ''
                });
                if (color) {
                    $stateBadge.css('background-color', color);
                }
                $stateCell.append($stateBadge, $('<span>', { text: record.CurrentState || '' })).appendTo($row);
                $('<td>', { text: formatDuration(record.CurrentStateMinutes) }).appendTo($row);
                $('<td>', { text: formatDuration(record.ReactionMinutes) }).appendTo($row);

                var $directions = $('<td>', { class: 'dashboard-directions' });
                var availableDirections = [];
                try {
                    availableDirections = record.WorkflowDirectionsJson
                        ? JSON.parse(record.WorkflowDirectionsJson)
                        : [];
                    if (!Array.isArray(availableDirections)) {
                        throw new Error('Invalid workflow directions returned for record ' +
                            record.IDModelloIstanza + '.');
                    }
                } catch (error) {
                    showError(error.message);
                }
                availableDirections.forEach(function (direction) {
                    var target = '/dynamic-forms/' + encodeURIComponent(selectedProcessId) +
                        '?recordId=' + encodeURIComponent(record.IDModelloIstanza) +
                        '&directionId=' + encodeURIComponent(direction.IDEventoDirezione);
                    $('<a>', {
                        class: 'btn btn-outline-primary btn-sm text-nowrap me-1 mb-1',
                        href: target,
                        text: direction.Description || ''
                    }).appendTo($directions);
                });
                if (!availableDirections.length) {
                    $('<span>', { class: 'text-secondary small', text: text.noDirections }).appendTo($directions);
                }
                $directions.appendTo($row);
                $rows.append($row);
            });
        }

        function updatePager() {
            var pageCount = Math.max(1, Math.ceil(totalRecord / pageSize));
            var $pager = $('.dashboard-pager');
            $pager.toggleClass('d-none', totalRecord <= pageSize);
            $('.dashboard-previous')
                .text(text.previous)
                .prop('disabled', pageIndex <= 1);
            $('.dashboard-next')
                .text(text.next)
                .prop('disabled', pageIndex >= pageCount);
            $('.dashboard-page-info').text(text.page + ' ' + pageIndex + ' ' + text.of + ' ' + pageCount);
        }

        function loadProcess(processId, processName) {
            selectedProcessId = processId;
            selectedProcessName = processName || '';
            selectedStateId = null;
            renderProcessBreadcrumb(selectedProcessName || text.noProcess);
            $processPage.addClass('d-none');
            $operationPage.removeClass('d-none');
            if (window.workflowScreensaver) {
                window.workflowScreensaver.setActive(false);
            }
            $subtitle.text('');
            $cards.empty();
            $filters.empty();
            $rows.empty();
            renderCardSkeletons($cards, 3);
            for (var index = 0; index < 5; index++) {
                $('<tr>', { class: 'dashboard-row-skeleton', 'aria-hidden': 'true' })
                    .append($('<td>', { colspan: 6 }))
                    .appendTo($rows);
            }
            $('.dashboard-total').text('');
            $('.dashboard-empty').addClass('d-none');
            $('.dashboard-pager').addClass('d-none');
            clearError();
            loadPage(1, null);
        }

        function renderProcessBreadcrumb(processPath) {
            appendProcessBreadcrumb($title, processPath);
        }

        function loadProcessCards() {
            setLoading(true);
            renderCardSkeletons($processCards, 3);
            $.getJSON('/dashboard/api/process-cards').done(function (response) {
                var onlyProcess = null;
                try {
                    var processes = unwrap(response);
                    if (!Array.isArray(processes)) {
                        throw new Error('Invalid process cards response.');
                    }
                    renderProcessCards(processes);
                    $processHeading.toggleClass('d-none', processes.length === 0);
                    if (window.workflowScreensaver) {
                        window.workflowScreensaver.setActive(processes.length === 0);
                        window.workflowScreensaver.setHasProcessCards(processes.length > 0);
                    }
                    if (processes.length === 1) {
                        onlyProcess = processes[0];
                    }
                } catch (error) {
                    $processCards.empty();
                    $processHeading.removeClass('d-none');
                    if (window.workflowScreensaver) {
                        window.workflowScreensaver.setActive(false);
                        window.workflowScreensaver.setHasProcessCards(false);
                    }
                    showError(error.message);
                } finally {
                    setLoading(false);
                }
                if (onlyProcess) {
                    var processId = Number(onlyProcess.IDProcesso);
                    if (!Number.isSafeInteger(processId) || processId <= 0) {
                        showError('Invalid process ID returned for dashboard card.');
                        return;
                    }
                    loadProcess(processId, onlyProcess.ProcessPath || onlyProcess.ProcessDescription);
                }
            }).fail(function (xhr) {
                $processCards.empty();
                $processHeading.removeClass('d-none');
                if (window.workflowScreensaver) {
                    window.workflowScreensaver.setActive(false);
                    window.workflowScreensaver.setHasProcessCards(false);
                }
                setLoading(false);
                var responseError = xhr.responseJSON && xhr.responseJSON.error;
                showError(responseError && (responseError.message || responseError) || text.error);
            });
        }

        function showProcessCards() {
            requestSequence++;
            selectedProcessId = null;
            selectedStateId = null;
            $operationPage.addClass('d-none');
            $processPage.removeClass('d-none');
        }

        function loadPage(nextPage, nextStateId) {
            if (!selectedProcessId || nextPage < 1) {
                return;
            }
            if (arguments.length > 1) {
                selectedStateId = nextStateId;
            }
            pageIndex = nextPage;
            var currentRequest = ++requestSequence;
            setLoading(true);
            $.getJSON('/dashboard/api/processes/' + encodeURIComponent(selectedProcessId) + '/records', {
                pageIndex: pageIndex,
                pageSize: pageSize,
                stateId: selectedStateId
            }).done(function (response) {
                if (currentRequest !== requestSequence) {
                    return;
                }
                try {
                    var data = unwrap(response);
                    totalRecord = Number(data.totalRecord) || 0;
                    var states = data.states || [];
                    var allCount = states.reduce(function (total, state) {
                        return total + (Number(state.RecordCount) || 0);
                    }, 0);
                    renderStateCards(states);
                    renderStateFilters(states);
                    renderRecords(data.rows);
                    $('.dashboard-total').text(totalRecord);
                    $('.dashboard-empty')
                        .text(text.noRecords)
                        .toggleClass('d-none', totalRecord > 0);
                    $subtitle.text(allCount + ' ' + text.records);
                    updatePager();
                } catch (error) {
                    $cards.empty();
                    $rows.empty();
                    showError(error.message);
                } finally {
                    setLoading(false);
                }
            }).fail(function (xhr) {
                if (currentRequest !== requestSequence) {
                    return;
                }
                $cards.empty();
                $rows.empty();
                setLoading(false);
                var responseError = xhr.responseJSON && xhr.responseJSON.error;
                showError(responseError && (responseError.message || responseError) || text.error);
            });
        }

        $processCards.on('click', '.dashboard-process-open', function () {
            var processId = Number($(this).attr('data-process-id'));
            if (Number.isSafeInteger(processId) && processId > 0) {
                loadProcess(processId, $(this).attr('data-process-name'));
            }
        });
        $('.dashboard-back').on('click', showProcessCards);

        $filters.on('click', '.dashboard-state-filter', function () {
            var stateId = $(this).attr('data-state-id');
            loadPage(1, stateId ? Number(stateId) : null);
        });
        $('.dashboard-previous').on('click', function () {
            loadPage(pageIndex - 1);
        });
        $('.dashboard-next').on('click', function () {
            loadPage(pageIndex + 1);
        });
        loadProcessCards();
    });
}(jQuery));
