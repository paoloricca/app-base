const express = require('express');
const path = require('path');
const response = require('../model/response');
const crud = require('../crud/persone');
const sessionUtil = require('../utils/session');

const gestioneUtenti = express.Router();

function sendError(res, error) {
    res.status(200).json(new response('ERR', null, {
        message: error.code || error.message,
        sender: 'GestioneUtenti'
    }));
}

function renderPage(req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.render('gestione-utenti', { user: req.session.user });
    }
}

async function requirePermission(req, res, permission) {
    const permissions = await crud.GetGestioneUtentiPermissions(
        req.session.user.IDProfiloUtenteDefault
    );
    if (!permissions[permission]) {
        sendError(res, { code: 'FORBIDDEN' });
        return false;
    }
    return true;
}

gestioneUtenti.get('/gestione-utenti-script', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../controller/gestione-utenti.js'));
});

gestioneUtenti.get(['/Configuration/frmSystemUsers', '/gestione-utenti'], renderPage);

gestioneUtenti.get('/gestione-utenti-permissions', async (req, res) => {
    if (sessionUtil.verifyUser(req, res)) {
        try {
            const permissions = await crud.GetGestioneUtentiPermissions(
                req.session.user.IDProfiloUtenteDefault
            );
            res.status(200).json(new response('OK', permissions, null));
        } catch (error) {
            sendError(res, error);
        }
    }
});

gestioneUtenti.get('/persone', async (req, res) => {
    if (sessionUtil.verifyUser(req, res)) {
        try {
            const data = await crud.GetPersone({
                pageIndex: req.query.pageIndex,
                pageSize: req.query.pageSize,
                nome: req.query.nome,
                cognome: req.query.cognome,
                isPublic: req.query.isPublic
            });
            res.status(200).json(new response('OK', data, null));
        } catch (error) {
            sendError(res, crud.mapDatabaseError(error));
        }
    }
});

gestioneUtenti.get('/persone/:idpersona', async (req, res) => {
    if (sessionUtil.verifyUser(req, res)) {
        try {
            const persona = await crud.GetPersona(req.params.idpersona);
            res.status(200).json(new response('OK', persona, null));
        } catch (error) {
            sendError(res, crud.mapDatabaseError(error));
        }
    }
});

gestioneUtenti.get('/persone/:idpersona/account', async (req, res) => {
    if (sessionUtil.verifyUser(req, res)) {
        try {
            if (!await requirePermission(req, res, 'canAccount')) {
                return;
            }
            const account = await crud.GetPersonaAccount(req.params.idpersona);
            res.status(200).json(new response('OK', account, null));
        } catch (error) {
            sendError(res, crud.mapDatabaseError(error));
        }
    }
});

gestioneUtenti.put('/persone/:idpersona/account', async (req, res) => {
    if (sessionUtil.verifyUser(req, res)) {
        try {
            if (!await requirePermission(req, res, 'canAccount')) {
                return;
            }
            const account = await crud.SavePersonaAccount(
                req.params.idpersona,
                req.body,
                req.session.user.IdAttore
            );
            res.status(200).json(new response('OK', account, null));
        } catch (error) {
            sendError(res, crud.mapDatabaseError(error));
        }
    }
});

gestioneUtenti.post('/persone', async (req, res) => {
    if (sessionUtil.verifyUser(req, res)) {
        try {
            if (!await requirePermission(req, res, 'canInsert')) {
                return;
            }
            const id = await crud.CreatePersona(req.body, req.session.user.IdAccount);
            res.status(200).json(new response('OK', { IDPersona: id }, null));
        } catch (error) {
            sendError(res, crud.mapDatabaseError(error));
        }
    }
});

gestioneUtenti.put('/persone/:idpersona', async (req, res) => {
    if (sessionUtil.verifyUser(req, res)) {
        try {
            if (!await requirePermission(req, res, 'canEdit')) {
                return;
            }
            await crud.UpdatePersona(req.params.idpersona, req.body);
            res.status(200).json(new response('OK', null, null));
        } catch (error) {
            sendError(res, crud.mapDatabaseError(error));
        }
    }
});

gestioneUtenti.delete('/persone/:idpersona', async (req, res) => {
    if (sessionUtil.verifyUser(req, res)) {
        try {
            if (!await requirePermission(req, res, 'canDelete')) {
                return;
            }
            await crud.DeletePersona(req.params.idpersona);
            res.status(200).json(new response('OK', null, null));
        } catch (error) {
            sendError(res, crud.mapDatabaseError(error));
        }
    }
});

module.exports = gestioneUtenti;
