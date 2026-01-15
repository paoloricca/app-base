
const express = require('express');
var exception = require('../model/exception');
const sql = require('mssql/msnodesqlv8');
const config = require('../utils/config')
var connection = require('../config.db');
const soap = require('soap');

function GeneraCodiceVerifica(myRequest) {

    const sender = arguments.callee.name;

    var myLanguageContext = myRequest.LanguageContext;
    var myIndirizzoEmail = myRequest.Email;    

    //console.log('myLanguageContext: ' + myLanguageContext);
    //console.log('myIndirizzoEmail: ' + myIndirizzoEmail);

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
                    request.input('IndirizzoEmail', sql.NVarChar(100), myIndirizzoEmail);
                    request.output('CodiceVerifica', sql.Int);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_POST_GENERA_CODICE_VERIFICA", function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
                            var myResponse = JSON.stringify(response);
                            console.log(myResponse);
                            console.log(JSON.parse(myResponse).output.Status);

                            if (JSON.parse(myResponse).output.Status == "OK") {
                                resolve(JSON.parse(myResponse).output.CodiceVerifica);
                            } else {
                                reject(JSON.stringify(
                                    new exception(sender, JSON.parse(myResponse).output.Status, sender, "internal error"))
                                );
                            }
                        }
                    });
                }
            });
        }
        catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
    return customPromise
}
function VerificaCodiceSicurezza(myRequest) {

    const sender = arguments.callee.name;

    var myLanguageContext = myRequest.LanguageContext;
    var myIndirizzoEmail = myRequest.Email;
    var mySecurityKey = myRequest.SecurityKey;

    //console.log('myLanguageContext: ' + myLanguageContext);
    //console.log('myIndirizzoEmail: ' + myIndirizzoEmail);
    //console.log('mySecurityKey: ' + mySecurityKey);

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
                    request.input('IndirizzoEmail', sql.NVarChar(100), myIndirizzoEmail);
                    request.input('CodiceVerifica', sql.Int, parseInt(mySecurityKey));
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_POST_CONTROLLO_CODICE_VERIFICA", function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
                            var myResponse = JSON.stringify(response);

                            if (JSON.parse(myResponse).output.Status == "OK") {
                                resolve(JSON.parse(myResponse).output.Status);
                            } else {
                                reject(JSON.stringify(
                                    new exception(sender, JSON.parse(myResponse).output.Status, sender, "internal error"))
                                );
                            }
                        }
                    });
                }
            });
        }
        catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
    return customPromise
}
function ReimpostaPassword(myRequest) {

    const sender = arguments.callee.name;

    var myLanguageContext = myRequest.LanguageContext;
    var myIndirizzoEmail = myRequest.Email;
    var myConfirmPassword = myRequest.ConfirmPassword;

    //console.log('myLanguageContext: ' + myLanguageContext);
    //console.log('myIndirizzoEmail: ' + myIndirizzoEmail);
    //console.log('myConfirmPassword: ' + myConfirmPassword);

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
                    request.input('Email', sql.NVarChar(100), myIndirizzoEmail);
                    request.input('Password', sql.NVarChar(50), myConfirmPassword);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_UPDATE_PASSWORD", function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
                            var myResponse = JSON.stringify(response);

                            if (JSON.parse(myResponse).output.Status == "OK") {
                                resolve("OK");
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
function ModificaPassword(myRequest) {

    const sender = arguments.callee.name;

    var myLanguageContext = myRequest.LanguageContext;
    var myIdAccount = myRequest.IdAccount;
    var myEmail = myRequest.Email;
    var myActualPassword = myRequest.ActualPassword;
    var myPassword = myRequest.ConfirmPassword;

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
                    request.input('IDAccount', sql.Int, parseInt(myIdAccount));
                    request.input('Email', sql.NVarChar(100), myEmail);
                    request.input('ActualPassword', sql.NVarChar(50), myActualPassword);
                    request.input('Password', sql.NVarChar(50), myPassword);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_EDIT_PASSWORD", function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
                            var myResponse = JSON.stringify(response);

                            if (JSON.parse(myResponse).output.Status == "OK") {
                                resolve("OK");
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
    GeneraCodiceVerifica,
    VerificaCodiceSicurezza,
    ReimpostaPassword,
    ModificaPassword
}