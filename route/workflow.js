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
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        req.session.user.OffsetRows = 0;
        req.session.save();
        res.status(200).render('workflow', {
            user: req.session.user,
            //data: JSON.parse(listOf),
        });
    }
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