const express = require('express');
const profiliUtente = express.Router();
const bodyParser = require('body-parser');
var requestProfiliUtenteRisorse = require('../model/request-profili-utente-risorse');
var requestProfiliUtente = require('../model/request-profili-utente');
var requestProfiloUtente = require('../model/request-profilo-utente');
var response = require('../model/response');
const crud = require('../crud/profili-utente');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');

profiliUtente.get('/profili-utente/:idgruppooperativo', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        //req.session.user.OffsetRows = 0;
        //req.session.save();
        var myRequest = new requestProfiliUtente(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.idgruppooperativo,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
        );
        crud.GetProfiliUtente(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
profiliUtente.get('/profilo-utente/:idprofiloutente', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestProfiloUtente(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.idprofiloutente,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
        );
        crud.GetProfiloUtente(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
profiliUtente.put('/profilo-utente/:idprofiloutente', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestProfiloUtente(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.idprofiloutente,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
            req.body
        );
        crud.PutProfiloUtente(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
profiliUtente.post('/profilo-utente', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestProfiliUtente(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.body.ProfiloUtenteIDGruppoOperativo,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
            req.body
        );
        crud.PostProfiloUtente(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
profiliUtente.delete('/profilo-utente/:idprofiloutente', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestProfiloUtente(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.idprofiloutente,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
            req.body
        );
        crud.DeleteProfiloUtente(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
profiliUtente.post('/profili-utente-risorse-list/:idprofiloutente', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        //console.log(req.body.pageIndex);
        //console.log(req.body.pageSize);

        var myRequest = new requestProfiliUtenteRisorse(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            null,
            req.params.idprofiloutente,
            null,
            req.session.user.LanguageContext,
            req.body.pageIndex,
            req.body.pageSize,
        );
        crud.PostProfiliUtenteRisorseList(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        });
    }
});
profiliUtente.post('/profili-utente-risorse/:idaccount', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestProfiliUtenteRisorse(
            req.session.user.IdAttore,
            req.params.idaccount,
            req.body.IDGruppoOperativo,
            req.body.IDProfiloUtente,
            null,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
        );
        crud.PostProfiloUtenteRisorsa(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
profiliUtente.delete('/profili-utente-risorse/:idaccount', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestProfiliUtenteRisorse(
            req.session.user.IdAttore,
            req.params.idaccount,
            req.body.IDGruppoOperativo,
            req.body.IDProfiloUtente,
            null,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
        );
        crud.DeleteProfiloUtenteRisorsa(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
profiliUtente.post('/profili-utente-set-dafault/:idaccount', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestProfiliUtenteRisorse(
            req.session.user.IdAttore,
            req.params.idaccount,
            req.body.IDGruppoOperativo,
            req.body.IDProfiloUtente,
            req.body.IsDefault,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
        );
        crud.PostProfiloUtenteSetDafault(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});

module.exports = profiliUtente;