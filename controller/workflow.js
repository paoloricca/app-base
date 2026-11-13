$(function () {

    let cy;
    let workflowNodeHealth = new Map();
    const versionId = Number($('#IDVersioneWorkflow').val()) || null;
    const isVersionEditor = versionId !== null;

    function isEnabled(value) {
        return value === true || value === 1 || value === '1';
    }

    function updateNodeHealthIndicator(indicator) {
        if (indicator.hasOwner == null) {
            indicator.marker.style.backgroundColor = '#adb5bd';
        } else {
            const isHealthy = indicator.hasConnection &&
                indicator.hasOwner &&
                indicator.hasAuthorization;
            indicator.marker.style.backgroundColor = isHealthy ? '#198754' : '#dc3545';
        }

        if (indicator.positionFrame) {
            cancelAnimationFrame(indicator.positionFrame);
        }
        indicator.positionFrame = requestAnimationFrame(function () {
            indicator.positionFrame = null;
            if (!indicator.marker.isConnected || indicator.node.removed()) {
                return;
            }

            const bounds = indicator.node.renderedBoundingBox({ includeLabels: false });
            indicator.marker.style.left = (bounds.x2 + 1) + 'px';
            indicator.marker.style.top = (bounds.y1 - 4) + 'px';
            indicator.timing.style.left = (bounds.x2 + 11) + 'px';
            indicator.timing.style.top = (bounds.y1 - 8) + 'px';
            indicator.timing.hidden = !indicator.hasTiming;
        });
    }

    function refreshWorkflowNodeHealth() {
        if (!isVersionEditor) {
            return;
        }

        $.ajax({
            url: '/workflow/api/versions/' + versionId + '/graph',
            type: 'GET'
        }).done(function (response) {
            if (response.status === 'ERR') {
                ShowError(response.error.message, response.error.sender);
                return;
            }

            response.data.states.forEach(function (state) {
                const indicator = workflowNodeHealth.get(String(state.id));
                if (!indicator) {
                    return;
                }
                indicator.hasConnection = isEnabled(state.HasConnection);
                indicator.hasAuthorization = isEnabled(state.HasAuthorization);
                indicator.hasTiming = isEnabled(state.HasTiming);
                updateNodeHealthIndicator(indicator);
            });
        }).fail(function (xhr, status, errorThrown) {
            ShowError(errorThrown || status, 'refreshWorkflowNodeHealth');
        });
    }

    $("#toolbar .btn").on("click", function () {

        $("#toolbar .btn").removeClass("btn-primary")
            .addClass("btn-dark");

        $(this).removeClass("btn-dark")
            .addClass("btn-primary");

    });

    /* inizializza il controllo processi */
    var ControlProcessi = $('#processi-container');

    function getCurrentProcessId() {
        if (isVersionEditor) {
            return Number($('#IDProcessoWorkflow').val()) || null;
        }
        return ControlProcessi.length && ControlProcessi.attr('data-options')
            ? JSON.parse(ControlProcessi.attr('data-options')).IDProcesso
            : null;
    }

    function isStartWorkflowNode(node) {
        if (!node) {
            return false;
        }
        if (node.IsStartNode === true || Number(node.IsStartNode) === 1) {
            return true;
        }
        const startLabels = ['INIZIO', 'START', 'INICIO', '开始'];
        return ['Code_IT', 'Code_GB', 'Code_ES', 'Code_CN', 'Text_IT', 'Text_GB', 'Text_ES', 'Text_CN', 'label', 'desc']
            .some(function (field) {
                return startLabels.includes(String(node[field] || '').trim().toUpperCase());
            });
    }

    function isEndWorkflowNode(node) {
        if (!node) {
            return false;
        }
        const endLabels = ['FINE', 'END', 'FIN', '结束'];
        return ['Code_IT', 'Code_GB', 'Code_ES', 'Code_CN', 'Text_IT', 'Text_GB', 'Text_ES', 'Text_CN', 'label', 'desc']
            .some(function (field) {
                return endLabels.includes(String(node[field] || '').trim().toUpperCase());
            });
    }

    function isProtectedWorkflowNode(node) {
        return isStartWorkflowNode(node) || isEndWorkflowNode(node);
    }

    let workflowRaciMatrix = null;
    const raciOwnerDefinitions = [
        { field: 'IsCreator', role: 'R', key: 'creator' },
        { field: 'IsAdminOfCreator', role: 'A', key: 'admin-creator' },
        { field: 'IsUsersFromAdminProfileCreator', role: 'R', key: 'creator-admin-profile-users' },
        { field: 'IsAdminOwnerSelectedNode', role: 'A', idField: 'IsAdminOwnerSelectedNode_Id', descField: 'IsAdminOwnerSelectedNode_Desc' },
        { field: 'IsOwnerSelectedNode', role: 'R', idField: 'IsOwnerSelectedNode_Id', descField: 'IsOwnerSelectedNode_Desc' },
        { field: 'IsCreatorSelectedNode', role: 'R', idField: 'IsCreatorSelectedNode_Id', descField: 'IsCreatorSelectedNode_Desc' }
    ];

    function raciLabel(key, fallback) {
        const language = $('#LanguageContext').val();
        const labels = {
            creator: { IT: 'Utente che ha creato l’oggetto', GB: 'User who created the object', ES: 'Usuario que creó el objeto', CN: '建立物件的使用者' },
            adminCreator: { IT: 'Responsabile del creatore dell’oggetto', GB: 'Creator’s supervisor', ES: 'Responsable del creador del objeto', CN: '物件建立者的主管' },
            creatorAdminProfile: { IT: 'Utenti con lo stesso profilo del creatore', GB: 'Users with the same profile as the creator', ES: 'Usuarios con el mismo perfil que el creador', CN: '與建立者相同設定檔的使用者' },
            adminOwner: { IT: 'Responsabile del proprietario dello stato', GB: 'Supervisor of the selected state owner', ES: 'Responsable del propietario del estado', CN: '所選狀態擁有者的主管' },
            stateOwner: { IT: 'Proprietario dello stato selezionato', GB: 'Owner of the selected state', ES: 'Propietario del estado seleccionado', CN: '所選狀態的擁有者' },
            stateCreator: { IT: 'Utente che ha registrato lo stato', GB: 'User who recorded the state', ES: 'Usuario que registró el estado', CN: '記錄該狀態的使用者' },
            profileUsers: { IT: 'Utenti del profilo selezionato', GB: 'Users of the selected profile', ES: 'Usuarios del perfil seleccionado', CN: '所選設定檔的使用者' },
            profileSupervisor: { IT: 'Responsabile del profilo', GB: 'Profile supervisor', ES: 'Responsable del perfil', CN: '設定檔主管' },
            state: { IT: 'Stato', GB: 'State', ES: 'Estado', CN: '狀態' },
            title: { IT: 'Matrice RACI - ', GB: 'RACI Matrix - ', ES: 'Matriz RACI - ', CN: 'RACI 矩陣 - ' }
        };
        return labels[key] && labels[key][language] || fallback || key;
    }

    function raciIsConfigured(value) {
        if (value === null || value === undefined) return false;
        return !['', '0', 'false', 'null'].includes(String(value).trim().toLowerCase());
    }

    function raciJson(url, method, data) {
        return new Promise(function (resolve, reject) {
            $.ajax({ url: url, type: method || 'GET', data: data || {} })
                .done(function (response) {
                    if (response.status !== 'OK') {
                        reject(new Error(response.error && response.error.message || 'Unable to load workflow RACI data.'));
                        return;
                    }
                    resolve(response.data);
                })
                .fail(function (xhr, status, error) {
                    reject(new Error(xhr.responseText || error || status));
                });
        });
    }

    function loadWorkflowRaciGraph() {
        const processId = getCurrentProcessId();
        if (!isVersionEditor && !processId) {
            return Promise.reject(new Error('Workflow process is not selected.'));
        }
        const graphRequest = isVersionEditor
            ? raciJson('/workflow/api/versions/' + versionId + '/graph')
            : raciJson('/workflow/' + encodeURIComponent(processId), 'POST');
        return graphRequest.then(function (data) {
            let graph = data;
            if (!isVersionEditor && typeof graph === 'string') graph = JSON.parse(graph);
            const states = typeof graph.states === 'string' ? JSON.parse(graph.states) : graph.states;
            const transitions = typeof graph.transitions === 'string' ? JSON.parse(graph.transitions) : graph.transitions;
            if (!Array.isArray(states) || !Array.isArray(transitions)) {
                throw new Error('Workflow states or transitions are unavailable.');
            }
            return { states: states, transitions: transitions };
        });
    }

    function loadWorkflowRaciOwners(states) {
        const ownerRequests = states.map(function (state) {
            return raciJson('/workflow-node-owner/' + encodeURIComponent(state.id)).then(function (data) {
                return Array.isArray(data) ? data[0] || null : null;
            });
        });
        return Promise.all(ownerRequests).then(function (owners) {
            return Promise.all(states.map(function (state, index) {
                const profileUrl = '/workflow-node-owner/' + encodeURIComponent(state.id) + '/profiles';
                return raciJson(profileUrl).then(function (data) {
                    const profiles = Array.isArray(data && data.profiles) ? data.profiles : [];
                    const links = Array.isArray(data && data.links) ? data.links : [];
                    const resolvedProfiles = profiles.map(function (profile) {
                        profile.EnabledDirections = new Set(links.filter(function (link) {
                            return String(link.IDGruppoOperativo) === String(profile.IDGruppoOperativo) &&
                                String(link.IDProfiloUtente) === String(profile.IDProfiloUtente) &&
                                isEnabled(link.Enabled);
                        }).map(function (link) {
                            return String(link.IDEventoDirezione);
                        }));
                        return profile;
                    });
                    const owner = owners[index];
                    if (!resolvedProfiles.length && owner && raciIsConfigured(owner.IsSelectedProfile)) {
                        resolvedProfiles.push({
                            IDProfiloUtente: owner.IsSelectedProfile_Id || owner.IsSelectedProfile,
                            IDGruppoOperativo: owner.IsSelectedProfile_Group || 0,
                            OwnerDescription: owner.IsSelectedProfile_Desc || raciLabel('profileUsers'),
                            LegacyProfile: true
                        });
                    }
                    return { owner: owner, profiles: resolvedProfiles };
                });
            }));
        });
    }

    function raciPosition(state, field) {
        const value = Number(state[field] !== undefined ? state[field] :
            state[field === 'x' ? 'XPos' : 'YPos']);
        return Number.isFinite(value) ? value : null;
    }

    function raciStateDescription(state) {
        const language = $('#LanguageContext').val();
        return String(state['Text_' + language] || state.desc || state.Text_IT || state.label || state.Code_IT || state.id);
    }

    function raciStateCode(state) {
        const language = $('#LanguageContext').val();
        return String(state['Code_' + language] || state.label || state.Code_IT || state.id);
    }

    function raciStateColor(state) {
        const color = String(state.HexColor || '').trim();
        return /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#3498db';
    }

    function raciDirectionDescription(transition, source, target) {
        const description = raciStateDescription;
        return '[DA] ' + description(source) + ' -> [A] ' + description(target);
    }

    function raciReturnTransition(transition, source, target) {
        const description = String(transition.event || transition.Description || '');
        if (/(rifiut|reject|return|back|revision|revisione|indietro|devol|refus|退回)/i.test(description)) {
            return true;
        }
        const sourceX = Number(source.x !== undefined ? source.x : source.XPos);
        const targetX = Number(target.x !== undefined ? target.x : target.XPos);
        return Number.isFinite(sourceX) && Number.isFinite(targetX) && targetX < sourceX;
    }

    function buildWorkflowRaci(graph, ownerData) {
        const stateOrder = new Map(graph.states.map(function (state, index) {
            return [String(state.id), index];
        }));
        const statesById = new Map(graph.states.map(function (state) {
            return [String(state.id), state];
        }));
        const compareByEditorPosition = function (left, right) {
            const leftX = raciPosition(left, 'x');
            const rightX = raciPosition(right, 'x');
            if (leftX !== null && rightX !== null && leftX !== rightX) return leftX - rightX;
            const leftY = raciPosition(left, 'y');
            const rightY = raciPosition(right, 'y');
            if (leftY !== null && rightY !== null && leftY !== rightY) return leftY - rightY;
            return stateOrder.get(String(left.id)) - stateOrder.get(String(right.id));
        };
        const starts = graph.states.filter(isStartWorkflowNode).sort(compareByEditorPosition);
        const ends = graph.states.filter(isEndWorkflowNode).sort(compareByEditorPosition);
        const startIds = new Set(starts.map(function (state) { return String(state.id); }));
        const endIds = new Set(ends.map(function (state) { return String(state.id); }));
        const transitionsByStart = new Map();
        graph.transitions.forEach(function (transition) {
            const sourceId = String(transition.from !== undefined ? transition.from : transition.IDTransizioneStart);
            const targetId = String(transition.to !== undefined ? transition.to : transition.IDTransizioneEnd);
            if (!transitionsByStart.has(sourceId)) transitionsByStart.set(sourceId, []);
            transitionsByStart.get(sourceId).push(targetId);
        });
        const orderedMiddle = [];
        const visited = new Set();
        const followFlow = function (initialStates) {
            const queue = initialStates.slice();
            for (let cursor = 0; cursor < queue.length; cursor++) {
                const state = queue[cursor];
                const stateId = String(state.id);
                if (visited.has(stateId) || endIds.has(stateId)) continue;
                visited.add(stateId);
                orderedMiddle.push(state);
                (transitionsByStart.get(stateId) || []).map(function (id) {
                    return statesById.get(id);
                }).filter(Boolean).sort(compareByEditorPosition).forEach(function (next) {
                    if (!visited.has(String(next.id)) && !endIds.has(String(next.id))) queue.push(next);
                });
            }
        };
        starts.forEach(function (state) {
            visited.add(String(state.id));
        });
        const firstFlowStates = [];
        starts.forEach(function (state) {
            (transitionsByStart.get(String(state.id)) || []).map(function (id) {
                return statesById.get(id);
            }).filter(Boolean).sort(compareByEditorPosition).forEach(function (next) {
                if (!visited.has(String(next.id)) && !endIds.has(String(next.id))) firstFlowStates.push(next);
            });
        });
        followFlow(firstFlowStates);
        graph.states.filter(function (state) {
            return !startIds.has(String(state.id)) && !endIds.has(String(state.id)) && !visited.has(String(state.id));
        }).sort(compareByEditorPosition).forEach(function (state) {
            followFlow([state]);
        });
        const orderedStates = starts.concat(orderedMiddle, ends);
        const ownerDataByState = new Map(graph.states.map(function (state, index) {
            return [String(state.id), ownerData[index]];
        }));
        const columns = [];
        const columnsByKey = new Map();
        const ownersByState = new Map();
        const profilesByState = new Map();

        function addColumn(key, label, type, metadata) {
            if (!columnsByKey.has(key)) {
                const column = Object.assign({ key: key, label: label, type: type }, metadata || {});
                columnsByKey.set(key, column);
                columns.push(column);
            }
            return columnsByKey.get(key);
        }

        function addRole(row, columnKey, role) {
            if (!row.has(columnKey)) row.set(columnKey, new Set());
            row.get(columnKey).add(role);
        }

        addColumn('creator', raciLabel('creator'), 'static');
        orderedStates.forEach(function (state) {
            const stateOwnerData = ownerDataByState.get(String(state.id)) || {};
            const owner = stateOwnerData.owner;
            const stateOwners = [];
            raciOwnerDefinitions.forEach(function (definition) {
                if (!owner || !raciIsConfigured(owner[definition.field])) return;
                let key = definition.key;
                let label;
                if (definition.field === 'IsAdminOfCreator') {
                    label = raciLabel('adminCreator');
                } else if (definition.field === 'IsUsersFromAdminProfileCreator') {
                    label = raciLabel('creatorAdminProfile');
                    key = definition.key;
                } else if (definition.field === 'IsCreator') {
                    label = raciLabel('creator');
                } else {
                    const targetId = owner[definition.idField] || owner[definition.field];
                    const target = targetId == null ? null : statesById.get(String(targetId));
                    const targetDescription = owner[definition.descField] ||
                        (target ? raciStateDescription(target) : '');
                    const labelKey = definition.field === 'IsAdminOwnerSelectedNode'
                        ? 'adminOwner'
                        : definition.field === 'IsOwnerSelectedNode' ? 'stateOwner' : 'stateCreator';
                    label = raciLabel(labelKey) + (targetDescription ? ' - ' + targetDescription : '');
                    key = definition.field + ':' + (targetId == null ? targetDescription : targetId);
                }
                const column = addColumn(key, label, 'static', { role: definition.role });
                stateOwners.push({
                    key: column.key,
                    role: definition.role,
                    field: definition.field,
                    targetStateId: definition.idField
                        ? owner[definition.idField] || owner[definition.field]
                        : null
                });
            });
            ownersByState.set(String(state.id), stateOwners);

            const profiles = stateOwnerData.profiles || [];
            profiles.forEach(function (profile) {
                const groupId = profile.IDGruppoOperativo == null ? 0 : profile.IDGruppoOperativo;
                const profileKey = 'profile:' + groupId + ':' + profile.IDProfiloUtente;
                const profileDescription = profile.OwnerDescription || raciLabel('profileUsers');
                const profileColumn = addColumn(profileKey,
                    profileDescription, 'profile', profile);
                profile.ColumnKey = profileColumn.key;
                if (raciIsConfigured(profile.SupervisorID)) {
                    profile.SupervisorColumnKey = 'supervisor:' + groupId + ':' + profile.SupervisorID;
                    if (!isEnabled(profile.SupervisorIsOnlyUser)) {
                        const groupDescription = profileDescription.split(' - ')[0];
                        addColumn(profile.SupervisorColumnKey,
                            raciLabel('profileSupervisor') + ' - ' + groupDescription, 'supervisor', profile);
                    }
                }
            });
            profilesByState.set(String(state.id), profiles);
        });

        const outgoingByStart = new Map();
        graph.transitions.forEach(function (transition) {
            const sourceId = String(transition.from !== undefined ? transition.from : transition.IDTransizioneStart);
            if (!outgoingByStart.has(sourceId)) outgoingByStart.set(sourceId, []);
            outgoingByStart.get(sourceId).push(transition);
        });
        const displayRows = [];
        orderedStates.forEach(function (state) {
            const stateKey = String(state.id);
            const transitions = outgoingByStart.get(stateKey) || [];
            const sourceOwners = ownersByState.get(stateKey) || [];
            const sourceProfiles = profilesByState.get(stateKey) || [];
            const ownerCount = sourceOwners.length + sourceProfiles.length;
            if (!transitions.length) {
                displayRows.push({ state: state, roles: new Map(), showStateDetails: true, directions: [] });
                return;
            }
            const hasMultipleOwners = ownerCount > 1;
            if (hasMultipleOwners) {
                displayRows.push({ state: state, roles: new Map(), stateHeaderOnly: true });
            }
            const combinedRoles = new Map();
            const combinedDirections = [];
            const directionRows = [];
            transitions.forEach(function (transition) {
                const sourceId = transition.from !== undefined ? transition.from : transition.IDTransizioneStart;
                const targetId = transition.to !== undefined ? transition.to : transition.IDTransizioneEnd;
                const targetKey = String(targetId);
                const source = statesById.get(stateKey);
                const target = statesById.get(targetKey);
                if (!source || !target) return;
                const roles = new Map();
                const returnTransition = raciReturnTransition(transition, source, target);
                const targetOwners = ownersByState.get(targetKey) || [];
                const targetProfiles = profilesByState.get(targetKey) || [];
                sourceOwners.forEach(function (owner) {
                    addRole(roles, owner.key, owner.role);
                    if (owner.role === 'R' && owner.targetStateId != null &&
                        ['IsCreatorSelectedNode', 'IsOwnerSelectedNode'].includes(owner.field)) {
                        const relatedStateOwners = ownersByState.get(String(owner.targetStateId)) || [];
                        relatedStateOwners.filter(function (relatedOwner) {
                            return relatedOwner.field === 'IsAdminOwnerSelectedNode';
                        }).forEach(function (accountable) {
                            addRole(roles, accountable.key, 'A');
                        });
                    }
                });
                sourceProfiles.forEach(function (profile) {
                    const isEnabledForTransition = profile.LegacyProfile ||
                        profile.EnabledDirections && profile.EnabledDirections.has(String(transition.IDEventoDirezione));
                    if (!isEnabledForTransition) return;
                    addRole(roles, profile.ColumnKey, 'R');
                    if (profile.SupervisorColumnKey) {
                        if (isEnabled(profile.SupervisorIsOnlyUser)) {
                            addRole(roles, profile.ColumnKey, 'A');
                        } else {
                            addRole(roles, profile.SupervisorColumnKey, 'A');
                        }
                    }
                });
                const sourceResponsibleKeys = new Set(Array.from(roles.entries())
                    .filter(function (entry) { return entry[1].has('R'); })
                    .map(function (entry) { return entry[0]; }));
                targetOwners.forEach(function (owner) {
                    if (sourceResponsibleKeys.has(owner.key)) return;
                    addRole(roles, owner.key, 'I');
                    if (returnTransition) addRole(roles, owner.key, 'C');
                });
                targetProfiles.forEach(function (profile) {
                    if (sourceResponsibleKeys.has(profile.ColumnKey)) return;
                    addRole(roles, profile.ColumnKey, 'I');
                    if (returnTransition) addRole(roles, profile.ColumnKey, 'C');
                });
                const direction = raciDirectionDescription(transition, source, target);
                if (hasMultipleOwners) {
                    displayRows.push({
                        state: state,
                        transition: transition,
                        roles: roles,
                        direction: direction,
                        directionOnly: true
                    });
                    return;
                }
                roles.forEach(function (roleSet, columnKey) {
                    roleSet.forEach(function (role) { addRole(combinedRoles, columnKey, role); });
                });
                combinedDirections.push(direction);
                const notificationRoles = new Map();
                const inheritedRoles = new Map();
                roles.forEach(function (roleSet, columnKey) {
                    roleSet.forEach(function (role) {
                        if (role === 'R' || role === 'A') {
                            addRole(notificationRoles, columnKey, role);
                            addRole(inheritedRoles, columnKey, role);
                        } else if (role === 'C' || role === 'I') {
                            addRole(notificationRoles, columnKey, role);
                        }
                    });
                });
                directionRows.push({
                    state: state,
                    transition: transition,
                    roles: notificationRoles,
                    inheritedRoles: inheritedRoles,
                    direction: direction,
                    directionOnly: true
                });
            });
            if (!hasMultipleOwners) {
                displayRows.push({
                    state: state,
                    roles: combinedRoles,
                    directions: directionRows.length > 1 ? [] : combinedDirections,
                    showStateDetails: true
                });
                if (directionRows.length > 1) {
                    displayRows.push.apply(displayRows, directionRows);
                }
            }
        });

        const title = raciLabel('title') + $('#container-workflow .modal-title').text().trim();
        return {
            title: title,
            states: orderedStates,
            columns: columns,
            displayRows: displayRows,
            stateDescription: raciStateDescription
        };
    }

    function raciStateCell(row, matrix) {
        const cell = $('<td>');
        if (row.directionOnly) {
            raciAppendDirection(cell, row.direction);
            return cell;
        }
        if (row.stateHeaderOnly) {
            cell.append($('<span class="badge rounded-pill me-2">')
                .text(raciStateCode(row.state))
                .css('background-color', raciStateColor(row.state)));
            cell.append($('<strong>').text(matrix.stateDescription(row.state)));
            return cell;
        }
        if (row.showStateDetails) {
            const heading = $('<div class="workflow-raci-state-heading">');
            heading.append($('<span class="badge rounded-pill me-2">')
                .text(raciStateCode(row.state))
                .css('background-color', raciStateColor(row.state)));
            heading.append($('<strong>').text(matrix.stateDescription(row.state)));
            cell.append(heading);
        }
        if (row.directions && row.directions.length) {
            row.directions.forEach(function (direction) {
                raciAppendDirection(cell, direction);
            });
        } else if (row.direction) {
            raciAppendDirection(cell, row.direction);
        } else if (!row.showStateDetails) {
            cell.append($('<span class="text-muted">').text('—'));
        }
        return cell;
    }

    function raciAppendDirection(cell, direction) {
        const parts = direction.split(' -> [A] ');
        const line = $('<div class="workflow-raci-direction">');
        line.append($('<i class="bi bi-arrow-return-right" aria-hidden="true">'));
        line.append($('<span>').text('[DA] ' + parts[0].replace(/^\[DA\]\s*/, '')));
        line.append($('<i class="bi bi-arrow-right" aria-hidden="true">'));
        line.append($('<span>').text('[A] ' + parts[1]));
        cell.append(line);
    }

    function renderWorkflowRaci(matrix) {
        const header = $('#container-workflow-raci .workflow-raci-header').empty();
        const body = $('#container-workflow-raci .workflow-raci-body').empty();
        header.append($('<th scope="col">').text(raciLabel('state')));
        matrix.columns.forEach(function (column) {
            header.append($('<th scope="col">').text(column.label));
        });
        matrix.displayRows.forEach(function (displayRow) {
            const row = $('<tr>');
            if (displayRow.stateHeaderOnly) row.addClass('workflow-raci-state-header-row');
            if (displayRow.directionOnly) row.addClass('workflow-raci-direction-row');
            row.append(raciStateCell(displayRow, matrix));
            matrix.columns.forEach(function (column) {
                const cell = $('<td class="text-center">');
                const roles = displayRow.roles && displayRow.roles.get(column.key);
                if (!roles || !roles.size) {
                    cell.text('-');
                } else {
                    ['R', 'A', 'C', 'I'].filter(function (role) {
                        return roles.has(role);
                    }).forEach(function (role) {
                        const inherited = displayRow.inheritedRoles &&
                            displayRow.inheritedRoles.get(column.key) &&
                            displayRow.inheritedRoles.get(column.key).has(role);
                        if (inherited) {
                            cell.append($('<span class="workflow-raci-inherited-check" aria-hidden="true">'));
                        } else {
                            cell.append($('<span>').addClass('workflow-raci-role workflow-raci-role-' + role.toLowerCase())
                                .text(role).attr('aria-label', role));
                        }
                    });
                }
                row.append(cell);
            });
            body.append(row);
        });
        $('#workflow-raci-title').text(matrix.title);
        $('#container-workflow-raci .workflow-raci-loading').addClass('d-none');
        $('#container-workflow-raci .workflow-raci-table').removeClass('d-none');
    }

    function workflowRaciExcelRows(matrix) {
        const language = $('#LanguageContext').val();
        const legend = {
            IT: ['R - Responsible: chi esegue l’azione', 'A - Accountable: chi risponde dell’azione',
                'C - Consulted: coinvolto nelle transizioni di ritorno/rifiuto', 'I - Informed: riceve il passaggio o l’avviso'],
            GB: ['R - Responsible: performs the action', 'A - Accountable: accountable for the action',
                'C - Consulted: involved in return/rejection transitions', 'I - Informed: receives the handoff or notification'],
            ES: ['R - Responsible: ejecuta la acción', 'A - Accountable: responde de la acción',
                'C - Consulted: participa en devoluciones/rechazos', 'I - Informed: recibe el paso o aviso'],
            CN: ['R - Responsible: 執行動作', 'A - Accountable: 對行動負責',
                'C - Consulted: 退回／拒絕時諮詢', 'I - Informed: 接收交接或通知']
        }[language] || [];
        return [
            [matrix.title],
            [legend.join(' | ')],
            [],
            [raciLabel('state'), ...matrix.columns.map(function (column) { return column.label; })]
        ].concat(matrix.displayRows.map(function (displayRow) {
            const directions = displayRow.directions || (displayRow.direction ? [displayRow.direction] : []);
            const stateLabel = displayRow.directionOnly
                ? displayRow.direction
                : (displayRow.showStateDetails
                ? raciStateCode(displayRow.state) + ' ' + matrix.stateDescription(displayRow.state)
                : '') + (directions.length ? (displayRow.showStateDetails ? '\n' : '') + directions.join('\n') : '');
            return [stateLabel].concat(matrix.columns.map(function (column) {
                const roles = displayRow.roles && displayRow.roles.get(column.key);
                return roles ? ['R', 'A', 'C', 'I'].filter(function (role) {
                    return roles.has(role);
                }).map(function (role) {
                    const inherited = displayRow.inheritedRoles &&
                        displayRow.inheritedRoles.get(column.key) &&
                        displayRow.inheritedRoles.get(column.key).has(role);
                    return inherited ? '✓' : role;
                }).join(' / ') : '-';
            }));
        }));
    }

    $('.workflow-raci').on('click', function () {
        const button = $(this).prop('disabled', true);
        const modal = $('#container-workflow-raci');
        workflowRaciMatrix = null;
        modal.find('.workflow-raci-loading').removeClass('d-none');
        modal.find('.workflow-raci-table').addClass('d-none');
        modal.modal('show');
        loadWorkflowRaciGraph()
            .then(function (graph) {
                return loadWorkflowRaciOwners(graph.states).then(function (owners) {
                    return buildWorkflowRaci(graph, owners);
                });
            })
            .then(function (matrix) {
                workflowRaciMatrix = matrix;
                renderWorkflowRaci(matrix);
            })
            .catch(function (error) {
                modal.modal('hide');
                ShowError(error.message, 'workflow-raci');
            })
            .finally(function () {
                button.prop('disabled', false);
            });
    });

    $('.workflow-raci-export').on('click', function () {
        if (!workflowRaciMatrix || !window.XLSX) {
            ShowError('RACI matrix or Excel export library is unavailable.', 'workflow-raci-export');
            return;
        }
        const worksheet = window.XLSX.utils.aoa_to_sheet(workflowRaciExcelRows(workflowRaciMatrix));
        worksheet['!cols'] = [{ wch: 36 }].concat(workflowRaciMatrix.columns.map(function (column) {
            return { wch: Math.min(Math.max(column.label.length, 18), 42) };
        }));
        const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Matrice RACI');
        window.XLSX.writeFile(workbook, 'matrice-raci.xlsx');
    });

    $('.workflow-raci-print').on('click', function () {
        if (!workflowRaciMatrix) {
            ShowError('RACI matrix is not available for printing.', 'workflow-raci-print');
            return;
        }
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            ShowError('The print window was blocked by the browser.', 'workflow-raci-print');
            return;
        }
        printWindow.document.open();
        printWindow.document.write('<!doctype html><html><head><meta charset="utf-8"><title></title><style>' +
            'body{font-family:Arial,sans-serif;margin:20px}h1{font-size:20px}table{border-collapse:collapse;width:100%}' +
            'th,td{border:1px solid #adb5bd;padding:6px;text-align:center}th{background:#f1f3f5}' +
            'th:first-child,td:first-child{text-align:left;min-width:180px}.workflow-raci-role{display:inline-flex;' +
            'align-items:center;justify-content:center;border-radius:50%;width:28px;height:28px;color:#fff;' +
            'font-weight:bold;margin:0 2px}.workflow-raci-role-r{background:#0876d1}.workflow-raci-role-a{background:#e66c5e}' +
            '.workflow-raci-role-c{background:#f0ad27;color:#212529}.workflow-raci-role-i{background:#7d8287}' +
            '.workflow-raci-inherited-check{display:inline-block;position:relative;vertical-align:middle;width:28px;height:28px;' +
            'border-radius:50%;background:#ced4da;margin:0 2px}.workflow-raci-inherited-check:after{content:"";position:absolute;' +
            'left:8px;top:6px;width:8px;height:13px;border:solid #6c757d;border-width:0 4px 4px 0;transform:rotate(45deg)}' +
            '.workflow-raci-state-heading{font-size:1.05rem;margin-bottom:3px}.badge{display:inline-block;border-radius:10rem;' +
            'color:#fff;padding:.25em .6em}.workflow-raci-direction{display:block;background:#e9ecef;border-radius:4px;padding:2px 5px;margin-top:3px}' +
            '.workflow-raci-direction .bi-arrow-return-right{margin-right:4px}.workflow-raci-direction .bi-arrow-right{margin:0 4px}' +
            '@media print{body{margin:8mm}thead{display:table-header-group}}</style></head><body></body></html>');
        printWindow.document.close();
        printWindow.document.title = workflowRaciMatrix.title;
        const title = printWindow.document.createElement('h1');
        title.textContent = workflowRaciMatrix.title;
        printWindow.document.body.appendChild(title);
        printWindow.document.body.appendChild(
            document.querySelector('#container-workflow-raci .workflow-raci-table').cloneNode(true)
        );
        printWindow.onafterprint = function () { printWindow.close(); };
        printWindow.focus();
        printWindow.print();
    });

    function reloadWorkflow() {
        initializeWorkflow(versionId || getCurrentProcessId());
    }

    if (!isVersionEditor) {
        /* Imposta le propriet� di default del plug-in <Pager> */
        ControlProcessi.processi({});

        ControlProcessi.bind(
            "onselect", function () {
                ControlWorkflowNodeStates.workflowNodeStates({
                    IdProcesso: getCurrentProcessId(),
                    IdEventoTransizione: null,
                    LanguageContext: $('#LanguageContext').val()
                });
            });

        /* Registra l'evento {onselect} per caricare la lista delle autorizzazioni */
        ControlProcessi.bind(
            "onworkflow", function () {
                initializeWorkflow(getCurrentProcessId());
                $('#container-workflow').modal('show');
            });

        /* Renderizza il plug-in <processi> */
        ControlProcessi.processi.load(null, ControlProcessi);
    } else {
        ControlProcessi.closest('.col-6').addClass('d-none');
    }


    $('.btn-cancel-context-menu-node').click(function () {
        $('#context-menu-node').hide();
    });

    /* initialize il controllo <confirm-delete-workflow-link> */
    var CtlDeleteLink = $('#container-confirm-delete-workflow-link');

    /* Imposta le propriet� di default del plug-in */
    CtlDeleteLink.confirmDelete({
        LanguageContext: $('#LanguageContext').val(),
    });

    /* Registra l'evento {onconfirm} del plug-in */
    CtlDeleteLink.bind("onconfirm", function () {

        var option = JSON.parse(CtlDeleteLink.attr('data-options'));
        var IdEventoDirezione = option.args.IDEventoDirezione;

        if (!IdEventoDirezione) {
            ShowError("Workflow link ID is missing", "deleteWorkflowLink");
            return;
        }

        deleteWorkflowLink(IdEventoDirezione);
        CtlDeleteLink.confirmDelete.hide(CtlDeleteLink);
    });

    /* initialize il controllo <confirm-delete-workflow-state> */
    var CtlDeleteState = $('#container-confirm-delete-workflow-state');

    /* Imposta le propriet� di default del plug-in */
    CtlDeleteState.confirmDelete({
        LanguageContext: $('#LanguageContext').val(),
    });

    /* Registra l'evento {onconfirm} del plug-in */
    CtlDeleteState.bind("onconfirm", function () {

        var option = JSON.parse(CtlDeleteState.attr('data-options'));

        $.when(
            deleteWorkflowState(option.args.IdEventoTransizione)
        ).then(function () {
            $('#context-menu-node').hide();
            CtlDeleteState.confirmDelete.hide(CtlDeleteState);
        });
    });

    /* Evento click che elimina uno stato selezionato */
    $('.workflow-del-node').click(function () {
        const node = JSON.parse($('#context-menu-node').find('.node').val() || 'null');
        if (isVersionEditor && isProtectedWorkflowNode(node)) {
            ShowError('I nodi Inizio e Fine non possono essere eliminati.', 'workflow');
            return;
        }
        /* get plugin attribute option */
        var option = JSON.parse(CtlDeleteState.attr('data-options'));
        /* set plugin args option */
        option.args = { IdEventoTransizione: $('#context-menu-node').find('#IdEventoTransizione').val() };
        /* re-store plugin attribute option */
        CtlDeleteState.attr('data-options', JSON.stringify(option));
        /* open plugin */
        CtlDeleteState.confirmDelete.show(CtlDeleteState);
    });

    /* Evento click che elimina il collegamento di uno stato */
    $('.workflow-del-link').click(function () {
        /* get plugin attribute option */
        var option = JSON.parse(CtlDeleteLink.attr('data-options'));
        /* set plugin args option */
        option.args = { IDEventoDirezione: $('#context-menu-link').find('#IDEventoDirezione').val() };
        /* re-store plugin attribute option */
        CtlDeleteLink.attr('data-options', JSON.stringify(option));
        /* open plugin */
        CtlDeleteLink.confirmDelete.show(CtlDeleteLink);
    });

    $(".container-control-culture-textbox-codice").multiLanguageTextBox({
        Title: '',
        Label: $('LabelCodice').html(),
        Id: 'Codice',
        LanguageContext: $('#LanguageContext').val(),
        languages: [
            { code: "IT", title: "Italiano" },
            { code: "GB", title: "English" },
            { code: "ES", title: "Spain" },
            { code: "CN", title: "Cinese" }

        ]
    });

    $(".container-control-culture-textbox-descrizione").multiLanguageTextBox({
        Title: '',
        Label: $('LabelDescrizione').html(),
        Id: 'Descrizione',
        LanguageContext: $('#LanguageContext').val(),
        languages: [
            { code: "IT", title: "Italiano" },
            { code: "GB", title: "English" },
            { code: "ES", title: "Spain" },
            { code: "CN", title: "Cinese" }
        ]
    });

    /* Evento click che modifica il collegamento di uno stato */
    $('.workflow-set-link').click(function () {
        $('.container-workflow-set-link-header').html(
            $('#context-menu-link').find('#DescDirezione').val()
        );
        $('#container-workflow-set-link').modal('show');

        var transition = JSON.parse($('#context-menu-link').find('.transition').val());

        $('#rb-is-available-note').prop('checked', transition.IsAvailableNote);
        $('#rb-required-confirmation').prop('checked', transition.RequiredConfirmation);

        $(".container-control-culture-textbox-codice").multiLanguageTextBox("option", "Title",
            $('#context-menu-link').find('#DescDirezione').val());
        $(".container-control-culture-textbox-codice").multiLanguageTextBox("load", {
            IT: transition.Code_IT,
            GB: transition.Code_GB,
            ES: transition.Code_ES,
            CN: transition.Code_CN
        });

        $(".container-control-culture-textbox-descrizione").multiLanguageTextBox("option", "Title",
            $('#context-menu-link').find('#DescDirezione').val());
        $(".container-control-culture-textbox-descrizione").multiLanguageTextBox("load", {
            Title: $('#context-menu-link').find('#DescDirezione').val(),
            IT: transition.Text_IT,
            GB: transition.Text_GB,
            ES: transition.Text_ES,
            CN: transition.Text_CN
        });

    });

    $('.btn-cancel-context-menu-link').click(function () {
        $('#context-menu-link').hide();
    });
    /* Imposta l'owner dello stato selezionato */
    $('.workflow-set-owner').click(function () {
        loadNodeWorkflowOwner(getCurrentProcessId());
    });

    $('.btn-workflow-states-new').click(function () {
        newNodeWorkflow(getCurrentProcessId());

        var ControlWorkflowNodeLink = $('.control-workflow-node-link');
        ControlWorkflowNodeLink.workflowNodeStates.clear(ControlWorkflowNodeLink);
        ControlWorkflowNodeLink.workflowNodeStates.loadStates(ControlWorkflowNodeLink);
    });

    /* Imposta le autorizzazioni dello stato selezionato */
    $('.workflow-set-auth').click(function () {
        //==========================================
        // Imposta il title del container
        //==========================================
        $('.container-workflow-set-auth-header').html(
            $('#context-menu-node').find('#DescTransizione').val()
        );
        var processOptions = JSON.parse(ControlAuthProcessi.attr('data-options'));
        processOptions.IDProcesso = null;
        processOptions.Descrizione = null;
        ControlAuthProcessi.attr('data-options', JSON.stringify(processOptions));
        ControlAuthProcessi.find('.processi-list').empty();
        var profileOptions = JSON.parse(ControlAuthProfiliUtente.attr('data-options'));
        profileOptions.IDProfiloUtente = null;
        profileOptions.Descrizione = null;
        ControlAuthProfiliUtente.attr('data-options', JSON.stringify(profileOptions));

        var authorizationOptions = JSON.parse(ControlAuthProcessiAzioni.attr('data-options'));
        authorizationOptions.IDProcesso = null;
        authorizationOptions.IdProfiloUtente = null;
        authorizationOptions.IdEventoTransizione = $('#context-menu-node').find('#IdEventoTransizione').val();
        ControlAuthProcessiAzioni.attr('data-options', JSON.stringify(authorizationOptions));
        ControlAuthGruppiOperativi.gruppioperativi.clear(ControlAuthGruppiOperativi);
        ControlAuthProfiliUtente.profiliutente.clear(ControlAuthProfiliUtente);
        ControlAuthProcessiAzioni.processiazioni.clear(ControlAuthProcessiAzioni);
        ControlAuthProcessi.processi.load(null, ControlAuthProcessi);
        ControlAuthGruppiOperativi.gruppioperativi.load(ControlAuthGruppiOperativi, 0);
        $('#container-workflow-set-auth').modal('show');
    });
    const timingMessages = {
        IT: ['Inserire una durata intera non negativa e selezionare lo stato automatico.',
             'L’intervallo massimo non può essere inferiore all’intervallo minimo.'],
        GB: ['Enter a non-negative integer duration and select the automatic state.',
             'The maximum interval cannot be shorter than the minimum interval.'],
        ES: ['Introduzca una duración entera no negativa y seleccione el estado automático.',
             'El intervalo máximo no puede ser inferior al mínimo.'],
        CN: ['請輸入非負整數持續時間並選擇自動狀態。', '最長間隔不能小於最短間隔。']
    };
    let timingNodeId = null;
    let timingVersionId = null;
    let timingRequestId = 0;
    function timingUrl() {
        return '/workflow/api/versions/' + encodeURIComponent(timingVersionId) +
            '/graph/nodes/' + encodeURIComponent(timingNodeId) + '/timing';
    }
    function timingError(message) {
        $('.workflow-timing-error').text(message).removeClass('d-none');
    }
    $('.workflow-timing-active').on('change', function () {
        $('#timing-section-' + $(this).data('type')).prop('hidden', !this.checked);
    });
    $('.workflow-timing-duration').on('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
    $('.workflow-set-timing').on('click', function () {
        const node = JSON.parse($('#context-menu-node').find('.node').val());
        timingNodeId = Number($('#context-menu-node').find('#IdEventoTransizione').val());
        timingVersionId = versionId || Number(node.IDVersioneWorkflow);
        if (!timingVersionId) {
            ShowError('Workflow version not available.', 'workflow-timing');
            return;
        }
        const requestId = ++timingRequestId;
        const nodeDescription = $('#context-menu-node').find('#DescTransizione').val();
        $.get(timingUrl()).done(function (response) {
            if (requestId !== timingRequestId) return;
            if (response.status !== 'OK') {
                ShowError(response.error.message, response.error.sender);
                return;
            }
            $('.workflow-timing-error').addClass('d-none').text('');
            $('.workflow-timing-node').text('(' + nodeDescription + ')');
            $('#timing-target, #timing-time-0, #timing-time-1').val('');
            $('#timing-target-description').text('');
            [0, 1].forEach(function (type) {
                const item = response.data.find(function (row) { return row.TimingType === type; });
                $('#timing-active-' + type).prop('checked', !!item && isEnabled(item.TimingActive)).trigger('change');
                $('#timing-type-' + type).val(item && item.ValidityType != null ? String(item.ValidityType) : '');
                $('#timing-time-' + type).val(item && item.ValidityTime != null ? item.ValidityTime : '');
                if (type === 1 && item && item.JumpToTransition) {
                    $('#timing-target').val(item.JumpToTransition);
                    $('#timing-target-description').text(' (' + (item.TargetDescription || item.JumpToTransition) + ')');
                }
            });
            $('#context-menu-node').hide();
            $('#container-workflow-timing').modal('show');
        }).fail(function (xhr, status, error) {
            if (requestId === timingRequestId) ShowError(error || status, 'workflow-timing');
        });
    });
    $('.workflow-timing-select-state').on('click', function () {
        const plugin = $('.control-workflow-node-states');
        const options = JSON.parse(plugin.attr('data-options'));
        options.Sender = 'workflow-timing';
        options.IDVersioneWorkflow = timingVersionId;
        options.SelectedState = $('#timing-target').val() || null;
        options.SelectedText = null;
        plugin.attr('data-options', JSON.stringify(options));
        plugin.workflowNodeStates.loadStates(plugin);
        $('#container-workflow-node-states').addClass('workflow-timing-picker').modal('show');
    });
    $('#container-workflow-node-states').on('hidden.bs.modal', function () {
        $(this).removeClass('workflow-timing-picker');
        if ($('#container-workflow-timing').hasClass('show')) $('body').addClass('modal-open');
    });
    $('.workflow-timing-save').on('click', function () {
        const messages = timingMessages[$('#LanguageContext').val()] || timingMessages.GB;
        const intervals = [0, 1].map(function (type) {
            const active = $('#timing-active-' + type).prop('checked');
            const duration = $('#timing-time-' + type).val();
            const validity = $('#timing-type-' + type).val();
            return {
                type: type, active: active,
                validityType: validity === '' ? null : Number(validity),
                validityTime: duration === '' ? null : Number(duration),
                target: type === 1 && $('#timing-target').val() ? Number($('#timing-target').val()) : null
            };
        });
        if (intervals.some(function (item) {
            return item.active && ((item.validityType !== 0 && item.validityType !== 1) ||
                !Number.isInteger(item.validityTime) || item.validityTime < 0 ||
                item.validityTime > 2147483647 || (item.type === 1 && (!item.target || item.target === timingNodeId)));
        })) {
            timingError(messages[0]);
            return;
        }
        if (intervals[0].active && intervals[1].active &&
            intervals[1].validityTime * (intervals[1].validityType ? 24 : 1) <
            intervals[0].validityTime * (intervals[0].validityType ? 24 : 1)) {
            timingError(messages[1]);
            return;
        }
        const button = $(this).prop('disabled', true);
        const requestId = timingRequestId;
        $.ajax({ url: timingUrl(), type: 'PUT', contentType: 'application/json',
            data: JSON.stringify({ intervals: intervals }) })
            .done(function (response) {
                if (response.status !== 'OK') {
                    if (requestId === timingRequestId) timingError(response.error.message);
                    else ShowError(response.error.message, response.error.sender);
                    return;
                }
                if (requestId === timingRequestId) $('#container-workflow-timing').modal('hide');
                if (isVersionEditor) refreshWorkflowNodeHealth();
            }).fail(function (xhr, status, error) {
                if (requestId === timingRequestId) timingError(error || status);
                else ShowError(error || status, 'workflow-timing');
            })
            .always(function () { button.prop('disabled', false); });
    });
    $('.workflow-set-rel').click(function () {
        var ControlWorkflowNodeLink = $('.control-workflow-node-link');
        var optionsWorkflowNodeLink = JSON.parse(ControlWorkflowNodeLink.attr('data-options'));
        optionsWorkflowNodeLink.IdProcesso = getCurrentProcessId();
        optionsWorkflowNodeLink.IDVersioneWorkflow = versionId;
        ControlWorkflowNodeLink.attr('data-options', JSON.stringify(optionsWorkflowNodeLink));
        ControlWorkflowNodeLink.workflowNodeStates.clear(ControlWorkflowNodeLink);
        ControlWorkflowNodeLink.workflowNodeStates.loadStates(ControlWorkflowNodeLink);
        $('.container-workflow-node-link-header').html(
            $('#context-menu-node').find('#DescTransizione').val()
        )
        $('#container-workflow-node-link').modal('show');
    });
    $('.workflow-set-node').click(function () {

        var transition = JSON.parse($('#context-menu-node').find('.node').val());

        $(".container-control-workflow-set-node-codice").multiLanguageTextBox({
            Title: '',
            Label: $('LabelCodice').html(),
            Id: 'CodiceNode',
            LanguageContext: $('#LanguageContext').val(),
            languages: [
                { code: "IT", title: "Italiano" },
                { code: "GB", title: "English" },
                { code: "ES", title: "Spain" },
                { code: "CN", title: "Cinese" }

            ]
        });

        $(".container-control-workflow-set-node-codice").multiLanguageTextBox("option", "Title",
            $('#context-menu-node').find('#DescTransizione').val());
        $(".container-control-workflow-set-node-codice").multiLanguageTextBox("load", {
            IT: transition.Code_IT,
            GB: transition.Code_GB,
            ES: transition.Code_ES,
            CN: transition.Code_CN
        });

        $(".container-control-workflow-set-node-descrizione").multiLanguageTextBox({
            Title: '',
            Label: $('LabelDescrizione').html(),
            Id: 'DescrizioneNode',
            LanguageContext: $('#LanguageContext').val(),
            languages: [
                { code: "IT", title: "Italiano" },
                { code: "GB", title: "English" },
                { code: "ES", title: "Spain" },
                { code: "CN", title: "Cinese" }
            ]
        });

        $(".container-control-workflow-set-node-descrizione").multiLanguageTextBox("option", "Title",
            $('#context-menu-node').find('#DescTransizione').val());
        $(".container-control-workflow-set-node-descrizione").multiLanguageTextBox("load", {
            IT: transition.Text_IT,
            GB: transition.Text_GB,
            ES: transition.Text_ES,
            CN: transition.Text_CN
        });


        $('.container-workflow-set-node-header').html(
            $('#context-menu-node').find('#DescTransizione').val()
        )
        $('#container-workflow-set-node').modal('show');
    });

    $('.bi-gear-is-admin-ownwer-selected-node').click(function () {

        var plugin = $('.control-workflow-node-states');

        /* get plugin attribute options */
        var options = JSON.parse(plugin.attr('data-options'));
        options.Sender = 'bi-gear-is-admin-ownwer-selected-node';

        if ($('#IsAdminOwnerSelectedNode_Id').val() != "") {
            options.SelectedState = $('#IsAdminOwnerSelectedNode_Id').val();
        } else {
            options.SelectedState = null;
        }

        /* re-store plugin attribute option */
        plugin.attr('data-options', JSON.stringify(options));

        plugin.workflowNodeStates.loadStates(plugin);

        $('#container-workflow-node-states').modal('show');
    });
    $('.bi-gear-is-ownwer-selected-node').click(function () {

        var plugin = $('.control-workflow-node-states');

        /* get plugin attribute options */
        var options = JSON.parse(plugin.attr('data-options'));
        options.Sender = 'bi-gear-is-ownwer-selected-node';

        if ($('#IsOwnerSelectedNode_Id').val() != "") {
            options.SelectedState = $('#IsOwnerSelectedNode_Id').val();
        } else {
            options.SelectedState = null;
        }

        /* re-store plugin attribute option */
        plugin.attr('data-options', JSON.stringify(options));

        plugin.workflowNodeStates.loadStates(plugin);

        $('#container-workflow-node-states').modal('show');
    });
    $('.bi-gear-is-creator-selected-node').click(function () {

        var plugin = $('.control-workflow-node-states');

        /* get plugin attribute options */
        var options = JSON.parse(plugin.attr('data-options'));
        options.Sender = 'bi-gear-is-creator-selected-node';

        if ($('#IsCreatorSelectedNode_Id').val() != "") {
            options.SelectedState = $('#IsCreatorSelectedNode_Id').val();
        } else {
            options.SelectedState = null;
        }

        /* re-store plugin attribute option */
        plugin.attr('data-options', JSON.stringify(options));

        plugin.workflowNodeStates.loadStates(plugin);

        $('#container-workflow-node-states').modal('show');
    });
    $('.bi-gear-is-selected-profile').click(function () {

        //var plugin = $('.control-workflow-node-states');

        /* get plugin attribute options */
        //var options = JSON.parse(plugin.attr('data-options'));
        //options.Sender = 'bi-gear-is-creator-selected-node';

        //if ($('#IsCreatorSelectedNode_Id').val() != "") {
        //    options.SelectedState = $('#IsCreatorSelectedNode_Id').val();
        //} else {
        //    options.SelectedState = null;
        //}

        ///* re-store plugin attribute option */
        //plugin.attr('data-options', JSON.stringify(options));

        //plugin.workflowNodeStates.loadStates(plugin);

        /* Initialize gruppi-operativi */
        ControlGruppiOperativi.gruppioperativi.clear(ControlGruppiOperativi);
        ControlProfiliUtente.profiliutente.clear(ControlProfiliUtente);
        ControlGruppiOperativi.gruppioperativi.load(ControlGruppiOperativi, 0);
        selectedOwnerProfile = null;
        resetOwnerProfileLinks();
        refreshOwnerProfiles();

        $('#container-workflow-set-profilo-utente').modal('show');


    });

    $('.btn-confirm-container-workflow-set-node').click(function () {

        /* Questa funzione modifica la descrizione del nodo selezionato */

        var IdEventoTransizione = $('#context-menu-node').find('#IdEventoTransizione').val();
        const CtlTxtCodice = $(".container-control-workflow-set-node-codice").data("mltextbox");
        const CtlTxtDescrizione = $(".container-control-workflow-set-node-descrizione").data("mltextbox");

        setNodeWorkflowState(
            IdEventoTransizione,
            CtlTxtCodice.value.IT,
            CtlTxtCodice.value.GB,
            CtlTxtCodice.value.ES,
            CtlTxtCodice.value.CN,
            CtlTxtDescrizione.value.IT,
            CtlTxtDescrizione.value.GB,
            CtlTxtDescrizione.value.ES,
            CtlTxtDescrizione.value.CN
        );

    });
    $('.btn-confirm-container-workflow-set-link').click(function () {
        
        /* Questa funzione conferma e imposta il collegamento selezionato */

        var IdEventoDirezione = $('#context-menu-link').find('#IDEventoDirezione').val();
        const CtlTxtCodice = $(".container-control-culture-textbox-codice").data("mltextbox");
        const CtlTxtDescrizione = $(".container-control-culture-textbox-descrizione").data("mltextbox");

        setNodeWorkflowLink(
            IdEventoDirezione,
            CtlTxtCodice.value.IT,
            CtlTxtCodice.value.GB,
            CtlTxtCodice.value.ES,
            CtlTxtCodice.value.CN,
            CtlTxtDescrizione.value.IT,
            CtlTxtDescrizione.value.GB,
            CtlTxtDescrizione.value.ES,
            CtlTxtDescrizione.value.CN,
            $('#rb-is-available-note').prop('checked'),
            $('#rb-required-confirmation').prop('checked')
        );

    });
    $('.btn-confirm-container-workflow-set-owner').click(function () {

        /* Questa funzione conferma e imposta l'owner selezionato */

        if ($('#container-workflow-set-owner').find('.form-check-input:checked').not('#rb-ChatAllParticipants').length == 0) {
            /* TODO: visualizza il messaggio di errore */

        } else {

            var IsCreator = $('#rb-IsCreator').prop('checked');
            var IsAdminOwnerSelectedNode = $('#rb-IsAdminOwnerSelectedNode').prop('checked');
            var IsAdminOfCreator = $('#rb-IsAdminOfCreator').prop('checked');
            var IsOwnerSelectedNode = $('#rb-IsOwnerSelectedNode').prop('checked');
            var IsCreatorSelectedNode = $('#rb-IsCreatorSelectedNode').prop('checked');
            var IsSelectedProfile = $('#rb-IsSelectedProfile').prop('checked');
            var IsUsersFromAdminProfileCreator = $('#rb-IsUsersFromAdminProfileCreator').prop('checked');


            if ($('#rb-IsAdminOwnerSelectedNode').prop('checked') &&
                $('#IsAdminOwnerSelectedNode_Id').val() == '') {
                /* TODO: visualizza il messaggio di errore */
                return false;
            } else {
                if ($('#rb-IsAdminOwnerSelectedNode').prop('checked') &&
                    $('#IsAdminOwnerSelectedNode_Id').val() != '') {
                    IsAdminOwnerSelectedNode = $('#IsAdminOwnerSelectedNode_Id').val();
                }
            }
            if ($('#rb-IsOwnerSelectedNode').prop('checked') &&
                $('#IsOwnerSelectedNode_Id').val() == '') {
                /* TODO: visualizza il messaggio di errore */
                return false;
            } else {
                if ($('#rb-IsOwnerSelectedNode').prop('checked') &&
                    $('#IsOwnerSelectedNode_Id').val() != '') {
                    IsOwnerSelectedNode = $('#IsOwnerSelectedNode_Id').val();
                }
            }
            if ($('#rb-IsCreatorSelectedNode').prop('checked') &&
                $('#IsCreatorSelectedNode_Id').val() == '') {
                /* TODO: visualizza il messaggio di errore */
                return false;
            } else {
                if ($('#rb-IsCreatorSelectedNode').prop('checked') &&
                    $('#IsCreatorSelectedNode_Id').val() != '') {
                    IsCreatorSelectedNode = $('#IsCreatorSelectedNode_Id').val();
                }
            }
            if ($('#rb-IsSelectedProfile').prop('checked') &&
                $('#IsSelectedProfile_Id').val() == '') {
                /* TODO: visualizza il messaggio di errore */
                return false;
            } else {
                if ($('#rb-IsSelectedProfile').prop('checked') &&
                    $('#IsSelectedProfile_Id').val() != '') {
                    IsSelectedProfile = $('#IsSelectedProfile_Id').val();
                }
            }

            setNodeWorkflowOwner(
                IsCreator,
                IsAdminOwnerSelectedNode,
                IsAdminOfCreator,
                IsOwnerSelectedNode,
                IsCreatorSelectedNode,
                IsSelectedProfile,
                IsUsersFromAdminProfileCreator,
                $('#rb-ChatAllParticipants').prop('checked'),
            )
        }
    });
    $('#container-workflow-set-owner').find('.form-check-input').not('#rb-ChatAllParticipants').click(function () {
        var oldProfile = $('#IsSelectedProfile_Id').val();
        if (oldProfile && (this.id !== 'rb-IsSelectedProfile' || !this.checked)) {
            saveOwnerProfileChange({ operation: 'clear' }, function () {}, function () {
                loadNodeWorkflowOwner();
            });
        }
        clearNodeWorkflowOwner($(this));
    });
    loadNodeInfo = function () {
        try {

        }
        catch (err) {
            ShowError(err.message, "loadNodeInfo");
        }
    }
    deleteWorkflowLink = function (IdEventoDirezione) {
        try {
            $('#context-menu-link').hide();
            $('.spinner-workflow').show();
            if (isVersionEditor) {
                $.ajax({
                    url: '/workflow/api/versions/' + versionId + '/graph/transitions/' + encodeURIComponent(IdEventoDirezione),
                    type: 'DELETE'
                }).done(function (response) {
                    if (response.status === 'ERR') {
                        ShowError(response.error.message, response.error.sender);
                    } else {
                        reloadWorkflow();
                    }
                    $('.spinner-workflow').hide();
                }).fail(function (xhr, status, errorThrown) {
                    $('.spinner-workflow').hide();
                    ShowError(errorThrown || status, 'deleteWorkflowLink');
                });
                return;
            }
            $.ajax({
                url: "/workflow-del-link/" + IdEventoDirezione,
                type: "DELETE",
                data: {},
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(response.error.message, response.error.sender);
                } else if (response.status == "OK") {
                    reloadWorkflow();
                }
                $('.spinner-workflow').hide();
            }).fail(function (xhr, status, errorThrown) {
                $('.spinner-workflow').hide();
                ShowError(errorThrown, "deleteWorkflowLink")
            });
        }
        catch (err) {
            ShowError(err.message, "deleteWorkflowLink");
        }
    }
    deleteWorkflowState = function (IdEventoTransizione) {
        try {
            $('.spinner-workflow').show();
            if (isVersionEditor) {
                $.ajax({
                    url: '/workflow/api/versions/' + versionId + '/graph/nodes/' + encodeURIComponent(IdEventoTransizione),
                    type: 'DELETE'
                }).done(function (response) {
                    if (response.status === 'ERR') {
                        ShowError(response.error.message, response.error.sender);
                    } else {
                        reloadWorkflow();
                    }
                    $('.spinner-workflow').hide();
                }).fail(function (xhr, status, errorThrown) {
                    $('.spinner-workflow').hide();
                    ShowError(errorThrown || status, 'deleteWorkflowState');
                });
                return;
            }
            $.ajax({
                url: "/workflow-del-state/" + IdEventoTransizione,
                type: "DELETE",
                data: {},
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(response.error.message, response.error.sender);
                } else if (response.status == "OK") {

                    reloadWorkflow();
                }
                $('.spinner-workflow').hide();
            }).fail(function (xhr, status, errorThrown) {
                $('.spinner-workflow').hide();
                ShowError(errorThrown, "deleteWorkflowState")
            });
        }
        catch (err) {
            ShowError(err.message, "deleteWorkflowState");
        }
    }
    toggleAuthProcessoAzione = function (IdGruppoOperativo, IdProfiloUtente, IdProcesso, IdProcessoAzione, IdEventoTransizione, Toggled) {
        try {
            $.ajax({
                url: "/eventi-transizioni-azioni",
                type: "POST",
                data: {
                    IdGruppoOperativo: IdGruppoOperativo,
                    IdProfiloUtente: IdProfiloUtente,
                    IdProcesso: IdProcesso,
                    IdProcessoAzione: IdProcessoAzione,
                    IdEventoTransizione: IdEventoTransizione,
                    Toggled: Toggled
                }
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(
                        response.error.message,
                        response.error.sender
                    );
                } else if (response.status == "OK") {
                    refreshWorkflowNodeHealth();
                }
            }).fail(function (xhr, status, errorThrown) {
            }).always(function (xhr, status) {
            });
        }
        catch (err) {
            ShowError(err.message, "toggleAuthProcessoAzione");
        }
    }
    newNodeWorkflow = function (IdProcesso) {
        try {
            $('.spinner-workflow').show();
            if (isVersionEditor) {
                $.ajax({
                    url: '/workflow/api/versions/' + versionId + '/graph/nodes',
                    type: 'POST'
                }).done(function (response) {
                    if (response.status === 'ERR') {
                        ShowError(response.error.message, response.error.sender);
                    } else {
                        reloadWorkflow();
                        const nodePicker = $('.control-workflow-node-link');
                        nodePicker.workflowNodeStates.clear(nodePicker);
                        nodePicker.workflowNodeStates.loadStates(nodePicker);
                    }
                    $('.spinner-workflow').hide();
                }).fail(function (xhr, status, errorThrown) {
                    $('.spinner-workflow').hide();
                    ShowError(errorThrown || status, 'newNodeWorkflow');
                });
                return;
            }
            $.ajax({
                url: "/workflow-new-node/" + IdProcesso,
                type: "POST",
                data: {},
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(response.error.message, response.error.sender);
                } else if (response.status == "OK") {

                    reloadWorkflow();
                }
                $('.spinner-workflow').hide();
            }).fail(function (xhr, status, errorThrown) {
                $('.spinner-workflow').hide();
                ShowError(errorThrown, "updateNodePosition")
            });
        }
        catch (err) {
            ShowError(err.message, "newNodeWorkflow");
        }
    }
    linkNodeWorkflow = function (IdTransizioneEnd) {
        try {
            if (isVersionEditor) {
                const startNodeId = $('#context-menu-node').find('#IdEventoTransizione').val();
                const startNode = cy.getElementById(startNodeId).data('state');
                const endNode = cy.getElementById(String(IdTransizioneEnd)).data('state');
                if ((isStartWorkflowNode(startNode) && isEndWorkflowNode(endNode)) ||
                    (isEndWorkflowNode(startNode) && isStartWorkflowNode(endNode))) {
                    ShowError('I nodi Inizio e Fine non possono essere collegati fra loro.', 'workflow');
                    return;
                }
            }
            $('.spinner-workflow').show();
            if (isVersionEditor) {
                $.ajax({
                    url: '/workflow/api/versions/' + versionId + '/graph/transitions',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        startNodeId: Number($('#context-menu-node').find('#IdEventoTransizione').val()),
                        endNodeId: Number(IdTransizioneEnd)
                    })
                }).done(function (response) {
                    if (response.status === 'ERR') {
                        ShowError(response.error.message, response.error.sender);
                    } else {
                        $('#container-workflow-node-link').modal('hide');
                        $('#context-menu-node').hide();
                        reloadWorkflow();
                    }
                    $('.spinner-workflow').hide();
                }).fail(function (xhr, status, errorThrown) {
                    $('.spinner-workflow').hide();
                    ShowError(errorThrown || status, 'linkNodeWorkflow');
                });
                return;
            }
            $.ajax({
                url: "/workflow-link-node",
                type: "POST",
                data: {
                    IdTransizioneStart: $('#context-menu-node').find('#IdEventoTransizione').val(),
                    IdTransizioneEnd: IdTransizioneEnd 
                },
            }).done(function (response) {
                if (response.status == "ERR") {
                    ShowError(response.error.message, response.error.sender);
                } else if (response.status == "OK") {
                    $('#container-workflow-node-link').modal('hide');
                    $('#context-menu-node').hide();
                    reloadWorkflow();
                }
                $('.spinner-workflow').hide();
            }).fail(function (xhr, status, errorThrown) {
                $('.spinner-workflow').hide();
                ShowError(errorThrown, "updateNodePosition")
            });
        }
        catch (err) {
            ShowError(err.message, "newNodeWorkflow");
        }
    }
    setNodeWorkflowState = function (IdEventoTransizione, Code_IT, Code_GB, Code_ES, Code_CN, Text_IT, Text_GB, Text_ES, Text_CN) {
        try {
            $('.spinner-workflow-set-node').show();

            if (isVersionEditor) {
                $.ajax({
                    url: '/workflow/api/versions/' + versionId + '/graph/nodes/' + encodeURIComponent(IdEventoTransizione),
                    type: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        Code_IT: Code_IT, Code_GB: Code_GB, Code_ES: Code_ES, Code_CN: Code_CN,
                        Text_IT: Text_IT, Text_GB: Text_GB, Text_ES: Text_ES, Text_CN: Text_CN
                    })
                }).done(function (response) {
                    $('.spinner-workflow-set-node').hide();
                    if (response.status === 'ERR') {
                        ShowError(response.error.message, response.error.sender);
                        return;
                    }
                    $('#container-workflow-set-node').modal('hide');
                    $('#context-menu-node').hide();
                    reloadWorkflow();
                }).fail(function (xhr, status, errorThrown) {
                    $('.spinner-workflow-set-node').hide();
                    ShowError(errorThrown || status, 'setNodeWorkflowState');
                });
                return;
            }
            $.ajax({
                url: "/workflow-node-set/" + IdEventoTransizione,
                type: "PUT",
                data: {
                    Code_IT: Code_IT,
                    Code_GB: Code_GB,
                    Code_ES: Code_ES,
                    Code_CN: Code_CN,
                    Text_IT: Text_IT,
                    Text_GB: Text_GB,
                    Text_ES: Text_ES,
                    Text_CN: Text_CN,
                },
            }).done(function (response) {

                if (response.status == "ERR") {
                    $('.spinner-workflow-set-node').hide();
                    ShowError(response.error.message, response.error.sender);

                } else if (response.status == "OK") {
                    $('.spinner-workflow-set-node').hide();
                    $('#container-workflow-set-node').modal('hide');
                    $('#context-menu-node').hide();
                    ControlWorkflowNodeLink.workflowNodeStates.clear(ControlWorkflowNodeLink);
                    ControlWorkflowNodeLink.workflowNodeStates.loadStates(ControlWorkflowNodeLink);
                    reloadWorkflow();
                }
            }).fail(function (xhr, status, errorThrown) {
                $('.spinner-workflow-set-node').hide();
                ShowError(errorThrown, "setNodeWorkflowState")
            });
        }
        catch (err) {
            ShowError(err.message, "setNodeWorkflowState");
        }
    }
    setNodeWorkflowLink = function (IdEventoDirezione, Code_IT, Code_GB, Code_ES, Code_CN, Text_IT, Text_GB, Text_ES, Text_CN, IsAvailableNote, RequiredConfirmation) {
        try {
            $('.spinner-node-workflow-link').show();

            if (isVersionEditor) {
                $.ajax({
                    url: '/workflow/api/versions/' + versionId + '/graph/transitions/' + encodeURIComponent(IdEventoDirezione),
                    type: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        Code_IT: Code_IT, Code_GB: Code_GB, Code_ES: Code_ES, Code_CN: Code_CN,
                        Text_IT: Text_IT, Text_GB: Text_GB, Text_ES: Text_ES, Text_CN: Text_CN,
                        IsAvailableNote: IsAvailableNote, RequiredConfirmation: RequiredConfirmation
                    })
                }).done(function (response) {
                    $('.spinner-node-workflow-link').hide();
                    if (response.status === 'ERR') {
                        ShowError(response.error.message, response.error.sender);
                        return;
                    }
                    $('#container-workflow-set-link').modal('hide');
                    $('#context-menu-link').hide();
                    reloadWorkflow();
                }).fail(function (xhr, status, errorThrown) {
                    $('.spinner-node-workflow-link').hide();
                    ShowError(errorThrown || status, 'setNodeWorkflowLink');
                });
                return;
            }
            $.ajax({
                url: "/workflow-node-link/" + IdEventoDirezione,
                type: "POST",
                data: {
                    Code_IT: Code_IT,
                    Code_GB: Code_GB,
                    Code_ES: Code_ES,
                    Code_CN: Code_CN,
                    Text_IT: Text_IT,
                    Text_GB: Text_GB,
                    Text_ES: Text_ES,
                    Text_CN: Text_CN,
                    IsAvailableNote: IsAvailableNote,
                    RequiredConfirmation: RequiredConfirmation
                },
            }).done(function (response) {

                if (response.status == "ERR") {
                    $('.spinner-node-workflow-link').hide();
                    ShowError(response.error.message, response.error.sender);

                } else if (response.status == "OK") {
                    $('.spinner-node-workflow-link').hide();
                    $('#container-workflow-set-link').modal('hide');
                    $('#context-menu-link').hide();

                    reloadWorkflow();
                }
            }).fail(function (xhr, status, errorThrown) {
                $('.spinner-node-workflow-link').hide();
                ShowError(errorThrown, "setNodeWorkflowLink")
            });
        }
        catch (err) {
            ShowError(err.message, "setNodeWorkflowLink");
        }
    }
    setNodeWorkflowOwner = function (
        IsCreator,
        IsAdminOwnerSelectedNode,
        IsAdminOfCreator,
        IsOwnerSelectedNode,
        IsCreatorSelectedNode,
        IsSelectedProfile,
        IsUsersFromAdminProfileCreator,
        ChatAllParticipants,
        IdEventoTransizione
    ) {
        try {
            $('.spinner-node-workflow-owner').show();

            $.ajax({
                url: "/workflow-node-owner/" + $('#context-menu-node').find('#IdEventoTransizione').val(),
                type: "POST",
                data: {
                    IsCreator: IsCreator,
                    IsAdminOwnerSelectedNode: IsAdminOwnerSelectedNode,
                    IsAdminOfCreator: IsAdminOfCreator,
                    IsOwnerSelectedNode: IsOwnerSelectedNode,
                    IsCreatorSelectedNode: IsCreatorSelectedNode,
                    IsSelectedProfile: IsSelectedProfile,
                    IsUsersFromAdminProfileCreator: IsUsersFromAdminProfileCreator,
                    ChatAllParticipants: ChatAllParticipants,
                    IdEventoTransizione: IdEventoTransizione,
                },
            }).done(function (response) {

                if (response.status == "ERR") {
                    $('.spinner-node-workflow-owner').hide();
                    ShowError(response.error.message, response.error.sender);

                } else if (response.status == "OK") {
                    $('.spinner-node-workflow-owner').hide();
                    $('#container-workflow-set-owner').modal('hide');
                    $('#context-menu-node').hide();

                    reloadWorkflow();
                }
            }).fail(function (xhr, status, errorThrown) {
                $('.spinner-node-workflow-owner').hide();
                ShowError(errorThrown, "setNodeWorkflowOwner")
            });
        }
        catch (err) {
            ShowError(err.message, "setNodeWorkflowOwner");
        }
    }
    clearNodeWorkflowOwner = function (sender) {
        try {
            if (sender != null && sender.prop('checked')) {
                $('#container-workflow-set-owner').find('.form-check-input').not('#rb-ChatAllParticipants').prop('checked', false);
                sender.prop('checked', true);
            } else {
                $('#container-workflow-set-owner').find('.form-check-input').not('#rb-ChatAllParticipants').prop('checked', false);
            }
            $('#IsOwnerSelectedNode_Id').val('');
            $('#IsOwnerSelectedNode_Desc').empty();
            $('#IsAdminOwnerSelectedNode_Id').val('');
            $('#IsAdminOwnerSelectedNode_Desc').empty();
            $('#IsCreatorSelectedNode_Id').val('');
            $('#IsCreatorSelectedNode_Desc').empty();
            $('#IsSelectedProfile_Id').val('');
            $('#IsSelectedProfile_Desc').empty();
        }
        catch (err) {
            ShowError(err.message, "clearNodeWorkflowOwner");
        }
    }
    loadNodeWorkflowOwner = function () {

        $('.spinner-node-workflow-owner').show();

        try {
            //==========================================
            // Imposta il title del container
            //==========================================
            $('.container-workflow-set-owner-header').html(
                $('#context-menu-node').find('#DescTransizione').val()
            );

            $.ajax({
                url: "/workflow-node-owner/" + $('#context-menu-node').find('#IdEventoTransizione').val(),
                type: "GET",
                data: {},
            }).done(function (response) {

                clearNodeWorkflowOwner();
                $('#rb-ChatAllParticipants').prop('checked', false);

                if (response.status == "ERR") {
                    //$('.spinner-border').hide();
                    ShowError(response.error.message, response.error.sender);

                } else if (response.status == "OK") {
                    if (response.data == "") {

                    } else {

                        var data = (response.data[0]);
                        $('#rb-ChatAllParticipants').prop('checked', !!data.ChatAllParticipants);

                        if (data.IsCreator != null) {
                            $('#rb-IsCreator').prop("checked", true);
                        }
                        if (data.IsAdminOfCreator != null) {
                            $('#rb-IsAdminOfCreator').prop("checked", true);
                        }

                        if (data.IsOwnerSelectedNode != null) {
                            $('#rb-IsOwnerSelectedNode').prop("checked", true);
                            $('#IsOwnerSelectedNode_Id').val(
                                data.IsOwnerSelectedNode_Id
                            )
                            $('#IsOwnerSelectedNode_Desc').html(
                                ' (' + data.IsOwnerSelectedNode_Desc + ')'
                            )
                        }
                        if (data.IsAdminOwnerSelectedNode != null) {
                            $('#rb-IsAdminOwnerSelectedNode').prop("checked", true);
                            $('#IsAdminOwnerSelectedNode_Id').val(
                                data.IsAdminOwnerSelectedNode_Id
                            )
                            $('#IsAdminOwnerSelectedNode_Desc').html(
                                ' (' + data.IsAdminOwnerSelectedNode_Desc + ')'
                            )
                        }
                        if (data.IsCreatorSelectedNode != null) {
                            $('#rb-IsCreatorSelectedNode').prop("checked", true);
                            $('#IsCreatorSelectedNode_Id').val(
                                data.IsCreatorSelectedNode_Id
                            )
                            $('#IsCreatorSelectedNode_Desc').html(
                                ' (' + data.IsCreatorSelectedNode_Desc + ')'
                            )
                        }
                        updateOwnerProfileSummaryFromOwner(data);
                        if (data.IsUsersFromAdminProfileCreator != null) {
                            $('#rb-IsUsersFromAdminProfileCreator').prop("checked", true);
                        }
                    }
                };
                $('#container-workflow-set-owner').modal('show');

                $('.spinner-node-workflow-owner').hide();

            });
        }
        catch (err) {
            $('.spinner-node-workflow-owner').hide();
            ShowError(err.message, "loadNodeWorkflowOwner");
        }
    }
    showContextMenuNode = function (XPos, YPos, node) {


        $('#context-menu-link').hide();
        const menu = document.getElementById("context-menu-node");
        const menuHeader = $('.context-menu-node-header');
        $('#context-menu-node').find('.node').val(JSON.stringify(node.state));
        $('#context-menu-node').find('#IdEventoTransizione').val(node.id);
        $('#context-menu-node').find('#DescTransizione').val(node.desc);
        $('#context-menu-node').find('.workflow-del-node')
            .toggle(!isVersionEditor || !isProtectedWorkflowNode(node.state));
        $('#context-menu-node').find('.workflow-set-timing')
            .toggle(!!(versionId || node.state.IDVersioneWorkflow) && !isProtectedWorkflowNode(node.state));
        menuHeader.html('<i class="bi bi-bezier2 x2"></i> ' + node.desc);
        menu.style.left = XPos + "px";
        menu.style.top = YPos + "px";
        menu.style.display = "block";
    }
    showContextMenuLink = function (XPos, YPos, node) {

        $('#context-menu-node').hide();
        const menu = document.getElementById("context-menu-link");
        const menuHeader = $('.context-menu-link-header');
        $('#context-menu-link').find('.transition').val(JSON.stringify(node.transition));
        $('#context-menu-link').find('#IDEventoDirezione').val(node.ideventodirezione);
        $('#context-menu-link').find('#DescDirezione').val(node.label);
        menuHeader.html('<i class="bi bi-bezier2 x2"></i> ' + node.label);
        menu.style.left = XPos + "px";
        menu.style.top = YPos + "px";
        menu.style.display = "block";
    }
    updateNodePosition = function (IdEventoTransizione, XPos, YPos) {
        try {
            $('.spinner-workflow').show();
            if (isVersionEditor) {
                $.ajax({
                    url: '/workflow/api/versions/' + versionId + '/graph/nodes/' +
                        encodeURIComponent(IdEventoTransizione) + '/position',
                    type: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify({ x: XPos, y: YPos })
                }).done(function (response) {
                    $('.spinner-workflow').hide();
                    if (response.status === 'ERR') {
                        ShowError(response.error.message, response.error.sender);
                    }
                }).fail(function (xhr, status, errorThrown) {
                    $('.spinner-workflow').hide();
                    ShowError(errorThrown || status, 'updateNodePosition');
                });
                return;
            }
            $.ajax({
                url: "/workflow-update-node-position/" + IdEventoTransizione,
                type: "PUT",
                data: {
                    XPos: XPos,
                    YPos: YPos
                },
            }).done(function (response) {

                if (response.status == "ERR") {
                    $('.spinner-workflow').hide();
                    ShowError(response.error.message, response.error.sender);

                } else if (response.status == "OK") {
                    $('.spinner-workflow').hide();
                }
            }).fail(function (xhr, status, errorThrown) {
                $('.spinner-workflow').hide();
                ShowError(errorThrown, "updateNodePosition")
            });
        }
        catch (err) {
            ShowError(err.message, "updateNodePosition");
        }
    }
    initializeWorkflow = function (IdProcesso) {
        $('.spinner-workflow').show();
        try {
            $.ajax({
                url: isVersionEditor
                    ? '/workflow/api/versions/' + versionId + '/graph'
                    : "/workflow/" + IdProcesso,
                type: isVersionEditor ? 'GET' : 'POST',
                data: {},
            }).done(function (response) {

                if (response.status == "ERR") {
                    //$('.spinner-border').hide();
                    ShowError(response.error.message, response.error.sender);

                } else if (response.status == "OK") {

                    var graphData = response.data;
                    var states = isVersionEditor
                        ? graphData.states
                        : JSON.parse(JSON.parse(JSON.parse(JSON.stringify(response)).data).states);
                    var transitions = isVersionEditor
                        ? graphData.transitions
                        : JSON.parse(JSON.parse(JSON.parse(JSON.stringify(response)).data).transitions);
                    //console.log(states);
                    //console.log(transitions);

                    //=========================
                    // JSON
                    //=========================

                    const machine = {

                        "states": states,
                        "transitions": transitions

                    };


                    //=========================
                    // Costruzione elementi
                    //=========================

                    const elements = [];

                    // nodi

                    machine.states.forEach(state => {

                        elements.push({

                            data: {
                                id: state.id,
                                label: state.label,
                                desc: state.desc,
                                state: state
                            },

                        });

                    });

                    // archi

                    machine.transitions.forEach(t => {

                        elements.push({

                            data: {
                                id: t.id,
                                source: t.from,
                                target: t.to,
                                label: t.event,
                                ideventodirezione: t.IDEventoDirezione,
                                transition: t
                            }

                        });

                    });


                    //=========================
                    // Cytoscape
                    //=========================

                    if (cy) {
                        workflowNodeHealth.forEach(function (indicator) {
                            indicator.marker.remove();
                            indicator.timing.remove();
                        });
                        workflowNodeHealth.clear();
                        cy.destroy();
                    }
                    cy = cytoscape({

                        container: document.getElementById('cy'),
                        elements,
                        selectionType: 'single',
                        style: [

                            {
                                selector: 'node',
                                style: {
                                    'label': 'data(label)',
                                    'text-valign': 'center',
                                    'text-halign': 'center',
                                    'background-color': '#3498db',
                                    'color': 'white',
                                    'font-size': '12px',
                                    'width': '90px',
                                    'height': '45px',
                                    'border-width': 2,
                                    'border-color': '#21618c',
                                    'shape': 'round-rectangle'
                                }
                            },
                            {
                                selector: 'node:selected',
                                style: {
                                    'background-color': '#e74c3c',
                                    'border-width': 4,
                                    'border-color': '#c0392b'
                                }
                            },
                            {
                                selector: 'edge:selected',
                                style: {
                                    'line-color': '#ff0000',
                                    'target-arrow-color': '#ff0000',
                                    'width': 5,
                                    'label': 'data(label)',
                                    'color': '#ff0000',
                                    'font-weight': 'bold'
                                }
                            },
                            {
                                selector: 'edge',
                                style: {

                                    'curve-style': 'bezier',
                                    'width': 3,
                                    'target-arrow-color': '#888',
                                    'target-arrow-shape': 'triangle',
                                    'arrow-scale': 1.3,
                                    'label': 'data(label)',
                                    'font-size': '13px',
                                    'text-background-color': 'white',
                                    'text-background-opacity': 1,
                                    'text-background-padding': '3px',
                                    'text-rotation': 'autorotate'
                                }
                            }

                        ],

                        layout: {
                            name: 'breadthfirst',
                            directed: true,
                            padding: 0
                        }

                    });


                    //=========================
                    // Eventi
                    //=========================

                    cy.on('select', 'node', function (evt) {
                        //console.log("Selezionato-id:", evt.target._private.data.id);
                        //console.log("Selezionato-id:", evt.target._private.data.label);
                        //console.log("Selezionato-label:", evt.target.label());

                        // const node = e.target;
                        // node.connectedEdges().addClass('highlight');

                    });
                    cy.on('tap', function (e) {

                        if (e.target === cy) {
                            cy.elements().unselect();
                            $('#context-menu-node').hide();
                            $('#context-menu-link').hide();
                        }

                    });
                    cy.on('tap', 'node', function (evt) {
                        //console.log("Nodo selezionato:", evt.target.id());
                        cy.elements().unselect();
                        $('#context-menu-node').hide();
                        $('#context-menu-link').hide();

                    });
                    cy.on('unselect', 'node', function (evt) {
                        // const node = e.target;
                        // node.connectedEdges().removeClass('highlight');
                        //console.log("Nodo deselezionato:", evt.target.id());

                    });
                    cy.on('select', 'edge', function (e) {
                        //console.log("Transizione selezionata:", e.target.id());
                        $('#context-menu-node').hide();
                        $('#context-menu-link').hide();
                    });
                    cy.on("drag", "node", (e) => {
                        const p = e.renderedPosition;
                        const tooltip = document.getElementById("tooltip");
                        tooltip.innerHTML = "<b>" + e.target._private.data.desc + "</b>";
                        tooltip.style.left = (p.x + 4) + "px";
                        tooltip.style.top = (p.y + 4) + "px";
                        tooltip.style.display = "block";
                    });
                    cy.on('dragfree', 'node', (e) => {
                        const node = e.target;
                        //console.log(node.id());
                        //console.log(node.position().x);
                        //console.log(node.position().y);
                        $.when(
                            updateNodePosition(
                                node.id(),
                                node.position().x,
                                node.position().y
                            )
                        ).then(function () {
                        });
                    });
                    cy.on('grab', 'node', function (e) {
                        e.target.style({
                            //'background-color': '#f39c12'
                        });
                    });
                    cy.on('free', 'node', function (e) {
                        e.target.style({
                            //'background-color': '#3498db'
                        });
                    });
                    cy.on("mouseover", "node", e => {
                        const p = e.renderedPosition;
                        const tooltip = document.getElementById("tooltip");
                        tooltip.innerHTML = "<b>" + e.target._private.data.desc + "</b>";
                        tooltip.style.left = (p.x + 4) + "px";
                        tooltip.style.top = (p.y + 4) + "px";
                        tooltip.style.display = "block";
                    });
                    cy.on("mousemove", "node", e => {

                        const p = e.renderedPosition;
                        tooltip.style.left = (p.x + 14) + "px";
                        tooltip.style.top = (p.y + 14) + "px";

                    });
                    cy.on("mouseout", "node", () => {

                        tooltip.style.display = "none";

                    });
                    cy.on('cxttap', 'node', function (e) {

                        e.originalEvent.preventDefault();

                        const node = e.target;

                        cy.elements().unselect();

                        e.target.select();

                        //console.log("Nodo:", node.id());

                        const selectedNode = cy.$('node:selected');

                        //if (selectedNode.length) {
                            showContextMenuNode(
                                e.originalEvent.pageX - 75,
                                e.originalEvent.pageY - 100,
                                e.target._private.data
                            );
                        //}

                    });

                    cy.on('cxttap', 'edge', function (e) {

                        e.originalEvent.preventDefault();

                        const link = e.target;
                        //console.log(e.target._private.data);
                        //console.log("Nodo:", node.id());
                        cy.elements().unselect();

                        e.target.select();

                        const selectedNode = cy.$('edge:selected');

                        //if (selectedNode.length) {
                            showContextMenuLink(
                                e.originalEvent.pageX - 75,
                                e.originalEvent.pageY - 100,
                                e.target._private.data
                            );
                        //}

                    });

                    machine.states.forEach(state => {

                        const node = cy.getElementById(state.id);
                        node.position({
                            x: Math.round(state.x),
                            y: Math.round(state.y)
                        });
                        node.style({
                            //'background-color': state.HexColor
                        });

                    });

                    if (isVersionEditor) {
                        const graphInstance = cy;
                        let ownerRequestErrorShown = false;
                        workflowNodeHealth = new Map();

                        machine.states.forEach(function (state) {
                            if (isProtectedWorkflowNode(state)) {
                                return;
                            }

                            const node = graphInstance.getElementById(state.id);
                            const marker = document.createElement('span');
                            marker.className = 'workflow-node-health-bullet';
                            marker.setAttribute('aria-hidden', 'true');
                            graphInstance.container().appendChild(marker);
                            const timing = document.createElement('i');
                            timing.className = 'bi bi-clock workflow-node-timing-icon';
                            timing.setAttribute('title', 'Duration interval');
                            graphInstance.container().appendChild(timing);

                            const indicator = {
                                node: node,
                                marker: marker,
                                timing: timing,
                                hasTiming: isEnabled(state.HasTiming),
                                hasConnection: isEnabled(state.HasConnection),
                                hasOwner: null,
                                hasAuthorization: isEnabled(state.HasAuthorization)
                            };
                            workflowNodeHealth.set(String(state.id), indicator);
                            updateNodeHealthIndicator(indicator);

                            $.ajax({
                                url: '/workflow-node-owner/' + encodeURIComponent(state.id),
                                type: 'GET'
                            }).done(function (response) {
                                if (cy !== graphInstance) {
                                    return;
                                }
                                if (response.status === 'ERR') {
                                    if (!ownerRequestErrorShown) {
                                        ownerRequestErrorShown = true;
                                        ShowError(response.error.message, response.error.sender);
                                    }
                                    return;
                                }

                                const owner = Array.isArray(response.data) ? response.data[0] : null;
                                const ownerFields = [
                                    'IsCreator',
                                    'IsAdminOwnerSelectedNode',
                                    'IsAdminOfCreator',
                                    'IsOwnerSelectedNode',
                                    'IsCreatorSelectedNode',
                                    'IsSelectedProfile',
                                    'IsUsersFromAdminProfileCreator'
                                ];
                                indicator.hasOwner = !!owner && ownerFields.some(function (field) {
                                    return owner[field] !== null &&
                                        owner[field] !== undefined &&
                                        String(owner[field]).trim() !== '';
                                });
                                updateNodeHealthIndicator(indicator);
                            }).fail(function (xhr, status, errorThrown) {
                                if (cy === graphInstance && !ownerRequestErrorShown) {
                                    ownerRequestErrorShown = true;
                                    ShowError(errorThrown || status, 'workflow-node-owner');
                                }
                            });
                        });

                        graphInstance.on('pan zoom resize', function () {
                            workflowNodeHealth.forEach(updateNodeHealthIndicator);
                        });
                        graphInstance.on('position', 'node', function (event) {
                            const indicator = workflowNodeHealth.get(String(event.target.id()));
                            if (indicator) {
                                updateNodeHealthIndicator(indicator);
                            }
                        });
                        graphInstance.on('drag', 'node', function (event) {
                            const indicator = workflowNodeHealth.get(String(event.target.id()));
                            if (indicator) {
                                updateNodeHealthIndicator(indicator);
                            }
                        });
                        graphInstance.on('dragfree', 'node', function (event) {
                            const indicator = workflowNodeHealth.get(String(event.target.id()));
                            if (indicator) {
                                updateNodeHealthIndicator(indicator);
                            }
                        });
                        workflowNodeHealth.forEach(updateNodeHealthIndicator);
                    }

                    $('.spinner-workflow').hide();

                    cy.fit(cy.elements(), 30);
                    if (isVersionEditor && cy.zoom() > 1) {
                        cy.zoom(1);
                        cy.center(cy.elements());
                    }

                    $('.workflow-download').click(function () {
                        const a = document.createElement("a");
                        a.href = cy.jpg({
                            full: true,
                            scale: 2
                        });
                        a.download = "workflow.png";
                        a.click();
                    });
                    $('.workflow-stampa').click(function () {
                        const img = cy.png({
                            full: true,
                            scale: 1
                        });

                        const win = window.open("", "_blank");

                        win.document.write(`
                            <html>
                            <head>
                                <title>Stampa workflow</title>
                            </head>
                            <body style="margin:0">
                                <img src="${img}" style="width:100%; position:absolute; top:50%; margin-top:-25%;">
                                <script>
                                    window.onload = function () {
                                        window.print();
                                    };

                                    window.onafterprint = function () {
                                        window.close();
                                    };
                                <\/script>
                            </body>
                            </html>
                            `);

                        win.document.close();
                    });

                }
            });
        }
        catch (err) {
            $('.spinner-workflow').hide();
            ShowError(err.message, "initializeWorkflow");
        }
    }

    /* inizializza il controllo <profili-utente-auth> */
    var ControlAuthProfiliUtente = $('#auth-profili-utente-container');

    /* Imposta le propriet� di default del plug-in <profili-utente-auth> */
    ControlAuthProfiliUtente.profiliutente({
        IDGruppoOperativo: null,
    });

    /* Registra l'evento {onselect} del plug-in <profili-utente-auth> */
    ControlAuthProfiliUtente.bind("onselect", function () {
        var option = JSON.parse(ControlAuthProfiliUtente.attr('data-options'));

        loadWorkflowNodeAuthorizations();

    });

    /* inizializza il controllo <gruppi-operativi-auth> */
    var ControlAuthGruppiOperativi = $('#auth-gruppi-operativi-container');

    /* Imposta le propriet� di default del plug-in <gruppi-operativi-auth> */
    ControlAuthGruppiOperativi.gruppioperativi({
        IDGruppoOperativo: null,
        IDGruppoOperativoParent: null,
        Descrizione: null,
    });

    /* Registra l'evento {onselect} del plug-in <gruppi-operativi-auth> */
    ControlAuthGruppiOperativi.bind("onselect", function () {
        var option = JSON.parse(ControlAuthGruppiOperativi.attr('data-options'));

        /* Caricare la lista dei profili utente in base a {option.IDGruppoOperativo} */
        ControlAuthProfiliUtente.profiliutente.clear(ControlAuthProfiliUtente);
        ControlAuthProcessiAzioni.processiazioni.clear(ControlAuthProcessiAzioni);
        var profileOptions = JSON.parse(ControlAuthProfiliUtente.attr('data-options'));
        profileOptions.IDProfiloUtente = null;
        profileOptions.Descrizione = null;
        ControlAuthProfiliUtente.attr('data-options', JSON.stringify(profileOptions));
        ControlAuthProfiliUtente.profiliutente.load(ControlAuthProfiliUtente, option.IDGruppoOperativo);

    });


    /* inizializza il controllo <profili-utente> */
    var ControlProfiliUtente = $('#profili-utente-container');

    /* Imposta le propriet� di default del plug-in <profili-utente> */
    ControlProfiliUtente.profiliutente({
        IDGruppoOperativo: null,
        toggleEnabled: true,
    });
    /* Registra l'evento {onselect} del plug-in <profili-utente> */
    ControlProfiliUtente.bind("onselect", function () {
        var option = JSON.parse(ControlProfiliUtente.attr('data-options'));

        var group = JSON.parse(ControlGruppiOperativi.attr('data-options')).IDGruppoOperativo;
        selectedOwnerProfile = { id: option.IDProfiloUtente, group: group, description: option.Descrizione };
        refreshOwnerProfiles();

    });
    var selectedOwnerProfile = null;
    var ownerProfileRequest = 0;
    function ownerProfileUrl() {
        return '/workflow-node-owner/' + encodeURIComponent($('#context-menu-node #IdEventoTransizione').val()) + '/profiles';
    }
    function resetOwnerProfileLinks() {
        $('#workflow-profile-links').empty();
        $('#workflow-profile-links-all').prop('checked', false).prop('disabled', true);
        $('.workflow-profile-links-title').text('');
    }
    function updateOwnerProfileSummary(profiles) {
        var descriptions = profiles.map(function (profile) {
            return profile.OwnerDescription;
        }).filter(function (description) {
            return typeof description === 'string' && description.trim();
        });
        $('#rb-IsSelectedProfile').prop('checked', profiles.length > 0);
        $('#IsSelectedProfile_Id').val(profiles.length ? profiles[0].IDProfiloUtente : '');
        $('#IsSelectedProfile_Desc').text(descriptions.length
            ? ' (' + descriptions.join(', ') + ')'
            : '');
    }
    function updateOwnerProfileSummaryFromOwner(data) {
        var hasProfiles = data && data.IsSelectedProfile != null;
        $('#rb-IsSelectedProfile').prop('checked', !!hasProfiles);
        $('#IsSelectedProfile_Id').val(hasProfiles ? data.IsSelectedProfile_Id : '');
        $('#IsSelectedProfile_Desc').text(
            hasProfiles && data.IsSelectedProfile_Desc ? ' (' + data.IsSelectedProfile_Desc + ')' : ''
        );
    }
    function renderOwnerProfiles(data) {
        var profiles = data.profiles;
        var active = profiles.map(function (p) { return p.IDGruppoOperativo + ':' + p.IDProfiloUtente; });
        var group = JSON.parse(ControlGruppiOperativi.attr('data-options')).IDGruppoOperativo;
        ControlProfiliUtente.find('.workflow-profile-toggle').each(function () {
            var id = $(this).closest('.profilo-utente').find('a[data-idprofiloutente]').data('idprofiloutente');
            $(this).prop('checked', active.indexOf(group + ':' + id) !== -1);
        });
        var isActive = selectedOwnerProfile && active.indexOf(selectedOwnerProfile.group + ':' + selectedOwnerProfile.id) !== -1;
        var links = data.links || [];
        var all = !!isActive && links.every(function (link) { return link.Enabled; });
        $('#workflow-profile-links-all').prop('checked', all).prop('disabled', !isActive || !links.length);
        $('.workflow-profile-links-title').text(selectedOwnerProfile ? ' (' + selectedOwnerProfile.description + ')' : '');
        var container = $('#workflow-profile-links').empty();
        if (!isActive || all) return;
        links.forEach(function (link) {
            var id = 'workflow-profile-direction-' + link.IDEventoDirezione;
            var row = $('<div class="form-check form-switch">');
            var input = $('<input>', { type: 'checkbox', id: id, class: 'form-check-input' })
                .prop('checked', !!link.Enabled);
            row.append(input, $('<label>', { for: id, class: 'form-check-label' })
                .text(link.Description || String(link.IDEventoDirezione)));
            container.append(row);
            input.on('change', function () {
                saveOwnerProfileChange({ operation: 'direction', profile: selectedOwnerProfile.id,
                    group: selectedOwnerProfile.group, direction: link.IDEventoDirezione, enabled: this.checked });
            });
        });
    }
    function refreshOwnerProfiles() {
        var token = ++ownerProfileRequest;
        $.ajax({ url: ownerProfileUrl(), type: 'GET',
            data: { profile: selectedOwnerProfile ? selectedOwnerProfile.id : '',
                group: selectedOwnerProfile ? selectedOwnerProfile.group : '' } })
            .done(function (response) {
                if (token !== ownerProfileRequest) return;
                if (response.status === 'ERR') return ShowError(response.error.message, response.error.sender);
                renderOwnerProfiles(response.data);
            }).fail(function (xhr, status, error) { ShowError(error || status, 'refreshOwnerProfiles'); });
    }
    function saveOwnerProfileChange(data, onSuccess, onFailure) {
        ++ownerProfileRequest;
        var controls = $('#container-workflow-set-profilo-utente, #container-workflow-set-owner').find('input, button');
        controls.prop('disabled', true);
        $.ajax({ url: ownerProfileUrl(), type: 'POST', data: data })
            .done(function (response) {
                if (response.status === 'ERR') {
                    ShowError(response.error.message, response.error.sender);
                    if (onFailure) onFailure();
                    return;
                }
                if (onSuccess) onSuccess(response.data);
            }).fail(function (xhr, status, error) {
                ShowError(error || status, 'saveOwnerProfileChange');
                if (onFailure) onFailure();
            }).always(function () {
                controls.prop('disabled', false);
                refreshOwnerProfiles();
            });
    }
    function refreshOwnerProfileSummary() {
        $.ajax({
            url: '/workflow-node-owner/' + encodeURIComponent($('#context-menu-node #IdEventoTransizione').val()),
            type: 'GET',
            data: {}
        }).done(function (response) {
            if (response.status === 'ERR') {
                ShowError(response.error.message, response.error.sender);
                return;
            }
            updateOwnerProfileSummaryFromOwner(response.data && response.data[0]);
        }).fail(function (xhr, status, error) {
            ShowError(error || status, 'refreshOwnerProfileSummary');
        });
    }
    var profileSelectorOpen = false;
    $('#container-workflow-set-profilo-utente')
        .on('shown.bs.modal', function () { profileSelectorOpen = true; })
        .on('hidden.bs.modal', function () {
            profileSelectorOpen = false;
            refreshOwnerProfileSummary();
    });
    ControlProfiliUtente.bind('onprofilesloaded', function () {
        if (profileSelectorOpen) refreshOwnerProfiles();
    });
    ControlProfiliUtente.bind('ontoggleprofile', function (event, profile, checked) {
        var group = JSON.parse(ControlGruppiOperativi.attr('data-options')).IDGruppoOperativo;
        selectedOwnerProfile = { id: profile.IDProfiloUtente, group: group, description: profile.ProfiloUtente };
        saveOwnerProfileChange({ operation: 'profile', profile: profile.IDProfiloUtente, group: group, enabled: checked },
            function (data) {
                clearNodeWorkflowOwner();
                updateOwnerProfileSummary(data.profiles);
            });
    });
    $('#workflow-profile-links-all').on('change', function () {
        if (selectedOwnerProfile) {
            saveOwnerProfileChange({ operation: 'all', profile: selectedOwnerProfile.id,
                group: selectedOwnerProfile.group, enabled: this.checked });
        }
    });

    /* inizializza il controllo <gruppi-operativi> */
    var ControlGruppiOperativi = $('#gruppi-operativi-container');

    /* Imposta le propriet� di default del plug-in <gruppi-operativi> */
    ControlGruppiOperativi.gruppioperativi({
        IDGruppoOperativo: null,
        IDGruppoOperativoParent: null,
        Descrizione: null,
    });

    /* Registra l'evento {onselect} del plug-in <gruppi-operativi> */
    ControlGruppiOperativi.bind("onselect", function () {
        var option = JSON.parse(ControlGruppiOperativi.attr('data-options'));

        /* Caricare la lista dei profili utente in base a {option.IDGruppoOperativo} */
        $('.profili-utente-text').html(' (' + option.Descrizione + ')');
        selectedOwnerProfile = null;
        resetOwnerProfileLinks();
        ControlProfiliUtente.profiliutente.load(ControlProfiliUtente, option.IDGruppoOperativo);

    });

    /* inizializza il controllo processi azioni */
    var ControlAuthProcessiAzioni = $('#auth-autorizzazioni-container');

    /* Imposta le propriet� di default del plug-in <Pager> */
    ControlAuthProcessiAzioni.processiazioni({
        VisibilityEnabled: true
    });

    const visibilityModal = $('#container-workflow-set-visibility');
    const ControlVisibilityProcessi = $('#workflow-visibility-processes');
    const workflowVisibility = {
        versionId: null,
        processId: null,
        processActionId: null,
        nodeId: null,
        groupId: null,
        profileId: null,
        actionEnabled: false
    };
    ControlVisibilityProcessi.processi({
        dataUrl: '/workflow/api/versions/' + encodeURIComponent(versionId || '') + '/visibility/processes',
        selectionEnabled: true
    });

    function renderVisibilityClasses(classes) {
        const $container = $('.workflow-visibility-classes').empty();
        const byParent = new Map();
        classes.forEach(function (item) {
            const parent = item.IDClasseParent == null ? 'root' : String(item.IDClasseParent);
            if (!byParent.has(parent)) byParent.set(parent, []);
            byParent.get(parent).push(item);
        });

        function appendChildren(parentId, depth) {
            (byParent.get(parentId) || []).forEach(function (item) {
                $('<button>', {
                    type: 'button',
                    class: 'btn btn-sm btn-light w-100 mb-1 workflow-visibility-class',
                    text: item.Description || ('#' + item.IDClasse)
                }).attr({
                    'data-idclasse': item.IDClasse,
                    'data-depth': depth
                }).css('padding-left', (0.5 + depth * 1.1) + 'rem').appendTo($container);
                appendChildren(String(item.IDClasse), depth + 1);
            });
        }

        appendChildren('root', 0);
        if (!classes.length) {
            $('<div>', {
                class: 'text-secondary',
                text: $('#LanguageContext').val() === 'IT'
                    ? 'Nessuna sezione disponibile.'
                    : 'No sections available.'
            }).appendTo($container);
        }
    }

    function renderVisibilityFields(fields) {
        const $container = $('.workflow-visibility-fields').empty();
        if (!fields.length) {
            $('<div>', {
                class: 'text-secondary',
                text: $('#LanguageContext').val() === 'IT'
                    ? 'Nessun campo visibile in questa sezione.'
                    : 'No visible fields in this section.'
            }).appendTo($container);
            return;
        }

        const canConfigure = workflowVisibility.actionEnabled;
        if (!canConfigure) {
            $('<div>', {
                class: 'alert alert-info py-2',
                text: $('#LanguageContext').val() === 'IT'
                    ? 'Attiva prima l’autorizzazione dell’azione per configurare i campi.'
                    : 'Enable the action permission before configuring fields.'
            }).appendTo($container);
        }
        fields.forEach(function (field) {
            const $row = $('<div>', {
                class: 'd-flex align-items-center border-bottom py-2 gap-2'
            });
            $('<span>', {
                class: 'flex-grow-1',
                text: field.Description || ('#' + field.IDAttributo)
            }).appendTo($row);
            const $switch = $('<input>', {
                type: 'checkbox',
                class: 'form-check-input m-0 workflow-visibility-field-toggle',
                checked: field.IsSelected === true || field.IsSelected === 1,
                disabled: !canConfigure,
                'aria-label': field.Description || ('#' + field.IDAttributo)
            }).attr('data-idattributo', field.IDAttributo);
            $('<div>', { class: 'form-check form-switch m-0' }).append($switch).appendTo($row);
            $container.append($row);
        });
    }

    ControlVisibilityProcessi.bind('onselect', function () {
        const options = JSON.parse(ControlVisibilityProcessi.attr('data-options'));
        workflowVisibility.processId = Number(options.IDProcesso);
        $('.workflow-visibility-class').removeClass('active');
        $('.workflow-visibility-classes').empty();
        $('.workflow-visibility-fields').empty();
        const language = $('#LanguageContext').val();
        const formLabel = {
            IT: 'Form',
            GB: 'Form',
            ES: 'Formulario',
            CN: '表单'
        }[language] || 'Form';
        const versionLabel = {
            IT: 'Versione',
            GB: 'Version',
            ES: 'Versión',
            CN: '版本'
        }[language] || 'Version';
        const formDescription = options.ModelDescription ||
            (options.IDModello ? formLabel + ' #' + options.IDModello : '');
        const formVersion = options.ModelVersionNumber == null
            ? (options.IDVersione ? '#' + options.IDVersione : '')
            : options.ModelVersionNumber;
        $('.workflow-visibility-form-info').text(
            formDescription + (formVersion ? ' / ' + versionLabel + ' ' + formVersion : '')
        );
        $.getJSON('/workflow/api/versions/' + encodeURIComponent(workflowVisibility.versionId) +
            '/visibility/processes/' + encodeURIComponent(workflowVisibility.processId) +
            '/classes', { nodeId: workflowVisibility.nodeId })
            .done(function (response) {
                if (response.status !== 'OK') {
                    ShowError(response.error.message, 'loadWorkflowVisibilityClasses');
                    return;
                }
                renderVisibilityClasses(response.data || []);
            })
            .fail(function (xhr, status, errorThrown) {
                ShowError(errorThrown || status, 'loadWorkflowVisibilityClasses');
            });
    });

    visibilityModal.on('click', '.workflow-visibility-class', function () {
        const $selected = $(this);
        const classId = Number($selected.attr('data-idclasse'));
        $selected.addClass('active').siblings('.workflow-visibility-class').removeClass('active');
        $('.workflow-visibility-fields').empty();
        $.getJSON('/workflow/api/versions/' + encodeURIComponent(workflowVisibility.versionId) +
            '/visibility/processes/' + encodeURIComponent(workflowVisibility.processId) +
            '/classes/' + encodeURIComponent(classId) + '/attributes', {
                nodeId: workflowVisibility.nodeId,
                processActionId: workflowVisibility.processActionId,
                groupId: workflowVisibility.groupId,
                profileId: workflowVisibility.profileId
            })
            .done(function (response) {
                if (response.status !== 'OK') {
                    ShowError(response.error.message, 'loadWorkflowVisibilityAttributes');
                    return;
                }
                renderVisibilityFields(response.data || []);
            })
            .fail(function (xhr, status, errorThrown) {
                ShowError(errorThrown || status, 'loadWorkflowVisibilityAttributes');
            });
    });

    visibilityModal.on('change', '.workflow-visibility-field-toggle', function () {
        const $toggle = $(this);
        const visible = $toggle.prop('checked');
        $toggle.prop('disabled', true);
        $.ajax({
            url: '/workflow/api/versions/' + encodeURIComponent(workflowVisibility.versionId) +
                '/visibility/processes/' + encodeURIComponent(workflowVisibility.processId) +
                '/attributes/' + encodeURIComponent($toggle.attr('data-idattributo')),
            type: 'PUT',
            data: {
                nodeId: workflowVisibility.nodeId,
                processActionId: workflowVisibility.processActionId,
                groupId: workflowVisibility.groupId,
                profileId: workflowVisibility.profileId,
                visible: visible
            }
        }).done(function (response) {
            if (response.status === 'ERR') {
                $toggle.prop('checked', !visible);
                ShowError(response.error.message, 'saveWorkflowVisibilityAttribute');
            }
        }).fail(function (xhr, status, errorThrown) {
            $toggle.prop('checked', !visible);
            ShowError(errorThrown || status, 'saveWorkflowVisibilityAttribute');
        }).always(function () {
            $toggle.prop('disabled', !workflowVisibility.actionEnabled);
        });
    });

    ControlAuthProcessiAzioni.on('click', '.workflow-action-visibility', function (event) {
        event.preventDefault();
        event.stopPropagation();
        const processOptions = JSON.parse(ControlAuthProcessi.attr('data-options'));
        const profileOptions = JSON.parse(ControlAuthProfiliUtente.attr('data-options'));
        const groupOptions = JSON.parse(ControlAuthGruppiOperativi.attr('data-options'));
        const $actionRow = $(this).closest('[class*="processo-azione-"]');
        const $authorizationToggle = $actionRow.find('.form-check-input').first();
        workflowVisibility.processId = Number(processOptions.IDProcesso);
        workflowVisibility.processActionId = Number($(this).attr('data-idprocessoazione'));
        workflowVisibility.nodeId = Number($('#context-menu-node #IdEventoTransizione').val());
        const node = JSON.parse($('#context-menu-node .node').val() || 'null');
        workflowVisibility.versionId = versionId || Number(node && node.IDVersioneWorkflow) || null;
        workflowVisibility.groupId = Number(groupOptions.IDGruppoOperativo);
        workflowVisibility.profileId = Number(profileOptions.IDProfiloUtente);
        workflowVisibility.actionEnabled = $authorizationToggle.prop('checked') === true;

        if (!workflowVisibility.versionId || ![
            workflowVisibility.processId,
            workflowVisibility.processActionId,
            workflowVisibility.nodeId,
            workflowVisibility.groupId,
            workflowVisibility.profileId
        ].every(function (value) { return Number.isSafeInteger(value) && value > 0; })) {
            ShowError('Selezionare un processo, un profilo e un gruppo di lavoro validi.', 'workflowVisibility');
            return;
        }

        const nodeDescription = $('#context-menu-node #DescTransizione').val() || '';
        const actionDescription = $(this).attr('data-action-description') || '';
        $('.workflow-visibility-header').text(nodeDescription + ' / ' + actionDescription);
        ControlVisibilityProcessi.processi({
            dataUrl: '/workflow/api/versions/' + encodeURIComponent(workflowVisibility.versionId) +
                '/visibility/processes',
            selectionEnabled: true
        });
        $('.workflow-visibility-classes').empty();
        $('.workflow-visibility-fields').empty();
        ControlVisibilityProcessi.processi.load(null, ControlVisibilityProcessi);
        visibilityModal.modal('show');
    });

    visibilityModal.on('shown.bs.modal', function () {
        visibilityModal.css('z-index', 1080);
        $('.modal-backdrop').last().css('z-index', 1075);
    });
    visibilityModal.on('hidden.bs.modal', function () {
        visibilityModal.css('z-index', '');
        $('.modal-backdrop').last().css('z-index', '');
    });

    function loadWorkflowNodeAuthorizations() {
        var processOptions = JSON.parse(ControlAuthProcessi.attr('data-options'));
        var profileOptions = JSON.parse(ControlAuthProfiliUtente.attr('data-options'));
        var authorizationOptions = JSON.parse(ControlAuthProcessiAzioni.attr('data-options'));
        authorizationOptions.IDProcesso = processOptions.IDProcesso;
        authorizationOptions.IdProfiloUtente = profileOptions.IDProfiloUtente;
        authorizationOptions.IdEventoTransizione = $('#context-menu-node #IdEventoTransizione').val();
        ControlAuthProcessiAzioni.attr('data-options', JSON.stringify(authorizationOptions));

        if (!authorizationOptions.IDProcesso || !authorizationOptions.IdProfiloUtente) {
            ControlAuthProcessiAzioni.processiazioni.clear(ControlAuthProcessiAzioni);
            return;
        }

        ControlAuthProcessiAzioni.processiazioni.loadFromWorkflowState();
    }

    var ControlAuthProcessi = $('#auth-processi-container');
    ControlAuthProcessi.processi({
        dataUrl: '/processi-gestione/dati',
        selectionEnabled: true
    });
    ControlAuthProcessi.bind('onselect', function (event) {
        ControlAuthProcessi.find('.workflow-auth-selected').removeClass('workflow-auth-selected');
        $(event.target).find('a').first().addClass('workflow-auth-selected');
        loadWorkflowNodeAuthorizations();
    });

    /* Registra l'evento {ontoggle} per aggiornare il valore dell'autorizzazione selezionata */
    ControlAuthProcessiAzioni.bind(
        "ontoggle", function () {

        var optionsAuthGruppiOperativi = JSON.parse(ControlAuthGruppiOperativi.attr('data-options'));
        var options = JSON.parse(ControlAuthProcessiAzioni.attr('data-options'));

        toggleAuthProcessoAzione(
            optionsAuthGruppiOperativi.IDGruppoOperativo,
            options.IdProfiloUtente,
            options.IDProcesso,
            options.IDProcessoAzione,
            $('#context-menu-node').find('#IdEventoTransizione').val(),
            options.Toggled
        );
    });

    /* inizializza il controllo workflow-node-link */
    var ControlWorkflowNodeLink = $('.control-workflow-node-link');

    /* Imposta le propriet� di default del plug-in */
    ControlWorkflowNodeLink.workflowNodeStates({
        IdProcesso: getCurrentProcessId(),
        IDVersioneWorkflow: versionId,
        IdEventoTransizione: null,
        LanguageContext: $('#LanguageContext').val()
    });

    ControlWorkflowNodeLink.bind("onready", function () {
        ControlWorkflowNodeLink.workflowNodeStates.loadStates(ControlWorkflowNodeLink);
    });

    /* Registra l'evento {onselect} */
    ControlWorkflowNodeLink.bind("onselect", function () {

        var option = JSON.parse(ControlWorkflowNodeLink.attr('data-options'));

        linkNodeWorkflow(option.SelectedState);

    });


    /* inizializza il controllo workflow-node-states */
    var ControlWorkflowNodeStates = $('.control-workflow-node-states');

    /* Registra l'evento {onselect} */
    ControlWorkflowNodeStates.bind("onselect", function () {

        var option = JSON.parse(ControlWorkflowNodeStates.attr('data-options'));

        if (option.Sender === 'workflow-timing') {
            $('#timing-target').val(option.SelectedState);
            $('#timing-target-description').text(' (' + option.SelectedText + ')');
            $('.workflow-timing-error').addClass('d-none').text('');
            $('#container-workflow-node-states').modal('hide');
            return;
        }

        clearNodeWorkflowOwner();

        if (option.Sender == 'bi-gear-is-admin-ownwer-selected-node') {
            $('#rb-IsAdminOwnerSelectedNode').prop('checked', true);
            $('#IsAdminOwnerSelectedNode_Id').val(option.SelectedState);
            $('#IsAdminOwnerSelectedNode_Desc').html(' (' + option.SelectedText + ')');
        }
        if (option.Sender == 'bi-gear-is-ownwer-selected-node') {
            $('#rb-IsOwnerSelectedNode').prop('checked', true);
            $('#IsOwnerSelectedNode_Id').val(option.SelectedState);
            $('#IsOwnerSelectedNode_Desc').html(' (' + option.SelectedText + ')');
        }
        if (option.Sender == 'bi-gear-is-creator-selected-node') {
            $('#rb-IsCreatorSelectedNode').prop('checked', true);
            $('#IsCreatorSelectedNode_Id').val(option.SelectedState);
            $('#IsCreatorSelectedNode_Desc').html(' (' + option.SelectedText + ')');
        }
        
        $('#container-workflow-node-states').modal('hide');

    });

    if (isVersionEditor) {
        ControlWorkflowNodeStates.workflowNodeStates({
            IdProcesso: getCurrentProcessId(),
            IDVersioneWorkflow: versionId,
            IdEventoTransizione: null,
            LanguageContext: $('#LanguageContext').val()
        });
        $('#container-workflow').on('hidden.bs.modal', function () {
            if (isVersionEditor && window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'workflow-version-editor-closed' }, '*');
            }
        });
        $('#container-workflow').modal('show');
        initializeWorkflow(versionId);
    }

});
