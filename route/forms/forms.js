const express = require('express');
const forms = express.Router();
const bodyParser = require('body-parser');
var requestForms = require('../../model/forms/request-forms.js');
var requestFormsVersion = require('../../model/forms/request-forms-version.js');
var requestBase = require('../../model/request-base.js');
// var postRichiestaAssistenza = require('../../model/ticket/post-richiesta-assistenza');
// var deleteRichiestaAssistenza = require('../../model/ticket/delete-richiesta-assistenza');
var response = require('../../model/response');
const crud = require('../../crud/forms/forms.js');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../../utils/session')
const session = require('express-session');

forms.get('/forms-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../../controller/forms/forms.js');
    res.sendFile(filePath);
});
forms.get('/control-processi-action-button-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../../controls/ux/control.ux.action.button.js');
    res.sendFile(filePath);
});
forms.get('/control-processi-filter-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../../controls/ux/control.ux.processi.filter.js');
    res.sendFile(filePath);
});
forms.get('/utility-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../../utils/utility.js');
    res.sendFile(filePath);
});
forms.post('/forms-version', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestFormsVersion(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.body.IDModello,
            req.session.user.LanguageContext,
        );
        crud.GetFormsVersion(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.stringify(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
forms.post('/post-forms-version', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        var IDModello = Number(req.body.IDModello);
        if (!Number.isSafeInteger(IDModello) || IDModello <= 0) {
            return res.status(200).json(new response('ERR', null, { message: 'IDModello non valido' }));
        }

        crud.CreateFormsVersion(IDModello).then(createdVersion => {
            res.status(200).json(new response('OK', JSON.stringify(createdVersion), null));
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        });
    }
});
forms.delete('/forms-version/:IDVersione', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        var IDVersione = Number(req.params.IDVersione);
        if (!Number.isSafeInteger(IDVersione) || IDVersione <= 0) {
            return res.status(200).json(new response('ERR', null, { message: 'IDVersione non valido' }));
        }

        crud.DeleteFormsVersion(IDVersione).then(() => {
            res.status(200).json(new response('OK', null, null));
        }).catch(err => {
            var message = err && err.message ? err.message : err;
            try {
                var parsedError = JSON.parse(message);
                message = parsedError.message || message;
            } catch (parseError) { }

            if (typeof message === 'string' && message.indexOf('Impossibile eliminare la versione:') === 0) {
                var messagesByLanguage = {
                    IT: 'Impossibile eliminare la versione: esistono istanze o associazioni collegate.',
                    GB: 'The version cannot be deleted because linked instances or associations exist.',
                    ES: 'No se puede eliminar la versión porque existen instancias o asociaciones vinculadas.',
                    CN: '无法删除此版本：存在关联的实例或关联记录。'
                };
                message = messagesByLanguage[req.session.user.LanguageContext] || messagesByLanguage.IT;
            }

            res.status(200).json(new response('ERR', null, { message: message }));
        });
    }
});
forms.get('/forms', function (req, res) {
    var internetAvailable = require("internet-available");
    res.set('Access-Control-Allow-Origin', '*');
    if (sessionUtil.verifyUser(req, res)) {
        internetAvailable().then(function (conn) {
            res.status(200).render('forms', {
                user: req.session.user,
                checkConn: true,
            });
        }).catch(function () {
            res.status(200).render('forms', {
                user: req.session.user,
                checkConn: false,
            });
        });
    }
});
forms.post('/forms', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        var myRequest = new requestForms(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.session.user.LanguageContext,
            req.body.pageIndex,
            req.body.pageSize,
            req.body.filter,
            req.body
        );
        crud.GetForms(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.stringify(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
forms.post('/post-model', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {

        res.set('Access-Control-Allow-Origin', '*');

        var myRequest = new requestBase(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.session.user.LanguageContext,
            req.body
        );
        crud.PostModel(myRequest).then(listOf => {
            res.status(200).json(listOf);
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
 });
// forms.delete('/richiesta-assistenza/:IDRecord', function (req, res) {
//     if (sessionUtil.verifyUser(req, res)) {
//         res.set('Access-Control-Allow-Origin', '*');

//         var myRequest = new deleteRichiestaAssistenza(
//             req.session.user.IdAttore,
//             req.session.user.IdAccount,
//             req.body.IDModelloIstanza,
//             req.body.IDProcesso,
//             req.params.IDRecord,
//             req.session.user.LanguageContext,
//             req.body
//         );

//         crud.DeleteRichiestaAssistenza(myRequest).then(listOf => {
//             res.status(200).json(
//                 new response('OK', JSON.stringify(listOf), null)
//             );
//         }).catch(err => {
//             res.status(200).json(new response('ERR', null, err));
//         }).finally(() => {

//         });
//     }
// });
module.exports = forms;