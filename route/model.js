const express = require('express');
const model = express.Router();
const bodyParser = require('body-parser');
var requestIdModelloIstanzaRecordMedia = require('../model/request-idmodello-istanza-record-media');
var requestIdModelloIstanzaRecord = require('../model/request-idmodello-istanza-record');
var requestIdModelloIstanza = require('../model/request-idmodello-istanza');
var requestBase = require('../model/request-base');
var requestModel = require('../model/request-model');
var response = require('../model/response');
const crud = require('../crud/model');
const dynamicFormsCrud = require('../crud/dynamic-forms');
const calculatedFields = require('../crud/forms/calculated-fields');
const calculatedText = require('../crud/forms/calculated-text');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');

function isPositiveInteger(value) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0;
}

function calculatedTextOptions(req, res, saving) {
    const data = saving ? req.body : req.query;
    if (!isPositiveInteger(data.versionId) ||
        (data.processId && !isPositiveInteger(data.processId)) ||
        (data.instanceId && !isPositiveInteger(data.instanceId)) ||
        (saving && (!isPositiveInteger(data.instanceId) ||
            !isPositiveInteger(data.classId) || !isPositiveInteger(data.recordId)))) {
        res.status(200).json(new response('ERR', null, { message: 'Invalid calculation parameters.' }));
        return null;
    }
    return {
        versionId: data.versionId, processId: data.processId, instanceId: data.instanceId,
        classId: data.classId, recordId: data.recordId,
        actorId: req.session.user.IdAttore, accountId: req.session.user.IdAccount,
        profileId: req.session.user.IDProfiloUtenteDefault,
        groupId: req.session.user.IdGruppoOperativoDefault,
        language: req.session.user.LanguageContext
    };
}

model.get('/calculated-text/context', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) return;
    const options = calculatedTextOptions(req, res, false);
    if (!options) return;
    calculatedText.preview(options).then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => res.status(200).json(new response('ERR', null, { message: error.message })));
});

model.get('/calculated-date/context', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) return;
    const options = calculatedTextOptions(req, res, false);
    if (!options) return;
    calculatedText.previewDate(options).then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => res.status(200).json(new response('ERR', null, { message: error.message })));
});

model.post('/calculated-text/save', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) return;
    const options = calculatedTextOptions(req, res, true);
    if (!options) return;
    try {
        options.fields = JSON.parse(req.body.fields || '[]');
        if (!Array.isArray(options.fields)) throw new Error('Invalid section values.');
    } catch (error) {
        res.status(200).json(new response('ERR', null, { message: 'Invalid section values.' }));
        return;
    }
    calculatedText.save(options).then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => res.status(200).json(new response('ERR', null, { message: error.message })));
});

