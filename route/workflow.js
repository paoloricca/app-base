const express = require('express');
const workflow = express.Router();
const bodyParser = require('body-parser');
const formidable = require('formidable');
const crypto = require('crypto');
//var requestIdModelloIstanzaRecordValue = require('../model/request-idmodello-istanza-record-value');
//var requestIdModelloIstanzaRecordMedia = require('../model/request-idmodello-istanza-record-media');
//var requestIdModelloIstanzaRecord = require('../model/request-idmodello-istanza-record');
//var requestIdModelloIstanza = require('../model/request-idmodello-istanza');
var requestWorkflow = require('../model/request-workflow');
var requestWorkflowActions = require('../model/request-workflow-actions');
var requestWorkflowTransitions = require('../model/request-workflow-transitions');
var requestWorkflowNodeOwner = require('../model/request-workflow-node-owner');
var requestWorkflowNodeLink = require('../model/request-workflow-node-link');
var requestWorkflowNodeState = require('../model/request-workflow-node-state');
var requestWorkflowNewNode = require('../model/request-workflow-new-node');
var requestWorkflowDelLink = require('../model/request-workflow-del-node');
var requestWorkflowDelState = require('../model/request-workflow-del-state');
var requestWorkflowLinkNode = require('../model/request-workflow-link-node');
var requestWorkflowPost = require('../model/request-workflow-post');
var requestWorkflowUpdateNodePosition = require('../model/request-workflow-update-node-position');
var requestWorkflowHistory = require('../model/request-workflow-history');
var response = require('../model/response');
const crud = require('../crud/workflow');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');
const workflowCatalog = require('../crud/workflow-catalog');
const breadcrumb = require('../crud/breadcrumb');
const workflowTiming = require('../utils/workflow-timing');
const ownerProfiles = require('../crud/workflow-owner-profiles');
const { identifyFile } = require('../utils/workflow-chat-file');
const workflowChatRealtime = require('../utils/workflow-chat-realtime');
const workflowChatStorage = path.join(__dirname, '..', 'files', '.workflow-chat');
const workflowChatMaxFileSize = 10 * 1024 * 1024;

function parseWorkflowApplyUpload(req) {
    return new Promise((resolve, reject) => {
        const form = new formidable.IncomingForm({
            multiples: true,
            maxFiles: 5,
            maxFileSize: workflowChatMaxFileSize,
            maxTotalFileSize: 5 * workflowChatMaxFileSize,
            maxFields: 4,
            maxFieldsSize: 100000
        });
        form.parse(req, (error, fields, parsedFiles) => {
            const files = Object.values(parsedFiles || {}).flat().filter(Boolean);
            if (error) {
                error.uploadedFiles = files;
                reject(error);
                return;
            }
            const body = {};
            Object.keys(fields || {}).forEach(key => {
                body[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
            });
            resolve({ body, files });
        });
    });
}

function isPositiveInteger(value) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0;
}

function parseBoolean(value) {
    if (value === true || value === 1 || value === '1' || value === 'true') {
        return true;
    }
    if (value === false || value === 0 || value === '0' || value === 'false') {
        return false;
    }
    return null;
}

function sendCatalogError(res, error) {
    res.status(200).json(new response('ERR', null, error));
}

function getDescriptions(body) {
    const source = body && body.descriptions;
    if (!source || typeof source !== 'object') {
        return null;
    }
    const descriptions = {
        IT: String(source.IT || '').trim(),
        GB: String(source.GB || '').trim(),
        ES: String(source.ES || '').trim(),
        CN: String(source.CN || '').trim(),
        DE: String(source.DE || '').trim()
    };
    return Object.values(descriptions).some(Boolean) ? descriptions : null;
}

function toOptionalBoolean(value) {
    if (value === true || value === 'true' || value === 1 || value === '1') {
        return true;
    }
    if (value === false || value === 'false' || value === 0 || value === '0') {
        return false;
    }
    return null;
}

