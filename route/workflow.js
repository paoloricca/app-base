const express = require('express');
const workflow = express.Router();
const bodyParser = require('body-parser');
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
workflow.get('/workflow', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    res.set('Access-Control-Allow-Origin', '*');
    workflowCatalog.getBreadcrumb(req.session.user.LanguageContext).then(function (processPath) {
        res.status(200).render('workflow-catalog', {
            user: req.session.user,
            processPath: processPath
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
        translations.descriptions
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
workflow.post('/workflow-apply/:IdRecord', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestWorkflowPost(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.body.IDProcesso,
            req.params.IdRecord,
            req.body.IDEventoDirezione,
            req.body.Note,
            req.session.user.LanguageContext,            
            req.body
        );
        crud.PostWorkflow(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
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