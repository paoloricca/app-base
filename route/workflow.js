const express = require('express');
const workflow = express.Router();
const bodyParser = require('body-parser');
//var requestIdModelloIstanzaRecordValue = require('../model/request-idmodello-istanza-record-value');
//var requestIdModelloIstanzaRecordMedia = require('../model/request-idmodello-istanza-record-media');
//var requestIdModelloIstanzaRecord = require('../model/request-idmodello-istanza-record');
//var requestIdModelloIstanza = require('../model/request-idmodello-istanza');
var requestWorkflowActions = require('../model/request-workflow-actions');
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
workflow.get('/control-workflow-history-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controls/ux/control.ux.workflow.history.js');
    res.sendFile(filePath);
});
workflow.get('/utility-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../utils/utility.js');
    res.sendFile(filePath);
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