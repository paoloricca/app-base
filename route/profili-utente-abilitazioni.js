const express = require('express');
const profiliutenteabilitazioni = express.Router();
const bodyParser = require('body-parser');
var requestProfiliUtenteAbilitazioni = require('../model/request-profili-utente-abilitazioni');
var response = require('../model/response');
const crud = require('../crud/profili-utente-abilitazioni');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');

profiliutenteabilitazioni.post('/profiliutenteabilitazioni', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestProfiliUtenteAbilitazioni(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.body.IdGruppoOperativo,
            req.body.IdProfiloUtente,
            req.body.IdProcesso,
            req.body.IdProcessoAzione,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
            req.body
        );
        crud.PostProfiliUtenteAbilitazioni(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
profiliutenteabilitazioni.delete('/profiliutenteabilitazioni', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestProfiliUtenteAbilitazioni(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.body.IdGruppoOperativo,
            req.body.IdProfiloUtente,
            req.body.IdProcesso,
            req.body.IdProcessoAzione,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
            req.body
        );
        crud.DeleteProfiliUtenteAbilitazioni(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
module.exports = profiliutenteabilitazioni;