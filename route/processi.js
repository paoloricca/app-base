const express = require('express');
const processi = express.Router();
const bodyParser = require('body-parser');
var requestProcessi = require('../model/request-processi');
var requestMenu = require('../model/request-menu');
var response = require('../model/response');
const crud = require('../crud/processi');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');

processi.get('/processi-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controller/processi.js');
    res.sendFile(filePath);
});
processi.get('/processi/:idprocesso', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestProcessi(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.idprocesso,
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
            req.body
        );
        crud.GetProcessi(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
processi.get('/menu', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestMenu(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.session.user.LanguageContext,
            null,
            req.body
        );
        crud.GetMenu(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
processi.get('/menu-child/:IdProcesso', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        var myRequest = new requestMenu(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.session.user.LanguageContext,
            req.params.IdProcesso,
            req.body
        );
        crud.GetMenuChild(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.parse(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});

module.exports = processi;