const express = require('express');
const config = require('../utils/config')
const login = express.Router();
const bodyParser = require('body-parser');
const soap = require('soap');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');
var modelResponse = require('../model/response');
var modelLogin = require('../model/login');
const crud = require('../crud/login');

// Define routes

login.get('/login-script', (req,res) => {
    const filePath = path.resolve(__dirname, '../controller/login.js');
    res.sendFile(filePath);
});

login.get('/login', function (req, res) {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        const htmlFile = 'view/login.html';
        fs.stat(`./${htmlFile}`, (err, stats) => {
            if (stats) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/html');
                fs.createReadStream(htmlFile).pipe(res);
            }
        });
    }
});

login.post('/login', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.set('Access-Control-Allow-Origin', '*');
        var myLogin = new modelLogin(
            req.body.Userid,
            req.body.Password,
        );
        /* Chiama la crud per la gestione del login */
        crud.login(myLogin).then(listOf => {
            req.session.user = JSON.parse(listOf);
            req.session.save();
            res.status(200).json(new modelResponse('OK', listOf, null));
        }).catch(err => {
            console.log('Errors: ' + err)
            res.status(200).json(new modelResponse('ERR', null, err));
        }).finally(() => {
            //console.log("Code has been executed")
        })
    }
});

module.exports = login;