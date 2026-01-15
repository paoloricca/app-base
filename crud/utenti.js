const express = require('express');
var exception = require('../model/exception');
const sql = require('mssql/msnodesqlv8');
const config = require('../utils/config')
var connection = require('../config.db');
function GetUtenti(myRequest) {
    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
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
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_UTENTI", function (err, response) {
                        if (err) {
                            reject(
                                new exception(sender, err.message, err.name, err.stack)
                            );
                        } else {
                            if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                                var myResponse = JSON.stringify(response);
                                if (JSON.parse(myResponse).recordset.length > 0) {
                                    var resultData = JSON.stringify(response.recordset);
                                    resolve(resultData);
                                } else {
                                    resolve(JSON.stringify(""));
                                }
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
function GetUtentiProfiloUtente(myRequest) {
    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdProfiloUtente = myRequest.IdProfiloUtente;
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
                    request.input('IdProfiloUtente', sql.Int, parseInt(myIdProfiloUtente));
                    request.input('OffsetRows', sql.Int, parseInt(myOffsetRows));
                    request.input('NextRows', sql.Int, parseInt(myNextRows));
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_UTENTI_PROFILO_UTENTE", function (err, response) {
                        if (err) {
                            reject(
                                new exception(sender, err.message, err.name, err.stack)
                            );
                        } else {
                            if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                                var myResponse = JSON.stringify(response);
                                if (JSON.parse(myResponse).recordset.length > 0) {
                                    var resultData = JSON.stringify(response.recordset);
                                    resolve(resultData);
                                } else {
                                    resolve(JSON.stringify(""));
                                }
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
    GetUtenti,
    GetUtentiProfiloUtente
}
