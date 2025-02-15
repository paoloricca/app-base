const express = require('express');
const config = require('../utils/config')
const logout = express.Router();
const bodyParser = require('body-parser');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');
var response = require('../model/response');
const crud = require('../crud/logout');

// Define routes
logout.get('/logout-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controller/logout.js');
    res.sendFile(filePath);
});
logout.post('/logout', function (req, res) {
    res.set('Access-Control-Allow-Origin', '*');
    crud.logout(req).then(listOf => {
        res.json(new response('OK', null, null) );
    })
    .catch(err => {
        res.json(new response('ERR', null, err));
    })
    .finally(() => {
    })   
});

module.exports = logout;