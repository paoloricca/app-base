$(function () {
    const languageContext = $('#LanguageContext').val();
    const labels = JSON.parse($('#labels').val());
    const datepickerLocaleByLanguage = { IT: 'it', GB: 'en-GB', ES: 'es', CN: 'zh-CN' };
    const datepickerLocale = datepickerLocaleByLanguage[languageContext] || 'it';
    const pageSize = 20;
    const pager = $('.utenti-pager');
    const editor = $('#container-user-edit');
    const deleteDialog = $('#container-confirm-delete-user').appendTo('body');
    const filterTooltipTriggers = $('.btn-filter-close, .btn-filter-open');
    let permissions = { canInsert: false, canEdit: false, canDelete: false, canAccount: false };
    let currentUserId = null;
    let accountUserId = null;
    let accountDeleteContext = null;
    let activeUsersMenu = null;
    let activeFilters = { nome: '', cognome: '', isPublic: '' };

    filterTooltipTriggers.each(function () {
        bootstrap.Tooltip.getOrCreateInstance(this, { trigger: 'manual' });
    }).on('mouseenter', function () {
        if (!$(this).data('tooltip-dismissed')) {
            bootstrap.Tooltip.getInstance(this).show();
        }
    }).on('mouseleave', function () {
        $(this).removeData('tooltip-dismissed');
        bootstrap.Tooltip.getInstance(this).hide();
    }).on('click', function () {
        filterTooltipTriggers.not(this).removeData('tooltip-dismissed');
        $(this).data('tooltip-dismissed', true);
        bootstrap.Tooltip.getInstance(this).hide();
        this.blur();
    });

    function closeUsersContextMenu() {
        if (!activeUsersMenu) {
            return;
        }
        activeUsersMenu.menu.removeClass('show').css({
            position: '',
            top: '',
            left: '',
            zIndex: '',
            visibility: ''
        }).appendTo(activeUsersMenu.parent);
        activeUsersMenu.trigger.attr('aria-expanded', 'false');
        activeUsersMenu = null;
    }

    function openUsersContextMenu(trigger, menu) {
        closeUsersContextMenu();
        const triggerElement = trigger[0];
        const menuElement = menu[0];
        const parent = menu.parent();
        menu.appendTo(document.body)
            .addClass('show')
            .css({
                position: 'fixed',
                top: '0',
                left: '0',
                zIndex: 1080,
                visibility: 'hidden'
            });

        const triggerRect = triggerElement.getBoundingClientRect();
        const menuRect = menuElement.getBoundingClientRect();
        const margin = 8;
        const left = Math.max(
            margin,
            Math.min(triggerRect.right - menuRect.width, window.innerWidth - menuRect.width - margin)
        );
        const spaceBelow = window.innerHeight - triggerRect.bottom - margin;
        const spaceAbove = triggerRect.top - margin;
        const top = spaceBelow >= menuRect.height || spaceBelow >= spaceAbove
            ? Math.min(triggerRect.bottom, window.innerHeight - menuRect.height - margin)
            : Math.max(margin, triggerRect.top - menuRect.height);

        menu.css({ top: top + 'px', left: left + 'px', visibility: 'visible' });
        trigger.attr('aria-expanded', 'true');
        activeUsersMenu = { menu: menu, parent: parent, trigger: trigger };
    }

    $(document).on('click', function (event) {
        if (activeUsersMenu &&
            !activeUsersMenu.menu[0].contains(event.target) &&
            !activeUsersMenu.trigger[0].contains(event.target)) {
            closeUsersContextMenu();
        }
    });
    $(window).on('resize.users-context-menu', closeUsersContextMenu);
    $('.forms-results-content').on('scroll', closeUsersContextMenu);

    const datepickerOptions = $.extend(
        {},
        $.datepicker.regional[datepickerLocale],
        { dateFormat: 'dd/mm/yy' }
    );
    $('#user-data-nascita').datepicker(datepickerOptions);
    $('#user-data-nascita').on('change blur', function () {
        validateBirthDate(this);
    });

    pager.paging({
        pageIndex: 1,
        pageSize: pageSize,
        LanguageContext: languageContext
    });
    pager.bind('prev next', function () {
        loadUsers(JSON.parse(pager.attr('data-options')).pageIndex);
    });

    deleteDialog.confirmDelete({ LanguageContext: languageContext });
    deleteDialog.bind('onconfirm', function () {
        deleteUser(deleteDialog.data('delete-id'));
    });
    deleteDialog.bind('oncancel', function () {
        if (accountDeleteContext) {
            accountDeleteContext.cancelled = true;
        }
    });
    deleteDialog.on('hidden.bs.modal', '.modal-confirm-delete', function () {
        if (accountDeleteContext && accountDeleteContext.cancelled) {
            reopenAccountAfterDelete();
        }
    });

    $('.btn-filter-apply').on('click', function () {
        activeFilters = {
            nome: $('#filter-nome').val().trim(),
            cognome: $('#filter-cognome').val().trim(),
            isPublic: $('#filter-is-public').val()
        };
        loadUsers(1);
    });
    $('.btn-filter-close').on('click', function () {
        $('.forms-layout').addClass('filter-hidden');
    });
    $('.btn-filter-open').on('click', function () {
        $('.forms-layout').removeClass('filter-hidden');
    });
    $('.btn-user-new').on('click', function () {
        openEditor(null);
    });
    $('#frm-user-edit').on('submit', function (event) {
        event.preventDefault();
        validateBirthDate($('#user-data-nascita')[0]);
        if (!this.checkValidity()) {
            return;
        }
        saveUser();
    });
    $('#container-user-edit').on('hidden.bs.modal', function () {
        $('#frm-user-edit')[0].reset();
        currentUserId = null;
    });

    function showError(response) {
        const message = response && response.error ? response.error.message : '';
        const translated = labels.errors[message];
        ShowError(translated || message || labels.errors.UNKNOWN, 'GestioneUtenti');
    }

    function validateBirthDate(input) {
        input.setCustomValidity('');
        if (!input.value.trim()) {
            return;
        }
        try {
            $.datepicker.parseDate(datepickerOptions.dateFormat, input.value);
        } catch (error) {
            input.setCustomValidity(labels.invalidDate);
        }
    }

    function setBirthDate(value) {
        if (!value) {
            $('#user-data-nascita').datepicker('setDate', null);
            $('#user-data-nascita')[0].setCustomValidity('');
            return;
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            $('#user-data-nascita').datepicker('setDate', null);
            $('#user-data-nascita')[0].setCustomValidity('');
            return;
        }
        $('#user-data-nascita').datepicker('setDate', date);
        $('#user-data-nascita')[0].setCustomValidity('');
    }

    function loadUsers(pageIndex) {
        pager.find('.spinner-border').show();
        $.ajax({
            url: '/persone',
            type: 'GET',
            data: {
                pageIndex: pageIndex,
                pageSize: pageSize,
                nome: activeFilters.nome,
                cognome: activeFilters.cognome,
                isPublic: activeFilters.isPublic
            }
        }).done(function (response) {
            if (response.status !== 'OK') {
                showError(response);
                return;
            }

            const data = response.data;
            const totalPage = Math.max(1, Math.ceil(data.TotalRecord / pageSize));
            const nextPage = Math.min(pageIndex, totalPage);
            const pagerOptions = JSON.parse(pager.attr('data-options'));
            pagerOptions.pageIndex = nextPage;
            pagerOptions.totalPage = totalPage;
            pagerOptions.totalRecord = data.TotalRecord;
            pager.attr('data-options', JSON.stringify(pagerOptions));
            pager.paging.draw(pager);
            if (nextPage !== pageIndex) {
                loadUsers(nextPage);
                return;
            }

            $('.result-utenti-container').empty();
            $.get('/template/utenti/utenti-row.ejs?' + Date.now()).done(function (template) {
                data.resultdata.forEach(function (row) {
                    const rendered = ejs.render(template, {
                        row: row,
                        labels: labels,
                        permissions: permissions
                    });
                    const rowElement = $(rendered).appendTo('.result-utenti-container');
                    const contextMenu = rowElement.find('.users-context-menu');
                    contextMenu.on('click', '.dropdown-item', function () {
                        closeUsersContextMenu();
                    });
                    rowElement.find('.users-context-trigger').on('click', function (event) {
                        event.stopPropagation();
                        if (activeUsersMenu && activeUsersMenu.trigger[0] === this) {
                            closeUsersContextMenu();
                            return;
                        }
                        openUsersContextMenu($(this), contextMenu);
                    });
                    rowElement.find('.btn-user-edit').on('click', function () {
                        openEditor(row.IDPersona);
                    });
                    rowElement.find('.btn-user-delete').on('click', function () {
                        deleteDialog.data('delete-id', row.IDPersona);
                        deleteDialog.find('.modal-body .alert').addClass('d-none').text('');
                        deleteDialog.confirmDelete.show(deleteDialog);
                    });
                    rowElement.find('.btn-user-account').on('click', function () {
                        openAccount(row.IDPersona);
                    });
                });
            }).fail(function (xhr) {
                ShowError(xhr.responseText || xhr.statusText, 'GestioneUtenti');
            });
        }).fail(function (xhr) {
            ShowError(xhr.responseText || xhr.statusText, 'GestioneUtenti');
        }).always(function () {
            pager.find('.spinner-border').hide();
        });
    }

    function openEditor(id) {
        currentUserId = id;
        $('#user-edit-title').text(id === null ? labels.newUser : labels.editUser);
        $('#user-nome, #user-cognome, #user-codice-fiscale, #user-sesso').val('');
        $('#user-data-nascita').datepicker('setDate', null);
        $('#user-is-public').prop('checked', false);

        if (id === null) {
            editor.modal('show');
            return;
        }

        $.get('/persone/' + encodeURIComponent(id)).done(function (response) {
            if (response.status !== 'OK') {
                showError(response);
                return;
            }
            const user = response.data;
            $('#user-nome').val(user.Nome);
            $('#user-cognome').val(user.Cognome);
            setBirthDate(user.DataNascita);
            $('#user-codice-fiscale').val(user.CodiceFiscale || '');
            $('#user-sesso').val(user.Sesso || '');
            $('#user-is-public').prop('checked', user.IsPublic === true);
            editor.modal('show');
        }).fail(function (xhr) {
            ShowError(xhr.responseText || xhr.statusText, 'GestioneUtenti');
        });
    }

    function saveUser() {
        const user = {
            Nome: $('#user-nome').val(),
            Cognome: $('#user-cognome').val(),
            DataNascita: $('#user-data-nascita').val(),
            CodiceFiscale: $('#user-codice-fiscale').val(),
            Sesso: $('#user-sesso').val(),
            IsPublic: $('#user-is-public').prop('checked')
        };
        const isNew = currentUserId === null;
        const submitButton = $('#btn-user-save').prop('disabled', true);
        $.ajax({
            url: isNew ? '/persone' : '/persone/' + encodeURIComponent(currentUserId),
            type: isNew ? 'POST' : 'PUT',
            data: user
        }).done(function (response) {
            if (response.status !== 'OK') {
                showError(response);
                return;
            }
            editor.one('hidden.bs.modal', function () {
                loadUsers(JSON.parse(pager.attr('data-options')).pageIndex);
            }).modal('hide');
        }).fail(function (xhr) {
            ShowError(xhr.responseText || xhr.statusText, 'GestioneUtenti');
        }).always(function () {
            submitButton.prop('disabled', false);
        });
    }

    function deleteUser(id) {
        $.ajax({
            url: '/persone/' + encodeURIComponent(id),
            type: 'DELETE'
        }).done(function (response) {
            if (response.status !== 'OK') {
                const message = response && response.error ? response.error.message : '';
                if (message === 'PERSON_REFERENCED') {
                    if (accountDeleteContext) {
                        reopenAccountAfterDelete(labels.deleteReferencedAccount || labels.errors.UNKNOWN);
                        return;
                    }
                    deleteDialog.find('.modal-body .alert')
                        .text(labels.errors.PERSON_REFERENCED || labels.errors.UNKNOWN)
                        .removeClass('d-none');
                    deleteDialog.confirmDelete.show(deleteDialog);
                    return;
                }
                showError(response);
                if (accountDeleteContext) {
                    reopenAccountAfterDelete();
                }
                return;
            }
            accountDeleteContext = null;
            accountUserId = null;
            loadUsers(JSON.parse(pager.attr('data-options')).pageIndex);
        }).fail(function (xhr) {
            ShowError(xhr.responseText || xhr.statusText, 'GestioneUtenti');
            if (accountDeleteContext) {
                reopenAccountAfterDelete();
            }
        });
    }

    function reopenAccountAfterDelete(message) {
        if (!accountDeleteContext) {
            return;
        }
        const context = accountDeleteContext;
        const reopen = function () {
            accountDeleteContext = null;
            accountUserId = context.id;
            $('#user-account-email').val(context.email);
            $('#user-account-password').val(context.password).attr('type', context.passwordType);
            $('#frm-user-account .show-hide-password')
                .toggleClass('bi-eye-fill', context.passwordType === 'text')
                .toggleClass('bi-eye-slash-fill', context.passwordType !== 'text');
            $('#user-account-is-public').prop('checked', context.isPublic);
            $('#user-account-is-visible').prop('checked', context.isVisible);
            $('#user-account-password-note').text(context.passwordNote);
            $('#btn-user-account-save').prop('disabled', false);
            $('#user-account-delete-error')
                .text(message || '')
                .toggleClass('d-none', !message);
            $('#container-user-account').modal('show');
        };
        const confirmModal = deleteDialog.find('.modal-confirm-delete');
        if (confirmModal.hasClass('show')) {
            confirmModal.one('hidden.bs.modal', reopen);
            deleteDialog.confirmDelete.hide(deleteDialog);
            return;
        }
        reopen();
    }

    function openAccount(id) {
        if (!permissions.canAccount) {
            return;
        }
        accountUserId = id;
        $('#frm-user-account')[0].reset();
        $('#user-account-password').val('').attr('type', 'password');
        $('#frm-user-account .show-hide-password')
            .removeClass('bi-eye-fill')
            .addClass('bi-eye-slash-fill');
        $('#user-account-password-note').text('');
        $('#user-account-delete-error').addClass('d-none').text('');
        $('#btn-user-account-save').prop('disabled', true);
        $.get('/persone/' + encodeURIComponent(id) + '/account').done(function (response) {
            if (response.status !== 'OK') {
                showError(response);
                return;
            }
            const account = response.data;
            $('#user-account-email').val(account.exists ? account.email : '');
            $('#user-account-password').val(account.exists ? account.password : '');
            $('#user-account-is-public').prop('checked', account.exists && account.isPublic);
            $('#user-account-is-visible').prop('checked', account.exists && account.isVisible);
            $('#user-account-password-note').text(account.exists ? '' : labels.passwordGenerated);
            $('#btn-user-account-save').prop('disabled', false);
            $('#container-user-account').modal('show');
        }).fail(function (xhr) {
            ShowError(xhr.responseText || xhr.statusText, 'GestioneUtenti');
        });
    }

    function saveAccount() {
        const submitButton = $('#btn-user-account-save').prop('disabled', true);
        $.ajax({
            url: '/persone/' + encodeURIComponent(accountUserId) + '/account',
            type: 'PUT',
            data: {
                Email: $('#user-account-email').val(),
                IsPublic: $('#user-account-is-public').prop('checked'),
                IsVisible: $('#user-account-is-visible').prop('checked')
            }
        }).done(function (response) {
            if (response.status !== 'OK') {
                showError(response);
                return;
            }
            if (response.data.created) {
                loadUsers(JSON.parse(pager.attr('data-options')).pageIndex);
                $('#container-user-account').modal('hide');
                return;
            }
            $('#container-user-account').modal('hide');
        }).fail(function (xhr) {
            ShowError(xhr.responseText || xhr.statusText, 'GestioneUtenti');
        }).always(function () {
            submitButton.prop('disabled', false);
        });
    }

    $('#frm-user-account').on('submit', function (event) {
        event.preventDefault();
        if (!this.checkValidity()) {
            return;
        }
        saveAccount();
    });
    $('#btn-user-account-delete').on('click', function () {
        if (!permissions.canDelete || accountUserId === null) {
            return;
        }
        accountDeleteContext = {
            id: accountUserId,
            email: $('#user-account-email').val(),
            password: $('#user-account-password').val(),
            passwordType: $('#user-account-password').attr('type'),
            passwordNote: $('#user-account-password-note').text(),
            isPublic: $('#user-account-is-public').prop('checked'),
            isVisible: $('#user-account-is-visible').prop('checked'),
            cancelled: false
        };
        const id = accountUserId;
        $('#container-user-account').one('hidden.bs.modal', function () {
            deleteDialog.data('delete-id', id);
            deleteDialog.find('.modal-body .alert').addClass('d-none').text('');
            deleteDialog.confirmDelete.show(deleteDialog);
        }).modal('hide');
    });
    $('#container-user-account').on('hidden.bs.modal', function () {
        if (accountDeleteContext) {
            return;
        }
        $('#frm-user-account')[0].reset();
        $('#user-account-password').val('').attr('type', 'password');
        $('#frm-user-account .show-hide-password')
            .removeClass('bi-eye-fill')
            .addClass('bi-eye-slash-fill');
        $('#user-account-password-note').text('');
        $('#btn-user-account-save').prop('disabled', false);
        accountUserId = null;
    });

    $.get('/gestione-utenti-permissions').done(function (response) {
        if (response.status !== 'OK') {
            showError(response);
            return;
        }
        permissions = response.data;
        $('.btn-user-new').prop('disabled', !permissions.canInsert);
        $('#btn-user-account-delete').prop('disabled', !permissions.canDelete);
    }).fail(function (xhr) {
        ShowError(xhr.responseText || xhr.statusText, 'GestioneUtenti');
    }).always(function () {
        loadUsers(1);
    });
});
