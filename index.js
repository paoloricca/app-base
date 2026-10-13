const express = require('express');
const app = express();
app.set('views', __dirname + '/view');
app.set('view engine', 'ejs');

const config = require('./utils/config');
const sessionUtil = require('./utils/session');
const session = require('express-session');
const { RedisStore } = require('connect-redis');
const { createClient } = require('redis');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Configurazione client Redis
const redisConfig = config.Redis || {};
const redisUrl = redisConfig.url || (
    redisConfig.password
        ? `redis://:${encodeURIComponent(redisConfig.password)}@${redisConfig.host || '127.0.0.1'}:${redisConfig.port || 6379}`
        : `redis://${redisConfig.host || '127.0.0.1'}:${redisConfig.port || 6379}`
);

const redisClient = createClient({
    url: redisUrl,
    socket: {
        reconnectStrategy: (retries) => 3000
    }
});

redisClient.on('error', (err) => {
    console.error('[Redis] Errore di connessione:', err.message);
});

redisClient.on('connect', () => {
    console.log('[Redis] Connessione a Redis stabilita con successo.');
});

redisClient.connect().catch((err) => {
    console.error('[Redis] Impossibile stabilire la connessione al server Redis:', err.message);
});

// Configurazione RedisStore per express-session
const redisStore = new RedisStore({
    client: redisClient,
    prefix: redisConfig.prefix || 'sess:',
    ttl: 14400 // 4 ore in secondi
});

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    store: redisStore,
    secret: config.SecretKey,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 14400000, // 4 ore
        httpOnly: true,
        secure: false
    }
}));

app.use('/', require('./route/init'));
app.use('/', require('./route/login'));
app.use('/', require('./route/password-edit'));
app.use('/', require('./route/password-recovery'));
app.use('/', require('./route/logout'));
app.use('/', require('./route/fileupload'));
app.use('/', require('./route/dashboard'));
app.use('/', require('./route/account'));
app.use('/', require('./route/forms/forms'));
app.use('/', require('./route/model'));
app.use('/', require('./route/workflow'));
app.use('/', require('./route/gruppi-operativi'));
app.use('/', require('./route/profili-utente'));
app.use('/', require('./route/profili-utente-abilitazioni'));
app.use('/', require('./route/utenti'));
app.use('/', require('./route/processi'));
app.use('/', require('./route/processi-azioni'));
app.use('/', require('./route/artwork/artwork-ordine'));
app.use('/', require('./route/ticket/richieste-assistenza'));

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

const PORT = process.env.PORT || config.Port || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
