const express = require('express');
const config = require('../utils/config')
const business = express.Router();
const bodyParser = require('body-parser');
const soap = require('soap');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');

business.get('/dashboard', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        if (req.session.user.ActivePassword == 0) {
            res.render('password-edit', {
                user: req.session.user,
                LanguageContext: req.session.user.LanguageContext,
                error: null
            });
        } else {
            res.status(200).render('dashboard', {
                user: req.session.user,
                LanguageContext: req.session.user.LanguageContext
            });
        }
    }
});

module.exports = business;