(function ($) {
    $.fn.workflowhistory = function (myoptions) {

        let optionsWorkflowHistory = $.extend({
            IdRecord: null,
            IdProcesso: null,
            LanguageContext: null,
            user: null,
            //onpreview: null,
            //ondelete: null,
            //onedit: null,
            //onhistory: null,
        }, myoptions);

        var plugin = $(this);

        //console.log(plugin);
        $.fn.workflowhistory.draw = function (plugin) {

            //console.log(plugin);
            var optionsWorkflowHistory = JSON.parse(plugin.attr('data-options'));

        };
        $.fn.workflowhistory.loadHistory = function (plugin, preserveView) {

            var optionsWorkflowHistory = JSON.parse(plugin.attr('data-options'));
            var strings = {
                IT: { context: 'Aggiungi un messaggio per lo stato: ', send: 'Invia', attach: 'Allega file', remove: 'Rimuovi allegato', tooMany: 'Sono consentiti al massimo 5 allegati.', placeholder: 'Scrivi un messaggio', failed: 'Impossibile caricare la chat.' },
                GB: { context: 'Add a message for state: ', send: 'Send', attach: 'Attach files', remove: 'Remove attachment', tooMany: 'A maximum of 5 attachments is allowed.', placeholder: 'Write a message', failed: 'Unable to load the chat.' },
                ES: { context: 'Añade un mensaje para el estado: ', send: 'Enviar', attach: 'Adjuntar archivos', remove: 'Quitar archivo adjunto', tooMany: 'Se permiten como máximo 5 archivos adjuntos.', placeholder: 'Escribe un mensaje', failed: 'No se puede cargar el chat.' },
                CN: { context: '为当前状态添加消息：', send: '发送', attach: '添加附件', remove: '移除附件', tooMany: '最多允许 5 个附件。', placeholder: '输入消息', failed: '无法加载聊天。' }
            }[optionsWorkflowHistory.LanguageContext] || {
                context: 'Add a message for state: ', send: 'Send', attach: 'Attach files', remove: 'Remove attachment', tooMany: 'A maximum of 5 attachments is allowed.', placeholder: 'Write a message', failed: 'Unable to load the chat.'
            };
            var ready = plugin.data('workflowhistoryReady');
            if (!ready) {
                return $.Deferred().reject(new Error('Workflow history control is not initialized.')).promise();
            }

            return ready.then(function () {
                return $.ajax({
                    url: '/workflow-chat/' + encodeURIComponent(optionsWorkflowHistory.IdProcesso) + '/' + encodeURIComponent(optionsWorkflowHistory.IdRecord),
                    type: 'GET'
                });
            }).then(function (response) {
                if (response.status !== "OK") {
                    var error = response.error || {};
                    ShowError(error.message || 'Unable to load workflow history.', error.sender || 'loadHistory');
                    return $.Deferred().reject(error).promise();
                }

                var $history = plugin.find('.container-workflow-history-' + optionsWorkflowHistory.IdRecord);
                var expandedStates = {};
                var previousScroll = $history.scrollTop();
                var wasAtBottom = !$history[0] || $history[0].scrollHeight - previousScroll - $history[0].clientHeight < 30;
                if (preserveView) $history.find('.event-workflow-history').each(function () {
                    expandedStates[$(this).attr('data-event-state')] =
                        $(this).find('.workflow-history-toggle').attr('aria-expanded') === 'true';
                });
                $history.empty();
                var data = response.data;
                var $composer = plugin.find('.workflow-chat-composer').prop('hidden', true);
                if (!data || !data.history.length) {
                    return plugin;
                }

                return $.get("/controls/ui/control.ui.workflow.history.flow.ejs?" + Date.now())
                    .then(function (templateString) {
                        var current = data.history.find(function (item) { return item.IDEventoStato === data.currentState; });
                        var orderedHistory = current ? data.history.filter(function (item) {
                            return item.IDEventoStato !== data.currentState;
                        }).concat([current]) : data.history;
                        $.each(orderedHistory, function (key, flowhistory) {
                            var partialToRender = ejs.render(templateString, {
                                flowhistory: flowhistory,
                                LanguageContext: optionsWorkflowHistory.LanguageContext
                            });
                            $history.append(partialToRender);
                        });
                        $.each(data.messages, function (_, message) {
                            var $state = $history.find('[data-event-state="' + Number(message.IDEventoStato) + '"]');
                            var $item = $('<div>', { class: 'workflow-chat-message-item' });
                            $('<i>', { class: 'bi bi-chat workflow-chat-marker', 'aria-hidden': 'true' }).appendTo($item);
                            var $message = $('<div>', { class: 'workflow-chat-message' }).appendTo($item);
                            var date = new Date(message.DataInvio);
                            $('<div>', { class: 'workflow-chat-message-header' })
                                .text((message.Mittente || '') + ' · ' + (isNaN(date.getTime()) ? '' : date.toLocaleString()))
                                .appendTo($message);
                            if (message.TestoMessaggio) {
                                $('<div>', { class: 'workflow-chat-message-text' }).text(message.TestoMessaggio).appendTo($message);
                            }
                            $.each(data.attachments.filter(function (file) { return file.IDMessaggio === message.IDMessaggio; }), function (_, file) {
                                var url = '/workflow-chat/' + encodeURIComponent(optionsWorkflowHistory.IdProcesso) + '/' +
                                    encodeURIComponent(optionsWorkflowHistory.IdRecord) + '/attachment/' + encodeURIComponent(file.IDAllegato);
                                var $attachment = $('<div>', { class: 'workflow-chat-attachment' }).appendTo($message);
                                if (file.MimeType.indexOf('image/') === 0) {
                                    $('<a>', { href: url, target: '_blank', rel: 'noopener noreferrer' })
                                        .append($('<img>', { src: url, alt: file.NomeFileOriginale, loading: 'lazy' }))
                                        .appendTo($attachment);
                                }
                                $('<a>', { href: url + '?download=1', text: file.NomeFileOriginale, download: '' }).appendTo($attachment);
                            });
                            $state.find('.workflow-chat-messages').append($item);
                        });
                        function setExpanded($state, expanded) {
                            $state.find('.workflow-history-toggle').attr('aria-expanded', String(expanded))
                                .find('i').toggleClass('bi-chevron-down', expanded).toggleClass('bi-chevron-right', !expanded);
                            $state.find('.workflow-history-content').prop('hidden', !expanded);
                        }
                        $history.off('click.workflowhistory', '.workflow-history-toggle')
                            .on('click.workflowhistory', '.workflow-history-toggle', function () {
                                var $state = $(this).closest('.event-workflow-history');
                                setExpanded($state, $(this).attr('aria-expanded') !== 'true');
                            });
                        if (preserveView && Object.keys(expandedStates).length) {
                            $history.find('.event-workflow-history').each(function () {
                                var id = $(this).attr('data-event-state');
                                setExpanded($(this), Object.prototype.hasOwnProperty.call(expandedStates, id)
                                    ? expandedStates[id] : $(this).is(':last-child'));
                            });
                        } else {
                            setExpanded($history.find('.event-workflow-history').last(), true);
                        }

                        function scrollToBottom() {
                            var history = $history[0];
                            if (history && history.clientHeight) history.scrollTop = history.scrollHeight;
                        }
                        var $modal = plugin.closest('.modal');
                        $modal.off('shown.bs.modal.workflowhistory').on('shown.bs.modal.workflowhistory', function () {
                            scrollToBottom();
                            if (plugin.data('workflowChatPendingRefresh')) {
                                plugin.data('workflowChatPendingRefresh', false);
                                plugin.workflowhistory.loadHistory(plugin, true);
                            }
                        });
                        var followNewImages = !preserveView || wasAtBottom;
                        $history.off('.workflowhistoryScroll').on('wheel.workflowhistoryScroll touchstart.workflowhistoryScroll keydown.workflowhistoryScroll', function () {
                            followNewImages = false;
                        });
                        $history.find('img').on('load.workflowhistory', function () {
                            if (followNewImages) scrollToBottom();
                        });
                        if (data.canWrite && current) {
                            var selectedFiles = plugin.data('workflowChatSelectedFiles') || [];
                            function renderSelectedFiles() {
                                var $selected = $composer.find('.workflow-chat-selected').empty();
                                selectedFiles.forEach(function (file, index) {
                                    var $file = $('<span>', { class: 'workflow-chat-selected-file' }).appendTo($selected);
                                    $('<span>').text(file.name).appendTo($file);
                                    $('<button>', {
                                        type: 'button',
                                        class: 'workflow-chat-remove-file',
                                        'data-index': index,
                                        'aria-label': strings.remove + ': ' + file.name,
                                        title: strings.remove
                                    }).append($('<i>', { class: 'bi bi-x-lg', 'aria-hidden': 'true' })).appendTo($file);
                                });
                            }
                            $composer.find('.workflow-chat-context').text(strings.context + current.Stato);
                            $composer.find('.workflow-chat-send').text(strings.send);
                            $composer.find('.workflow-chat-attach-label').text(strings.attach);
                            $composer.find('.workflow-chat-file-label').attr('title', strings.attach);
                            $composer.find('.workflow-chat-text').attr('placeholder', strings.placeholder);
                            $composer.prop('hidden', false);
                            $composer.off('.workflowchat').on('change.workflowchat', '.workflow-chat-files', function () {
                                var files = Array.from(this.files);
                                this.value = '';
                                var $error = $composer.find('.workflow-chat-error');
                                if (selectedFiles.length + files.length > 5) {
                                    $error.text(strings.tooMany).prop('hidden', false);
                                    return;
                                }
                                $error.prop('hidden', true);
                                selectedFiles.push.apply(selectedFiles, files);
                                plugin.data('workflowChatSelectedFiles', selectedFiles);
                                renderSelectedFiles();
                            }).on('click.workflowchat', '.workflow-chat-remove-file', function () {
                                selectedFiles.splice(Number($(this).attr('data-index')), 1);
                                $composer.find('.workflow-chat-error').prop('hidden', true);
                                renderSelectedFiles();
                            }).on('submit.workflowchat', function (event) {
                                event.preventDefault();
                                var $error = $composer.find('.workflow-chat-error').prop('hidden', true);
                                var payload = new FormData();
                                payload.append('state', data.currentState);
                                payload.append('text', $composer.find('.workflow-chat-text').val());
                                selectedFiles.forEach(function (file) { payload.append('files', file); });
                                $composer.find('button, textarea, input').prop('disabled', true);
                                $.ajax({
                                    url: '/workflow-chat/' + encodeURIComponent(optionsWorkflowHistory.IdProcesso) + '/' + encodeURIComponent(optionsWorkflowHistory.IdRecord),
                                    type: 'POST', data: payload, processData: false, contentType: false
                                }).done(function () {
                                    $composer.find('.workflow-chat-text').val('');
                                    $composer.find('.workflow-chat-files').val('');
                                    selectedFiles.splice(0, selectedFiles.length);
                                    plugin.data('workflowChatSelectedFiles', selectedFiles);
                                    renderSelectedFiles();
                                    plugin.workflowhistory.loadHistory(plugin);
                                }).fail(function (xhr) {
                                    var result = xhr.responseJSON;
                                    $error.text(result && result.error && result.error.message || strings.failed).prop('hidden', false);
                                }).always(function () {
                                    $composer.find('button, textarea, input').prop('disabled', false);
                                });
                            });
                        }
                        if (!preserveView || wasAtBottom) scrollToBottom();
                        else $history.scrollTop(previousScroll);
                        return plugin;
                    });
            }).fail(function (xhr) {
                if (xhr && xhr.statusText) {
                    var error = xhr.responseJSON && xhr.responseJSON.error;
                    ShowError(error && error.message || xhr.statusText, 'loadHistory');
                }
            });
        };

        /*return this.each(function () {*/

        /* initialize plugin instance */
        plugin.attr('data-options', JSON.stringify(optionsWorkflowHistory));
        plugin.data('workflowChatSelectedFiles', []);
        plugin.data('workflowChatPendingRefresh', false);
        var oldRealtimeHandler = plugin.data('workflowChatRealtimeHandler');
        if (oldRealtimeHandler) $(document).off('workflow-chat-message', oldRealtimeHandler);
        var realtimeHandler = function (_, event) {
            if (!plugin[0].isConnected) {
                $(document).off('workflow-chat-message', realtimeHandler);
                return;
            }
            if (!event) return;
            if (!plugin.closest('.modal').hasClass('show')) {
                plugin.data('workflowChatPendingRefresh', true);
                return;
            }
            clearTimeout(plugin.data('workflowChatRefreshTimer'));
            plugin.data('workflowChatRefreshTimer', setTimeout(function () {
                plugin.workflowhistory.loadHistory(plugin, true);
            }, 100));
        };
        plugin.data('workflowChatRealtimeHandler', realtimeHandler);
        $(document).on('workflow-chat-message', realtimeHandler);


        /* load plugin template */
        var ready = $.get("/controls/ui/control.ui.workflow.history.ejs?" + Date.now())
            .then(function (templateString) {
            renderTemplate(templateString);
        });
        plugin.data('workflowhistoryReady', ready);

        function renderTemplate(templateString) {

            var optionsWorkflowHistory = JSON.parse(plugin.attr('data-options'));

            var LanguageContext = optionsWorkflowHistory.LanguageContext;
            var IdProcesso = optionsWorkflowHistory.IdProcesso;
            var IdRecord = optionsWorkflowHistory.IdRecord;
            var partialToRender = ejs.render(templateString, { LanguageContext, IdRecord });

            /* fill plugin template */
            plugin.html(partialToRender);

            // Initialize tooltips
            var tooltipTriggerList = [].slice.call(plugin.find('.btn-actions'))
            var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl)
            })

            plugin.workflowhistory.draw(plugin);

        };
        return plugin;
        //});
    };
}(jQuery));