const express = require('express');
const artworkordine = express.Router();
const bodyParser = require('body-parser');
var requestArtworkOrdini = require('../../model/artwork/request-artwork-ordini');
var postArtworkOrdine = require('../../model/artwork/post-artwork-ordine');
var deleteArtworkOrdine = require('../../model/artwork/delete-artwork-ordine');
var response = require('../../model/response');
const crud = require('../../crud/artwork/artwork-ordine');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../../utils/session')
const session = require('express-session');

artworkordine.get('/artwork-ordine-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../../controller/artwork/artwork-ordine.js');
    res.sendFile(filePath);
});
artworkordine.get('/control-processi-action-button-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../../controls/ux/control.ux.action.button.js');
    res.sendFile(filePath);
});
artworkordine.get('/control-processi-filter-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../../controls/ux/control.ux.processi.filter.js');
    res.sendFile(filePath);
});
artworkordine.get('/utility-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../../utils/utility.js');
    res.sendFile(filePath);
});
artworkordine.get('/artwork-ordine', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        res.status(200).render('artwork-ordine', {
            user: req.session.user,
        });
    }
});
artworkordine.post('/artwork-ordine/ordini', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        var myRequest = new requestArtworkOrdini(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.session.user.LanguageContext,
            req.body.pageIndex,
            req.body.pageSize,
            req.body
        );

        crud.GetOrdini(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.stringify(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
artworkordine.post('/artwork-ordine/:IDModelloIstanza', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        /* IDProcesso = 71 ==> Gestione Ordini Artwork */
        var myRequest = new postArtworkOrdine(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.params.IDModelloIstanza,
            71,
            req.session.user.LanguageContext,
            req.body.pageIndex,
            req.body.pageSize,
            req.body
        );

        crud.PostOrdine(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.stringify(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
artworkordine.delete('/artwork-ordine/:IDRecord', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');

        var myRequest = new deleteArtworkOrdine(
            req.session.user.IdAttore,
            req.session.user.IdAccount,
            req.body.IDModelloIstanza,
            req.body.IDProcesso,
            req.params.IDRecord,
            req.session.user.LanguageContext,
            req.body
        );

        crud.DeleteOrdine(myRequest).then(listOf => {
            res.status(200).json(
                new response('OK', JSON.stringify(listOf), null)
            );
        }).catch(err => {
            res.status(200).json(new response('ERR', null, err));
        }).finally(() => {

        });
    }
});
module.exports = artworkordine;