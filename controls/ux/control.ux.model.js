(function ($) {
    /* Questo controllo utente consente di interagire con un processo di sistema */

    var attributeTemplateRequests = Object.create(null);
    var attributeValuesTemplateRequest = null;
    var attributeTypesRequest = null;

    let labelNuovo = {
        Description_IT: "Nuovo",
        Description_GB: "New",
        Description_ES: "Nuevo",
        Description_CN: "新的",
        Description: null,
    }
    $.fn.model = function (options) {
        var options = $.extend({
            IDModello: null,
            IDVersione: null,
            IDModelloIstanza: null,
            Mode: null,
            user: null,
            onselect: null,
            onsave: null,
            onload: null,
            ondesign: null,
        }, options);

        var plugin = $(this);
        function bindFileUploadValueEvents($fileUpload, IDAttributo) {
            $fileUpload.off('onupload.modelRecordValues ondelete.modelRecordValues')
                .on('onupload.modelRecordValues ondelete.modelRecordValues', function () {
                    var fileOptions = JSON.parse($fileUpload.attr('data-options'));
                    plugin.find('#control_' + IDAttributo).val(fileOptions.filelist);
                });
        }
        function selectMultipleEntryRecord($row) {
            var IDClasse = Number($row.data('idclasse'));
            var IDRecord = Number($row.data('idrecord'));
            var $summary = $row.closest('.model-multiple-entry-summary');
            var $container = plugin.find('.model-class-' + IDClasse + '-container');
            $container.data('selected-record-id', IDRecord);
            $summary.find('.model-multiple-entry-record')
                .removeClass('model-multiple-entry-row-editing');
            $row.addClass('model-multiple-entry-row-editing');
            updateMultipleEntryStatus(
                $summary,
                JSON.parse(plugin.attr('data-options')).user.LanguageContext
            );
            loadMultipleEntryRecordValues(IDClasse, IDRecord).fail(function (xhr, status, errorThrown) {
                ShowError(
                    xhr && (xhr.responseText || xhr.message) || errorThrown || status ||
                        'Unable to load the selected class record.',
                    'model.loadMultipleEntryRecordValues'
                );
            });
        }

        plugin.off('.modelMultipleEntry')
            .on('click.modelMultipleEntry', '.multiple-entry-edit', function () {
                selectMultipleEntryRecord($(this).closest('.model-multiple-entry-record'));
            })
            .on('click.modelMultipleEntry', '.multiple-entry-delete', function () {
                var $action = $(this);
                var IDClasse = Number($action.data('idclasse'));
                var IDRecord = Number($action.data('idrecord'));
                var $confirm = plugin.find('.model-multiple-entry-delete-confirm');
                $confirm.data('args', { IDClasse: IDClasse, IDRecord: IDRecord });
                $confirm.confirmDelete.show($confirm);
            })
            .on('click.modelMultipleEntry', '.model-multiple-entry-record', function (event) {
                if ($(event.target).closest('button, a, .dropdown-menu').length) {
                    return;
                }
                selectMultipleEntryRecord($(this));
            })
            .on('show.bs.dropdown.modelMultipleEntry', '.model-multiple-entry-summary [data-bs-toggle="dropdown"]', function () {
                $(this).closest('.model-multiple-entry-summary')
                    .addClass('model-multiple-entry-menu-open');
            })
            .on('hidden.bs.dropdown.modelMultipleEntry', '.model-multiple-entry-summary [data-bs-toggle="dropdown"]', function () {
                var $summary = $(this).closest('.model-multiple-entry-summary');
                if (!$summary.find('.dropdown-menu.show').length) {
                    $summary.removeClass('model-multiple-entry-menu-open');
                }
            });

        plugin.off('onconfirm.modelMultipleEntry')
            .on('onconfirm.modelMultipleEntry', '.model-multiple-entry-delete-confirm', function () {
                var $confirm = $(this);
                var args = $confirm.data('args');
                if (!args) {
                    return;
                }
                try {
                    var options = JSON.parse(plugin.attr('data-options'));
                    var $container = plugin.find('.model-class-' + args.IDClasse + '-container');
                    var $loader = $container.find('.model-section-loader').show();
                    setTimeout(function () {
                        var loadingRefresh = false;
                        try {
                            var status = modelApiRequest(options, 'class-records/' + args.IDRecord, 'DELETE', {
                                IDClasse: args.IDClasse
                            });
                            var response = JSON.parse(status);
                            if (response.status !== 'OK') {
                                throw new Error(response.error && response.error.message || 'Unable to delete the class record.');
                            }
                            $container.removeData('selected-record-id');
                            $confirm.removeData('args');
                            loadingRefresh = true;
                            $.when(
                                refreshMultipleEntrySummary(args.IDClasse),
                                loadMultipleEntryRecordValues(args.IDClasse, null)
                            ).fail(function (xhr, status, errorThrown) {
                                ShowError(
                                    xhr && (xhr.responseText || xhr.message) || errorThrown || status ||
                                        'Unable to refresh the class summary.',
                                    'model.deleteClassRecord'
                                );
                            }).always(function () {
                                $loader.hide();
                            });
                        } catch (error) {
                            ShowError(error.message, 'model.deleteClassRecord');
                        } finally {
                            if (!loadingRefresh) {
                                $loader.hide();
                            }
                        }
                    }, 0);
                } catch (error) {
                    ShowError(error.message, 'model.deleteClassRecord');
                }
            });

        function toggleModelSection($header) {
            var isExpanded = $header.attr('aria-expanded') === 'true';
            var attributesId = $header.attr('aria-controls');
            var $attributes = attributesId ? plugin.find('#' + attributesId) : $();
            if (!$attributes.length) {
                return;
            }
            $attributes.toggle(!isExpanded);
            $header.attr('aria-expanded', String(!isExpanded))
                .find('.model-section-toggle')
                .html(isExpanded
                    ? '<i class="bi bi-folder-plus"></i>'
                    : '<i class="bi bi-folder-minus"></i>');
        }
        function updateMultipleEntryValidation(modal, languageContext) {
            var enabled = modal.find('#class-InserimentoMultiplo').prop('checked');
            var indicator = modal.find('.multiple-entry-minimum-indicator');
            var warning = modal.find('.multiple-entry-validation-warning');

            if (!enabled) {
                indicator.hide();
                warning.addClass('d-none').text('');
                return true;
            }

            indicator.show();
            var minimumValue = modal.find('#class-NumeroCicliMin').val();
            var maximumValue = modal.find('#class-NumeroCicli').val();
            var minimum = Number(minimumValue);
            var maximum = Number(maximumValue);
            var minimumValid = minimumValue !== '' && Number.isInteger(minimum) && minimum >= 2;
            var maximumBelowMinimum = minimumValue !== '' && maximumValue !== '' &&
                Number.isInteger(minimum) && Number.isInteger(maximum) && maximum < minimum;
            var messages = [];
            var labels = {
                IT: [
                    'La ripetizione minima è obbligatoria e deve essere almeno 2.',
                    'La ripetizione massima non può essere inferiore alla ripetizione minima.'
                ],
                GB: [
                    'Minimum repetitions is required and must be at least 2.',
                    'Maximum repetitions cannot be lower than minimum repetitions.'
                ],
                ES: [
                    'La repetición mínima es obligatoria y debe ser al menos 2.',
                    'La repetición máxima no puede ser inferior a la repetición mínima.'
                ],
                CN: [
                    '最少重複次數為必填，且不得小於 2。',
                    '最大重複次數不得小於最少重複次數。'
                ]
            };
            var validationLabels = labels[languageContext] || labels.IT;

            indicator.toggleClass('text-success', minimumValid)
                .toggleClass('text-danger', !minimumValid)
                .html(minimumValid
                    ? '<i class="bi bi-check-circle-fill"></i>'
                    : '<i class="bi bi-x-circle-fill"></i>');

            if (!minimumValid) {
                messages.push(validationLabels[0]);
            }
            if (maximumBelowMinimum) {
                messages.push(validationLabels[1]);
            }

            warning.toggleClass('d-none', messages.length === 0)
                .text(messages.join(' '));
            return minimumValid && !maximumBelowMinimum;
        }
        function originMessage(key, languageContext) {
            var messages = {
                connectionOk: {
                    IT: 'Connessione stabilita correttamente.',
                    GB: 'Connection established successfully.',
                    ES: 'Conexión establecida correctamente.',
                    CN: '連線成功。'
                },
                columnsOk: {
                    IT: 'Verifica completata. Elenco colonne aggiornato.',
                    GB: 'Test completed. Column list updated.',
                    ES: 'Prueba completada. Lista de columnas actualizada.',
                    CN: '測試完成，欄位清單已更新。'
                },
                descriptionRequired: {
                    IT: 'Inserire la descrizione dell’origine.',
                    GB: 'Enter the source description.',
                    ES: 'Introduzca la descripción del origen.',
                    CN: '請輸入來源描述。'
                },
                connectionRequired: {
                    IT: 'La connessione è obbligatoria.',
                    GB: 'Connection is required.',
                    ES: 'La conexión es obligatoria.',
                    CN: '連線為必填。'
                },
                connectionAndTextRequired: {
                    IT: 'Inserire una connessione e una query per verificare le colonne.',
                    GB: 'Enter a connection and query to test the columns.',
                    ES: 'Introduzca una conexión y una consulta para probar las columnas.',
                    CN: '請輸入連線與查詢以測試欄位。'
                },
                textRequired: {
                    IT: 'Il testo è obbligatorio.',
                    GB: 'Text is required.',
                    ES: 'El texto es obligatorio.',
                    CN: '文字為必填。'
                },
                mappingsRequired: {
                    IT: 'Associare una colonna dinamica a ogni campo di sistema.',
                    GB: 'Map a dynamic column to every system field.',
                    ES: 'Asocie una columna dinámica a cada campo del sistema.',
                    CN: '請為每個系統欄位指定動態欄位。'
                },
                duplicateMapping: {
                    IT: 'Attenzione: più campi di sistema sono associati alla stessa colonna dinamica.',
                    GB: 'Warning: multiple system fields are mapped to the same dynamic column.',
                    ES: 'Atención: varios campos del sistema están asociados a la misma columna dinámica.',
                    CN: '警告：多個系統欄位對應到同一個動態欄位。'
                }
            };
            return messages[key][languageContext] || messages[key].IT;
        }
        function showOriginFeedback($modal, message, feedbackType) {
            var $feedback = $modal.find('.class-origin-feedback');
            $feedback.removeClass('alert alert-success alert-danger alert-warning')
                .empty();
            if (!message) {
                return;
            }
            var alertClass = feedbackType === true
                ? 'alert-success'
                : 'alert-danger';
            $feedback.addClass('alert ' + alertClass)
                .text(message);
        }
        function updateOriginInputStatus($modal, selector) {
            var $field = $modal.find(selector);
            var isValid = String($field.val() || '').trim().length > 0;
            if (selector === '#class-origin-description') {
                $field.toggleClass('is-valid', isValid)
                    .toggleClass('is-invalid', !isValid);
                return;
            }
            $field.closest('.mb-3, .pt-3, .mt-3')
                .find('.origin-validation-indicator')
                .first()
                .toggleClass('text-success', isValid)
                .toggleClass('text-danger', !isValid)
                .html(isValid
                    ? '<i class="bi bi-check-circle-fill"></i>'
                    : '<i class="bi bi-x-circle-fill"></i>');
        }
        function updateOriginFormValidation($modal) {
            updateOriginInputStatus($modal, '#class-origin-description');
            updateOriginInputStatus($modal, '#class-origin-connection');
            updateOriginInputStatus($modal, '#class-origin-text');
        }
        function showOriginPanel($modal, originType) {
            var $tab = $modal.find('[data-origin-type="' + originType + '"]');
            $modal.find('[data-origin-type]')
                .removeClass('active')
                .attr('aria-selected', 'false');
            $tab.addClass('active').attr('aria-selected', 'true');
            $modal.find('.class-origin-tab-panels .tab-pane')
                .removeClass('active')
                .prop('hidden', true);
            $modal.find('#' + $tab.attr('aria-controls'))
                .addClass('active')
                .prop('hidden', false);
        }
        function updateOriginFieldStatus($row, languageContext, savedValue) {
            var labels = {
                linked: { IT: 'Campo associato', GB: 'Field mapped', ES: 'Campo asociado', CN: '欄位已對應' },
                missing: { IT: 'Campo non associato', GB: 'Field not mapped', ES: 'Campo no asociado', CN: '欄位未對應' }
            };
            if (savedValue === undefined) {
                savedValue = $row.find('.class-origin-dynamic-field').val() || '';
            }
            var isMapped = Boolean(savedValue);
            $row.find('.class-origin-field-status')
                .toggleClass('bi-check-circle-fill text-success', isMapped)
                .toggleClass('bi-x-circle-fill text-danger', !isMapped)
                .attr('aria-label', (isMapped ? labels.linked : labels.missing)[languageContext] ||
                    (isMapped ? labels.linked.IT : labels.missing.IT));
        }
        function populateOriginColumns($modal, columns) {
            var languageContext = JSON.parse(plugin.attr('data-options')).user.LanguageContext;
            var placeholder = {
                IT: 'Seleziona colonna',
                GB: 'Select column',
                ES: 'Seleccionar columna',
                CN: '選擇欄位'
            }[languageContext] || 'Seleziona colonna';
            $modal.find('.class-origin-dynamic-field').each(function () {
                var $select = $(this);
                var selectedValue = String($select.val() || '');
                var selectedColumn = (columns || []).some(function (column) {
                    return String(column) === selectedValue;
                }) ? selectedValue : '';
                $select.empty().append(new Option(placeholder, ''));
                (columns || []).forEach(function (column) {
                    $select.append(new Option(column, column));
                });
                $select.val(selectedColumn);
                updateOriginFieldStatus($select.closest('tr'), languageContext);
            });
        }
        function renderOriginFields($modal, attributes, languageContext) {
            var $body = $modal.find('.class-origin-fields-body').empty();
            (attributes || []).forEach(function (attribute) {
                var mappedValue = attribute.CampoDinamico || '';
                var $row = $('<tr>');
                var $systemField = $('<td>').appendTo($row);
                $('<i>', {
                    class: 'bi class-origin-field-status me-2',
                    role: 'img'
                }).appendTo($systemField);
                $('<span>').text(attribute.Descrizione || '').appendTo($systemField);
                var $select = $('<select>', {
                    class: 'form-select form-select-sm class-origin-dynamic-field',
                    'data-idattributo': attribute.IDAttributo,
                    'data-saved-value': mappedValue
                }).appendTo($('<td>').appendTo($row));
                $select.append(new Option(
                    languageContext === 'GB' ? 'Select column' :
                        languageContext === 'ES' ? 'Seleccionar columna' :
                            languageContext === 'CN' ? '選擇欄位' : 'Seleziona colonna',
                    ''
                ));
                if (mappedValue) {
                    $select.append(new Option(mappedValue, mappedValue));
                }
                $select.val(mappedValue);
                updateOriginFieldStatus($row, languageContext, mappedValue);
                $body.append($row);
            });
        }
        function openClassOrigin(idClasse, languageContext) {
            var $originModal = plugin.find('#container-class-origin-edit');
            var $sectionModal = plugin.find('#container-class-edit');
            var classId = Number(idClasse);
            if (!Number.isSafeInteger(classId) || classId <= 0) {
                ShowError(
                    languageContext === 'GB'
                        ? 'Save the section before configuring its source.'
                        : 'Salvare la sezione prima di configurarne l’origine.',
                    'model.openClassOrigin'
                );
                return;
            }

            var $button = $sectionModal.find('.btn-configura-origine').prop('disabled', true);
            var sectionDescription = $sectionModal.find('.class-header').text().trim();
            var configureOriginTitles = {
                IT: 'CONFIGURA ORIGINE',
                GB: 'CONFIGURE SOURCE',
                ES: 'CONFIGURAR ORIGEN',
                CN: '設定來源'
            };
            var originTitle = configureOriginTitles[languageContext] || configureOriginTitles.IT;
            if (sectionDescription) {
                originTitle += ' (' + sectionDescription + ')';
            }
            $originModal.find('#class-origin-title').text(originTitle);
            $.ajax({
                type: 'GET',
                url: '/model-class-origin/' + classId,
                dataType: 'json'
            }).done(function (response) {
                if (response.status !== 'OK') {
                    ShowError(
                        response.error && response.error.message || 'Impossibile caricare l’origine.',
                        'model.openClassOrigin'
                    );
                    return;
                }

                var config = response.data;
                var origin = config.origin;
                $originModal.data('idclasse', classId);
                $originModal.find('#class-origin-description').val(origin ? origin.Descrizione : '');
                $originModal.find('#class-origin-connection').val(origin ? origin.Connessione : '');
                $originModal.find('#class-origin-text').val(origin ? origin.TestoOrigine : '');
                var showConnectionLabels = {
                    IT: 'Mostra connessione',
                    GB: 'Show connection',
                    ES: 'Mostrar conexión',
                    CN: '顯示連線'
                };
                $originModal.find('#class-origin-connection').attr('type', 'password');
                $originModal.find('.btn-toggle-origin-connection-visibility')
                    .attr('aria-pressed', 'false')
                    .attr('aria-label', showConnectionLabels[languageContext] || showConnectionLabels.IT)
                    .find('i').removeClass('bi-eye-slash').addClass('bi-eye');
                var originType = origin ? Number(origin.TipoOrigine) : 1;
                $originModal.data('origin-type', originType);
                showOriginPanel($originModal, originType);
                renderOriginFields($originModal, config.attributes, languageContext);
                updateOriginFormValidation($originModal);
                showOriginFeedback($originModal, '', false);
                $originModal.addClass('show').show().attr('aria-hidden', 'false').trigger('focus');

                if (origin && origin.Connessione && origin.TestoOrigine) {
                    testClassOriginQuery($originModal, languageContext, true);
                }
            }).fail(function (xhr, status, errorThrown) {
                var response = xhr && xhr.responseJSON;
                ShowError(
                    response && response.error && response.error.message ||
                        xhr.responseText || errorThrown || status,
                    'model.openClassOrigin'
                );
            }).always(function () {
                $button.prop('disabled', false);
            });
        }
        function testClassOriginConnection($modal, languageContext) {
            var classId = Number($modal.data('idclasse'));
            var $button = $modal.find('.btn-test-origin-connection').prop('disabled', true);
            showOriginFeedback($modal, '', false);
            $.ajax({
                type: 'POST',
                url: '/model-class-origin/' + classId + '/test-connection',
                dataType: 'json',
                data: { Connessione: $modal.find('#class-origin-connection').val() }
            }).done(function (response) {
                if (response.status !== 'OK') {
                    showOriginFeedback($modal,
                        response.error && response.error.message || 'Connessione non riuscita.', false);
                    return;
                }
                showOriginFeedback($modal, originMessage('connectionOk', languageContext), true);
            }).fail(function (xhr, status, errorThrown) {
                var response = xhr && xhr.responseJSON;
                showOriginFeedback($modal,
                    response && response.error && response.error.message ||
                        xhr.responseText || errorThrown || status,
                    false);
            }).always(function () {
                $button.prop('disabled', false);
            });
        }
        function testClassOriginQuery($modal, languageContext, isInitialLoad) {
            var classId = Number($modal.data('idclasse'));
            var $button = $modal.find('.btn-test-origin-query').prop('disabled', true);
            var data = {
                Connessione: $modal.find('#class-origin-connection').val(),
                TestoOrigine: $modal.find('#class-origin-text').val()
            };
            if (!data.Connessione || !data.TestoOrigine) {
                $button.prop('disabled', false);
                if (!isInitialLoad) {
                    showOriginFeedback($modal, originMessage('connectionAndTextRequired', languageContext), false);
                }
                return;
            }

            showOriginFeedback($modal, '', false);
            $.ajax({
                type: 'POST',
                url: '/model-class-origin/' + classId + '/query-columns',
                dataType: 'json',
                data: data
            }).done(function (response) {
                if (response.status !== 'OK') {
                    showOriginFeedback($modal,
                        response.error && response.error.message || 'Impossibile leggere le colonne della query.',
                        false);
                    return;
                }
                populateOriginColumns($modal, response.data || []);
                showOriginFeedback($modal, originMessage('columnsOk', languageContext), true);
            }).fail(function (xhr, status, errorThrown) {
                var response = xhr && xhr.responseJSON;
                showOriginFeedback($modal,
                    response && response.error && response.error.message ||
                        xhr.responseText || errorThrown || status,
                    false);
            }).always(function () {
                $button.prop('disabled', false);
            });
        }
        function saveClassOrigin($modal, languageContext) {
            var description = String($modal.find('#class-origin-description').val() || '').trim();
            var connectionString = String($modal.find('#class-origin-connection').val() || '');
            var queryText = String($modal.find('#class-origin-text').val() || '');
            var originType = Number($modal.data('origin-type') || 1);
            updateOriginFormValidation($modal);
            if (!description) {
                showOriginFeedback($modal, originMessage('descriptionRequired', languageContext), false);
                return;
            }
            if (!connectionString.trim()) {
                showOriginFeedback($modal, originMessage('connectionRequired', languageContext), false);
                return;
            }
            if (!queryText.trim()) {
                showOriginFeedback($modal, originMessage('textRequired', languageContext), false);
                return;
            }

            var mappings = [];
            $modal.find('.class-origin-dynamic-field').each(function () {
                mappings.push({
                    IDAttributo: Number($(this).data('idattributo')),
                    CampoDinamico: $(this).val() || ''
                });
            });
            if (mappings.some(function (mapping) { return !String(mapping.CampoDinamico).trim(); })) {
                showOriginFeedback($modal, originMessage('mappingsRequired', languageContext), 'warning');
                return;
            }
            var mappedColumns = Object.create(null);
            var hasDuplicateColumn = mappings.some(function (mapping) {
                var normalizedColumn = String(mapping.CampoDinamico).trim().toLowerCase();
                if (mappedColumns[normalizedColumn]) {
                    return true;
                }
                mappedColumns[normalizedColumn] = true;
                return false;
            });
            if (hasDuplicateColumn) {
                showOriginFeedback($modal, originMessage('duplicateMapping', languageContext), 'warning');
                return;
            }
            var payload = {
                Descrizione: description,
                TipoOrigine: originType,
                Connessione: connectionString,
                TestoOrigine: queryText,
                Mappings: mappings
            };
            var classId = Number($modal.data('idclasse'));
            var $button = $modal.find('.btn-save-class-origin').prop('disabled', true);
            $.ajax({
                type: 'POST',
                url: '/model-class-origin/' + classId,
                contentType: 'application/json',
                dataType: 'json',
                data: JSON.stringify(payload)
            }).done(function (response) {
                if (response.status !== 'OK') {
                    showOriginFeedback($modal,
                        response.error && response.error.message || 'Impossibile salvare l’origine.',
                        false);
                    return;
                }
                var $sectionModal = plugin.find('#container-class-edit');
                $sectionModal.data('has-class-origin', true)
                    .find('#class-CompilazioneManuale').prop('checked', false);
                $sectionModal.find('.origin-configure-container').show();
                $modal.find('.class-origin-dynamic-field').each(function () {
                    var $select = $(this);
                    var selectedValue = $select.val() || '';
                    $select.attr('data-saved-value', selectedValue);
                    updateOriginFieldStatus($select.closest('tr'), languageContext, selectedValue);
                });
                $modal.removeClass('show').hide().attr('aria-hidden', 'true');
            }).fail(function (xhr, status, errorThrown) {
                var response = xhr && xhr.responseJSON;
                showOriginFeedback($modal,
                    response && response.error && response.error.message ||
                        xhr.responseText || errorThrown || status,
                    false);
            }).always(function () {
                $button.prop('disabled', false);
            });
        }
        function configureClassOriginEditor(languageContext) {
            var $sectionModal = plugin.find('#container-class-edit');
            $sectionModal.data('origin-ui-ready', false)
                .find('#class-CompilazioneManuale, .btn-configura-origine')
                .prop('disabled', true);
            $.get('/controls/ui/control.ui.model-class-origin-edit.ejs?' + Date.now())
                .done(function (templateString) {
                    plugin.find('.model-container').append(
                        ejs.render(templateString, { LanguageContext: languageContext })
                    );
                    var $originModal = plugin.find('#container-class-origin-edit');
                    $sectionModal.data('origin-ui-ready', true);
                    if ($sectionModal.data('origin-state-ready') === true) {
                        $sectionModal.find('#class-CompilazioneManuale, .btn-configura-origine')
                            .prop('disabled', false);
                    }

                    plugin.off('click.classOrigin')
                        .on('click.classOrigin', '.btn-configura-origine', function () {
                            openClassOrigin($sectionModal.find('#IDClasse').val(), languageContext);
                        })
                        .on('change.classOrigin', '#class-CompilazioneManuale', function () {
                            var $toggle = $(this);
                            var hasSavedOrigin = $sectionModal.data('has-class-origin') === true;
                            if ($toggle.prop('checked') && hasSavedOrigin) {
                                $toggle.prop('checked', false);
                                var $confirm = plugin.find('#confirm-delete-origin');
                                var confirmOptions = JSON.parse($confirm.attr('data-options'));
                                confirmOptions.args = {
                                    IDClasse: Number($sectionModal.find('#IDClasse').val())
                                };
                                $confirm.attr('data-options', JSON.stringify(confirmOptions));
                                $confirm.confirmDelete.show($confirm);
                                return;
                            }
                            $sectionModal.find('.origin-configure-container')
                                .toggle(!$toggle.prop('checked'));
                        })
                        .on('click.classOrigin', '[data-origin-type]', function () {
                            var $tab = $(this);
                            var originType = Number($tab.data('origin-type'));
                            $originModal.data('origin-type', originType);
                            showOriginPanel($originModal, originType);
                        })
                        .on('change.classOrigin', '.class-origin-dynamic-field', function () {
                            updateOriginFieldStatus(
                                $(this).closest('tr'),
                                languageContext
                            );
                        })
                        .on('input.classOrigin', '#class-origin-description, #class-origin-connection, #class-origin-text', function () {
                            updateOriginFormValidation($originModal);
                        })
                        .on('click.classOrigin', '.btn-test-origin-connection', function () {
                            testClassOriginConnection($originModal, languageContext);
                        })
                        .on('click.classOrigin', '.btn-toggle-origin-connection-visibility', function () {
                            var $button = $(this);
                            var $input = $originModal.find('#class-origin-connection');
                            var showConnection = $input.attr('type') === 'password';
                            var labels = showConnection
                                ? { IT: 'Nascondi connessione', GB: 'Hide connection', ES: 'Ocultar conexión', CN: '隱藏連線' }
                                : { IT: 'Mostra connessione', GB: 'Show connection', ES: 'Mostrar conexión', CN: '顯示連線' };
                            $input.attr('type', showConnection ? 'text' : 'password');
                            $button.attr('aria-pressed', String(showConnection))
                                .attr('aria-label', labels[languageContext] || labels.IT)
                                .find('i')
                                .toggleClass('bi-eye', !showConnection)
                                .toggleClass('bi-eye-slash', showConnection);
                        })
                        .on('click.classOrigin', '.btn-test-origin-query', function () {
                            testClassOriginQuery($originModal, languageContext, false);
                        })
                        .on('click.classOrigin', '.btn-save-class-origin', function () {
                            saveClassOrigin($originModal, languageContext);
                        })
                        .on('click.classOrigin', '.btn-close-class-origin', function () {
                            $originModal.removeClass('show').hide().attr('aria-hidden', 'true');
                        });

                    var $confirm = plugin.find('#confirm-delete-origin');
                    $confirm.confirmDelete({ LanguageContext: languageContext });
                    $confirm.off('onconfirm.classOrigin').on('onconfirm.classOrigin', function () {
                        var classId = Number($sectionModal.find('#IDClasse').val());
                        $.ajax({
                            type: 'DELETE',
                            url: '/model-class-origin/' + classId,
                            dataType: 'json'
                        }).done(function (response) {
                            if (response.status !== 'OK') {
                                ShowError(
                                    response.error && response.error.message ||
                                        'Impossibile eliminare l’origine dati.',
                                    'model.deleteClassOrigin'
                                );
                                return;
                            }
                            $sectionModal.data('has-class-origin', false)
                                .find('#class-CompilazioneManuale').prop('checked', true);
                            $sectionModal.find('.origin-configure-container').hide();
                        }).fail(function (xhr, status, errorThrown) {
                            var response = xhr && xhr.responseJSON;
                            ShowError(
                                response && response.error && response.error.message ||
                                    xhr.responseText || errorThrown || status,
                                'model.deleteClassOrigin'
                            );
                        });
                    });
                })
                .fail(function (xhr, status, errorThrown) {
                    ShowError(xhr.responseText || errorThrown || status, 'model.loadClassOriginTemplate');
                });
        }
        plugin.off('.modelSectionToggle');
        plugin.on('click.modelSectionToggle', '.model-section-header', function (event) {
            if ($(event.target).closest('.model-editor-menu-trigger, .model-editor-context-menu').length) {
                return;
            }
            toggleModelSection($(this));
        });
        plugin.on('keydown.modelSectionToggle', '.model-section-header', function (event) {
            if ((event.key === 'Enter' || event.key === ' ') &&
                !$(event.target).closest('.model-editor-menu-trigger, .model-editor-context-menu').length) {
                event.preventDefault();
                toggleModelSection($(this));
            }
        });
        var attributesValuesList = [];
        function modelApiUrl(options, endpoint) {
            var apiBase = options && options.ApiBase
                ? String(options.ApiBase).replace(/\/$/, '')
                : '';
            return apiBase + '/' + endpoint;
        }
        function modelApiRequest(options, endpoint, method, data) {
            var request = $.ajax({
                type: method,
                url: modelApiUrl(options, endpoint),
                data: data,
                async: false
            });
            var response = request.responseJSON;

            if (request.status < 200 || request.status >= 300 ||
                (response && response.status === "ERR")) {
                var error = response && response.error;
                var message = error && (error.message || error);
                throw new Error(typeof message === 'string'
                    ? message
                    : (request.responseText || request.statusText || "The process form request failed."));
            }

            return request.responseText;
        }
        function modelApiRequestAsync(options, endpoint, method, data) {
            return $.ajax({
                type: method,
                url: modelApiUrl(options, endpoint),
                data: data,
                dataType: 'text'
            });
        }
        function multipleEntryLabel(key, languageContext) {
            var labels = {
                actions: { IT: 'Azioni', GB: 'Actions', ES: 'Acciones', CN: '操作' },
                edit: { IT: 'Modifica', GB: 'Edit', ES: 'Editar', CN: '編輯' },
                delete: { IT: 'Elimina', GB: 'Delete', ES: 'Eliminar', CN: '刪除' }
            };
            return (labels[key] && labels[key][languageContext]) ||
                (labels[key] && labels[key].IT) || '';
        }
        function datepickerOptions(languageContext) {
            var locale = { IT: 'it', GB: 'en-GB', ES: 'es', CN: 'zh-CN' }[languageContext] || 'it';
            return $.extend({}, $.datepicker.regional[locale], { dateFormat: 'dd/mm/yy' });
        }
        function summaryValue(field, value, languageContext) {
            if (Number(field.IDTipoDati) === 5 && value !== '') {
                var booleanLabels = {
                    IT: { no: 'No', yes: 'Sì' },
                    GB: { no: 'No', yes: 'Yes' },
                    ES: { no: 'No', yes: 'Sí' },
                    CN: { no: '不', yes: '是的' }
                };
                var labels = booleanLabels[languageContext] || booleanLabels.IT;
                if (value === '0' || value.toLowerCase() === 'false') {
                    return labels.no;
                }
                if (value === '1' || value.toLowerCase() === 'true') {
                    return labels.yes;
                }
            }
            return value || '';
        }
        function isModelPreview(options) {
            return options.Mode === 'preview' || options.ActionName === 'Anteprima';
        }
        function updateMultipleEntryStatus($summary, languageContext) {
            if (!$summary.length) {
                return;
            }

            var minimum = Number($summary.data('minimum'));
            var maximum = Number($summary.data('maximum'));
            var recordCount = $summary.find('tbody tr').length;
            var maximumReached = maximum > 0 && recordCount >= maximum;
            var isEditingRecord = $summary.closest('[data-fieldlist]')
                .data('selected-record-id') != null;
            var minimumNotMet = recordCount < minimum;
            var $message = $summary.find('.model-multiple-entry-info');
            var options = JSON.parse(plugin.attr('data-options'));
            var messages = {
                IT: {
                    minimum: 'Devi inserire almeno {minimum} righe',
                    minimumAndMaximum: 'Devi inserire almeno {minimum} righe e al massimo {maximum} righe',
                    maximumReached: 'Hai inserito il numero di righe richiesto ({maximum})'
                },
                GB: {
                    minimum: 'You must enter at least {minimum} rows',
                    minimumAndMaximum: 'You must enter at least {minimum} rows and at most {maximum} rows',
                    maximumReached: 'You have entered the required number of rows ({maximum})'
                },
                ES: {
                    minimum: 'Debes introducir al menos {minimum} filas',
                    minimumAndMaximum: 'Debes introducir al menos {minimum} filas y como máximo {maximum} filas',
                    maximumReached: 'Has introducido el número de filas requerido ({maximum})'
                },
                CN: {
                    minimum: '至少需要輸入 {minimum} 行',
                    minimumAndMaximum: '至少需要輸入 {minimum} 行，最多 {maximum} 行',
                    maximumReached: '已輸入所需的行數（{maximum}）'
                }
            };
            var labels = messages[languageContext] || messages.IT;
            var message = '';
            if (isModelPreview(options)) {
                message = '';
            } else if (maximumReached) {
                message = labels.maximumReached.replace('{maximum}', maximum);
            } else if (minimumNotMet) {
                message = maximum > 0
                    ? labels.minimumAndMaximum
                        .replace('{minimum}', minimum)
                        .replace('{maximum}', maximum)
                    : labels.minimum.replace('{minimum}', minimum);
            }

            $message.text(message).toggleClass('d-none', !message);
            $summary.closest('[data-fieldlist]')
                .find('.model-class-save')
                .prop('disabled', maximumReached && !isEditingRecord);
        }

        function loadMultipleEntryRecordValues(IdClasse, IDRecord) {
            var $classContainer = plugin.find('.model-class-' + IdClasse + '-container');
            var attributes = $classContainer.data('model-attributes') || [];
            var options = JSON.parse(plugin.attr('data-options'));
            var requestId = Number($classContainer.data('record-values-request-id') || 0) + 1;
            $classContainer.data('record-values-request-id', requestId);

            var fieldLoads = attributes.map(function (field) {
                var valueRequest = IDRecord == null
                    ? $.Deferred().resolve('').promise()
                    : plugin.model.getIDModelloIstanzaRecordValueAsync(IDRecord, field.IDAttributo);

                return valueRequest.then(function (value) {
                    if (requestId !== Number($classContainer.data('record-values-request-id'))) {
                        return;
                    }

                    var $control = $classContainer.find('#control_' + field.IDAttributo);
                    if (Number(field.IDTipoDati) === 5) {
                        $classContainer.find('input[name="control_' + field.IDAttributo + '"]')
                            .prop('checked', false)
                            .filter(function () {
                                return this.value === String(value == null ? '' : value);
                            })
                            .prop('checked', true);
                        return;
                    }
                    if (Number(field.IDTipoDati) === 6) {
                        return plugin.model.loadAttributeValuesAsync(field.IDAttributo, value)
                            .then(function (response) {
                                if (requestId !== Number($classContainer.data('record-values-request-id'))) {
                                    return;
                                }
                                var result = JSON.parse(response);
                                if (result.status !== 'OK') {
                                    throw new Error(result.error && result.error.message ||
                                        'Unable to load attribute values.');
                                }
                                var $placeholder = $control.find('option').first().clone();
                                $control.empty().append($placeholder);
                                $.each(result.data || [], function (key, attributeValue) {
                                    $control.append(new Option(
                                        attributeValue.Description,
                                        attributeValue.Code
                                    ));
                                });
                                $control.val(value);
                            });
                    }
                    if (Number(field.IDTipoDati) === 7) {
                        var isWorkflowFieldReadOnly = options.ActionName === 'Modifica' &&
                            (field.IsWorkflowEditable === false || field.IsWorkflowEditable === 0 ||
                                field.IsWorkflowEditable === '0');
                        var $fileUpload = $classContainer.find('.control_' + field.IDAttributo);
                        $fileUpload.fileupload({
                            user: options.user,
                            filelist: value || '',
                            filenumber: field.FileNumber,
                            filetypes: field.FileTypes,
                            fileweight: field.FileWeight,
                            readOnly: options.ReadOnly === true || isWorkflowFieldReadOnly
                        });
                        bindFileUploadValueEvents($fileUpload, field.IDAttributo);
                    }
                    $control.val(value == null ? '' : value);
                });
            });

            return $.when.apply($, fieldLoads).then(function () {
                if (requestId === Number($classContainer.data('record-values-request-id'))) {
                    updateMultipleEntryStatus(
                        $classContainer.find('.model-multiple-entry-summary'),
                        options.user.LanguageContext
                    );
                }
            });
        }

        function refreshMultipleEntrySummary(IdClasse) {
            var $classContainer = plugin.find('.model-class-' + IdClasse + '-container');
            return loadMultipleEntrySummary(
                IdClasse,
                $classContainer.data('model-attributes') || []
            );
        }

        function loadMultipleEntrySummary(IdClasse, attributes) {
            var $summary = plugin.find('.model-class-' + IdClasse + '-container .model-multiple-entry-summary');
            if (!$summary.length) {
                return $.Deferred().resolve().promise();
            }

            var options = JSON.parse(plugin.attr('data-options'));
            var summaryFields = (attributes || []).filter(function (attribute) {
                return attribute.IsSummary === true || attribute.IsSummary === 1;
            });
            var $heading = $summary.find('thead tr').empty();
            var $body = $summary.find('tbody').empty();
            summaryFields.forEach(function (field) {
                $('<th>', { scope: 'col', text: field.Description || '' }).appendTo($heading);
            });
            var canEdit = options.ReadOnly !== true;
            if (canEdit) {
                $('<th>', {
                    scope: 'col',
                    class: 'text-end',
                    text: multipleEntryLabel('actions', options.user.LanguageContext)
                }).appendTo($heading);
            }
            if (!summaryFields.length) {
                $summary.addClass('d-none');
                return $.Deferred().resolve().promise();
            }

            var recordsRequest = options.IDModelloIstanza == null
                ? $.Deferred().resolve([]).promise()
                : modelApiRequestAsync(
                    options,
                    'class-records/' + options.IDModelloIstanza + '/' + IdClasse,
                    'GET'
                ).then(function (response) {
                    var result = JSON.parse(response);
                    if (result.status !== 'OK') {
                        throw new Error(result.error && result.error.message ||
                            'Unable to load class records.');
                    }
                    return result.data || [];
                });

            return recordsRequest.then(function (records) {
                var rowLoads = [];
                records.forEach(function (record) {
                    var IDRecord = Number(record.IDRecord);
                    var $row = $('<tr>');
                    if (canEdit) {
                        $row.addClass('model-multiple-entry-record')
                            .attr({
                                'data-idclasse': IdClasse,
                                'data-idrecord': IDRecord
                            });
                        if (Number(plugin.find('.model-class-' + IdClasse + '-container')
                            .data('selected-record-id')) === IDRecord) {
                            $row.addClass('model-multiple-entry-row-editing');
                        }
                    }

                    var fieldLoads = summaryFields.map(function (field) {
                        var $cell = $('<td>').appendTo($row);
                        return plugin.model.getIDModelloIstanzaRecordValueAsync(
                            IDRecord,
                            field.IDAttributo
                        ).then(function (value) {
                            if (Number(field.IDTipoDati) === 6 && value !== '') {
                                return plugin.model.loadAttributeValuesAsync(
                                    field.IDAttributo,
                                    value
                                ).then(function (response) {
                                    var choices = JSON.parse(response);
                                    var choice = (choices.data || []).find(function (item) {
                                        return String(item.Code) === String(value);
                                    });
                                    if (choice) {
                                        value = choice.Description;
                                    }
                                    return value;
                                });
                            }
                            return value;
                        }).then(function (value) {
                            $cell.text(summaryValue(field, value, options.user.LanguageContext));
                        });
                    });

                    if (canEdit) {
                        var $menu = $('<div>', { class: 'btn-group ms-auto flex-shrink-0' });
                        $('<button>', {
                            type: 'button',
                            class: 'btn btn-light bi bi-three-dots-vertical btn-actions btn-circle rounded-circle p-0 d-inline-flex align-items-center justify-content-center',
                            'data-bs-toggle': 'dropdown',
                            'aria-expanded': 'false',
                            'aria-label': multipleEntryLabel('actions', options.user.LanguageContext)
                        }).appendTo($menu);
                        var $menuItems = $('<ul>', { class: 'dropdown-menu dropdown-menu-end app-context-menu' });
                        $('<button>', {
                            type: 'button',
                            class: 'dropdown-item multiple-entry-edit',
                            'data-idclasse': IdClasse,
                            'data-idrecord': IDRecord
                        }).append($('<i>', { class: 'bi bi-pencil me-2' }))
                            .append(document.createTextNode(multipleEntryLabel('edit', options.user.LanguageContext)))
                            .wrap('<li></li>').parent().appendTo($menuItems);
                        $('<button>', {
                            type: 'button',
                            class: 'dropdown-item multiple-entry-delete',
                            'data-idclasse': IdClasse,
                            'data-idrecord': IDRecord
                        }).append($('<i>', { class: 'bi bi-trash me-2' }))
                            .append(document.createTextNode(multipleEntryLabel('delete', options.user.LanguageContext)))
                            .wrap('<li></li>').parent().appendTo($menuItems);
                        $menu.append($menuItems).appendTo($('<td>', { class: 'text-end' }).appendTo($row));
                    }
                    $body.append($row);
                    rowLoads.push($.when.apply($, fieldLoads));
                });

                $summary.toggleClass('d-none', !summaryFields.length);
                return $.when.apply($, rowLoads).then(function () {
                    updateMultipleEntryStatus($summary, options.user.LanguageContext);
                });
            });
        }

        $.fn.model.draw = function () {
            var options = JSON.parse(plugin.attr('data-options'));

            plugin.find('.model-container').empty();
        };

        $.fn.model.load = function () {

            /* al termine di tutte le chiamate nasconde i loader rimasti visibili */
            $(document).off('ajaxStop.modelLoader').on('ajaxStop.modelLoader', function () {
                plugin.find('.spinner-border').not('.model-section-loader').hide();
            });

            var options = JSON.parse(plugin.attr('data-options'));

            labelNuovo.Description = labelNuovo['Description_' + options.user.LanguageContext];
            var sectionLoads = [];
            function settleSectionLoad(request) {
                var completion = $.Deferred();
                $.when(request).always(function () {
                    completion.resolve();
                });
                return completion.promise();
            }

            $.ajax({
                url: modelApiUrl(options, "model-class/" + options.IDVersione),
                type: "GET",
                data: {},
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(
                        response.error.message,
                        response.error.sender
                    );
                } else if (response.status == "OK") {

                    plugin.find('.model-container').empty();

                    $.when(
                        $.get("/controls/ui/control.ui.model-class.ejs?" + Date.now(),
                            function (templateString) {
                            })
                    ).then(function (templateString, textStatus, jqXHR) {

                        var LanguageContext = options.user.LanguageContext;

                        $.each(response.data, function (key, row) {

                            plugin.find('.model-container').append(
                                ejs.render(templateString, { row, LanguageContext })
                            );

                            if (options.Mode == 'edit') {

                                if (options.IDModelloIstanza == null ||
                                    Number(row.NumeroCicliMin) > 1) {
                                    plugin.find('.model-class-' + row.IDClasse + '-container')
                                        .removeData('selected-record-id');
                                    sectionLoads.push(settleSectionLoad(
                                        plugin.model.loadAttributes(row.IDClasse, null)
                                    ));
                                } else {
                                    /* Per ogni IDClasse, verifica l'esistenza di un record esistente */
                                    sectionLoads.push(settleSectionLoad($.when(
                                        plugin.model.getIDModelloIstanzaRecordAsync(options.IDModelloIstanza, row.IDClasse)
                                    ).then(function (IDRecord, textStatus, jqXHR) {
                                        return plugin.model.loadAttributes(row.IDClasse, IDRecord);
                                    })));
                                }
                            } else {

                                plugin.find('.btn-edit-class-' + row.IDClasse).show();

                                /* design mode */
                                sectionLoads.push(settleSectionLoad(
                                    plugin.model.loadAttributes(row.IDClasse, null)
                                ));

                                plugin.find('.btn-class-' + row.IDClasse + '-edit').click(function () {
                                    plugin.model.editClass(row);
                                });
                                plugin.find('.btn-class-' + row.IDClasse + '-del').click(function () {

                                    var CtlDeleteClass = plugin.find('#confirm-delete-class');

                                    /* get plugin attribute option */
                                    var option = JSON.parse(CtlDeleteClass.attr('data-options'));
                                    /* set plugin args option */
                                    option.args = { IDClasse: $(this).data('idclasse') };
                                    /* re-store plugin attribute option */
                                    CtlDeleteClass.attr('data-options', JSON.stringify(option));
                                    /* open plugin */
                                    CtlDeleteClass.confirmDelete.show(CtlDeleteClass);
                                });
                            }

                        });

                        $.when.apply($, sectionLoads).done(function () {
                            plugin.find('.model-section-loader').hide();
                            plugin.trigger('onsectionsloaded');
                        });

                        /* Carica il template per l'inserimento e la modifica di una sezione */
                        $.when(
                            $.get("/controls/ui/control.ui.model-class-edit.ejs?" + Date.now(),
                                function (templateString) {
                                })
                        ).then(function (templateString, textStatus, jqXHR) {

                            plugin.find('.model-container').append(
                                ejs.render(templateString, { LanguageContext })
                            );

                            configureClassOriginEditor(LanguageContext);

                            plugin.find('.btn-salva-classe').click(function () {
                                plugin.model.saveClass();
                            });

                            plugin.find('#class-InserimentoMultiplo').off('change.multipleEntry').on('change.multipleEntry', function () {
                                var modal = plugin.find('#container-class-edit');
                                modal.find('#class-multiple-entry-settings').toggle(this.checked);
                                updateMultipleEntryValidation(modal, options.user.LanguageContext);
                            });
                            plugin.find('#class-NumeroCicliMin, #class-NumeroCicli')
                                .off('input.multipleEntry change.multipleEntry')
                                .on('input.multipleEntry change.multipleEntry', function () {
                                    updateMultipleEntryValidation(
                                        plugin.find('#container-class-edit'),
                                        options.user.LanguageContext
                                    );
                                });

                            plugin.find('.btn-cancel-class-edit').click(function () {
                                plugin.find('#container-class-edit').hide();
                            });

                            if (options.Mode == 'design') {

                                /* initialize il controllo <confirm-delete-class> */
                                var CtlDeleteClass = plugin.find('#confirm-delete-class');

                                /* Imposta le proprietà di default del plug-in */
                                CtlDeleteClass.confirmDelete({
                                    LanguageContext: LanguageContext,
                                });

                                /* Registra l'evento {onconfirm} del plug-in */
                                CtlDeleteClass.bind("onconfirm", function () {

                                    var option = JSON.parse(CtlDeleteClass.attr('data-options'));

                                    $.when(

                                        plugin.model.delClass(option.args.IDClasse)

                                    ).then(function (response) {

                                        if (response.status == 'OK') { /* raise event */

                                            plugin.model.load();
                                        }

                                    });

                                });

                            }

                        });

                        /* Carica il template per l'inserimento e la modifica di un campo */
                        $.when(
                            $.get("/controls/ui/control.ui.model-attribute-edit.ejs?" + Date.now(),
                                function (templateString) {
                                })
                        ).then(function (templateString, textStatus, jqXHR) {

                            plugin.find('.model-container').append(
                                ejs.render(templateString, { LanguageContext, user: options.user })
                            );

                            plugin.off('click.modelAttributeEdit')
                                .on('click.modelAttributeEdit', '.btn-attribute-edit', function (event) {
                                    event.preventDefault();
                                    var attribute = $(this).data('attribute');
                                    if (attribute) {
                                        plugin.model.editAttribute(attribute);
                                    }
                                });

                            plugin.find('.btn-salva-attributo').click(function () {
                                plugin.model.saveAttribute();
                            });

                            plugin.find('.btn-cancel-attribute-edit').click(function () {
                                plugin.find('#container-attribute-edit').removeClass('show').hide();
                            });

                            var visibilityModal = plugin.find('#container-attribute-value-visibility');
                            var visibilityGroups = visibilityModal.find('#attribute-value-visibility-groups');
                            var visibilityProfiles = visibilityModal.find('#attribute-value-visibility-profiles');
                            var selectedVisibilityGroup = null;
                            var visibilityProfilesRequest = 0;
                            var visibilityGroupsReady = false;
                            var visibilityProfilesReady = false;

                            function loadVisibilityGroups() {
                                if (visibilityGroupsReady && visibilityModal.hasClass('show')) {
                                    visibilityGroups.gruppioperativi.clear(visibilityGroups);
                                    visibilityGroups.gruppioperativi.load(visibilityGroups, 0);
                                }
                            }
                            function loadVisibilityProfiles(groupId) {
                                if (visibilityProfilesReady && groupId) {
                                    visibilityProfiles.profiliutente.load(visibilityProfiles, groupId);
                                }
                            }

                            if (options.Mode == 'design') {
                                visibilityGroups.gruppioperativi({});
                                visibilityProfiles.profiliutente({ toggleEnabled: true });
                            }

                            visibilityGroups.on('onload', function () {
                                visibilityGroupsReady = true;
                                if (visibilityModal.hasClass('show')) loadVisibilityGroups();
                            });
                            visibilityProfiles.on('onload', function () {
                                visibilityProfilesReady = true;
                                loadVisibilityProfiles(selectedVisibilityGroup);
                            });
                            visibilityGroups.on('onselect', function () {
                                var groupOptions = JSON.parse(visibilityGroups.attr('data-options'));
                                selectedVisibilityGroup = groupOptions.IDGruppoOperativo;
                                visibilityModal.find('.attribute-value-visibility-group').text(
                                    groupOptions.Descrizione ? ' (' + groupOptions.Descrizione + ')' : ''
                                );
                                visibilityProfiles.profiliutente.clear(visibilityProfiles);
                                loadVisibilityProfiles(selectedVisibilityGroup);
                            });

                            visibilityProfiles.on('onprofilesloaded', function () {
                                var valueId = visibilityModal.find('#attribute-value-visibility-id').val();
                                var groupId = selectedVisibilityGroup;
                                if (!valueId || !groupId) return;

                                var requestId = ++visibilityProfilesRequest;
                                var profileToggles = visibilityProfiles.find('.workflow-profile-toggle').prop('disabled', true);
                                $.getJSON('/model-class-attribute-value-profili/' + encodeURIComponent(valueId))
                                    .done(function (response) {
                                        if (response.status === 'ERR') {
                                            ShowError(response.error.message, response.error.sender);
                                            return;
                                        }
                                        if (requestId !== visibilityProfilesRequest ||
                                            String(groupId) !== String(selectedVisibilityGroup) ||
                                            String(valueId) !== String(visibilityModal.find('#attribute-value-visibility-id').val())) {
                                            return;
                                        }
                                        var profiles = response.data || [];
                                        visibilityProfiles.find('.workflow-profile-toggle').each(function () {
                                            var profileId = $(this).closest('.profilo-utente')
                                                .find('a[data-idprofiloutente]').data('idprofiloutente');
                                            var enabled = profiles.some(function (item) {
                                                return String(item.IDGruppoOperativo) === String(groupId) &&
                                                    String(item.IDProfiloUtente) === String(profileId);
                                            });
                                            $(this).prop('checked', enabled);
                                        });
                                    })
                                    .fail(function (xhr, status, errorThrown) {
                                        ShowError(xhr.responseText || errorThrown || status, 'loadAttributeValueProfiles');
                                    })
                                    .always(function () {
                                        profileToggles.prop('disabled', false);
                                    });
                            });

                            visibilityProfiles.on('ontoggleprofile', function (event, profile, enabled, toggle) {
                                var valueId = visibilityModal.find('#attribute-value-visibility-id').val();
                                var groupId = selectedVisibilityGroup;
                                if (!valueId || !groupId) return;

                                $(toggle).prop('disabled', true);
                                $.ajax({
                                    url: '/model-class-attribute-value-profili/' + encodeURIComponent(valueId),
                                    type: 'POST',
                                    data: {
                                        IDGruppoOperativo: groupId,
                                        IDProfiloUtente: profile.IDProfiloUtente,
                                        Enabled: enabled
                                    }
                                }).done(function (response) {
                                    if (response.status === 'ERR') {
                                        $(toggle).prop('checked', !enabled);
                                        ShowError(response.error.message, response.error.sender);
                                    }
                                }).fail(function (xhr, status, errorThrown) {
                                    $(toggle).prop('checked', !enabled);
                                    ShowError(xhr.responseText || errorThrown || status, 'saveAttributeValueProfile');
                                }).always(function () {
                                    $(toggle).prop('disabled', false);
                                });
                            });

                            plugin.off('setattributevaluevisibility').on('setattributevaluevisibility', function (event, value) {
                                var valueId = value.IDValue;
                                visibilityModal.appendTo('body');
                                visibilityModal.find('#attribute-value-visibility-id').val(valueId);
                                visibilityModal.find('.attribute-value-visibility-description').text(' / ' + value.Description);
                                visibilityModal.find('.attribute-value-visibility-group').empty();
                                visibilityGroups.gruppioperativi.clear(visibilityGroups);
                                visibilityProfiles.profiliutente.clear(visibilityProfiles);
                                selectedVisibilityGroup = null;
                                visibilityModal.modal('show');
                                var visibilityZIndex = 1065;
                                visibilityModal.css('z-index', visibilityZIndex);
                                $('.modal-backdrop').last().css('z-index', visibilityZIndex - 10);
                            });
                            visibilityModal.on('shown.bs.modal', loadVisibilityGroups);
                            visibilityModal.on('hidden.bs.modal', function () {
                                visibilityModal.css('z-index', '');
                                $('.modal-backdrop').last().css('z-index', '');
                            });

                            plugin.find('.file-type').click(function () {
                                if ($(this).prop('checked')) {
                                    $('#FileTypes').val($('#FileTypes').val() + ',' + $(this).data('type'));
                                } else {
                                    $('#FileTypes').val($('#FileTypes').val().split(',' + $(this).data('type')).join(''));
                                }
                                if (plugin.find('.file-type:checked').length > 0) {
                                    plugin.find('.tipo-file').removeClass('text-danger');
                                    plugin.find('.tipo-file-error').hide();
                                }
                            });

                            if (options.Mode == 'design') {

                                /* initialize il controllo <confirm-delete-attribute> */
                                var CtlDeleteAttribute = plugin.find('#confirm-delete-attribute');

                                /* Imposta le proprietà di default del plug-in */
                                CtlDeleteAttribute.confirmDelete({
                                    LanguageContext: LanguageContext,
                                });

                                /* Registra l'evento {onconfirm} del plug-in */
                                CtlDeleteAttribute.bind("onconfirm", function () {

                                    var option = JSON.parse(CtlDeleteAttribute.attr('data-options'));

                                    $.when(

                                        plugin.model.delAttribute(option.args.IDAttributo)

                                    ).then(function (response) {

                                        if (response.status == 'OK') { /* raise event */

                                            plugin.model.load();
                                        }

                                    });
                                });
                            }

                        });

                        if (options.Mode == 'design') {

                            plugin.find('.model-container').append(
                                '<div class="col-12 p-0 mt-2 mb-2 px-3"><a class="btn btn-primary btn-circle bi bi-plus-lg btn-new-class" data-idversione="' + options.IDVersione + '"></a></div>'
                            )
                            plugin.find('.btn-new-class').click(function () {
                                plugin.model.newClass(options.IDVersione);
                            });

                        }
                    });
                }
            }).fail(function (xhr, status, errorThrown) {

            });
        }
        $.fn.model.loadAttributeTemplate = function (IDTipoDati) {
            var templateKey = String(IDTipoDati);
            if (!attributeTemplateRequests[templateKey]) {
                var request = $.ajax({
                    type: "GET",
                    url: "/controls/ui/control.ui.model-class-attribute-tipo-dati-" + IDTipoDati + ".ejs?" + Date.now()
                });
                attributeTemplateRequests[templateKey] = request;
                request.fail(function (xhr, status, errorThrown) {
                    if (attributeTemplateRequests[templateKey] === request) {
                        delete attributeTemplateRequests[templateKey];
                    }
                    ShowError(xhr.responseText || errorThrown || status, 'model.loadAttributeTemplate');
                });
            }
            return attributeTemplateRequests[templateKey];
        };
        $.fn.model.loadAttributeValuesTemplate = function () {
            if (!attributeValuesTemplateRequest) {
                var request = $.ajax({
                    type: "GET",
                    url: "/controls/ui/control.ui.model-class-attribute-values.ejs?" + Date.now()
                });
                attributeValuesTemplateRequest = request;
                request.fail(function (xhr, status, errorThrown) {
                    if (attributeValuesTemplateRequest === request) {
                        attributeValuesTemplateRequest = null;
                    }
                    ShowError(xhr.responseText || errorThrown || status, 'model.loadAttributeValuesTemplate');
                });
            }
            return attributeValuesTemplateRequest;
        };
        $.fn.model.editAttributeValueList = function (value) {

            let fnName = getFnName();

            try {

                plugin.find('.btn-delete-lista').attr('disabled', false);

                plugin.find(".container-value-edit-culture").multiLanguageTextBox("load", {
                    Title: null,
                    IT: value.Description_IT,
                    GB: value.Description_GB,
                    ES: value.Description_ES,
                    CN: value.Description_CN
                });

            } catch (err) {

                ShowError(err.message, fnName);
            }
        }
        $.fn.model.applyAttributeValueList = function (IDValue) {

            let fnName = getFnName();

            try {

                const CtlTxtValue = $(".container-value-edit-culture").data("mltextbox");

                var options = JSON.parse(plugin.attr('data-options'));
                user = options.user;

                if (attributesValuesList == '') { attributesValuesList = []; }

                if (IDValue != "") {

                    let index = attributesValuesList.findIndex(obj => obj.IDValue === eval(IDValue));
                    attributesValuesList[index].Description = CtlTxtValue.values[options.user.LanguageContext];
                    attributesValuesList[index].Description_IT = CtlTxtValue.values.IT;
                    attributesValuesList[index].Description_GB = CtlTxtValue.values.GB;
                    attributesValuesList[index].Description_ES = CtlTxtValue.values.ES;
                    attributesValuesList[index].Description_CN = CtlTxtValue.values.CN;

                } else {

                    var newValue = {
                        "Description": CtlTxtValue.values[options.user.LanguageContext],
                        IDAttributo: plugin.find('#IDAttributo').val(),
                        IDValue: Date.now(),
                        Code: Date.now(),
                        Description_IT: CtlTxtValue.values.IT,
                        Description_GB: CtlTxtValue.values.GB,
                        Description_ES: CtlTxtValue.values.ES,
                        Description_CN: CtlTxtValue.values.CN,
                        IsVisible: "true",
                        Required: "true",
                    }

                    attributesValuesList.push(newValue);
                }

                plugin.model.loadAttributeValuesList(attributesValuesList, user);
                plugin.model.clearAttributeValueList();
                plugin.find('.btn-delete-lista').attr('disabled', true);

            } catch (err) {

                ShowError(err.message, fnName);
            }
        }
        $.fn.model.clearAttributeValueList = function () {

            let fnName = getFnName();

            try {

                plugin.find(".container-value-edit-culture").multiLanguageTextBox("load", {
                    Title: null,
                    IT: null,
                    GB: null,
                    ES: null,
                    CN: null
                });

                plugin.find('#IDValue').val('');

            } catch (err) {

                ShowError(err.message, fnName);
            }
        }
        $.fn.model.delAttributeValueList = function (IDValue) {

            let fnName = getFnName();

            try {

                var options = JSON.parse(plugin.attr('data-options'));
                user = options.user;

                let index = attributesValuesList.findIndex(obj => obj.IDValue === eval(IDValue));

                if (index !== -1) {
                    attributesValuesList.splice(index, 1);
                }

                plugin.model.loadAttributeValuesList(attributesValuesList, user);
                plugin.model.clearAttributeValueList();
                plugin.find('.btn-delete-lista').attr('disabled', true);

            } catch (err) {

                ShowError(err.message, fnName);
            }
        }
        $.fn.model.loadAttributeValuesList = function (attributesValues, user) {

            let fnName = getFnName();

            try {

                var containerValues = plugin.find('.container-attribute-edit-values-list');

                $.when(
                    plugin.model.loadAttributeValuesTemplate()
                ).then(function (templateString, textStatus, jqXHR) {

                    containerValues.empty();

                    $.each(attributesValues, function (key, value) {

                        containerValues.append(

                            ejs.render(templateString, { value, user })
                            
                        );
                        containerValues.find('.btn-value-' + value.IDValue + '-edit').click(function () {
                            plugin.find('#IDValue').val(value.IDValue);
                            containerValues.find('a').removeClass('text-dark');
                            containerValues.find('.btn-value-' + value.IDValue + '-edit .lbl-value-' + value.IDValue  + '-edit').addClass('text-dark');
                            plugin.model.editAttributeValueList(value);

                        });
                        containerValues.find('.btn-value-' + value.IDValue + '-del').click(function () {

                            plugin.find('#IDValue').val(value.IDValue);
                            containerValues.find('a').removeClass('text-dark');
                            containerValues.find('.btn-value-' + value.IDValue + '-edit .lbl-value-' + value.IDValue + '-edit').addClass('text-dark');
                            plugin.model.editAttributeValueList(value);

                        });
                        containerValues.find('.btn-value-' + value.IDValue + '-visibility').click(function (event) {
                            event.preventDefault();
                            event.stopPropagation();
                            plugin.trigger('setattributevaluevisibility', [value]);
                        });

                    });

                });
            } catch (err) {

                ShowError(err.message, fnName);
            }
        };
        $.fn.model.loadAttributeValues = function (IDAttributo, currentValue) {
            var options = JSON.parse(plugin.attr('data-options'));
            var endpoint = "model-class-attribute-values/" + IDAttributo;
            var query = [];
            if (options.ActionName) {
                query.push("action=" + encodeURIComponent(options.ActionName));
            }
            if (currentValue != null && currentValue !== '') {
                query.push("currentValue=" + encodeURIComponent(currentValue));
            }
            if (query.length) {
                endpoint += "?" + query.join("&");
            }
            return modelApiRequest(
                options,
                endpoint,
                "GET"
            );
        };
        $.fn.model.loadAttributeValuesAsync = function (IDAttributo, currentValue) {
            var options = JSON.parse(plugin.attr('data-options'));
            var endpoint = "model-class-attribute-values/" + IDAttributo;
            var query = [];
            if (options.ActionName) {
                query.push("action=" + encodeURIComponent(options.ActionName));
            }
            if (currentValue != null && currentValue !== '') {
                query.push("currentValue=" + encodeURIComponent(currentValue));
            }
            if (query.length) {
                endpoint += "?" + query.join("&");
            }
            return modelApiRequestAsync(options, endpoint, "GET");
        };
        $.fn.model.postIDModelloIstanza = function () {
            var options = JSON.parse(plugin.attr('data-options'));
            var instanceId = Number(modelApiRequest(options, "post-idmodello-istanza", "POST", {
                IDCliente: options.user.IdAttore,
                IDVersione: options.IDVersione
            }));
            if (!Number.isSafeInteger(instanceId) || instanceId <= 0) {
                throw new Error("The server returned an invalid instance ID.");
            }
            return instanceId;
        };
        $.fn.model.postIDModelloIstanzaRecord = function (IdRecord, IdAttributo, RecordValue) {
            var options = JSON.parse(plugin.attr('data-options'));
            var status = modelApiRequest(options, "post-idmodello-istanza-record", "POST", {
                IdRecord: IdRecord,
                IdAttributo: IdAttributo,
                RecordValue: RecordValue
            });
            if (status !== "OK") {
                throw new Error(status || "Unable to save the process form value.");
            }
            return status;
        };
        $.fn.model.postIDModelloIstanzaRecordMedia = function (IdRecord, IdAttributo, fileString) {
            var options = JSON.parse(plugin.attr('data-options'));
            var file = JSON.parse(fileString);
            var status = modelApiRequest(options, "post-idmodello-istanza-record-media", "POST", {
                IdRecord: IdRecord,
                IdAttributo: IdAttributo,
                originalFilename: file.originalFilename,
                newFilename: file.newFilename,
                mimetype: file.mimetype
            });
            if (status !== "OK") {
                throw new Error(status || "Unable to save the process form attachment.");
            }
            return status;
        };
        $.fn.model.deleteIDModelloIstanzaRecordMedia = function (IdRecord, IdAttributo, filelisttodelete) {
            if (filelisttodelete) {
                var options = JSON.parse(plugin.attr('data-options'));
                filelisttodelete.substring(1).split('@').filter(Boolean).forEach(function (fileToDelete) {
                    var status = modelApiRequest(options, "delete-idmodello-istanza-record-media", "DELETE", {
                        filetodelete: fileToDelete
                    });
                    if (status !== "OK") {
                        throw new Error(status || "Unable to delete the process form attachment.");
                    }
                });
            }
        };
        $.fn.model.getIDModelloIstanzaRecord = function (IDModelloIstanza, IDClasse) {
            var options = JSON.parse(plugin.attr('data-options'));
            var recordId = Number(modelApiRequest(options, "get-idmodello-istanza-record", "POST", {
                IDModelloIstanza: IDModelloIstanza,
                IDClasse: IDClasse
            }));
            if (!Number.isSafeInteger(recordId) || recordId <= 0) {
                throw new Error("The server returned an invalid class record ID.");
            }
            return recordId;
        };
        $.fn.model.getIDModelloIstanzaRecordAsync = function (IDModelloIstanza, IDClasse) {
            var options = JSON.parse(plugin.attr('data-options'));
            return modelApiRequestAsync(options, "get-idmodello-istanza-record", "POST", {
                IDModelloIstanza: IDModelloIstanza,
                IDClasse: IDClasse
            }).then(function (response) {
                var recordId = Number(response);
                if (!Number.isSafeInteger(recordId) || recordId <= 0) {
                    throw new Error("The server returned an invalid class record ID.");
                }
                return recordId;
            });
        };
        $.fn.model.createClassRecord = function (IDModelloIstanza, IDClasse) {
            var options = JSON.parse(plugin.attr('data-options'));
            var response = JSON.parse(modelApiRequest(options, 'class-records', 'POST', {
                IDModelloIstanza: IDModelloIstanza,
                IDClasse: IDClasse
            }));
            var recordId = Number(response.data);
            if (response.status !== 'OK' || !Number.isSafeInteger(recordId) || recordId <= 0) {
                throw new Error(response.error && response.error.message ||
                    'The server returned an invalid class record ID.');
            }
            return recordId;
        };
        $.fn.model.getIDModelloIstanzaRecordValue = function (IDRecord, IDAttributo) {
            var options = JSON.parse(plugin.attr('data-options'));
            return modelApiRequest(options, "get-idmodello-istanza-record-value", "POST", {
                IdRecord: IDRecord,
                IdAttributo: IDAttributo
            });
        };
        $.fn.model.getIDModelloIstanzaRecordValueAsync = function (IDRecord, IDAttributo) {
            var options = JSON.parse(plugin.attr('data-options'));
            return modelApiRequestAsync(options, "get-idmodello-istanza-record-value", "POST", {
                IdRecord: IDRecord,
                IdAttributo: IDAttributo
            });
        };
        $.fn.model.laodTipoDati = function () {

            let fnName = getFnName();

            try {

                var options = JSON.parse(plugin.attr('data-options'));

                if (!attributeTypesRequest) {
                    var request = $.ajax({
                        url: "/tipo-dati",
                        type: "GET",
                        data: {},
                    });
                    attributeTypesRequest = request;
                    request.fail(function () {
                        if (attributeTypesRequest === request) {
                            attributeTypesRequest = null;
                        }
                    });
                }

                return attributeTypesRequest.done(function (response) {

                    plugin.find(".tipo-dati").empty();

                    if (response.status == "ERR") {

                        ShowError(response.error.message, fnName);

                    } else if (response.status == "OK") {
                        $.each(JSON.parse(JSON.parse(JSON.parse(JSON.stringify(response)).data).resultdata), function (key, row) {
                            plugin.find(".tipo-dati").append(
                                new Option(
                                    row.Description,
                                    row.IDTipoDati)
                            );
                        });
                        plugin.find('.tipo-dati').change(function () {
                            attributesValuesList = [];
                            plugin.find('.container-attribute-edit-values-list').empty();
                            plugin.model.clearAttributeValueList();
                            plugin.model.switchTipoDati($(this).val());
                        });
                    }
                }).fail(function (xhr, status, errorThrown) {

                    ShowError(xhr.responseText, fnName);

                });

            } catch (err) {

                ShowError(err.message, fnName);

                return false
            }
        }
        $.fn.model.switchTipoDati = function (IDTipoDati) {

            let fnName = getFnName();

            try {

                plugin.find(".lunghezza-massima").hide();
                plugin.find(".numero-righe").hide();
                plugin.find(".btn-configura-lista").hide();
                plugin.find(".btn-delete-lista").hide();
                plugin.find(".btn-salva-lista").hide();
                plugin.find(".valore-minimo").hide();
                plugin.find(".numero-file").hide();
                plugin.find(".dimensione-file").hide();
                plugin.find(".tipo-file").hide();

                /* TESTO */
                if (IDTipoDati == 1 || IDTipoDati == 11) {

                    plugin.find(".lunghezza-massima").show();

                    if (IDTipoDati == 11) {

                        plugin.find(".numero-righe").show();
                    }
                }
                /* NUMERO */
                if (IDTipoDati == 2) {
                    plugin.find(".valore-minimo").show();
                }
                /* VALUTA */
                if (IDTipoDati == 3) {
                    plugin.find(".valore-minimo").show();
                }
                /* VALUTA */
                if (IDTipoDati == 9) {
                    plugin.find(".valore-minimo").show();
                }
                /* DATA */
                if (IDTipoDati == 4) {

                }
                /* BOOLEAN */
                if (IDTipoDati == 5) {

                }
                /* LISTA COMBINATA */
                if (IDTipoDati == 6) {

                    plugin.find(".btn-configura-lista").show();
                    plugin.find(".btn-delete-lista").show();
                    plugin.find(".btn-salva-lista").show();

                }
                /* FILE */
                if (IDTipoDati == 7) {

                    plugin.find(".tipo-file").show();
                    plugin.find(".numero-file").show();
                    plugin.find(".dimensione-file").show();

                }

            } catch (err) {

                ShowError(err.message, fnName);

            }
        }
        $.fn.model.delClass = function (IDClasse) {

            let fnName = getFnName();

            return $.ajax({
                url: "/del-class/" + IDClasse,
                type: "DELETE",
                data: {},
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(
                        response.error.message,
                        response.error.sender
                    );

                }
            }).fail(function (xhr, status, errorThrown) {

                ShowError(errorThrown, fnName)

            });

            try {

            } catch (err) {

                ShowError(err, fnName);

            }
        }
        $.fn.model.editClass = function (classe) {

            let fnName = getFnName();

            try {

                var options = JSON.parse(plugin.attr('data-options'));

                var modal = plugin.find('#container-class-edit');

                modal.find('#IDClasse').val(classe.IDClasse);
                modal.find('#IDVersione').val(classe.IDVersione);

                /* Inizializza il controllo per gestire la descrizione del campo */
                modal.find('.class-header').html(classe.Description);

                /* Valorizza il campo <Visibile> */
                modal.find("#class-Visibile").prop("checked", classe.Visibile);
                var multipleEntryEnabled = classe.NumeroCicliMin != null || classe.NumeroCicli != null;
                modal.find('#class-InserimentoMultiplo').prop('checked', multipleEntryEnabled);
                modal.find('#class-multiple-entry-settings').toggle(multipleEntryEnabled);
                modal.find('#class-CompilazioneManuale')
                    .prop('checked', true)
                    .prop('disabled', true);
                modal.find('.origin-configure-container').hide();
                modal.data('has-class-origin', false)
                    .data('origin-state-ready', false);
                modal.find('#class-NumeroCicliMin').val(classe.NumeroCicliMin == null ? '' : classe.NumeroCicliMin);
                modal.find('#class-NumeroCicli').val(classe.NumeroCicli == null ? '' : classe.NumeroCicli);
                updateMultipleEntryValidation(modal, options.user.LanguageContext);

                modal.find(".container-control-class-culture-textbox-descrizione").multiLanguageTextBox({
                    Title: null,
                    Label: $('LabelDescrizione').html(),
                    Id: 'DescrizioneClasse',
                    LanguageContext: options.user.LanguageContext,
                    languages: [
                        { code: "IT", title: "Italiano" },
                        { code: "GB", title: "English" },
                        { code: "ES", title: "Spain" },
                        { code: "CN", title: "Cinese" }
                    ]
                });

                modal.find(".container-control-class-culture-textbox-descrizione").multiLanguageTextBox("option", "Title", null);

                modal.find(".container-control-class-culture-textbox-descrizione").multiLanguageTextBox("load", {
                    Title: null,
                    IT: classe.Description_IT,
                    GB: classe.Description_GB,
                    ES: classe.Description_ES,
                    CN: classe.Description_CN
                });

                modal.show();

                var classId = Number(classe.IDClasse);
                var originLoadSequence = Number(modal.data('origin-load-sequence') || 0) + 1;
                modal.data('origin-load-sequence', originLoadSequence);
                if (Number.isSafeInteger(classId) && classId > 0) {
                    var $manualEntry = modal.find('#class-CompilazioneManuale');
                    $.ajax({
                        type: 'GET',
                        url: '/model-class-origin/' + classId,
                        dataType: 'json'
                    }).done(function (response) {
                        if (Number(modal.data('origin-load-sequence')) !== originLoadSequence ||
                            Number(modal.find('#IDClasse').val()) !== classId) {
                            return;
                        }
                        if (response.status !== 'OK') {
                            ShowError(
                                response.error && response.error.message ||
                                    'Impossibile verificare l’origine dati della sezione.',
                                'model.editClass'
                            );
                            return;
                        }
                        var hasOrigin = Boolean(response.data && response.data.origin);
                                modal.data('has-class-origin', hasOrigin)
                                    .data('origin-state-ready', true);
                        $manualEntry.prop('checked', !hasOrigin)
                            .prop('disabled', modal.data('origin-ui-ready') !== true);
                        modal.find('.origin-configure-container').toggle(hasOrigin);
                        modal.find('.btn-configura-origine')
                            .prop('disabled', modal.data('origin-ui-ready') !== true);
                    }).fail(function (xhr, status, errorThrown) {
                        ShowError(
                            xhr && xhr.responseJSON && xhr.responseJSON.error &&
                                xhr.responseJSON.error.message ||
                                xhr.responseText || errorThrown || status,
                            'model.editClass'
                        );
                    });
                } else {
                    modal.data('origin-state-ready', true)
                        .find('#class-CompilazioneManuale')
                        .prop('disabled', modal.data('origin-ui-ready') !== true);
                }

            } catch (err) {

                ShowError(err.message, fnName);

            }
        }
        $.fn.model.newClass = function (IDVersione) {

            let fnName = getFnName();

            try {

                plugin.find('#container-class-edit #IDClasse').val('');
                plugin.find('#container-class-edit #IDVersione').val(IDVersione);

                var classe = {
                    "Description": labelNuovo.Description,
                    "IDClasse": null,
                    "IDClasseParent": null,
                    "IDVersione": IDVersione,
                    "Visibile": true,
                    "Description_IT": labelNuovo.Description_IT,
                    "Description_GB": labelNuovo.Description_GB,
                    "Description_ES": labelNuovo.Description_ES,
                    "Description_CN": labelNuovo.Description_CN,
                    "NumeroCicliMin": null,
                    "NumeroCicli": null,
                    "Peso": null,
                    "Scala": null,
                    "IsQuestion": null,
                    "HelpText_IT": null,
                    "HelpText_GB": null,
                    "HelpText_ES": null,
                    "HelpText_CN": null,
                    Ordine: Date.now(),
                    "IsVisible": true
                }

                plugin.model.editClass(classe);

            } catch (err) {

                ShowError(err.message, fnName);

            }
        }
        $.fn.model.saveClass = function () {

            let fnName = getFnName();

            try {

                var options = JSON.parse(plugin.attr('data-options'));

                var modal = plugin.find('#container-class-edit');
                var IDClasse = modal.find('#IDClasse').val();
                var IDVersione = modal.find('#IDVersione').val();
                var multipleEntryEnabled = modal.find('#class-InserimentoMultiplo').prop('checked');

                /* Convalida i dati immessi dall'utente */
                var isvalidform = true;
                var formSource = '#container-class-edit';
                const forms = document.querySelectorAll(formSource + ' .form-control, ' + formSource + ' .form-select, ' + formSource + ' .form-check-input ');
                Array.from(forms).forEach(form => {
                    if (form.offsetParent != null && !form.checkValidity()) {
                        isvalidform = false;
                    }
                })

                if (!updateMultipleEntryValidation(modal, options.user.LanguageContext)) {
                    isvalidform = false;
                }
                if (!isvalidform) {
                    return;
                }

                const CtlTxtDescrizione = plugin.find(".container-control-class-culture-textbox-descrizione").data("mltextbox");

                var Ordine = null;
                
                if (IDClasse == '') {
                    Ordine = Date.now();
                }

                $.ajax({
                    type: "POST",
                    url: "/post-class",
                    data: {
                        IDVersione: IDVersione,
                        IDClasse: IDClasse,
                        Visibile: plugin.find('#class-Visibile').prop('checked'),
                        Description_IT: CtlTxtDescrizione.value.IT,
                        Description_GB: CtlTxtDescrizione.value.GB,
                        Description_ES: CtlTxtDescrizione.value.ES,
                        Description_CN: CtlTxtDescrizione.value.CN,
                        NumeroCicliMin: multipleEntryEnabled && modal.find('#class-NumeroCicliMin').val() !== ''
                            ? Number(modal.find('#class-NumeroCicliMin').val())
                            : null,
                        NumeroCicli: multipleEntryEnabled && modal.find('#class-NumeroCicli').val() !== ''
                            ? Number(modal.find('#class-NumeroCicli').val())
                            : null,
                        Ordine: Ordine,
                    },
                    async: false
                }).done(function (response) {

                    if (response == "OK") {

                        plugin.model.load();

                    } else {

                        ShowError(JSON.parse(response).error, fnName);

                    }
                });

            } catch (err) {

                ShowError(err, fnName);

            }

        }
        $.fn.model.delAttribute = function (IDAttributo) {

            let fnName = getFnName();

            try {

                return $.ajax({
                    url: "/del-attribute/" + IDAttributo,
                    type: "DELETE",
                    data: {},
                }).done(function (response) {
                    if (response.status == "ERR") {
                        /* attende la chiusura della conferma di eliminazione prima di mostrare l'avviso */
                        var showAttributeError = function () {
                            var systemMessage = $('#system-message').appendTo('body').css('z-index', 2000);
                            systemMessage.one('shown.bs.modal', function () {
                                $('.modal-backdrop').last().css('z-index', 1990);
                            });
                            ShowError(
                                response.error.message,
                                response.error.sender
                            );
                        };
                        var openConfirm = $('.modal-confirm-delete.show');
                        if (openConfirm.length) {
                            openConfirm.one('hidden.bs.modal', showAttributeError);
                            openConfirm.modal('hide');
                        } else {
                            showAttributeError();
                        }

                    }
                }).fail(function (xhr, status, errorThrown) {

                    ShowError(errorThrown, fnName)

                });

            } catch (err) {

                ShowError(err, fnName);

            }
        }
        $.fn.model.editAttribute = function (campo) {

            var options = JSON.parse(plugin.attr('data-options'));

            var modal = plugin.find('#container-attribute-edit');

            /* Inizializza il controllo per gestire la descrizione del campo */
            modal.find('.attribute-header').html(campo.Description);
            modal.find('.tipo-file').removeClass('text-danger');
            modal.find('.tipo-file-error').hide();
            plugin.find('#container-attribute-edit-values .attribute-header').html(campo.Description);

            modal.find(".container-control-culture-textbox-descrizione").multiLanguageTextBox({
                Title: '',
                Label: $('LabelDescrizione').html(),
                Id: 'DescrizioneAttributo',
                LanguageContext: options.user.LanguageContext,
                languages: [
                    { code: "IT", title: "Italiano" },
                    { code: "GB", title: "English" },
                    { code: "ES", title: "Spain" },
                    { code: "CN", title: "Cinese" }
                ]
            });

            modal.find(".container-control-culture-textbox-descrizione").multiLanguageTextBox("option", "Title",
                $('#context-menu-link').find('#DescDirezione').val());

            modal.find(".container-control-culture-textbox-descrizione").multiLanguageTextBox("load", {
                Title: $('#context-menu-link').find('#DescDirezione').val(),
                IT: campo.Description_IT,
                GB: campo.Description_GB,
                ES: campo.Description_ES,
                CN: campo.Description_CN
            });

            plugin.find(".container-value-edit-culture").multiLanguageTextBox({
                Title: null,
                Label: null,
                Id: 'DescrizioneValue',
                LanguageContext: options.user.LanguageContext,
                languages: [
                    { code: "IT", title: "Italiano" },
                    { code: "GB", title: "English" },
                    { code: "ES", title: "Spain" },
                    { code: "CN", title: "Cinese" }
                ]
            });

            plugin.find(".container-value-edit-culture").multiLanguageTextBox("option", "Title", null);

            $.when(
                plugin.model.laodTipoDati()
            ).then(function () {

                /* Valorizza il campo <Tipo> */
                plugin.find("#IDTipoDati").val(campo.IDTipoDati);

                /* Valorizza il campo <Visibile> */
                plugin.find("#Visibile").prop("checked", campo.Visibile);

                /* Valorizza il campo <Obbligatorio> */
                plugin.find("#Obbligatorio").prop("checked", campo.Obbligatorio);

                plugin.find("#IsFilter").prop("checked", campo.IsFilter === true || campo.IsFilter === 1);
                plugin.find("#IsSummary").prop("checked", campo.IsSummary === true || campo.IsSummary === 1);

                plugin.find("#Lunghezza").val(campo.Lunghezza);

                plugin.find("#NumeroRighe").val(campo.NumeroRighe);

                plugin.find("#FileTypes").val(campo.FileTypes);

                plugin.find("#FileNumber").val(campo.FileNumber);

                plugin.find("#FileWeight").val(campo.FileWeight);

                /* TESTO */
                if (campo.IDTipoDati == 1 || campo.IDTipoDati == 11) {

                }
                /* NUMERO */
                if (campo.IDTipoDati == 2) {

                }
                /* VALUTA */
                if (campo.IDTipoDati == 3) {

                }
                /* DATA */
                if (campo.IDTipoDati == 4) {

                }
                /* BOOLEAN */
                if (campo.IDTipoDati == 5) {

                }
                /* LISTA COMBINATA */
                if (campo.IDTipoDati == 6) {

                    /* Caricamento valori lista */
                    $.when(
                        plugin.model.loadAttributeValuesAsync(campo.IDAttributo)
                    ).then(function (AttributesValues, textStatus, jqXHR) {

                        attributesValuesList = JSON.parse(AttributesValues).data;

                        plugin.model.loadAttributeValuesList(attributesValuesList, user);

                    });

                }
                /* FILE */
                if (campo.IDTipoDati == 7) {
                    $('#file-type-text').prop('checked', false);
                    $('#file-type-pdf').prop('checked', false);
                    $('#file-type-image').prop('checked', false);
                    if (campo.FileTypes != '') {
                        arFileTypes = campo.FileTypes.split(',');
                        for (i = 0; i <= arFileTypes.length; i++) {
                            $('#file-type-' + arFileTypes[i]).prop('checked', true);
                        }
                    }

                }

                plugin.model.switchTipoDati(campo.IDTipoDati);
                plugin.find('#IDClasse').val(campo.IDClasse);
                plugin.find('#IDAttributo').val(campo.IDAttributo);

                modal.addClass('show').show();
                modal.find('.spinner-border').hide();

            });
            
        }
        $.fn.model.saveAttribute = function () {

            let fnName = getFnName();

            try {

                var options = JSON.parse(plugin.attr('data-options'));

                var IDClasse = plugin.find('#IDClasse').val();
                var IDAttributo = plugin.find('#IDAttributo').val();

                /* Convalida i dati immessi dall'utente */
                var isvalidform = true;
                var formSource = '#container-attribute-edit';
                const forms = document.querySelectorAll(formSource + ' .form-control, ' + formSource + ' .form-select, ' + formSource + ' .form-check-input ');
                Array.from(forms).forEach(form => {
                    if (form.offsetParent != null && !form.checkValidity()) {
                        isvalidform = false;
                    }
                })

                /* Tipo File: almeno un tipo file deve essere selezionato */
                var fileTypesMissing = plugin.find('#IDTipoDati').val() == 7 && plugin.find('.file-type:checked').length == 0;
                plugin.find('.tipo-file').toggleClass('text-danger', fileTypesMissing);
                plugin.find('.tipo-file-error').toggle(fileTypesMissing);
                if (fileTypesMissing) {
                    isvalidform = false;
                }

                if (!isvalidform) {
                    return;
                }

                const CtlTxtDescrizione = plugin.find(".container-control-culture-textbox-descrizione").data("mltextbox");

                $.ajax({
                    type: "POST",
                    url: "/post-attribute",
                    data: {
                        IDAttributo: IDAttributo,
                        IDClasse: IDClasse,
                        IDTipoDati: plugin.find('#IDTipoDati').val(),
                        ValoreMinimo: plugin.find('#ValoreMinimo').val(),
                        Visibile: plugin.find('#Visibile').prop('checked'),
                        Obbligatorio: plugin.find('#Obbligatorio').prop('checked'),
                        IsFilter: plugin.find('#IsFilter').prop('checked'),
                        IsSummary: plugin.find('#IsSummary').prop('checked'),
                        Description_IT: CtlTxtDescrizione.value.IT,
                        Description_GB: CtlTxtDescrizione.value.GB,
                        Description_ES: CtlTxtDescrizione.value.ES,
                        Description_CN: CtlTxtDescrizione.value.CN,
                        Lunghezza: plugin.find('#Lunghezza').val(),
                        LunghezzaDecimale: plugin.find('#LunghezzaDecimale').val(),
                        NumeroRighe: plugin.find('#NumeroRighe').val(),
                        Ordine: Date.now(),
                        FileTypes: plugin.find('#FileTypes').val(),
                        FileWeight: plugin.find('#FileWeight').val(),
                        FileNumber: plugin.find('#FileNumber').val(),
                        attributesValuesList: attributesValuesList,
                    },
                    async: false
                }).done(function (response) {

                    if (response == "OK") {

                        plugin.model.load();

                    } else {

                        ShowError(JSON.parse(response).error, fnName);

                    }
                });

            } catch (err) {

                ShowError(err, fnName);

            }

        }
        $.fn.model.loadAttributes = function (IdClasse, IDRecord) {

            var options = JSON.parse(plugin.attr('data-options'));
            user = options.user;
            var $sectionLoader = plugin.find(
                '.model-class-' + IdClasse + '-container .model-section-loader'
            ).show();

            var fieldlist = "";
            function isWorkflowFieldReadOnly(row) {
                return options.ActionName === 'Modifica' &&
                    (row.IsWorkflowEditable === false || row.IsWorkflowEditable === 0 ||
                        row.IsWorkflowEditable === '0');
            }
            function lockWorkflowField(row) {
                if (!isWorkflowFieldReadOnly(row)) {
                    return;
                }
                plugin.find('#control_' + row.IDAttributo +
                    ', [name="control_' + row.IDAttributo + '"]').prop('disabled', true);
                plugin.find('.control_' + row.IDAttributo + ' :input').prop('disabled', true);
            }

            var fieldLoads = [];
            var classOriginConfig = null;
            if (options.ApiBase && options.ActionName === 'Modifica') {
                fieldLoads.push(modelApiRequestAsync(
                    options,
                    'class-origin/' + IdClasse,
                    'GET',
                    { workflowRecordId: options.WorkflowRecordId || '' }
                ).then(function (response) {
                    var result = JSON.parse(response);
                    if (result.status !== 'OK') {
                        throw new Error(result.error && result.error.message ||
                            'Unable to load the class data source.');
                    }
                    classOriginConfig = result.data;
                }));
            }
            return $.when(
                $.ajax({
                    url: modelApiUrl(JSON.parse(plugin.attr('data-options')),
                        "model-class-attribute/" + IdClasse) +
                        '?workflowRecordId=' + encodeURIComponent(options.WorkflowRecordId || '') +
                        '&action=' + encodeURIComponent(options.ActionName || ''),
                    type: "GET",
                    data: {},
                }).done(function (response) {
                    if (response.status == "ERR") {
                        $sectionLoader.hide();
                        ShowError(
                            response.error.message,
                            response.error.sender
                        );
                    } else if (response.status == "OK") {

                        plugin.find('.model-class-' + IdClasse + '-container')
                            .data('model-attributes', response.data || []);
                        plugin.find('.model-class-' + IdClasse + '-attributes').empty();
                        try {
                            fieldLoads.push(loadMultipleEntrySummary(IdClasse, response.data));
                        } catch (error) {
                            fieldLoads.push($.Deferred().reject(error).promise());
                        }

                        if (isModelPreview(options) &&
                            plugin.find('.model-class-' + IdClasse + '-container .model-multiple-entry-summary').length) {
                            return;
                        }

                        $.each(response.data, function (key, row) {                            

                            /* Caricamento valori attributo */
                            var recordValue = '';
                            var fieldPlaceholder = document.createComment('');
                            plugin.find('.model-class-' + IdClasse + '-attributes')[0]
                                .appendChild(fieldPlaceholder);

                            if (options.Mode == 'edit') {

                                var fieldLoad = $.when(IDRecord == null
                                    ? ''
                                    : plugin.model.getIDModelloIstanzaRecordValueAsync(IDRecord, row.IDAttributo)
                                ).then(function (RecordValue) {

                                    return $.when(
                                        plugin.model.loadAttributeTemplate(row.IDTipoDati)
                                    ).then(function (templateString) {

                                        var mode = options.Mode;

                                        $(fieldPlaceholder).replaceWith(
                                            ejs.render(templateString, { row, mode, user })
                                        );
                                        lockWorkflowField(row);

                                        /* TESTO */
                                        if (row.IDTipoDati == 1 || row.IDTipoDati == 11) {
                                            plugin.find("#control_" + row.IDAttributo).val(RecordValue);
                                        }

                                        /* NUMERO */
                                        if (row.IDTipoDati == 2) {
                                            plugin.find("#control_" + row.IDAttributo).val(RecordValue);
                                            plugin.find("#control_" + row.IDAttributo).inputFilter(function (value) {
                                                return /^-?\d*$/.test(value);
                                            });
                                        }
                                        /* VALUTA */
                                        if (row.IDTipoDati == 3) {
                                            plugin.find("#control_" + row.IDAttributo).val(RecordValue);
                                            plugin.find("#control_" + row.IDAttributo).inputFilter(function (value) {
                                                return /^-?\d*[.,]?\d{0,row.LunghezzaDecimale}$/.test(value);
                                            });
                                        }
                                        /* DATA */
                                        if (row.IDTipoDati == 4) {
                                            plugin.find("#control_" + row.IDAttributo).val(RecordValue);
                                            plugin.find("#control_" + row.IDAttributo)
                                                .datepicker(datepickerOptions(options.user.LanguageContext));
                                        }
                                        /* BOOLEAN */
                                        if (row.IDTipoDati == 5) {
                                            plugin.find('input[name="control_' + row.IDAttributo + '"]')
                                                .filter(function () {
                                                    return this.value === String(RecordValue == null ? '' : RecordValue);
                                                })
                                                .prop('checked', true);
                                        }
                                        /* LISTA COMBINATA */
                                        if (row.IDTipoDati == 6) {

                                            /* Caricamento valori lista */
                                            return plugin.model.loadAttributeValuesAsync(row.IDAttributo, RecordValue)
                                                .then(function (AttributesValues) {
                                                $.each(JSON.parse(AttributesValues).data, function (key, AttributeValue) {
                                                    plugin.find("#control_" + row.IDAttributo).append(
                                                        new Option(
                                                            AttributeValue.Description,
                                                            AttributeValue.Code)
                                                    );
                                                });
                                                var $control = plugin.find("#control_" + row.IDAttributo);
                                                $control.val(RecordValue);
                                            });
                                        }
                                        /* FILE */
                                        if (row.IDTipoDati == 7) {

                                            plugin.find("#control_" + row.IDAttributo).val(RecordValue);

                                            /* inizializza il controllo FileUpload */
                                            var ControlFileUpload = plugin.find(".control_" + row.IDAttributo);

                                            /* Imposta le proprietà di default del plug-in <FileUpload> */
                                            ControlFileUpload.fileupload({
                                                user: options.user,
                                                filelist: RecordValue,
                                                filenumber: row.FileNumber,
                                                filetypes: row.FileTypes,
                                                fileweight: row.FileWeight,
                                                readOnly: options.ReadOnly === true || isWorkflowFieldReadOnly(row)
                                            });

                                            bindFileUploadValueEvents(ControlFileUpload, row.IDAttributo);
                                        }
                                    });
                                });
                                fieldLoads.push(fieldLoad);
                            } else {
                                /* design mode */

                                var fieldLoad = $.when(
                                    plugin.model.loadAttributeTemplate(row.IDTipoDati)
                                ).then(function (templateString) {

                                    var mode = options.Mode;

                                    $(fieldPlaceholder).replaceWith(
                                        ejs.render(templateString, { row, mode, user })
                                    );

                                    plugin.find('.btn-attribute-' + row.IDAttributo + '-edit')
                                        .data('attribute', row);

                                    plugin.find('.btn-attribute-' + row.IDAttributo + '-del').click(function () {

                                        var CtlDeleteAttribute = plugin.find('#confirm-delete-attribute');

                                        /* get plugin attribute option */
                                        var option = JSON.parse(CtlDeleteAttribute.attr('data-options'));
                                        /* set plugin args option */
                                        option.args = { IDAttributo: $(this).data('idattributo') };
                                        /* re-store plugin attribute option */
                                        CtlDeleteAttribute.attr('data-options', JSON.stringify(option));
                                        /* open plugin */
                                        CtlDeleteAttribute.confirmDelete.show(CtlDeleteAttribute);

                                    });


                                    /* TESTO */
                                    if (row.IDTipoDati == 1 || row.IDTipoDati == 11) {

                                    }

                                    /* NUMERO */
                                    if (row.IDTipoDati == 2) {
                                        plugin.find("#control_" + row.IDAttributo).inputFilter(function (value) {
                                            return /^-?\d*$/.test(value);
                                        });
                                    }
                                    /* VALUTA */
                                    if (row.IDTipoDati == 3) {
                                        plugin.find("#control_" + row.IDAttributo).inputFilter(function (value) {
                                            return /^-?\d*[.,]?\d{0,row.LunghezzaDecimale}$/.test(value);
                                        });
                                    }
                                    /* DATA */
                                    if (row.IDTipoDati == 4) {
                                        plugin.find("#control_" + row.IDAttributo)
                                            .datepicker(datepickerOptions(options.user.LanguageContext));
                                    }
                                    /* BOOLEAN */
                                    if (row.IDTipoDati == 5) {

                                    }
                                    /* LISTA COMBINATA */
                                    if (row.IDTipoDati == 6) {

                                        /* Caricamento valori lista */
                                        return plugin.model.loadAttributeValuesAsync(row.IDAttributo)
                                            .then(function (AttributesValues) {
                                            $.each(JSON.parse(AttributesValues).data, function (key, AttributeValue) {
                                                plugin.find("#control_" + row.IDAttributo).append(
                                                    new Option(
                                                        AttributeValue.Description,
                                                        AttributeValue.Code)
                                                );
                                            });
                                        });
                                    }
                                    /* FILE */
                                    if (row.IDTipoDati == 7) {

                                        /* inizializza il controllo FileUpload */
                                        var ControlFileUpload = plugin.find(".control_" + row.IDAttributo);

                                        /* Imposta le proprietà di default del plug-in <FileUpload> */
                                        ControlFileUpload.fileupload({
                                            user: options.user,
                                            filelist: '',
                                            filenumber: row.FileNumber,
                                            filetypes: row.FileTypes,
                                            fileweight: row.FileWeight
                                        });

                                        bindFileUploadValueEvents(ControlFileUpload, row.IDAttributo);
                                    }

                                });
                                fieldLoads.push(fieldLoad);


                            }

                        });

                    }
                    return fieldlist;
                }).fail(function (xhr, status, errorThrown) {

                })
            ).then(function (response) {
                return $.when.apply($, fieldLoads).then(function () {

                if (classOriginConfig && classOriginConfig.configured &&
                    Array.isArray(classOriginConfig.columns)) {
                    var $classContainer = plugin.find('.model-class-' + IdClasse + '-container');
                    var $originButton = $('<button>', {
                        type: 'button',
                        class: 'btn btn-outline-primary model-class-origin-select',
                        'data-idclasse': IdClasse
                    }).append(
                        $('<i>', { class: 'bi bi-database me-1', 'aria-hidden': 'true' }),
                        document.createTextNode({
                            IT: 'Seleziona',
                            GB: 'Select',
                            ES: 'Seleccionar',
                            CN: '選擇資料'
                        }[options.user.LanguageContext] || 'Seleziona dati')
                    );
                    var $originAction = $('<div>', {
                        class: 'model-class-origin-select-container mb-2'
                    }).append($originButton);
                    var $summary = $classContainer.find('.model-multiple-entry-summary');
                    if ($summary.length) {
                        $summary.before($originAction);
                    } else {
                        $classContainer.find('.model-class-' + IdClasse + '-attributes')
                            .before($originAction);
                    }

                    classOriginConfig.columns.forEach(function (column) {
                        var attributeId = Number(column.IDAttributo);
                        var attributeSelector = '#control_' + attributeId +
                            ', [name="control_' + attributeId + '"]';
                        $classContainer.find(attributeSelector)
                            .prop('disabled', true)
                            .attr('aria-readonly', 'true');
                        $classContainer.find('.control_' + attributeId + ' :input')
                            .prop('disabled', true)
                            .attr('aria-readonly', 'true');
                    });
                }

                plugin.find(".btn-configura-lista")
                    .off('click.modelAttributeList')
                    .on('click.modelAttributeList', function () {
                        $('#container-attribute-edit-values').modal('show');
                    });
                plugin.find(".btn-salva-lista")
                    .off('click.modelAttributeList')
                    .on('click.modelAttributeList', function () {
                        plugin.model.applyAttributeValueList(plugin.find('#IDValue').val());
                    });
                plugin.find(".btn-delete-lista")
                    .off('click.modelAttributeList')
                    .on('click.modelAttributeList', function () {
                        plugin.model.delAttributeValueList(plugin.find('#IDValue').val());
                    });

                if (options.Mode == 'design') {

                    plugin.find('.model-class-' + IdClasse + '-container').append(

                        '<div class="col-12 p-0 mb-2 px-3"><a class="btn btn-primary btn-circle bi bi-plus-lg btn-new-attribute" data-idclasse="' + IdClasse + '"></a></div>'
                    );

                    plugin.find('.btn-new-attribute').click(function () {
                        plugin.model.editAttribute(
                            {

                                "Description": labelNuovo.Description,
                                "IDAttributo": null,
                                "IDClasse": $(this).data('idclasse'),
                                "Visibile": true,
                                "Obbligatorio": false,
                                "IsFilter": false,
                                "IsSummary": false,
                                "IDTipoDati": null,
                                "ValoreMinimo": null,
                                "Peso": null,
                                "Description_IT": labelNuovo.Description_IT,
                                "Description_GB": labelNuovo.Description_GB,
                                "Description_ES": labelNuovo.Description_ES,
                                "Description_CN": labelNuovo.Description_CN,
                                "Description_DE": null,
                                "HelpText_IT": null,
                                "HelpText_GB": null,
                                "HelpText_DE": null,
                                "HelpText_ES": null,
                                "Lunghezza": 0,
                                "LunghezzaDecimale": null,
                                "NumeroRighe": 0,
                                "TipoValuta": "",
                                "Ordine": Date.now(),
                                "FileTypes": null,
                                "FileWeight": 0,
                                "FileValidity": null,
                                "FileNumber": 0,
                                "IsVisible": true
                            }
                        );
                    });

                }

                /* Valorizza la lista degli IDAttributo, utilizzata per la registrazione dei valori */
                $.each(response.data, function (key, row) {
                    if (isWorkflowFieldReadOnly(row)) {
                        return;
                    }
                    fieldlist += '@' + row.IDAttributo;
                });

                if (options.Mode == "edit" && options.ReadOnly !== true) {

                    if (!fieldlist && options.ActionName === 'Modifica' && options.WorkflowRecordId) {
                        plugin.trigger("onload");
                        $sectionLoader.hide();
                        return;
                    }

                    var $classContainer = plugin.find('.model-class-' + IdClasse + '-container');
                    $classContainer.data('fieldlist', fieldlist.substring(1));
                    $classContainer.find('.btn-salva').remove();
                    $.get("/controls/ui/control.ui.button.salva.ejs?" + Date.now(), function (response) {
                        var $attributes = $classContainer.find('.model-class-' + IdClasse + '-attributes');
                        $attributes.append(
                            ejs.render(response, { user })
                        );
                        var $saveButton = $attributes.find('.btn-salva');
                        $saveButton.addClass('model-class-save').click(function () {
                            if (this.disabled) {
                                return;
                            }
                            $sectionLoader.show();
                            setTimeout(function () {
                                var loadingRefresh = false;
                                try {
                                    var saved = plugin.model.salvaClasse(
                                        IdClasse,
                                        $classContainer.data('fieldlist')
                                    );
                                    if (saved) {
                                        if ($classContainer.find('.model-multiple-entry-summary').length) {
                                            $classContainer.removeData('selected-record-id');
                                            loadingRefresh = true;
                                            $.when(
                                                refreshMultipleEntrySummary(IdClasse),
                                                loadMultipleEntryRecordValues(IdClasse, null)
                                            ).fail(function (xhr, status, errorThrown) {
                                                ShowError(
                                                    xhr && (xhr.responseText || xhr.message) ||
                                                        errorThrown || status ||
                                                        'Unable to refresh the class summary.',
                                                    'model.saveClassRecord'
                                                );
                                            }).always(function () {
                                                $sectionLoader.hide();
                                            });
                                        }
                                        plugin.trigger("onsave");
                                        $classContainer[0].scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'start'
                                        });
                                    }
                                } finally {
                                    if (!loadingRefresh) {
                                        $sectionLoader.hide();
                                    }
                                }
                            }, 0);

                        });
                        updateMultipleEntryStatus(
                            $classContainer.find('.model-multiple-entry-summary'),
                            options.user.LanguageContext
                        );
                    });
                }
                plugin.trigger("onload");
                $sectionLoader.hide();
                });
            }).fail(function (xhr, status, errorThrown) {
                $sectionLoader.hide();
                ShowError(
                    xhr && (xhr.responseText || xhr.message) || errorThrown || status ||
                        'Unable to load model attributes.',
                    'model.loadAttributes'
                );
            });
        }
        $.fn.model.salvaClasse = function (IdClasse, FieldList) {
            try {
                var isvalidform = true;
                var forms = document.querySelectorAll(
                    '#frm-class-' + IdClasse + ' .form-control, #frm-class-' + IdClasse + ' .form-select'
                );
                Array.from(forms).forEach(form => {
                    if (form.offsetParent != null && !form.checkValidity()) {
                        isvalidform = false;
                    }
                });

                var options = JSON.parse(plugin.attr('data-options'));
                if (!isvalidform) {
                    var form = document.getElementById('frm-class-' + IdClasse);
                    var invalidField = form && form.querySelector(':invalid');
                    if (invalidField) {
                        invalidField.focus();
                        invalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    return false;
                }

                if (options.IDModelloIstanza == null) {
                    options.IDModelloIstanza = plugin.model.postIDModelloIstanza();
                    plugin.attr('data-options', JSON.stringify(options));
                }

                var $classContainer = plugin.find('.model-class-' + IdClasse + '-container');
                var hasMultipleEntry = $classContainer.find('.model-multiple-entry-summary').length > 0;
                var IDRecord = $classContainer.data('selected-record-id');
                if (IDRecord == null) {
                    IDRecord = hasMultipleEntry
                        ? plugin.model.createClassRecord(options.IDModelloIstanza, IdClasse)
                        : plugin.model.getIDModelloIstanzaRecord(options.IDModelloIstanza, IdClasse);
                }

                (FieldList || '').split('@').filter(Boolean).forEach(function (IDAttributo) {
                    var control = plugin.find('#control_' + IDAttributo);
                    if (control.data('idtipodati') === undefined) {
                        control = plugin.find('input[name="control_' + IDAttributo + '"]:checked');
                    }
                    var IdTipoDati = control.data('idtipodati');
                    var recordValue = control.val();
                    recordValue = recordValue == null ? '' : String(recordValue);
                    plugin.model.postIDModelloIstanzaRecord(IDRecord, IDAttributo, recordValue);

                    if (IdTipoDati == 7) {
                        var fileList = recordValue.charAt(0) === '@'
                            ? recordValue.substring(1)
                            : recordValue;
                        fileList.split('@').filter(Boolean).forEach(function (file) {
                            plugin.model.postIDModelloIstanzaRecordMedia(IDRecord, IDAttributo, file);
                        });
                        var $fileControl = plugin.find('.control_' + IDAttributo);
                        plugin.model.deleteIDModelloIstanzaRecordMedia(
                            IDRecord,
                            IDAttributo,
                            JSON.parse($fileControl.attr('data-options')).filetodelete
                        );
                    }
                });

                $classContainer.find('.card.border-success').fadeIn('slow');
                setTimeout(function () {
                    $classContainer.find('.card.border-success').fadeOut('slow');
                }, 3000);
                return true;
            } catch (err) {
                ShowError(err.message, 'model.salvaClasse');
                return false;
            }
        };
        return this.each(function () {

            /* store first plugin attribute options */
            plugin.attr('data-options', JSON.stringify(options));

            /* initialize plugin instance */
            plugin.html($.fn.model.draw());

            /* load plugin template */
            $.get("/controls/ui/control.ui.model.html", function (response) {
                /* render plugin template */
                renderTemplate(response);
            });
            function renderTemplate(response) {
                /* fill plugin template */
                plugin.html($(response).html());

                /* get plugin attribute options */
                var options = JSON.parse(plugin.attr('data-options'));
                if (options.Mode === 'edit' && options.ReadOnly !== true) {
                    var $confirm = $('<div>', {
                        class: 'model-multiple-entry-delete-confirm'
                    }).appendTo(plugin);
                    $confirm.confirmDelete({
                        LanguageContext: options.user.LanguageContext
                    });
                }

                plugin.model.draw();

            };
            return plugin;
        });
    };
}(jQuery));