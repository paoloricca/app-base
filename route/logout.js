const express = require('express');
const config = require('../utils/config')
const logout = express.Router();
const bodyParser = require('body-parser');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');
var response = require('../model/response');
const crud = require('../crud/logout');
const realtime = require('../utils/workflow-chat-realtime');

// Define routes
logout.get('/logout-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controller/logout.js');
    res.sendFile(filePath);
});
logout.post('/logout', function (req, res) {
    res.set('Access-Control-Allow-Origin', '*');
    const sessionId = req.sessionID;
    const account = req.session && req.session.user && req.session.user.IdAccount;
    crud.logout(req).then(listOf => {
        if (account) realtime.disconnectSession(sessionId, account)
            .catch(error => console.error('[workflow-chat] disconnect', error));
        res.json(new response('OK', null, null) );
    })
    .catch(err => {
        res.json(new response('ERR', null, err));
    })
    .finally(() => {
    })   
});

module.exports = logout;