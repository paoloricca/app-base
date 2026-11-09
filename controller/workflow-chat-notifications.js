(function ($) {
    'use strict';
    $(function () {
        var $root = $('.chat-notifications');
        if (!$root.length) return;
        var language = $root.data('language');
        var strings = {
            IT: { title: 'Messaggi non letti', all: 'Segna tutti come letti', empty: 'Nessun messaggio non letto',
                record: 'Richiesta', history: 'Visualizza storia', attachment: 'Allegato', error: 'Impossibile aggiornare le notifiche.', offline: 'Connessione in tempo reale non disponibile.', destination: 'Pagina della richiesta non disponibile.' },
            GB: { title: 'Unread messages', all: 'Mark all as read', empty: 'No unread messages',
                record: 'Request', history: 'View history', attachment: 'Attachment', error: 'Unable to update notifications.', offline: 'Real-time connection unavailable.', destination: 'Request page unavailable.' },
            ES: { title: 'Mensajes no leídos', all: 'Marcar todos como leídos', empty: 'No hay mensajes sin leer',
                record: 'Solicitud', history: 'Ver historial', attachment: 'Archivo adjunto', error: 'No se pueden actualizar las notificaciones.', offline: 'Conexión en tiempo real no disponible.', destination: 'Página de solicitud no disponible.' },
            CN: { title: '未读消息', all: '全部标为已读', empty: '没有未读消息',
                record: '请求', history: '查看历史', attachment: '附件', error: '无法更新通知。', offline: '实时连接不可用。', destination: '请求页面不可用。' }
        }[language] || {};
        var $error = $root.find('.chat-notifications-error');
        var $list = $root.find('.chat-notifications-list');
        var $badge = $root.find('.chat-notifications-badge');
        var sequence = 0;
        $root.find('.chat-notifications-title').text(strings.title);
        $root.find('.chat-notifications-read-all').text(strings.all);
        $root.find('.chat-notifications-toggle').attr('aria-label', strings.title);

        function showError(xhr) {
            var message = xhr && xhr.responseJSON && xhr.responseJSON.error && xhr.responseJSON.error.message;
            $error.text(message || strings.error).prop('hidden', false);
        }
        function refresh() {
            var request = ++sequence;
            $.getJSON('/workflow-chat-notifications').done(function (data) {
                if (request !== sequence) return;
                $error.prop('hidden', true);
                $badge.text(data.count).prop('hidden', !data.count);
                $list.empty();
                if (!data.items.length) {
                    $('<div class="p-3 text-muted">').text(strings.empty).appendTo($list);
                    return;
                }
                data.items.forEach(function (item) {
                    var $row = $('<button type="button" class="chat-notifications-row">');
                    var date = new Date(item.DataInvio);
                    $('<span class="chat-notifications-time">')
                        .text(isNaN(date.getTime()) ? '' : date.toLocaleString()).appendTo($row);
                    $('<span class="chat-notifications-record">')
                        .text(strings.record + ' #' + item.IDRecord + ' · ' + (item.Stato || '')).appendTo($row);
                    $('<span>').text(item.Mittente || '').appendTo($row);
                    $('<span class="chat-notifications-preview">').text(item.TestoMessaggio || strings.attachment).appendTo($row);
                    $row.on('click', function () {
                        var process = Number(item.IDProcesso), record = Number(item.IDRecord);
                        if (!Number.isSafeInteger(process) || process < 1 ||
                            !Number.isSafeInteger(record) || record < 1) {
                            $error.text(strings.destination).prop('hidden', false);
                            return;
                        }
                        var path = item.IsDynamic ? '/dynamic-forms/' + process :
                            ({ 71: '/artwork-ordine', 76: '/richieste-assistenza' })[process];
                        if (!path) {
                            $error.text(strings.destination).prop('hidden', false);
                            return;
                        }
                        if (window.location.pathname.replace(/\/$/, '') === path) {
                            $(document).trigger('workflow-chat-open-history', [{ process: process, record: record }]);
                            bootstrap.Dropdown.getOrCreateInstance($root.find('.chat-notifications-toggle')[0]).hide();
                        } else {
                            window.location.assign(path + '?chatRecord=' + encodeURIComponent(record));
                        }
                    });
                    $list.append($row);
                });
            }).fail(function (xhr) { if (request === sequence) showError(xhr); });
        }
        $root.find('.chat-notifications-read-all').on('click', function () {
            var $button = $(this).prop('disabled', true);
            $.post('/workflow-chat-notifications/read-all').done(refresh).fail(showError)
                .always(function () { $button.prop('disabled', false); });
        });
        $root.find('.chat-notifications-toggle').on('show.bs.dropdown', refresh);
        if (typeof window.ShowError !== 'function') window.ShowError = function (message) { $error.text(message).prop('hidden', false); };
        if (typeof io !== 'function') {
            $error.text(strings.offline).prop('hidden', false);
            refresh();
            return;
        }
        var socket = io();
        socket.on('connect', refresh);
        socket.on('connect_error', function () { $error.text(strings.offline).prop('hidden', false); });
        socket.on('disconnect', function () { $error.text(strings.offline).prop('hidden', false); });
        socket.on('new_chat_notification', function (payload) {
            refresh();
            $(document).trigger('workflow-chat-message', [payload]);
        });
        socket.on('chat_notifications_read', refresh);
        refresh();
    });
}(jQuery));
