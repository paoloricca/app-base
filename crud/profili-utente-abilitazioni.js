const express = require('express');
var exception = require('../model/exception');
const sql = require('mssql/msnodesqlv8');
const config = require('../utils/config')
var connection = require('../config.db');
function PostProfiliUtenteAbilitazioni(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdGruppoOperativo = myRequest.IdGruppoOperativo;
    var myIdProfiloUtente = myRequest.IdProfiloUtente;
    var myIdProcesso = myRequest.IdProcesso;
    var myIdProcessoAzione = myRequest.IdProcessoAzione;
    var myLanguageContext = myRequest.LanguageContext;
    var myOffsetRows = myRequest.OffsetRows;
    var myNextRows = myRequest.NextRows;

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {
                    var request = new sql.Request();

                    request.input('IdAttore', sql.Int, parseInt(myIdAttore));
                    request.input('IdGruppoOperativo', sql.Int, parseInt(myIdGruppoOperativo));
                    request.input('IdProfiloUtente', sql.Int, parseInt(myIdProfiloUtente));
                    request.input('IdProcesso', sql.Int, parseInt(myIdProcesso));
                    request.input('IdProcessoAzione', sql.Int, parseInt(myIdProcessoAzione));
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_POST_PROFILI_UTENTE_ABILITAZIONI", function (err, response) {
                        if (err) {
                            reject(
                                new exception(sender, err.message, err.name, err.stack)
                            );
                        } else {
                            if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                                resolve(JSON.stringify('OK'));
                            } else {
                                reject(
                                    new exception(sender, JSON.parse(JSON.stringify(response.output)).Status, null, null)
                                );
                            }
                        }
                    });
                }
            })
        }
        catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
    return customPromise
}
function DeleteProfiliUtenteAbilitazioni(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdGruppoOperativo = myRequest.IdGruppoOperativo;
    var myIdProfiloUtente = myRequest.IdProfiloUtente;
    var myIdProcesso = myRequest.IdProcesso;
    var myIdProcessoAzione = myRequest.IdProcessoAzione;
    var myLanguageContext = myRequest.LanguageContext;
    var myOffsetRows = myRequest.OffsetRows;
    var myNextRows = myRequest.NextRows;

    console.log(myRequest);

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {
                    var request = new sql.Request();

                    request.input('IdAttore', sql.Int, parseInt(myIdAttore));
                    request.input('IdGruppoOperativo', sql.Int, parseInt(myIdGruppoOperativo));
                    request.input('IdProfiloUtente', sql.Int, parseInt(myIdProfiloUtente));
                    request.input('IdProcesso', sql.Int, parseInt(myIdProcesso));
                    request.input('IdProcessoAzione', sql.Int, parseInt(myIdProcessoAzione));
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_DELETE_PROFILI_UTENTE_ABILITAZIONI", function (err, response) {
                        if (err) {
                            reject(
                                new exception(sender, err.message, err.name, err.stack)
                            );
                        } else {
                            if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                                resolve(JSON.stringify('OK'));
                            } else {
                                reject(
                                    new exception(sender, JSON.parse(JSON.stringify(response.output)).Status, null, null)
                                );
                            }
                        }
                    });
                }
            })
        }
        catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
    return customPromise
}

module.exports = {
    PostProfiliUtenteAbilitazioni,
    DeleteProfiliUtenteAbilitazioni
}
