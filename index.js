const express = require('express');
const app = express();
app.set('views', __dirname + '/view');
app.set('view engine', 'ejs');

const config = require('./utils/config')
const sessionUtil = require('./utils/session')
const session = require('express-session');
const cookieParser = require("cookie-parser");
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use(session({
  secret: config.SecretKey, // A secret key used to sign the session ID cookie
  resave: true, // Forces the session to be saved back to the session store
  saveUninitialized: false, // Forces a session that is "uninitialized" to be saved to the store
  cookie: {
      maxAge: 14400000, // 4 hour Sets the cookie expiration time in milliseconds (1 hour = 3600000)
      httpOnly: false, // Reduces client-side script control over the cookie
      secure: false, // Ensures cookies are only sent over HTTPS
  }
}));

app.use('/', require('./route/login'));
app.use('/', require('./route/password-edit'));
app.use('/', require('./route/password-recovery'));
app.use('/', require('./route/logout'));
app.use('/', require('./route/fileupload'));
app.use('/', require('./route/dashboard'));
app.use('/', require('./route/account'));
app.use('/', require('./route/model'));
app.use('/', require('./route/workflow'));
app.use('/', require('./route/gruppi-operativi'));
app.use('/', require('./route/profili-utente'));
app.use('/', require('./route/profili-utente-abilitazioni'));
app.use('/', require('./route/utenti'));
app.use('/', require('./route/processi'));
app.use('/', require('./route/processi-azioni'));
app.use('/', require('./route/artwork/artwork-ordine'));

//app.use('/', require('./route/changePassword'));

app.use(express.static('public'));

app.get('/image', (req, res) => {
    const imagePath = __dirname + '/images';
    res.sendFile(imagePath);
});

app.get('/confirm-delete', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.status(200).sendFile(path.join(__dirname, "/view/confirm-delete.html"));
    }
});

app.get('/css', (req, res) => {
    const cssPath = __dirname + '/css';
    res.sendFile(cssPath);
});

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    if (sessionUtil.verifyUser(req, res)) {
        res.render('dashboard', {
            user: req.session.user
        });
    }
});
app.use(function (req, res, next) {
    res.status(404).sendFile(path.join(__dirname, "/view/404.html"));
});

const server = app.listen(5000, () => {
  console.log('Server running on port 5000');
});
