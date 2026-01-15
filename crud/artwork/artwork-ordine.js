const express = require('express');
var exception = require('../../model/exception');
const sql = require('mssql/msnodesqlv8');
const config = require('../../utils/config')
var connection = require('../../config.db');
const business = require('../../crud/business');

function GetOrdini(myRequest) {
    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myLanguageContext = myRequest.LanguageContext;

    var myOffsetRows = myRequest.OffsetRows;
    var myNextRows = myRequest.NextRows;

    //console.log("crude GetOrdini: " + JSON.stringify(myRequest));

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {
                    var request = new sql.Request();

                    request.input('IDIstanziatore', sql.Int, myIdAccount);
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.input('OffsetRows', sql.Int, parseInt(myOffsetRows));
                    request.input('NextRows', sql.Int, parseInt(myNextRows));
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_ARTWORK_ORDINE_LIST", function (err, response) {
                        if (err) {
                            reject(
                                new exception(sender, err.message, err.name, err.stack)
                            );
                        } else {
                            //console.log("response: " + JSON.stringify(response));
                            if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                                var myResponse = JSON.stringify(response);

                                if (JSON.parse(myResponse).recordsets.length > 0) {
                                    //console.log(JSON.parse(myResponse).recordsets[0]);

                                    var resultData = JSON.stringify(response.recordsets[0]);
                                    var TotalRecord = JSON.parse(JSON.stringify(response.recordsets[1]))[0].TotalRecord;

                                    //console.log("resultData: " + resultData);
                                    //console.log("TotalRecord: " + TotalRecord);

                                    resolve(
                                        {
                                            TotalRecord: TotalRecord,
                                            resultdata: resultData
                                        }
                                    );
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
function DeleteOrdine(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIDModelloIstanza = myRequest.IDModelloIstanza;
    var myIDProcesso = myRequest.IDProcesso;
    var myIDRecord = myRequest.IDRecord;
    var myLanguageContext = myRequest.LanguageContext;

    const customPromise = new Promise((resolve, reject) => {
        try {
            /*
                TODO: invio delle notifiche
            */

            sql.connect(connection, function (err, conn) {
                if (err) {
                    reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
                }
                // Inizio transazione
                conn.query("BEGIN TRAN", (err) => {
                    if (err) {
                        reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
                    } else {

                        business.DeleteIdModelloIstanza(myIDModelloIstanza, myIdAccount, sql).then(listOf => {

                            console.log('DeleteIdModelloIstanza: ' + listOf);

                        }).catch(err => {

                            RollBack(conn); reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));

                        }).then(response => {

                            business.DeleteProcessRecord(myIDProcesso, myIDRecord, myIdAccount, sql).then(listOf => {

                                console.log("DeleteProcessRecord: " + listOf);

                            }).catch(err => {

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
function PostOrdine(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIDModelloIstanza = myRequest.IDModelloIstanza;
    var myIDProcesso = myRequest.IDProcesso;
    var myLanguageContext = myRequest.LanguageContext;
    var myOffsetRows = myRequest.OffsetRows;
    var myNextRows = myRequest.NextRows;

    var StrGetOwner = "";
    var StrGetEditors = "";

    const customPromise = new Promise((resolve, reject) => {
        try {
            /*
                TODO: invio delle notifiche
            */

            sql.connect(connection, function (err, conn) {
                if (err) {
                    reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
                }
                // Inizio transazione
                conn.query("BEGIN TRAN", (err) => {
                    if (err) {
                        reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
                    } else {

                        const requestCheckArtworkOrdine = new sql.Request();
                        requestCheckArtworkOrdine.query("SELECT COUNT(*) AS CheckArtworkOrdine FROM dbo.TArtworkOrdine WHERE IDModelloIstanza = " + myIDModelloIstanza, (err, response) => {
                            if (err) {
                                RollBack(conn); reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
                            } else {

                                var CheckArtworkOrdine = response.recordset[0].CheckArtworkOrdine;
                                
                                if (CheckArtworkOrdine == 0) {
                                    /* 1. Registrazione nuova richiesta in tabella dbo.TArtworkOrdine */
                                    const requestPostArtworkOrdine = new sql.Request();
                                    requestPostArtworkOrdine.input('IDModelloIstanza', sql.Int, myIDModelloIstanza);
                                    requestPostArtworkOrdine.input('IdAccount', sql.Int, myIdAccount);
                                    requestPostArtworkOrdine.query("INSERT INTO TArtworkOrdine (IDModelloIstanza, IDIstanziatore) OUTPUT INSERTED.IDArtwork VALUES (@IDModelloIstanza, @IdAccount)", (err, response) => {

                                        if (err) {
                                            RollBack(conn); reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
                                        } else {

                                            var IDRecord = response.recordset[0].IDArtwork;
                                            console.log('IDRecord: ' + IDRecord);

                                            /* 2. Recupera il nodo di partenza del workflow */
                                            business.GetStartNode(myIDProcesso, myIdAttore, myLanguageContext, sql).then(listOf => {
                                                return listOf;
                                            }).catch(err => {

                                                RollBack(conn); reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));

                                            }).then(IDNode => {

                                                console.log('GetStartNode: ' + IDNode);

                                                /* 3) Valorizzazione Owner e Editors del Processo (GetOwner, GetEditors) */
                                                business.GetOwner(IDNode, IDRecord, myIdAccount, sql).then(listOf => {

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

                                                        business.PutFlowAccess(IDRecord, IDNode, StrGetOwner, StrGetEditors, sql).then(listOf => {

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
                                } else {
                                    conn.query("COMMIT", (err) => {
                                        if (err) {
                                            reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
                                        }
                                    });

                                    resolve(JSON.stringify("OK"));  
                                }
                            }
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
function RollBack(conn) {
    conn.query("ROLLBACK", () => conn.close());
}

module.exports = {
    GetOrdini,
    DeleteOrdine,
    PostOrdine,
}
