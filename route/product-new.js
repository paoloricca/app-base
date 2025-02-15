const express = require('express');
const productNew = express.Router();
const bodyParser = require('body-parser');
var modelRequest = require('../model/request');
var modelResponse = require('../model/response');
const crud = require('../crud/product-new');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');

let products = [];

productNew.get('/product-new-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controller/product-new.js');
    res.sendFile(filePath);
});
productNew.get('/product-new', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        //Products = [];
        req.session.user.OffsetRows = 0;
        req.session.save();

        var myRequest = new modelRequest(
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
        );

        /* Chiama la crud necessaria per il caricamento degli articoli */
        crud.GetArticoliNew(myRequest).then(listOf => {
            //console.log(products);
            res.status(200).render('product-new', {
                user: req.session.user,
                products: JSON.parse(listOf)
            });
        }).catch(err => {
            console.log('Errors: ' + err)
            res.status(200).json(new modelResponse('ERR', null, err));
        }).finally(() => {
            //console.log("Code has been executed")
        })
    }
});
productNew.post('/product-new', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        req.session.user.OffsetRows = req.session.user.OffsetRows + req.session.user.NextRows;
        req.session.save();

        var myRequest = new modelRequest(
            req.session.user.LanguageContext,
            req.session.user.OffsetRows,
            req.session.user.NextRows,
        );
        /* Chiama la crud necessaria per il caricamento degli articoli */
        crud.GetArticoliNew(myRequest).then(listOf => {
            res.status(200).json(
                new modelResponse('OK', JSON.parse(listOf), null)
            );

        }).catch(err => {
            console.log('Errors: ' + err)
            res.status(200).json(new modelResponse('ERR', null, err));

        }).finally(() => {
            //console.log("Code has been executed")
        })
    }
});

module.exports = productNew;