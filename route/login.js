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

login.get('/login-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controller/login.js');
    res.sendFile(filePath);
});
login.get('/validation-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../utils/validation.js');
    res.sendFile(filePath);
});
login.get('/login', function (req, res) {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.status(200).render('login', {
            LanguageContext: 'IT',
            error: null,
            //storeduser: req.cookies.storeduser,
        });
    }
});
login.get('/login/:LanguageContext', function (req, res) {
    res.render('login', {
        LanguageContext: req.params.LanguageContext,
        error: null,
        //storeduser: req.cookies.storeduser,
    });
});
login.post('/login', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.set('Access-Control-Allow-Origin', '*');
        var myLogin = new modelLogin(
            req.body.LanguageContext,
            req.body.Userid,
            req.body.Password,
        );
        /* Chiama la crud per la gestione del login */
        crud.login(myLogin).then(listOf => {
            var response = JSON.parse(listOf);
            req.session.user = response;
            req.session.save();

            if (response.ActivePassword == 0) {
                res.render('password-edit', {
                    user: req.session.user,
                    LanguageContext: req.body.LanguageContext,
                    error: null
                });
            } else {
                /* Ricorda il mio username */
                //res.cookie('storeduser', req.session.user, {
                //    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
                //    httpOnly: true
                //});
                /* Non ricordare il mio username
                    cookies.set('storeduser', {expires: Date.now()});
                */

                res.render('dashboard', {
                    user: req.session.user,
                    LanguageContext: req.body.LanguageContext,
                    error: null
                });
            }
        }).catch(err => {
            res.render('login', {
                LanguageContext: req.body.LanguageContext,
                error: JSON.parse(err).message
            });
        }).finally(() => {
            //console.log("Code has been executed")
        })
    }
});

module.exports = login;