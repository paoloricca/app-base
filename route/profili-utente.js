const express = require('express');
const profiliUtente = express.Router();
const bodyParser = require('body-parser');
var requestProfiliUtente = require('../model/request-profili-utente');
var requestProfiloUtente = require('../model/request-profilo-utente');
var response = require('../model/response');
const crud = require('../crud/profili-utente');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');

//gruppiOperativi.get('/gruppi-operativi-script', (req, res) => {
//    const filePath = path.resolve(__dirname, '../controller/gruppi-operativi.js');
//    res.sendFile(filePath);
//});
//gruppiOperativi.get('/utility-script', (req, res) => {
//    const filePath = path.resolve(__dirname, '../utils/utility.js');
//    res.sendFile(filePath);
//});
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
profiliUtente.delete('/gruppo-operativo/:idgruppooperativo', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestProfiliUtente(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.idgruppooperativo,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
            req.body
        );
        crud.DeleteGruppoOperativo(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});


profiliUtente.get('/gruppi-operativi', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        req.session.user.OffsetRows = 0;
        req.session.save();

        var myRequest = new requestProfiliUtente(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            null,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
        );
        crud.GetGruppiOperativi(myRequest).then(listOf => {
            res.status(200).render('gruppi-operativi', {
                user: req.session.user,
                root: {},
                data: JSON.parse(listOf),
                IdGruppoOperativoParent: null
            });
        }).catch(err => {
            console.log('Errors: ' + err)
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {
        })
    }
});
profiliUtente.post('/gruppi-operativi', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        req.session.user.OffsetRows = req.session.user.OffsetRows + req.session.user.NextRows;
        req.session.save();

        var myRequest = new requestProfiliUtente(
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
        );

        crud.GetGruppiOperativi(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );

        }).catch(err => {
            console.log('Errors: ' + err)
            res.status(200).json(new response('ERR', null, err));

        }).finally(() => {
        })
    }
});

module.exports = profiliUtente;