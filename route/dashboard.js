const express = require('express');
const config = require('../utils/config')
const dashboard = express.Router();
const bodyParser = require('body-parser');
const soap = require('soap');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');
const response = require('../model/response');
const crud = require('../crud/dashboard');
//var response = require('../model/response');

// Define routes
dashboard.get('/dashboard-script', (req,res) => {
    const filePath = path.resolve(__dirname, '../controller/dashboard.js');
    res.sendFile(filePath);
});
dashboard.get('/workflow-screensaver-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controller/workflow-screensaver.js');
    res.sendFile(filePath);
});
dashboard.get('/utility-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../utils/utility.js');
    res.sendFile(filePath);
});
dashboard.get('/dashboard', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        if (req.session.user.ActivePassword == 0) {
            res.render('password-edit', {
                user: req.session.user,
                LanguageContext: req.session.user.LanguageContext,
                error: null
            });
        } else {
            res.status(200).render('dashboard', {
                user: req.session.user,
                LanguageContext: req.session.user.LanguageContext
            });
        }
    }
});

function sendDashboardError(res, error) {
    let parsedError = error;
    try {
        parsedError = JSON.parse(error);
    } catch (parseError) {
    }
    res.status(200).json(new response('ERR', null, parsedError));
}

function isPositiveInteger(value) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0;
}

dashboard.get('/dashboard/api/processes/:IdProcessoParent?', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }

    const parentId = req.params.IdProcessoParent == null
        ? null
        : Number(req.params.IdProcessoParent);
    if (parentId !== null && (!Number.isSafeInteger(parentId) || parentId <= 0)) {
        sendDashboardError(res, { message: 'Invalid parent process ID.' });
        return;
    }

    const user = req.session.user;
    crud.getProcesses(
        user.IdAttore,
        user.IdAccount,
        user.LanguageContext,
        parentId
    ).then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => sendDashboardError(res, error));
});

dashboard.get('/dashboard/api/process-cards', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }

    const user = req.session.user;
    crud.getProcessCards(
        user.IdAttore,
        user.IdAccount,
        user.LanguageContext
    ).then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => sendDashboardError(res, error));
});

dashboard.get('/dashboard/api/processes/:IdProcesso/records', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }

    const IdProcesso = Number(req.params.IdProcesso);
    const PageIndex = Number(req.query.pageIndex || 1);
    const PageSize = Number(req.query.pageSize || 20);
    const StateId = req.query.stateId == null || req.query.stateId === ''
        ? null
        : Number(req.query.stateId);
    if (!isPositiveInteger(IdProcesso) ||
        !Number.isSafeInteger(PageIndex) || PageIndex < 1 ||
        !Number.isSafeInteger(PageSize) || PageSize < 1 || PageSize > 100 ||
        (StateId !== null && !isPositiveInteger(StateId))) {
        sendDashboardError(res, { message: 'Invalid process or paging parameters.' });
        return;
    }

    const user = req.session.user;
    crud.getRecords(
        user.IdAttore,
        user.IdAccount,
        user.LanguageContext,
        IdProcesso,
        PageIndex,
        PageSize,
        StateId
    ).then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => sendDashboardError(res, error));
});

module.exports = dashboard;