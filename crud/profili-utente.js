const express = require('express');
var exception = require('../model/exception');
const sql = require('mssql/msnodesqlv8');
const config = require('../utils/config')
var connection = require('../config.db');

function GetProfiliUtente(myRequest) {
    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdGruppoOperativo = myRequest.IdGruppoOperativo;
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

                    request.input('IdGruppoOperativo', sql.Int, parseInt(myIdGruppoOperativo));
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_PROFILI_UTENTE", function (err, response) {
                        if (err) {
                            reject(
                                new exception(sender, err.message, err.name, err.stack)
                            );
                        } else {
                            if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                                var myResponse = JSON.stringify(response);
                                if (JSON.parse(myResponse).recordset.length > 0) {
                                    var resultData = JSON.parse(myResponse).recordset;
                                    resolve(JSON.stringify(resultData));

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
function GetProfiloUtente(myRequest) {
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
                    request.query("SELECT * FROM VW_PROFILO_UTENTE Where IDProfiloUtente = " + myIdProfiloUtente, function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
                            /* response.params:
                                recordsets,
                                output,
                                rowsAffected
                            */
                            var myResponse = JSON.stringify(response);

                            if (JSON.parse(myResponse).recordset.length > 0) {

                                var resultData = JSON.parse(myResponse).recordset;

                                resolve(JSON.stringify(resultData));

                            } else {
                                resolve(JSON.stringify(""));
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
function DeleteProfiloUtente(myRequest) {

    const sender = arguments.callee.name;

    //console.log(myRequest);

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdProfiloUtente = myRequest.IdProfiloUtente;
    var myLanguageContext = myRequest.LanguageContext;
    var myOffsetRows = myRequest.OffsetRows;
    var myNextRows = myRequest.NextRows;
    var myBody = myRequest.RequestBody;

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {

                    var request = new sql.Request();

                    request.input('IdProfiloUtente', sql.Int, parseInt(myIdProfiloUtente));
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_DELETE_ProfiloUtente", function (err, response) {
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
function PostProfiloUtente(myRequest) {

    const sender = arguments.callee.name;

    //console.log(myRequest);

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdGruppoOperativo = myRequest.IdGruppoOperativo;
    var myLanguageContext = myRequest.LanguageContext;
    var myOffsetRows = myRequest.OffsetRows;
    var myNextRows = myRequest.NextRows;
    var myBody = myRequest.RequestBody;

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {

                    var request = new sql.Request();

                    request.input('IdOwner', sql.Int, parseInt(myIdAttore));
                    request.input('IdGruppoOperativo', sql.Int, parseInt(myIdGruppoOperativo));
                    request.input('Text_IT', sql.NVarChar(500), myBody.Text_IT);
                    request.input('Text_GB', sql.NVarChar(500), myBody.Text_GB);
                    request.input('IsPublic', sql.Bit, (myBody.IsPublic === "true"));
                    request.input('IsVisible', sql.Bit, (myBody.IsVisible === "true"));
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_POST_PROFILO_UTENTE", function (err, response) {
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
function PutProfiloUtente(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdProfiloUtente = myRequest.IdProfiloUtente;
    var myLanguageContext = myRequest.LanguageContext;
    var myOffsetRows = myRequest.OffsetRows;
    var myNextRows = myRequest.NextRows;
    var myBody = myRequest.RequestBody;

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {

                    var request = new sql.Request();

                    request.input('IdProfiloUtente', sql.Int, parseInt(myIdProfiloUtente));
                    request.input('Text_IT', sql.NVarChar(500), myBody.Text_IT);
                    request.input('Text_GB', sql.NVarChar(500), myBody.Text_GB);
                    request.input('IsPublic', sql.Bit, (myBody.IsPublic === "true"));
                    request.input('IsVisible', sql.Bit, (myBody.IsVisible === "true"));
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_PUT_PROFILO_UTENTE", function (err, response) {
                        if (err) {
                            reject(
                                new exception(sender, err.message, err.name, err.stack)
                            );
                        } else {
                            if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                                resolve(JSON.stringify("OK"));
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
function PostProfiliUtenteRisorseList(myRequest) {
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

                    request.input('IdProfiloUtente', sql.Int, parseInt(myIdProfiloUtente));
                    request.input('OffsetRows', sql.Int, parseInt(myOffsetRows));
                    request.input('NextRows', sql.Int, parseInt(myNextRows));
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_PROFILI_UTENTE_RISORSE_LIST", function (err, response) {
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
function PostProfiloUtenteRisorsa(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdGruppoOperativo = myRequest.IdGruppoOperativo;
    var myIdProfiloUtente = myRequest.IdProfiloUtente;
    var myLanguageContext = myRequest.LanguageContext;

    //console.log("myIdAttore : " + myIdAttore);
    //console.log("myIdAccount : " + myIdAccount);
    //console.log("myIdGruppoOperativo : " + myIdGruppoOperativo);
    //console.log("myIdAttore : " + myIdAttore);
    //console.log("myIDProfiloUtente : " + myIdProfiloUtente);
    //console.log("myLanguageContext : " + myLanguageContext);

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {

                    var request = new sql.Request();

                    request.input('IdOwner', sql.Int, parseInt(myIdAttore));
                    request.input('IdGruppoOperativo', sql.Int, parseInt(myIdGruppoOperativo));
                    request.input('IdProfiloUtente', sql.Int, parseInt(myIdProfiloUtente));
                    request.input('IdAccount', sql.Int, parseInt(myIdAccount));
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_POST_PROFILO_UTENTE_RISORSA", function (err, response) {
                        if (err) {
                            reject(
                                new exception(sender, err.message, err.name, err.stack)
                            );
                        } else {
                            if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                                resolve(JSON.stringify("OK"));
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
function PostProfiloUtenteSetDafault(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdGruppoOperativo = myRequest.IdGruppoOperativo;
    var myIdProfiloUtente = myRequest.IdProfiloUtente;
    var myLanguageContext = myRequest.LanguageContext;
    var myIsDefault = myRequest.IsDefault;

    //console.log("myIdAttore : " + myIdAttore);
    //console.log("myIdAccount : " + myIdAccount);
    //console.log("myIdGruppoOperativo : " + myIdGruppoOperativo);
    //console.log("myIDProfiloUtente : " + myIdProfiloUtente);
    //console.log("myIsDefault : " + myIsDefault);
    //console.log("myLanguageContext : " + myLanguageContext);

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {

                    var request = new sql.Request();

                    request.input('IdProfiloUtente', sql.Int, parseInt(myIdProfiloUtente));
                    request.input('IdAccount', sql.Int, parseInt(myIdAccount));
                    request.input('IsDefault', sql.Bit, (myIsDefault === "true"));
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_POST_PROFILO_SET_DEFAULT", function (err, response) {
                        if (err) {
                            reject(
                                new exception(sender, err.message, err.name, err.stack)
                            );
                        } else {
                            if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                                resolve(JSON.stringify("OK"));
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
function DeleteProfiloUtenteRisorsa(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdGruppoOperativo = myRequest.IdGruppoOperativo;
    var myIdProfiloUtente = myRequest.IdProfiloUtente;
    var myLanguageContext = myRequest.LanguageContext;

    //console.log("myIdAttore : " + myIdAttore);
    //console.log("myIdAccount : " + myIdAccount);
    //console.log("myIdGruppoOperativo : " + myIdGruppoOperativo);
    //console.log("myIdAttore : " + myIdAttore);
    //console.log("myIDProfiloUtente : " + myIdProfiloUtente);
    //console.log("myLanguageContext : " + myLanguageContext);

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {

                    var request = new sql.Request();

                    request.input('IdOwner', sql.Int, parseInt(myIdAttore));
                    request.input('IdGruppoOperativo', sql.Int, parseInt(myIdGruppoOperativo));
                    request.input('IdProfiloUtente', sql.Int, parseInt(myIdProfiloUtente));
                    request.input('IdAccount', sql.Int, parseInt(myIdAccount));
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_DELETE_PROFILO_UTENTE_RISORSA", function (err, response) {
                        if (err) {
                            reject(
                                new exception(sender, err.message, err.name, err.stack)
                            );
                        } else {
                            if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                                resolve(JSON.stringify("OK"));
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
    GetProfiliUtente,
    GetProfiloUtente,
    PutProfiloUtente,
    PostProfiloUtente,
    DeleteProfiloUtente,
    PostProfiliUtenteRisorseList,
    PostProfiloUtenteSetDafault,
    PostProfiloUtenteRisorsa,
    DeleteProfiloUtenteRisorsa
}
