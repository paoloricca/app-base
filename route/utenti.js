const express = require('express');
const utenti = express.Router();
const bodyParser = require('body-parser');
var requestUtenti = require('../model/request-utenti');
var response = require('../model/response');
const crud = require('../crud/utenti');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');

utenti.get('/utenti', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        var myRequest = new requestUtenti(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            null,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
            req.body
        );
        crud.GetUtenti(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
utenti.post('/utenti/profilo-utente/:idprofiloutente', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        var myRequest = new requestUtenti(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.idprofiloutente,
            req.session.user.LanguageContext,
            req.body.pageIndex,
            req.body.pageSize,
            req.body
        );
        console.log(JSON.stringify(myRequest));
        crud.GetUtentiProfiloUtente(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});

module.exports = utenti;