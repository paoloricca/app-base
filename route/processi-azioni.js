const express = require('express');
const processiAzioni = express.Router();
const bodyParser = require('body-parser');
var requestProcessiAzioni = require('../model/request-processi-azioni');
var response = require('../model/response');
const crud = require('../crud/processi-azioni');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');

processiAzioni.post('/processiazioni/:idprocesso', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestProcessiAzioni(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.idprocesso,
            req.body.IdProfiloUtente,
            null,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
            req.body
        );
        crud.PostProcessiAzioni(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
processiAzioni.post('/processiazioniprimary', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestProcessiAzioni(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.body.IdProcesso,
            req.body.IdProfiloUtente,
            req.body.ActionName,
            req.body.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
            req.body
        );
        crud.PostProcessiAzioniPrimary(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});

module.exports = processiAzioni;