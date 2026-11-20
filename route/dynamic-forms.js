const express = require('express');
const path = require('path');
const router = express.Router();
const response = require('../model/response');
const crud = require('../crud/dynamic-forms');
const classOrigin = require('../crud/forms/class-origin');
const calculatedFields = require('../crud/forms/calculated-fields');
const calculatedSummary = require('../crud/forms/calculated-summary');
const calculatedText = require('../crud/forms/calculated-text');
const sessionUtil = require('../utils/session');

function isPositiveInteger(value) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0;
}

function sendError(res, error) {
    res.status(200).json(new response('ERR', null,
        error instanceof Error ? { message: error.message } : error));
}

function getEditableClassAttributes(req) {
    const data = req.method === 'POST' ? req.body : req.query;
    const workflowRecordId = data.workflowRecordId == null || data.workflowRecordId === ''
        ? null
        : data.workflowRecordId;
    const actionName = data.action || 'Modifica';
    if (!isPositiveInteger(req.params.IdProcesso) ||
        !isPositiveInteger(req.params.IDClasse) ||
        (workflowRecordId !== null && !isPositiveInteger(workflowRecordId)) ||
        (actionName !== 'Inserimento' && actionName !== 'Modifica')) {
        return Promise.reject(new Error('Invalid process, class, action or workflow record ID.'));
    }

    return crud.getClassAttributes(
        req.params.IdProcesso,
        req.params.IDClasse,
        req.session.user.IdAccount,
        req.session.user.LanguageContext,
        workflowRecordId,
        req.session.user.IDProfiloUtenteDefault,
        req.session.user.IdGruppoOperativoDefault,
        actionName
    ).then(attributes => attributes.filter(attribute =>
        attribute.IsWorkflowEditable !== false &&
        attribute.IsWorkflowEditable !== 0 &&
        attribute.IsWorkflowEditable !== '0'
    ));
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
    ).then(async data => {
        await calculatedSummary.attachCalculatedSummaries(
            data.rows, req.params.IdProcesso, req.session.user.IdAttore
        );
        res.status(200).json(new response('OK', data, null));
    })
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
    const workflowRecordId = req.query.workflowRecordId == null || req.query.workflowRecordId === ''
        ? null
        : req.query.workflowRecordId;
    if (workflowRecordId !== null && !isPositiveInteger(workflowRecordId)) {
        sendError(res, { message: 'Invalid workflow record ID.' });
        return;
    }
    crud.getClassAttributes(
        req.params.IdProcesso,
        req.params.IdClasse,
        req.session.user.IdAccount,
        req.session.user.LanguageContext,
        workflowRecordId,
        req.session.user.IDProfiloUtenteDefault,
        req.session.user.IdGruppoOperativoDefault,
        req.query.action
    ).then(data => calculatedFields.attachConditions(data))
        .then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => sendError(res, error));
});

router.get('/dynamic-forms/:IdProcesso/api/class-origin/:IDClasse', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    getEditableClassAttributes(req)
        .then(attributes => classOrigin.getClassOrigin(
            req.session.user.IdAttore,
            req.params.IDClasse,
            req.session.user.LanguageContext
        ).then(async config => {
            const allowedIds = new Set(attributes.map(attribute => Number(attribute.IDAttributo)));
            const conditionConfig = config.origin
                ? await classOrigin.getClassOriginConditions(
                    req.session.user.IdAttore, req.params.IDClasse, req.session.user.LanguageContext
                )
                : null;
            return {
                configured: Boolean(config.origin),
                description: config.origin ? config.origin.Descrizione : '',
                conditionFields: conditionConfig
                    ? conditionConfig.conditions.map(condition => {
                        const field = conditionConfig.fields.find(item =>
                            Number(item.IDAttributo) === Number(condition.IDAttributo));
                        return { IDAttributo: Number(condition.IDAttributo),
                            Description: field ? field.Description : '' };
                    })
                    : [],
                columns: config.origin
                    ? config.attributes
                        .filter(attribute => allowedIds.has(Number(attribute.IDAttributo)) &&
                            attribute.CampoDinamico)
                        .map(attribute => ({
                            name: attribute.CampoDinamico,
                            IDAttributo: Number(attribute.IDAttributo)
                        }))
                    : []
            };
        }))
        .then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => sendError(res, error));
});

