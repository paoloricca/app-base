const express = require('express');
const productPromotion = express.Router();
const bodyParser = require('body-parser');
var modelRequest = require('../model/request');
var modelResponse = require('../model/response');
const crud = require('../crud/product-promotion');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');

let products = [];

productPromotion.get('/product-promotion-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controller/product-promotion.js');
    res.sendFile(filePath);
});
productPromotion.get('/product-promotion', function (req, res) {
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
        crud.GetArticoliPromotion(myRequest).then(listOf => {
            //console.log(products);
            res.status(200).render('product-promotion', {
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
productPromotion.post('/product-promotion', function (req, res) {
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
        crud.GetArticoliPromotion(myRequest).then(listOf => {
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

module.exports = productPromotion;