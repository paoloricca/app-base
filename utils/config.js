const fs = require('fs');

/* Legge il file di configurazione JSON */
var data = fs.readFileSync('./config.json');

/* Valorizza le chiavi applicative */
var SapWebServiceURL = JSON.parse(data).SapWebServiceURL;
var SecretKey = JSON.parse(data).SecretKey;
var LanguageContext = JSON.parse(data).LanguageContext;
var OffsetRows = JSON.parse(data).OffsetRows;
var NextRows = JSON.parse(data).NextRows;

var config = {
    SapWebServiceURL: SapWebServiceURL,
    SecretKey: SecretKey,
    LanguageContext: LanguageContext,
    OffsetRows: OffsetRows,
    NextRows: NextRows
}

module.exports = config;