model.get('/model-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controller/model.js');
    res.sendFile(filePath);
});
model.get('/control-model-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controls/ux/control.ux.model.js');
    res.sendFile(filePath);
});
model.get('/calculated-fields-script', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../controls/ux/calculated-fields.js'));
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
model.get('/tipo-dati', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestBase(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.session.user.LanguageContext,
        );
        crud.GetTipoDati(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.stringify(listOf), null)
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
        crud.GetModelClassAttribute(myRequest)
            .then(listOf => calculatedFields.attachConditions(JSON.parse(listOf)))
            .then(listOf => {
                res.status(200).json(
                    new response('OK', listOf, null)
                );
            }).catch(err => {
                res.status(200).json(new response('ERR', null,
                    err instanceof Error ? { message: err.message } : err));
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
model.get('/model-class-attribute-value-profili/:idvalue', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }

    res.set('Access-Control-Allow-Origin', '*');
    var rawValueId = String(req.params.idvalue || '');
    var IDValue = Number(rawValueId);
    if (!/^[1-9]\d*$/.test(rawValueId) || !Number.isSafeInteger(IDValue)) {
        return res.status(200).json(new response('ERR', null, { message: 'IDValue non valido' }));
    }

    crud.GetModelClassAttributeValueProfili(
        req.session.user.IdAttore,
        IDValue,
        req.session.user.LanguageContext
    ).then(profiles => {
        res.status(200).json(new response('OK', profiles, null));
    }).catch(err => {
        res.status(200).json(new response('ERR', null, err));
    });
});
model.post('/model-class-attribute-value-profili/:idvalue', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }

    res.set('Access-Control-Allow-Origin', '*');
    var rawValueId = String(req.params.idvalue || '');
    var IDValue = Number(rawValueId);
    var IDGruppoOperativo = Number(req.body.IDGruppoOperativo);
    var IDProfiloUtente = Number(req.body.IDProfiloUtente);
    var enabledValue = req.body.Enabled;
    var validEnabled = enabledValue === true || enabledValue === false ||
        enabledValue === 'true' || enabledValue === 'false';
    if (!/^[1-9]\d*$/.test(rawValueId) || !Number.isSafeInteger(IDValue) ||
        !Number.isSafeInteger(IDGruppoOperativo) || IDGruppoOperativo <= 0 ||
        !Number.isSafeInteger(IDProfiloUtente) || IDProfiloUtente <= 0 || !validEnabled) {
        return res.status(200).json(new response('ERR', null, { message: 'Configurazione profilo non valida' }));
    }

    crud.PostModelClassAttributeValueProfilo(
        req.session.user.IdAttore,
        IDValue,
        IDGruppoOperativo,
        IDProfiloUtente,
        enabledValue === true || enabledValue === 'true',
        req.session.user.LanguageContext
    ).then(() => {
        res.status(200).json(new response('OK', null, null));
    }).catch(err => {
        res.status(200).json(new response('ERR', null, err));
    });
});
model.post('/post-class', function (req, res) {

    if (sessionUtil.verifyUser(req, res)) {

        res.set('Access-Control-Allow-Origin', '*');

        var myRequest = new requestBase(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.session.user.LanguageContext,
            req.body
        );

        crud.PostClass(myRequest).then(listOf => {
            res.status(200).json(listOf);
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
model.delete('/del-class/:IDClasse', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestBase(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.session.user.LanguageContext,
            req.params.IDClasse
        );
        crud.DeleteClass(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.stringify(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
model.delete('/del-attribute/:IDAttributo', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestBase(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.session.user.LanguageContext,
            req.params.IDAttributo
        );
        crud.DeleteAttribute(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.stringify(listOf), null)
            );
        }).catch(err => {
            if (err && err.message === 'ATTRIBUTE_IN_USE') {
                var messagesByLanguage = {
                    IT: 'Impossibile eliminare il campo: è utilizzato da valori, allegati, condizioni o dati già registrati.',
                    GB: 'The field cannot be deleted because it is used by values, attachments, conditions or already registered data.',
                    ES: 'No se puede eliminar el campo porque está siendo utilizado por valores, archivos adjuntos, condiciones o datos ya registrados.',
                    CN: '无法删除该字段：它已被值、附件、条件或已登记的数据使用。'
                };
                err = {
                    sender: err.sender,
                    message: messagesByLanguage[req.session.user.LanguageContext] || messagesByLanguage.IT
                };
            }
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
model.post('/post-attribute', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        var myRequest = new requestBase(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.session.user.LanguageContext,
            req.body
        );
        crud.PostAttribute(myRequest).then(listOf => {
            res.status(200).json(listOf);
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
        calculatedText.saveRegularValue({
            recordId: req.body.IdRecord, fieldId: req.body.IdAttributo,
            actorId: req.session.user.IdAttore, accountId: req.session.user.IdAccount, value: req.body.RecordValue,
            language: req.session.user.LanguageContext
        }).then(() => {
            res.status(200).json(new response('OK', 'OK', null));
        }).catch(err => {
            res.status(200).json(new response('ERR', null, { message: err.message }));
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
model.get('/class-records/:IDModelloIstanza/:IDClasse', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    if (!isPositiveInteger(req.params.IDModelloIstanza) ||
        !isPositiveInteger(req.params.IDClasse)) {
        res.status(200).json(new response('ERR', null, { message: 'Invalid instance or class ID.' }));
        return;
    }
    dynamicFormsCrud.getInstanceClassRecords(
        req.params.IDModelloIstanza,
        req.params.IDClasse,
        req.session.user.IdAttore,
        req.session.user.IdAccount
    ).then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => res.status(200).json(new response('ERR', null, error)));
});
model.post('/class-records', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    if (!isPositiveInteger(req.body.IDModelloIstanza) ||
        !isPositiveInteger(req.body.IDClasse)) {
        res.status(200).json(new response('ERR', null, { message: 'Invalid instance or class ID.' }));
        return;
    }
    dynamicFormsCrud.createInstanceClassRecord(
        req.body.IDModelloIstanza,
        req.body.IDClasse,
        req.session.user.IdAttore,
        req.session.user.IdAccount
    ).then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => res.status(200).json(new response('ERR', null, error)));
});
model.delete('/class-records/:IDRecord', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    if (!isPositiveInteger(req.params.IDRecord) || !isPositiveInteger(req.body.IDClasse)) {
        res.status(200).json(new response('ERR', null, { message: 'Invalid class or record ID.' }));
        return;
    }
    dynamicFormsCrud.deleteInstanceClassRecord(
        req.params.IDRecord,
        req.body.IDClasse,
        req.session.user.IdAttore,
        req.session.user.IdAccount
    ).then(() => res.status(200).json(new response('OK', null, null)))
        .catch(error => res.status(200).json(new response('ERR', null, error)));
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