function getGraphTranslations(body) {
    if (!body || typeof body !== 'object') {
        return null;
    }
    const codes = {};
    const descriptions = {};
    for (const language of ['IT', 'GB', 'ES', 'CN']) {
        const code = body['Code_' + language];
        const description = body['Text_' + language];
        if ((code != null && typeof code !== 'string') ||
            (description != null && typeof description !== 'string')) {
            return null;
        }
        codes[language] = String(code || '').trim();
        descriptions[language] = String(description || '').trim();
        if (codes[language].length > 50 || descriptions[language].length > 4000) {
            return null;
        }
    }
    return { codes, descriptions };
}

workflow.get('/workflow-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controller/workflow.js');
    res.sendFile(filePath);
});
workflow.get('/control-workflow-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controls/ux/control.ux.workflow.js');
    res.sendFile(filePath);
});
workflow.get('/control-culture-textbox-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controls/ux/control.ux.culture.textbox.js');
    res.sendFile(filePath);
});
workflow.get('/control-workflow-node-states-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controls/ux/control.ux.workflow-node-states.js');
    res.sendFile(filePath);
});
workflow.get('/control-profili-utente-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controls/ux/control.ux.profili.utente.js');
    res.sendFile(filePath);
});
workflow.get('/control-gruppi-operativi-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controls/ux/control.ux.gruppi.operativi.js');
    res.sendFile(filePath);
});
workflow.get('/control-confirm-delete-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controls/ux/control.ux.confirm.delete.js');
    res.sendFile(filePath);
});
workflow.get('/control-workflow-history-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controls/ux/control.ux.workflow.history.js');
    res.sendFile(filePath);
});
workflow.get('/utility-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../utils/utility.js');
    res.sendFile(filePath);
});
workflow.get('/xlsx-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../node_modules/xlsx/dist/xlsx.full.min.js');
    res.sendFile(filePath);
});
workflow.get('/workflow', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    res.set('Access-Control-Allow-Origin', '*');
    breadcrumb.getBreadcrumbInfo(req.session.user.LanguageContext, 'workflow').then(function (info) {
        res.status(200).render('workflow-catalog', {
            user: req.session.user,
            processPath: info.processPath,
            processId: info.processId
        });
    }).catch(function (error) {
        res.status(500).send(error.message || 'Unable to load the Workflow page.');
    });
});
workflow.get('/workflow-editor', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    const versionId = req.query.versionId;
    if (versionId == null || versionId === '') {
        res.status(200).render('workflow', {
            user: req.session.user,
            versionId: null,
            editorTitle: 'Workflow'
        });
        return;
    }
    if (!isPositiveInteger(versionId)) {
        res.status(400).send('Invalid workflow version ID.');
        return;
    }
    workflowCatalog.getVersionEditorDetails(
        Number(versionId),
        req.session.user.IdAttore,
        req.session.user.LanguageContext
    ).then(function (version) {
        if (!version) {
            res.status(404).send('Workflow version not found.');
            return;
        }
        const versionLabel = {
            IT: 'Versione',
            GB: 'Version',
            ES: 'Versión',
            CN: '版本'
        }[req.session.user.LanguageContext] || 'Version';
        res.status(200).render('workflow', {
            user: req.session.user,
            versionId: version.IDVersioneWorkflow,
            processId: version.IDProcesso,
            editorTitle: (version.Description || 'Workflow') + ' (' + versionLabel + ' ' + version.Numero + ')'
        });
    }).catch(function (error) {
        res.status(500).send(error.message || 'Unable to load the Workflow editor.');
    });
});
workflow.get('/workflow-catalog-script', function (req, res) {
    const filePath = path.resolve(__dirname, '../controller/workflow-catalog.js');
    res.sendFile(filePath);
});
workflow.get('/workflow/api/records', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }

    const pageIndex = req.query.pageIndex == null ? 1 : Number(req.query.pageIndex);
    const pageSize = req.query.pageSize == null ? 20 : Number(req.query.pageSize);
    const search = String(req.query.search || '').trim();
    const visibility = req.query.visibility == null || req.query.visibility === ''
        ? null
        : parseBoolean(req.query.visibility);
    if (!Number.isSafeInteger(pageIndex) || pageIndex < 1 ||
        !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100 ||
        (pageIndex - 1) * pageSize > 2147483647 ||
        search.length > 1000 ||
        (req.query.visibility != null && req.query.visibility !== '' && visibility === null)) {
        sendCatalogError(res, { message: 'Invalid paging or filter parameters.' });
        return;
    }

    workflowCatalog.getRecords(
        req.session.user.IdAttore,
        pageIndex,
        pageSize,
        search,
        visibility,
        req.session.user.LanguageContext
    ).then(function (data) {
        res.status(200).json(new response('OK', data, null));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.get('/workflow/api/records/:IdWorkflow/versions', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    if (!isPositiveInteger(req.params.IdWorkflow)) {
        sendCatalogError(res, { message: 'Invalid workflow ID.' });
        return;
    }
    workflowCatalog.getVersions(Number(req.params.IdWorkflow)).then(function (data) {
        res.status(200).json(new response('OK', data, null));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.post('/workflow/api/records', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    const descriptions = getDescriptions(req.body);
    const isVisible = parseBoolean(req.body && req.body.isVisible);
    if (!descriptions || isVisible === null) {
        sendCatalogError(res, { message: 'At least one description and a valid visibility value are required.' });
        return;
    }
    workflowCatalog.createWorkflow(req.session.user.IdAttore, descriptions, isVisible).then(function (id) {
        res.status(200).json(new response('OK', { IDWorkflow: id }, null));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.put('/workflow/api/records/:IdWorkflow', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    const descriptions = getDescriptions(req.body);
    const isVisible = parseBoolean(req.body && req.body.isVisible);
    if (!isPositiveInteger(req.params.IdWorkflow) || !descriptions || isVisible === null) {
        sendCatalogError(res, { message: 'Invalid workflow data.' });
        return;
    }
    workflowCatalog.updateWorkflow(Number(req.params.IdWorkflow), descriptions, isVisible).then(function () {
        res.status(200).json(new response('OK', true, null));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.delete('/workflow/api/records/:IdWorkflow', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    if (!isPositiveInteger(req.params.IdWorkflow)) {
        sendCatalogError(res, { message: 'Invalid workflow ID.' });
        return;
    }
    workflowCatalog.deleteWorkflow(Number(req.params.IdWorkflow)).then(function () {
        res.status(200).json(new response('OK', true, null));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.post('/workflow/api/records/:IdWorkflow/versions', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    if (!isPositiveInteger(req.params.IdWorkflow)) {
        sendCatalogError(res, { message: 'Invalid workflow ID.' });
        return;
    }
    workflowCatalog.createVersion(Number(req.params.IdWorkflow)).then(function (id) {
        res.status(200).json(new response('OK', { IDVersioneWorkflow: id }, null));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.put('/workflow/api/versions/:IDVersioneWorkflow', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    const isVisible = parseBoolean(req.body && req.body.isVisible);
    if (!isPositiveInteger(req.params.IDVersioneWorkflow) || isVisible === null) {
        sendCatalogError(res, { message: 'Invalid workflow version data.' });
        return;
    }
    workflowCatalog.setVersionVisibility(Number(req.params.IDVersioneWorkflow), isVisible).then(function () {
        res.status(200).json(new response('OK', true, null));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.delete('/workflow/api/versions/:IDVersioneWorkflow', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    if (!isPositiveInteger(req.params.IDVersioneWorkflow)) {
        sendCatalogError(res, { message: 'Invalid workflow version ID.' });
        return;
    }
    workflowCatalog.deleteVersion(Number(req.params.IDVersioneWorkflow)).then(function () {
        res.status(200).json(new response('OK', true, null));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.get('/workflow/api/versions/:IDVersioneWorkflow/graph', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    if (!isPositiveInteger(req.params.IDVersioneWorkflow)) {
        sendCatalogError(res, { message: 'Invalid workflow version ID.' });
        return;
    }
    workflowCatalog.getVersionGraph(
        Number(req.params.IDVersioneWorkflow),
        req.session.user.IdAttore,
        req.session.user.LanguageContext
    ).then(function (graph) {
        res.status(200).json(new response('OK', graph, null));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.get('/workflow/api/versions/:IDVersioneWorkflow/visibility/processes/:IDProcessoParent?', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    const versionId = Number(req.params.IDVersioneWorkflow);
    const parentId = req.params.IDProcessoParent == null ? null : Number(req.params.IDProcessoParent);
    if (!isPositiveInteger(versionId) || (parentId !== null && !isPositiveInteger(parentId))) {
        sendCatalogError(res, { message: 'Parametri processo workflow non validi.' });
        return;
    }
    workflowCatalog.getVersionEditorDetails(
        versionId,
        req.session.user.IdAttore,
        req.session.user.LanguageContext
    ).then(function (version) {
        if (!version) {
            sendCatalogError(res, { message: 'Versione workflow non trovata o non autorizzata.' });
            return;
        }
        return workflowCatalog.getVisibilityProcesses(
            versionId,
            req.session.user.IdAttore,
            req.session.user.LanguageContext,
            parentId
        ).then(data => res.status(200).json(new response('OK', data, null)));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.get('/workflow/api/versions/:IDVersioneWorkflow/visibility/processes/:IDProcesso/classes', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    const versionId = Number(req.params.IDVersioneWorkflow);
    const processId = Number(req.params.IDProcesso);
    const nodeId = Number(req.query.nodeId);
    if (!isPositiveInteger(versionId) || !isPositiveInteger(processId) || !isPositiveInteger(nodeId)) {
        sendCatalogError(res, { message: 'Parametri form workflow non validi.' });
        return;
    }
    workflowCatalog.getVersionEditorDetails(
        versionId,
        req.session.user.IdAttore,
        req.session.user.LanguageContext
    ).then(function (version) {
        if (!version) {
            sendCatalogError(res, { message: 'Versione workflow non trovata o non autorizzata.' });
            return;
        }
        return workflowCatalog.getVisibilityClasses(
            versionId,
            req.session.user.IdAttore,
            processId,
            nodeId,
            req.session.user.LanguageContext
        ).then(data => res.status(200).json(new response('OK', data, null)));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.get('/workflow/api/versions/:IDVersioneWorkflow/visibility/processes/:IDProcesso/classes/:IDClasse/attributes', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    const versionId = Number(req.params.IDVersioneWorkflow);
    const processId = Number(req.params.IDProcesso);
    const classId = Number(req.params.IDClasse);
    const nodeId = Number(req.query.nodeId);
    const processActionId = Number(req.query.processActionId);
    const groupId = Number(req.query.groupId);
    const profileId = Number(req.query.profileId);
    if (![versionId, processId, classId, nodeId, processActionId, groupId, profileId].every(isPositiveInteger)) {
        sendCatalogError(res, { message: 'Parametri campo workflow non validi.' });
        return;
    }
    workflowCatalog.getVersionEditorDetails(
        versionId,
        req.session.user.IdAttore,
        req.session.user.LanguageContext
    ).then(function (version) {
        if (!version) {
            sendCatalogError(res, { message: 'Versione workflow non trovata o non autorizzata.' });
            return;
        }
        return workflowCatalog.getVisibilityAttributes(
            versionId,
            req.session.user.IdAttore,
            processId,
            nodeId,
            processActionId,
            groupId,
            profileId,
            classId,
            req.session.user.LanguageContext
        ).then(data => res.status(200).json(new response('OK', data, null)));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.put('/workflow/api/versions/:IDVersioneWorkflow/visibility/processes/:IDProcesso/attributes/:IDAttributo', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    const versionId = Number(req.params.IDVersioneWorkflow);
    const processId = Number(req.params.IDProcesso);
    const attributeId = Number(req.params.IDAttributo);
    const nodeId = Number(req.body.nodeId);
    const processActionId = Number(req.body.processActionId);
    const groupId = Number(req.body.groupId);
    const profileId = Number(req.body.profileId);
    const visible = parseBoolean(req.body.visible);
    if (![versionId, processId, attributeId, nodeId, processActionId, groupId, profileId].every(isPositiveInteger) ||
        visible === null) {
        sendCatalogError(res, { message: 'Parametri visibilità campo non validi.' });
        return;
    }
    workflowCatalog.getVersionEditorDetails(
        versionId,
        req.session.user.IdAttore,
        req.session.user.LanguageContext
    ).then(function (version) {
        if (!version) {
            sendCatalogError(res, { message: 'Versione workflow non trovata o non autorizzata.' });
            return;
        }
        return workflowCatalog.setVisibilityAttribute(
            versionId,
            req.session.user.IdAttore,
            processId,
            nodeId,
            processActionId,
            groupId,
            profileId,
            attributeId,
            visible
        ).then(data => res.status(200).json(new response('OK', data, null)));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.get('/workflow/api/versions/:IDVersioneWorkflow/states', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    if (!isPositiveInteger(req.params.IDVersioneWorkflow)) {
        sendCatalogError(res, { message: 'Invalid workflow version ID.' });
        return;
    }
    workflowCatalog.getVersionGraphStates(
        Number(req.params.IDVersioneWorkflow),
        req.session.user.IdAttore,
        req.session.user.LanguageContext
    ).then(function (states) {
        res.status(200).json(new response('OK', states, null));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
    workflow.get('/workflow/api/versions/:IDVersioneWorkflow/graph/nodes/:IDEventoTransizione/timing', function (req, res) {
        if (!sessionUtil.verifyUser(req, res)) return;
        if (!isPositiveInteger(req.params.IDVersioneWorkflow) || !isPositiveInteger(req.params.IDEventoTransizione)) {
            sendCatalogError(res, { message: 'Invalid workflow node ID.' });
            return;
        }
        workflowCatalog.getNodeTiming(Number(req.params.IDVersioneWorkflow), req.session.user.IdAttore,
            Number(req.params.IDEventoTransizione), req.session.user.LanguageContext)
            .then(function (data) { res.json(new response('OK', data, null)); })
            .catch(function (error) { sendCatalogError(res, error); });
    });
    workflow.put('/workflow/api/versions/:IDVersioneWorkflow/graph/nodes/:IDEventoTransizione/timing', function (req, res) {
        if (!sessionUtil.verifyUser(req, res)) return;
        if (!isPositiveInteger(req.params.IDVersioneWorkflow) || !isPositiveInteger(req.params.IDEventoTransizione)) {
            sendCatalogError(res, { message: 'Invalid workflow node ID.' });
            return;
        }
        let intervals;
        try {
            intervals = workflowTiming.parseTiming(req.body);
        } catch (error) {
            sendCatalogError(res, { message: error.message, sender: 'workflow-timing' });
            return;
        }
        workflowCatalog.saveNodeTiming(Number(req.params.IDVersioneWorkflow), req.session.user.IdAttore,
            Number(req.params.IDEventoTransizione), intervals)
            .then(function () { res.json(new response('OK', true, null)); })
            .catch(function (error) { sendCatalogError(res, error); });
    });
});
workflow.post('/workflow/api/versions/:IDVersioneWorkflow/graph/nodes', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    if (!isPositiveInteger(req.params.IDVersioneWorkflow)) {
        sendCatalogError(res, { message: 'Invalid workflow version ID.' });
        return;
    }
    workflowCatalog.createVersionGraphNode(
        Number(req.params.IDVersioneWorkflow),
        req.session.user.IdAttore
    ).then(function () {
        res.status(200).json(new response('OK', true, null));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.post('/workflow/api/versions/:IDVersioneWorkflow/graph/transitions', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    const startNodeId = req.body && Number(req.body.startNodeId);
    const endNodeId = req.body && Number(req.body.endNodeId);
    if (!isPositiveInteger(req.params.IDVersioneWorkflow) ||
        !Number.isSafeInteger(startNodeId) || startNodeId < 1 ||
        !Number.isSafeInteger(endNodeId) || endNodeId < 1) {
        sendCatalogError(res, { message: 'Invalid workflow link data.' });
        return;
    }
    workflowCatalog.createVersionGraphTransition(
        Number(req.params.IDVersioneWorkflow),
        req.session.user.IdAttore,
        startNodeId,
        endNodeId
    ).then(function () {
        res.status(200).json(new response('OK', true, null));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.put('/workflow/api/versions/:IDVersioneWorkflow/graph/nodes/:IDEventoTransizione', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    const translations = getGraphTranslations(req.body);
    if (!isPositiveInteger(req.params.IDVersioneWorkflow) ||
        !isPositiveInteger(req.params.IDEventoTransizione) || !translations) {
        sendCatalogError(res, { message: 'Invalid workflow node data.' });
        return;
    }
    workflowCatalog.updateVersionGraphNode(
        Number(req.params.IDVersioneWorkflow),
        req.session.user.IdAttore,
        Number(req.params.IDEventoTransizione),
        translations.codes,
        translations.descriptions
    ).then(function () {
        res.status(200).json(new response('OK', true, null));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.put('/workflow/api/versions/:IDVersioneWorkflow/graph/transitions/:IDEventoDirezione', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    const translations = getGraphTranslations(req.body);
    if (!isPositiveInteger(req.params.IDVersioneWorkflow) ||
        !isPositiveInteger(req.params.IDEventoDirezione) || !translations) {
        sendCatalogError(res, { message: 'Invalid workflow link data.' });
        return;
    }
    workflowCatalog.updateVersionGraphTransition(
        Number(req.params.IDVersioneWorkflow),
        req.session.user.IdAttore,
        Number(req.params.IDEventoDirezione),
        translations.codes,
        translations.descriptions,
        {
            isAvailableNote: toOptionalBoolean(req.body.IsAvailableNote),
            requiredConfirmation: toOptionalBoolean(req.body.RequiredConfirmation)
        }
    ).then(function () {
        res.status(200).json(new response('OK', true, null));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.put('/workflow/api/versions/:IDVersioneWorkflow/graph/nodes/:IDEventoTransizione/position', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    const x = req.body && Number(req.body.x);
    const y = req.body && Number(req.body.y);
    if (!isPositiveInteger(req.params.IDVersioneWorkflow) ||
        !isPositiveInteger(req.params.IDEventoTransizione) ||
        !Number.isFinite(x) || !Number.isFinite(y) ||
        Math.abs(x) > 100000 || Math.abs(y) > 100000) {
        sendCatalogError(res, { message: 'Invalid workflow node position.' });
        return;
    }
    workflowCatalog.updateVersionGraphNodePosition(
        Number(req.params.IDVersioneWorkflow),
        req.session.user.IdAttore,
        Number(req.params.IDEventoTransizione),
        x,
        y
    ).then(function () {
        res.status(200).json(new response('OK', true, null));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.delete('/workflow/api/versions/:IDVersioneWorkflow/graph/nodes/:IDEventoTransizione', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    if (!isPositiveInteger(req.params.IDVersioneWorkflow) ||
        !isPositiveInteger(req.params.IDEventoTransizione)) {
        sendCatalogError(res, { message: 'Invalid workflow node ID.' });
        return;
    }
    workflowCatalog.deleteVersionGraphNode(
        Number(req.params.IDVersioneWorkflow),
        req.session.user.IdAttore,
        Number(req.params.IDEventoTransizione)
    ).then(function () {
        res.status(200).json(new response('OK', true, null));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.delete('/workflow/api/versions/:IDVersioneWorkflow/graph/transitions/:IDEventoDirezione', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    if (!isPositiveInteger(req.params.IDVersioneWorkflow) ||
        !isPositiveInteger(req.params.IDEventoDirezione)) {
        sendCatalogError(res, { message: 'Invalid workflow link ID.' });
        return;
    }
    workflowCatalog.deleteVersionGraphTransition(
        Number(req.params.IDVersioneWorkflow),
        req.session.user.IdAttore,
        Number(req.params.IDEventoDirezione)
    ).then(function () {
        res.status(200).json(new response('OK', true, null));
    }).catch(function (error) {
        sendCatalogError(res, error);
    });
});
workflow.post('/workflow/:IdProcesso', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestWorkflow(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.IdProcesso,
            req.session.user.LanguageContext,
            null
        );
        crud.GetWorkflow(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.stringify(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
workflow.delete('/workflow-del-link/:IdEventoDirezione', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestWorkflowDelLink(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.IdEventoDirezione,
            req.session.user.LanguageContext,
        );
        crud.DeleteWorkflowDelLink(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.stringify(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
workflow.delete('/workflow-del-state/:IdEventoTransizione', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestWorkflowDelState(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.IdEventoTransizione,
            req.session.user.LanguageContext,
        );
        crud.DeleteWorkflowDelState(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.stringify(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
workflow.post('/workflow-new-node/:IdProcesso', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestWorkflowNewNode(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.IdProcesso,
            req.session.user.LanguageContext,
        );
        crud.PostWorkflowNewNode(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.stringify(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
workflow.post('/workflow-link-node', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestWorkflowLinkNode(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.body.IdTransizioneStart,
            req.body.IdTransizioneEnd,
            req.session.user.LanguageContext,
        );
        crud.PostWorkflowLinkNode(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.stringify(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
workflow.put('/workflow-update-node-position/:IdEventoTransizione', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestWorkflowUpdateNodePosition(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.IdEventoTransizione,
            req.body.XPos,
            req.body.YPos,
            req.session.user.LanguageContext,
        );
        crud.PutWorkflowUpdateNodePosition(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.stringify(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
workflow.post('/workflow-apply/:IdRecord', async function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) return;
    res.set('Access-Control-Allow-Origin', '*');
    let files = [];
    let savedPaths = [];
    let saveAttempted = false;
    try {
        const upload = req.is('multipart/form-data')
            ? await parseWorkflowApplyUpload(req)
            : { body: req.body || {}, files: [] };
        files = upload.files;
        const body = upload.body;
        const note = String(body.Note || '');
        if (note.length > 10000) throw new Error('Messaggio troppo lungo.');
        const postNoteAsMessage = body.PostNoteAsMessage === 'true';
        if (files.length && !postNoteAsMessage) throw new Error('Allegati non validi.');

        const attachments = [];
        if (files.length) await fs.promises.mkdir(workflowChatStorage, { recursive: true });
        for (const file of files) {
            const mime = await identifyFile(file, workflowChatMaxFileSize);
            const name = crypto.randomBytes(24).toString('hex');
            const target = path.join(workflowChatStorage, name);
            await fs.promises.copyFile(file.filepath, target, fs.constants.COPYFILE_EXCL);
            savedPaths.push(target);
            attachments.push({
                OriginalName: path.basename(file.originalFilename || 'allegato').slice(0, 255),
                StorageName: name,
                MimeType: mime,
                Size: file.size
            });
        }

        const myRequest = new requestWorkflowPost(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            body.IDProcesso,
            req.params.IdRecord,
            body.IDEventoDirezione,
            note,
            req.session.user.LanguageContext,
            body
        );
        myRequest.IdProfiloUtente = req.session.user.IDProfiloUtenteDefault || 0;
        myRequest.IdGruppoOperativo = req.session.user.IdGruppoOperativoDefault || 0;
        myRequest.PostNoteAsMessage = postNoteAsMessage;
        myRequest.Attachments = attachments;
        saveAttempted = true;
        const result = await crud.PostWorkflow(myRequest);
        savedPaths.length = 0;
        if (result.messageCreated) {
            const accounts = new Set(result.notificationAccounts || []);
            accounts.add(Number(req.session.user.IdAccount));
            accounts.forEach(account => workflowChatRealtime.publish(account, 'new_chat_notification', {})
                .catch(error => console.error('[workflow-apply] realtime', error)));
        }
        res.status(200).json(new response('OK', 'OK', null));
    } catch (error) {
        if (error.uploadedFiles) files = error.uploadedFiles;
        if (saveAttempted && !error.transactionRolledBack && error.code !== 'EREQUEST') {
            console.error('[workflow-apply] Esito SQL incerto: allegati conservati per verifica.', savedPaths);
            savedPaths = [];
        }
        res.status(200).json(new response('ERR', null, error));
    } finally {
        for (const file of files) {
            try { await fs.promises.unlink(file.filepath); }
            catch (error) { console.error('[workflow-apply] cleanup', error); }
        }
        for (const file of savedPaths) {
            try { await fs.promises.unlink(file); }
            catch (error) { console.error('[workflow-apply] cleanup', error); }
        }
    }
});
workflow.post('/workflow-action/:IdRecord', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestWorkflowActions(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.body.IdProcesso,
            req.params.IdRecord,
            req.body.IdProfiloUtente,
            req.session.user.LanguageContext,            
            req.body
        );
        crud.GetWorkflowActions(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
workflow.post('/workflow-transitions/:IdRecord', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestWorkflowActions(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.body.IdProcesso,
            req.params.IdRecord,
            req.body.IdProfiloUtente,
            req.session.user.LanguageContext,            
            req.body
        );
        crud.GetWorkflowTransitions(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
workflow.get('/workflow-node-owner/:IdEventoTransizione', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestWorkflowNodeOwner(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.IdEventoTransizione,
            req.session.user.LanguageContext
        );
        crud.GetWorkflowNodeOwner(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
workflow.all('/workflow-node-owner/:node/profiles', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) return;
    const body = req.body || {};
    const operation = req.method === 'GET' ? 'read' : body.operation;
    const profile = req.method === 'GET' ? req.query.profile : body.profile;
    const group = req.method === 'GET' ? req.query.group : body.group;
    const direction = body.direction;
    const enabled = parseBoolean(body.enabled);
    if (!['GET', 'POST'].includes(req.method) || !isPositiveInteger(req.params.node) ||
        !['read', 'profile', 'direction', 'all', 'clear'].includes(operation) ||
        (operation !== 'read' && req.method !== 'POST') ||
        (operation !== 'clear' && operation !== 'read' && !isPositiveInteger(profile)) ||
        (profile && !isPositiveInteger(profile)) ||
        (profile && !isPositiveInteger(group)) ||
        (operation === 'direction' && !isPositiveInteger(direction)) ||
        (['profile', 'direction', 'all'].includes(operation) && enabled === null)) {
        return sendCatalogError(res, { message: 'Parametri profilo workflow non validi.' });
    }
    ownerProfiles.execute(Number(req.params.node), Number(req.session.user.IdAttore),
        profile ? Number(profile) : null, group ? Number(group) : null, req.session.user.LanguageContext,
        operation, enabled, direction ? Number(direction) : null)
        .then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => sendCatalogError(res, { message: error.message, sender: 'workflow-owner-profiles' }));
});
workflow.post('/workflow-node-owner/:IdEventoTransizione', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestWorkflowNodeOwner(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.IdEventoTransizione,
            req.session.user.LanguageContext,
            req.body
        );
        crud.PostWorkflowNodeOwner(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
workflow.post('/workflow-node-link/:IdEventoDirezione', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestWorkflowNodeLink(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.session.user.LanguageContext,
            req.params.IdEventoDirezione,
            req.body.Code_IT,
            req.body.Code_GB,
            req.body.Code_ES,
            req.body.Code_CN,
            req.body.Text_IT,
            req.body.Text_GB,
            req.body.Text_ES,
            req.body.Text_CN,
            req.body.IsAvailableNote,
            req.body.RequiredConfirmation
        );
        crud.PostWorkflowNodeLink(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
workflow.put('/workflow-node-set/:IdEventoTransizione', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestWorkflowNodeState(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.session.user.LanguageContext,
            req.params.IdEventoTransizione,
            req.body.Code_IT,
            req.body.Code_GB,
            req.body.Code_ES,
            req.body.Code_CN,
            req.body.Text_IT,
            req.body.Text_GB,
            req.body.Text_ES,
            req.body.Text_CN
        );
        crud.PutWorkflowNodeState(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
workflow.get('/workflow-node-states/:IdProcesso', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestWorkflow(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.IdProcesso,
            req.session.user.LanguageContext
        );
        crud.GetWorkflowNodeStates(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {
        });
    }
});
workflow.get('/workflow-transitions/:IdProcesso', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestWorkflowTransitions(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.IdProcesso,
            req.session.user.LanguageContext,            
            req.body
        );
        crud.GetWorkflowTransitionsByIdProcesso(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
workflow.post('/workflow-has-transitions/:IdRecord', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestWorkflowActions(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.body.IdProcesso,
            req.params.IdRecord,
            req.body.IdProfiloUtente,
            req.session.user.LanguageContext,
            req.body
        );
        crud.GetHasWorkflowTransitions(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
workflow.post('/workflow-history/:IdRecord', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestWorkflowHistory(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.body.IdProcesso,
            req.params.IdRecord,
            req.session.user.LanguageContext,
            req.body
        );
        crud.GetWorkflowHistory(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});


module.exports = workflow;