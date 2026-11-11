const express = require('express');
const path = require('path');
const router = express.Router();
const response = require('../model/response');
const crud = require('../crud/dynamic-forms');
const sessionUtil = require('../utils/session');

function isPositiveInteger(value) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0;
}

function sendError(res, error) {
    res.status(200).json(new response('ERR', null, error));
}

router.get('/dynamic-forms/:IdProcesso', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }

    if (!isPositiveInteger(req.params.IdProcesso)) {
        res.status(404).sendFile(path.resolve(__dirname, '../view/404.html'));
        return;
    }

    crud.getProcessPage(
        req.params.IdProcesso,
        req.session.user.IdAccount,
        req.session.user.LanguageContext
    ).then(function (process) {
        if (!process) {
            res.status(404).sendFile(path.resolve(__dirname, '../view/404.html'));
            return;
        }
        res.status(200).render('dynamic-forms', {
            user: req.session.user,
            process: process
        });
    }).catch(function (error) {
        sendError(res, error);
    });
});

router.get('/dynamic-forms-script', function (req, res) {
    res.sendFile(path.resolve(__dirname, '../controller/dynamic-forms.js'));
});

router.get('/dynamic-forms/:IdProcesso/api/fields', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    crud.getFields(
        req.params.IdProcesso,
        req.session.user.IdAccount,
        req.session.user.LanguageContext
    )
        .then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => sendError(res, error));
});

router.get('/dynamic-forms/:IdProcesso/api/actions', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    crud.getActions(
        req.params.IdProcesso,
        req.session.user.IdAccount,
        req.session.user.LanguageContext
    ).then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => sendError(res, error));
});

router.get('/dynamic-forms/:IdProcesso/api/states', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    crud.getStates(
        req.params.IdProcesso,
        req.session.user.IdAccount,
        req.session.user.LanguageContext
    ).then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => sendError(res, error));
});

router.post('/dynamic-forms/:IdProcesso/api/records', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    const pageIndex = Number(req.body.pageIndex);
    const pageSize = Number(req.body.pageSize);
    if (!isPositiveInteger(req.params.IdProcesso) ||
        !Number.isSafeInteger(pageIndex) || pageIndex < 1 ||
        !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
        sendError(res, { message: 'Invalid process or paging parameters.' });
        return;
    }

    crud.getRecords(
        req.params.IdProcesso,
        req.session.user.IdAttore,
        req.session.user.IdAccount,
        req.session.user.IDProfiloUtenteDefault,
        pageIndex,
        pageSize,
        req.session.user.LanguageContext,
        req.body.filter
    ).then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => sendError(res, error));
});

router.get('/dynamic-forms/:IdProcesso/api/model-class/:IdVersione', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    crud.getModelClasses(
        req.params.IdProcesso,
        req.params.IdVersione,
        req.session.user.IdAccount,
        req.session.user.LanguageContext
    ).then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => sendError(res, error));
});

router.get('/dynamic-forms/:IdProcesso/api/model-class-attribute/:IdClasse', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    crud.getClassAttributes(
        req.params.IdProcesso,
        req.params.IdClasse,
        req.session.user.IdAccount,
        req.session.user.LanguageContext
    ).then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => sendError(res, error));
});

router.get('/dynamic-forms/:IdProcesso/api/model-class-attribute-values/:IdAttributo', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    crud.getAttributeValues(
        req.params.IdProcesso,
        req.params.IdAttributo,
        req.session.user.IdAccount,
        req.session.user.IdGruppoOperativoDefault,
        req.session.user.IDProfiloUtenteDefault,
        req.session.user.LanguageContext,
        req.query.action,
        req.query.currentValue
    ).then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => sendError(res, error));
});

router.post('/dynamic-forms/:IdProcesso/api/post-idmodello-istanza', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    crud.createInstance(
        req.params.IdProcesso,
        req.session.user.IdAttore,
        req.session.user.IdAccount,
        req.session.user.LanguageContext
    ).then(id => res.status(200).send(String(id)))
        .catch(error => sendError(res, error));
});

router.post('/dynamic-forms/:IdProcesso/api/get-idmodello-istanza-record', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    crud.getClassRecord(
        req.params.IdProcesso,
        req.body.IDModelloIstanza,
        req.body.IDClasse,
        req.session.user.IdAttore,
        req.session.user.IdAccount
    ).then(id => res.status(200).send(String(id)))
        .catch(error => sendError(res, error));
});

router.post('/dynamic-forms/:IdProcesso/api/get-idmodello-istanza-record-value', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    crud.getRecordValue(
        req.params.IdProcesso,
        req.body.IdRecord,
        req.body.IdAttributo,
        req.session.user.IdAttore,
        req.session.user.IdAccount
    ).then(value => res.status(200).send(value))
        .catch(error => sendError(res, error));
});

router.post('/dynamic-forms/:IdProcesso/api/post-idmodello-istanza-record', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    crud.saveRecordValue(
        req.params.IdProcesso,
        req.body.IdRecord,
        req.body.IdAttributo,
        req.body.RecordValue,
        req.session.user.IdAttore,
        req.session.user.IdAccount
    ).then(() => res.status(200).send('OK'))
        .catch(error => sendError(res, error));
});

router.post('/dynamic-forms/:IdProcesso/api/post-idmodello-istanza-record-media', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    crud.saveRecordMedia(
        req.params.IdProcesso,
        req.body.IdRecord,
        req.body.IdAttributo,
        req.session.user.IdAttore,
        req.session.user.IdAccount,
        req.body
    ).then(() => res.status(200).send('OK'))
        .catch(error => sendError(res, error));
});

router.delete('/dynamic-forms/:IdProcesso/api/delete-idmodello-istanza-record-media', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    crud.deleteRecordMedia(
        req.params.IdProcesso,
        req.session.user.IdAttore,
        req.session.user.IdAccount,
        req.body.filetodelete
    ).then(() => res.status(200).send('OK'))
        .catch(error => sendError(res, error));
});

router.delete('/dynamic-forms/:IdProcesso/api/records/:IDModelloIstanza', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    if (!isPositiveInteger(req.params.IdProcesso) || !isPositiveInteger(req.params.IDModelloIstanza)) {
        sendError(res, { message: 'Invalid process or record ID.' });
        return;
    }
    crud.deleteInstance(
        req.params.IdProcesso,
        req.params.IDModelloIstanza,
        req.session.user.IdAttore,
        req.session.user.IdAccount
    ).then(() => res.status(200).json(new response('OK', null, null)))
        .catch(error => sendError(res, error));
});

module.exports = router;
