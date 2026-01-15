const express = require('express');
const model = express.Router();
const bodyParser = require('body-parser');
var requestIdModelloIstanzaRecordValue = require('../model/request-idmodello-istanza-record-value');
var requestIdModelloIstanzaRecordMedia = require('../model/request-idmodello-istanza-record-media');
var requestIdModelloIstanzaRecord = require('../model/request-idmodello-istanza-record');
var requestIdModelloIstanza = require('../model/request-idmodello-istanza');
var requestModel = require('../model/request-model');
var response = require('../model/response');
const crud = require('../crud/model');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');

model.get('/model-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controller/model.js');
    res.sendFile(filePath);
});
model.get('/control-model-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controls/ux/control.ux.model.js');
    res.sendFile(filePath);
});
model.get('/utility-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../utils/utility.js');
    res.sendFile(filePath);
});
model.get('/model-class/:idversione', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestModel(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.idversione,
            null,
            null,
            req.session.user.LanguageContext,
            req.body
        );
        crud.GetModelClass(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
model.get('/model-class-attribute/:idclasse', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestModel(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            null,
            req.params.idclasse,
            null,
            req.session.user.LanguageContext,
            req.body
        );
        crud.GetModelClassAttribute(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
model.get('/model-class-attribute-values/:idattributo', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestModel(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            null,
            null,
            req.params.idattributo,
            req.session.user.LanguageContext,
            req.body
        );
        crud.GetModelClassAttributeValues(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
model.post('/post-idmodello-istanza', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestIdModelloIstanza(
            req.body.IDCliente,
            req.body.IDVersione,
            req.session.user.IdAccount,
            req.session.user.LanguageContext,
        );
        crud.PostIdModelloIstanza(myRequest).then(IdModelloIstanza => {
            res.status(200).json(IdModelloIstanza);
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
model.post('/post-idmodello-istanza-record', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestIdModelloIstanzaRecordValue(
            req.body.IdRecord,
            req.body.IdAttributo,
            req.session.user.IdAccount,
            req.body.RecordValue,
            req.session.user.LanguageContext,
        );
        crud.PostIdModelloIstanzaRecord(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
model.post('/post-idmodello-istanza-record-media', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestIdModelloIstanzaRecordMedia(
            req.body.IdRecord,
            req.body.IdAttributo,
            req.session.user.IdAccount,
            req.body.originalFilename,
            req.body.newFilename,
            req.body.mimetype,
            req.session.user.LanguageContext,
        );
        crud.PostIdModelloIstanzaRecordMedia(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
model.delete('/delete-idmodello-istanza-record-media', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestIdModelloIstanzaRecordMedia(
            null,
            null,
            req.session.user.IdAccount,
            null,
            req.body.filetodelete,
            null,
            req.session.user.LanguageContext,
        );
        crud.DeleteIdModelloIstanzaRecordMedia(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});

model.post('/get-idmodello-istanza-record', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestIdModelloIstanzaRecord(
            req.body.IDModelloIstanza,
            req.body.IDClasse,
            req.session.user.IdAccount,
            req.session.user.LanguageContext,
        );
        crud.GetIdModelloIstanzaRecord(myRequest).then(IdRecord => {
            res.status(200).json(IdRecord);
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
model.post('/get-idmodello-istanza-record-value', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestIdModelloIstanzaRecordValue(
            req.body.IdRecord,
            req.body.IdAttributo,
        );
        crud.GetIdModelloIstanzaRecordValue(myRequest).then(RecordValue => {
            res.status(200).send(RecordValue);
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});

module.exports = model;