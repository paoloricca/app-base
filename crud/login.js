
const express = require('express');
var exception = require('../model/exception');
const sql = require('mssql/msnodesqlv8');
const config = require('../utils/config')
var connection = require('../config.db');

function login(myRequest) {

    //console.log("login myRequest: " + JSON.stringify(myRequest));

    const sender = arguments.callee.name;

    var myLanguageContext = myRequest.LanguageContext;
    var myUserid = myRequest.Userid;
    var myPassword = myRequest.Password;

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {
                    var request = new sql.Request();

                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.input('Userid', sql.NVarChar(50), myUserid);
                    request.input('Password', sql.NVarChar(50), myPassword);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_LOGIN", function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
                            var myResponse = JSON.stringify(response);
                            
                            if (JSON.parse(myResponse).output.Status == "OK") {

                                var resultData = JSON.parse(myResponse).recordset[0];

                                /* Imposta il language applicativo */
                                var languageContext = config.LanguageContext;

                                if (languageContext != myLanguageContext) {
                                    languageContext = myLanguageContext;
                                }

                                if (resultData.LanguageContext != undefined) {
                                    languageContext = resultData.LanguageContext;
                                }

                                /* Valorizza l'oggetto restituito al route */
                                const user = {
                                    IdAccount: resultData.IDAccount,
                                    IdAttore: resultData.IDAttore,
                                    IdContratto: resultData.IDContratto,
                                    IDProfiloUtenteDefault: resultData.IDProfiloUtenteDefault,
                                    ProfiloUtenteDefault: resultData.ProfiloUtenteDefault,
                                    IdGruppoOperativoDefault: resultData.IDGruppoOperativoDefault,
                                    GruppoOperativoDefault: resultData.GruppoOperativoDefault,
                                    Nome: resultData.Nome,
                                    Cognome: resultData.Cognome,
                                    Email: resultData.Email,
                                    ActivePassword: resultData.ActivePassword,
                                    IsPublic: resultData.IsPublicAccount,
                                    IsVisible: resultData.IsVisible,
                                    LanguageContext: languageContext,
                                    OffsetRows: config.OffsetRows,
                                    NextRows: config.NextRows

                                };
                                resolve(JSON.stringify(user));

                            } else {
                                reject(JSON.stringify(
                                    new exception(sender, JSON.parse(myResponse).output.Status, sender, "internal error"))
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
    login,
}