function getOriginRows(req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    getEditableClassAttributes(req)
        .then(attributes => {
            const data = req.method === 'POST' ? req.body : req.query;
            const filters = data.filters == null ? [] :
                (typeof data.filters === 'string' ? JSON.parse(data.filters) : data.filters);
            const conditionValues = data.conditionValues == null ? [] :
                (typeof data.conditionValues === 'string' ? JSON.parse(data.conditionValues) : data.conditionValues);
            return classOrigin.getClassOriginRows(
                req.session.user.IdAttore,
                req.params.IDClasse,
                req.session.user.LanguageContext,
                attributes,
                filters,
                conditionValues
            );
        })
        .then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => sendError(res, error));
}
router.get('/dynamic-forms/:IdProcesso/api/class-origin/:IDClasse/rows', getOriginRows);
router.post('/dynamic-forms/:IdProcesso/api/class-origin/:IDClasse/rows', getOriginRows);

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

router.get('/dynamic-forms/:IdProcesso/api/class-records/:IDModelloIstanza/:IDClasse', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    if (!isPositiveInteger(req.params.IdProcesso) ||
        !isPositiveInteger(req.params.IDModelloIstanza) ||
        !isPositiveInteger(req.params.IDClasse)) {
        sendError(res, { message: 'Invalid process, instance or class ID.' });
        return;
    }
    crud.getClassRecords(
        req.params.IdProcesso,
        req.params.IDModelloIstanza,
        req.params.IDClasse,
        req.session.user.IdAttore,
        req.session.user.IdAccount
    ).then(data => res.status(200).json(new response('OK', data, null)))
        .catch(error => sendError(res, error));
});

router.post('/dynamic-forms/:IdProcesso/api/class-records', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    if (!isPositiveInteger(req.params.IdProcesso) ||
        !isPositiveInteger(req.body.IDModelloIstanza) ||
        !isPositiveInteger(req.body.IDClasse)) {
        sendError(res, { message: 'Invalid process, instance or class ID.' });
        return;
    }
    crud.createClassRecord(
        req.params.IdProcesso,
        req.body.IDModelloIstanza,
        req.body.IDClasse,
        req.session.user.IdAttore,
        req.session.user.IdAccount
    ).then(id => res.status(200).json(new response('OK', id, null)))
        .catch(error => sendError(res, error));
});

router.delete('/dynamic-forms/:IdProcesso/api/class-records/:IDRecord', function (req, res) {
    if (!sessionUtil.verifyUser(req, res)) {
        return;
    }
    if (!isPositiveInteger(req.params.IdProcesso) ||
        !isPositiveInteger(req.params.IDRecord) ||
        !isPositiveInteger(req.body.IDClasse)) {
        sendError(res, { message: 'Invalid process, class or record ID.' });
        return;
    }
    crud.deleteClassRecord(
        req.params.IdProcesso,
        req.params.IDRecord,
        req.body.IDClasse,
        req.session.user.IdAttore,
        req.session.user.IdAccount
    ).then(() => res.status(200).json(new response('OK', null, null)))
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
    calculatedText.saveRegularValue({
        processId: req.params.IdProcesso, recordId: req.body.IdRecord,
        fieldId: req.body.IdAttributo, value: req.body.RecordValue,
        actorId: req.session.user.IdAttore, accountId: req.session.user.IdAccount,
        profileId: req.session.user.IDProfiloUtenteDefault,
        groupId: req.session.user.IdGruppoOperativoDefault
    }).then(() => res.status(200).send('OK'))
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
