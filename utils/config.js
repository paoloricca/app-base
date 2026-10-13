const fs = require('fs');

/* Legge il file di configurazione JSON */
var data = fs.readFileSync('./config.json');

/* Valorizza le chiavi applicative */
var SapWebServiceURL = JSON.parse(data).SapWebServiceURL;
var SecretKey = JSON.parse(data).SecretKey;
var LanguageContext = JSON.parse(data).LanguageContext;
var OffsetRows = JSON.parse(data).OffsetRows;
var NextRows = JSON.parse(data).NextRows;
var Port = JSON.parse(data).Port || 3000;
var Redis = JSON.parse(data).Redis || { host: '127.0.0.1', port: 6379, password: '', prefix: 'sess:' };

var config = {
    Port: Port,
    SapWebServiceURL: SapWebServiceURL,
    SecretKey: SecretKey,
    LanguageContext: LanguageContext,
    OffsetRows: OffsetRows,
    NextRows: NextRows,
    Redis: Redis
}

module.exports = config;