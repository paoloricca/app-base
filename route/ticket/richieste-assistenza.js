const express = require('express');
const RichiesteAssistenza = express.Router();
const bodyParser = require('body-parser');
var requestRichiesteAssistenza = require('../../model/ticket/request-richieste-assistenza.js');
var postRichiestaAssistenza = require('../../model/ticket/post-richiesta-assistenza');
var deleteRichiestaAssistenza = require('../../model/ticket/delete-richiesta-assistenza');
var response = require('../../model/response');
const crud = require('../../crud/ticket/richiesta-assistenza');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../../utils/session')
const session = require('express-session');

RichiesteAssistenza.get('/richiesta-assistenza-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../../controller/ticket/richiesta-assistenza.js');
    res.sendFile(filePath);
});
RichiesteAssistenza.get('/control-processi-action-button-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../../controls/ux/control.ux.action.button.js');
    res.sendFile(filePath);
});
RichiesteAssistenza.get('/control-processi-filter-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../../controls/ux/control.ux.processi.filter.js');
    res.sendFile(filePath);
});
RichiesteAssistenza.get('/utility-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../../utils/utility.js');
    res.sendFile(filePath);
});
RichiesteAssistenza.get('/richieste-assistenza', function (req, res) {
    var internetAvailable = require("internet-available");
    res.set('Access-Control-Allow-Origin', '*');
    if (sessionUtil.verifyUser(req, res)) {
        internetAvailable().then(function (conn) {
            res.status(200).render('richieste-assistenza', {
                user: req.session.user,
                checkConn: true,
            });
        }).catch(function () {
            res.status(200).render('richieste-assistenza', {
                user: req.session.user,
                checkConn: false,
            });
        });
    }
});
RichiesteAssistenza.post('/richieste-assistenza/richieste', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        var myRequest = new requestRichiesteAssistenza(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.session.user.LanguageContext,
            req.body.pageIndex,
            req.body.pageSize,
            req.body.filter,
            req.body.IdWorkedOn,
            req.body
        );
        crud.GetRichiesteAssistenza(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.stringify(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
RichiesteAssistenza.post('/richiesta-assistenza/:IDModelloIstanza', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        /* IDProcesso = 76 ==> Gestione Richieste Assistenza */
        var myRequest = new postRichiestaAssistenza(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.IDModelloIstanza,
            76,
            req.session.user.LanguageContext,
            req.body.pageIndex,
            req.body.pageSize,
            req.body
        );

        crud.PostRichiestaAssistenza(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.stringify(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
RichiesteAssistenza.delete('/richiesta-assistenza/:IDRecord', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        var myRequest = new deleteRichiestaAssistenza(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.body.IDModelloIstanza,
            req.body.IDProcesso,
            req.params.IDRecord,
            req.session.user.LanguageContext,
            req.body
        );

        crud.DeleteRichiestaAssistenza(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.stringify(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
module.exports = RichiesteAssistenza;