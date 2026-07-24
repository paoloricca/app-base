const express = require('express');
const config = require('../utils/config')
const init = express.Router();
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');

init.post('/init', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        var NextRows = config.NextRows;
        if (req.body.NextRows != undefined) {
            NextRows = req.body.NextRows;
        }
        req.session.user.OffsetRows = -1;
        req.session.user.NextRows = NextRows;
        req.session.save();
        res.status(200).send("OK");
    } else {
        res.status(200).json("ERR");
    }
});
init.get('/checksession', function (req, res) {
    var internetAvailable = require("internet-available");
    internetAvailable().then(function () {
        if (req.session.user) {
            res.json({ status: "OK" });
        } else {
            res.json({ status: "KO" });
        }
    }).catch(function () {
        res.json({ status: "CN" });
    });

});
module.exports = init;
