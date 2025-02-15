const express = require('express');
const account = express.Router();
var response = require('../model/response');
//const crud = require('../crud/userAccount');
const sessionUtil = require('../utils/session')
const session = require('express-session');

// Define routes

//userAccount.get('/productList-script', (req, res) => {
//    const filePath = path.resolve(__dirname, '../controller/productList.js');
//    res.sendFile(filePath);
//});

account.get('/account', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.render('account', { user: req.session.user });
    }
});

module.exports = account;