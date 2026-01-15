const express = require('express');
const gruppiOperativi = express.Router();
const bodyParser = require('body-parser');
var request = require('../model/request-gruppi-operativi');
var response = require('../model/response');
const crud = require('../crud/gruppi-operativi');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');

gruppiOperativi.get('/gruppi-operativi-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controller/gruppi-operativi.js');
    res.sendFile(filePath);
});
gruppiOperativi.get('/utility-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../utils/utility.js');
    res.sendFile(filePath);
});
gruppiOperativi.get('/control-utenti-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controls/ux/control.ux.utenti.js');
    res.sendFile(filePath);
});
gruppiOperativi.get('/control-processi-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controls/ux/control.ux.processi.js');
    res.sendFile(filePath);
});
gruppiOperativi.get('/control-processi-azioni-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controls/ux/control.ux.processi.azioni.js');
    res.sendFile(filePath);
});
gruppiOperativi.get('/control-pager-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controls/ux/control.ux.pager.js');
    res.sendFile(filePath);
});
gruppiOperativi.get('/attore-risorse', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new request(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.idgruppooperativo,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
        );
        crud.GetAttoreRisorse(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {
        });
    }
});
gruppiOperativi.get('/gruppo-operativo/:idgruppooperativo', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        var myRequest = new request(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.idgruppooperativo,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
        );
        crud.GetGruppoOperativo(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
gruppiOperativi.put('/gruppo-operativo/:idgruppooperativo', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new request(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.idgruppooperativo,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
            req.body
        );
        crud.PutGruppoOperativo(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
gruppiOperativi.post('/gruppo-operativo', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new request(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.idgruppooperativo,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
            req.body
        );
        crud.PostGruppoOperativo(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
gruppiOperativi.delete('/gruppo-operativo/:idgruppooperativo', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new request(
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
gruppiOperativi.get('/gruppi-operativi', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {

        res.set('Access-Control-Allow-Origin', '*');

        req.session.user.OffsetRows = 0;
        req.session.save();

        var myRequest = new request(
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
                IdGruppoOperativoParent: null,
            });
        }).catch(err => {
            console.log('Errors: ' + err)
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {
        })
    }
});
gruppiOperativi.get('/gruppi-operativi/:idgruppooperativo', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        req.session.user.OffsetRows = 0;
        req.session.save();

        var myRequest = new request(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.idgruppooperativo,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
        );
        var data;
        var root;
        crud.GetGruppiOperativi(myRequest).then(listOf => {
            data = listOf;
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {
            crud.GetGruppiOperativiRoot(myRequest).then(listOf => {
                root = listOf;
            }).catch(err => {
                res.status(200).json(new response('ERR', null, err));
            }).finally(() => {
                res.status(200).render('gruppi-operativi', {
                    user: req.session.user,
                    root: JSON.parse(root),
                    data: JSON.parse(data),
                    IdGruppoOperativoParent: req.params.idgruppooperativo
                });
            });
        });
    }
});
gruppiOperativi.post('/gruppi-operativi', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        req.session.user.OffsetRows = req.session.user.OffsetRows + req.session.user.NextRows;
        req.session.save();

        var myRequest = new request(
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

module.exports = gruppiOperativi;