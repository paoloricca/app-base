const express = require('express');
const forms = express.Router();
const bodyParser = require('body-parser');
var requestForms = require('../../model/forms/forms.js');
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
// forms.post('/richiesta-assistenza/:IDModelloIstanza', function (req, res) {
//     if (sessionUtil.verifyUser(req, res)) {
//         res.set('Access-Control-Allow-Origin', '*');

//         /* IDProcesso = 76 ==> Gestione Richieste Assistenza */
//         var myRequest = new postRichiestaAssistenza(
//             req.session.user.IdAttore,
//             req.session.user.IdAccount,
//             req.params.IDModelloIstanza,
//             76,
//             req.session.user.LanguageContext,
//             req.body.pageIndex,
//             req.body.pageSize,
//             req.body
//         );

//         crud.PostRichiestaAssistenza(myRequest).then(listOf => {
//             res.status(200).json(
//                 new response('OK', JSON.stringify(listOf), null)
//             );
//         }).catch(err => {
//             res.status(200).json(new response('ERR', null, err));
//         }).finally(() => {

//         });
//     }
// });
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