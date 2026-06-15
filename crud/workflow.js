const express = require('express');
var exception = require('../model/exception');
const sql = require('mssql/msnodesqlv8');
const config = require('../utils/config')
var connection = require('../config.db');
const business = require('../crud/business');

function GetWorkflowActions(myRequest) {
    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdProcesso = myRequest.IdProcesso;
    var myIdRecord = myRequest.IdRecord;
    var myIdProfiloUtente = myRequest.IdProfiloUtente;
    var myLanguageContext = myRequest.LanguageContext;

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
                    request.input('IdAccount', sql.Int, parseInt(myIdAccount));
                    request.input('IdProfiloUtente', sql.Int, parseInt(myIdProfiloUtente));
                    request.input('IdRecord', sql.Int, parseInt(myIdRecord));
                    request.input('IdProcesso', sql.Int, parseInt(myIdProcesso));
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(2))

                    request.execute("SP_GET_WORKFLOW_AZIONI", function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
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
function GetWorkflowTransitions(myRequest) {
    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdProcesso = myRequest.IdProcesso;
    var myIdRecord = myRequest.IdRecord;
    var myIdProfiloUtente = myRequest.IdProfiloUtente;
    var myLanguageContext = myRequest.LanguageContext;

    //console.log(myIdAttore)
    //console.log(myIdAccount)
    //console.log(myIdProcesso)
    //console.log(myIdRecord)
    //console.log(myIdProfiloUtente)
    //console.log(myLanguageContext)

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
                    request.input('IdAccount', sql.Int, parseInt(myIdAccount));
                    request.input('IdProfiloUtente', sql.Int, parseInt(myIdProfiloUtente));
                    request.input('IdRecord', sql.Int, parseInt(myIdRecord));
                    request.input('IdProcesso', sql.Int, parseInt(myIdProcesso));
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(2))

                    request.execute("SP_GET_WORKFLOW_TRANSITIONS", function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
                            var myResponse = JSON.stringify(response);

                            if (JSON.parse(myResponse).recordset != undefined) {
                                if (JSON.parse(myResponse).recordset.length > 0) {

                                    var resultData = JSON.parse(myResponse).recordset;

                                    resolve(JSON.stringify(resultData));

                                } else {
                                    resolve(JSON.stringify(""));
                                }
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
function GetHasWorkflowTransitions(myRequest) {
    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdProcesso = myRequest.IdProcesso;
    var myIdRecord = myRequest.IdRecord;
    var myIdProfiloUtente = myRequest.IdProfiloUtente;
    var myLanguageContext = myRequest.LanguageContext;

    //console.log(myIdAttore)
    //console.log(myIdAccount)
    //console.log(myIdProcesso)
    //console.log(myIdRecord)
    //console.log(myIdProfiloUtente)
    //console.log(myLanguageContext)

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
                    request.input('IdAccount', sql.Int, parseInt(myIdAccount));
                    request.input('IdProfiloUtente', sql.Int, parseInt(myIdProfiloUtente));
                    request.input('IdRecord', sql.Int, parseInt(myIdRecord));
                    request.input('IdProcesso', sql.Int, parseInt(myIdProcesso));
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(2))

                    request.execute("SP_GET_HAS_WORKFLOW_TRANSITIONS", function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
                            var myResponse = JSON.stringify(response);

                            resolve(JSON.stringify(JSON.parse(myResponse).output.Status));
                        }
                    });
                }
            })
        }
        catch (err) {
            alert();
            reject(JSON.stringify(                
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
    return customPromise
}
function GetWorkflowHistory(myRequest) {
    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdProcesso = myRequest.IdProcesso;
    var myIdRecord = myRequest.IdRecord;
    var myLanguageContext = myRequest.LanguageContext;

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
                    request.input('IdAccount', sql.Int, parseInt(myIdAccount));
                    request.input('IdRecord', sql.Int, parseInt(myIdRecord));
                    request.input('IdProcesso', sql.Int, parseInt(myIdProcesso));
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(2))

                    request.execute("SP_GET_WORKFLOW_HISTORY", function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
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
function PostWorkflow(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIDProcesso = myRequest.IdProcesso;
    var myIDRecord = myRequest.IdRecord;
    var myIDEventoDirezione = myRequest.IdEventoDirezione;
    var myNote = myRequest.Note;
    var myLanguageContext = myRequest.LanguageContext;

    //console.log('myIDProcesso: ' + myIDProcesso); 
    //console.log('myIDRecord: ' + myIDRecord);     
    //console.log('myIDEventoDirezione: ' + myIDEventoDirezione); 

    var StrGetOwner = "";
    var StrGetEditors = "";

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err, conn) {
                if (err) {
                    reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
                }
                // Inizio transazione
                conn.query("BEGIN TRAN", (err) => {
                    if (err) {
                        reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
                    } else {

                        /* 2. Recupera il nodo dalla transizione applicata */
                        business.GetNodeEndFromTransition(myIDEventoDirezione, sql).then(listOf => {
                            console.log(listOf);
                            return listOf;
                        }).catch(err => {

                            RollBack(conn); reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));

                        }).then(IDNode => {

                            console.log('GetNodeEndFromTransition: ' + IDNode);

                            /* 3) Valorizzazione Owner e Editors del Processo (GetOwner, GetEditors) */
                            business.GetOwner(IDNode, myIDRecord, myIdAccount, sql).then(listOf => {

                                StrGetOwner = listOf;

                                console.log('StrGetOwner: ' + listOf);
                                return listOf;

                            }).catch(err => {

                                RollBack(conn); reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));

                            }).then(StrGetOwner => {

                                business.GetEditors(myIDProcesso, IDNode, myIdAccount, sql).then(listOf => {

                                    StrGetEditors = listOf;
                                    console.log('StrGetEditors: ' + listOf);
                                    return listOf;

                                }).catch(err => {

                                    RollBack(conn); reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));

                                }).then(StrGetEditors => {

                                    business.PutFlowAccess(myIDRecord, IDNode, StrGetOwner, StrGetEditors, myIdAccount, myNote, sql).then(listOf => {

                                        console.log("PutFlowAccess: " + listOf);

                                    }).catch(err => {

                                        console.log("PutFlowAccess err: " + err.message);

                                        RollBack(conn); reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));

                                    }).then(StrGetEditors => {

                                        conn.query("COMMIT", (err) => {
                                            if (err) {
                                                reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
                                            }
                                        });

                                        resolve(JSON.stringify("OK"));
                                    });
                                })
                            });
                        });

                    }
                });
            });
        }
        catch (err) {
            reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
        }
    });
    return customPromise
}

module.exports = {
    GetWorkflowActions,
    GetHasWorkflowTransitions,
    GetWorkflowTransitions,
    GetWorkflowHistory,
    PostWorkflow
}
