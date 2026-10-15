const express = require('express');
var exception = require('../../model/exception');
const sql = require('mssql/msnodesqlv8');
const config = require('../../utils/config')
var connection = require('../../config.db');
const business = require('../../crud/business');

function GetFormsVersion(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdModello = myRequest.IDModello
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

                    request.input('IDModello', sql.Int, myIdModello);
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_FORMS_VERSION", function (err, response) {
                        if (err) {
                            reject(
                                new exception(sender, err.message, err.name, err.stack)
                            );
                        } else {
                            if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {

                                var myResponse = JSON.stringify(response);

                                if (JSON.parse(myResponse).recordsets.length > 0) {

                                    var resultData = JSON.stringify(response.recordsets[0]);

                                    resolve(
                                        {
                                            resultdata: resultData,
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
function CreateFormsVersion(IDModello) {
    const sender = arguments.callee.name;

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err, conn) {
                if (err) {
                    reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
                    return;
                }

                var request = new sql.Request(conn);
                request.input('IDModello', sql.Int, IDModello);
                request.query(`
                    SET XACT_ABORT ON;
                    BEGIN TRY
                        BEGIN TRANSACTION;

                        DECLARE @Numero int;
                        SELECT @Numero = ISNULL(MAX(Numero), 0) + 1
                        FROM dbo.TModelliVersioni WITH (UPDLOCK, HOLDLOCK)
                        WHERE IDModello = @IDModello;

                        INSERT INTO dbo.TModelliVersioni (IDModello, Numero, DataVersione, DataIstanza, IsVisible)
                        OUTPUT INSERTED.IDVersione, INSERTED.IDModello, INSERTED.Numero,
                            INSERTED.DataVersione, INSERTED.DataIstanza, INSERTED.IsVisible
                        VALUES (@IDModello, @Numero, GETDATE(), NULL, 1);

                        COMMIT TRANSACTION;
                    END TRY
                    BEGIN CATCH
                        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                        THROW;
                    END CATCH;
                `, function (queryError, result) {
                    if (queryError) {
                        reject(JSON.stringify(new exception(sender, queryError.message, queryError.name, queryError.stack)));
                    } else {
                        resolve(result.recordset[0]);
                    }
                });
            });
        }
        catch (err) {
            reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
        }
    });
    return customPromise;
}
function DeleteFormsVersion(IDVersione) {
    const sender = arguments.callee.name;

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err, conn) {
                if (err) {
                    reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
                    return;
                }

                var request = new sql.Request(conn);
                request.input('IDVersione', sql.Int, IDVersione);
                request.query(`
                    SET XACT_ABORT ON;
                    BEGIN TRY
                        BEGIN TRANSACTION;

                        IF NOT EXISTS (
                            SELECT 1
                            FROM dbo.TModelliVersioni WITH (UPDLOCK, HOLDLOCK)
                            WHERE IDVersione = @IDVersione
                        )
                            THROW 50001, 'Versione non trovata.', 1;

                        IF EXISTS (SELECT 1 FROM dbo.TModelliIstanze WHERE IDVersione = @IDVersione)
                            OR EXISTS (SELECT 1 FROM dbo.TModelliProdottiClassi WHERE IDVersione = @IDVersione OR IDVersioneValutazione = @IDVersione)
                            THROW 50002, 'Impossibile eliminare la versione: esistono istanze o associazioni collegate.', 1;

                        DECLARE @IDClassi TABLE (IDClasse int PRIMARY KEY);
                        INSERT INTO @IDClassi (IDClasse)
                        SELECT IDClasse
                        FROM dbo.TModelliClassi
                        WHERE IDVersione = @IDVersione;

                        IF EXISTS (
                            SELECT 1
                            FROM dbo.TModelliIstanzeRecords AS records
                            INNER JOIN @IDClassi AS classes ON classes.IDClasse = records.IDClasse
                        )
                            THROW 50003, 'Impossibile eliminare la versione: le classi sono utilizzate da record.', 1;

                        DECLARE @IDAttributi TABLE (IDAttributo int PRIMARY KEY);
                        INSERT INTO @IDAttributi (IDAttributo)
                        SELECT attributes.IDAttributo
                        FROM dbo.TModelliClassiAttributi AS attributes
                        INNER JOIN @IDClassi AS classes ON classes.IDClasse = attributes.IDClasse;

                        IF EXISTS (
                            SELECT 1
                            FROM dbo.TAttributiCondizioni AS conditions
                            INNER JOIN @IDAttributi AS attributes ON attributes.IDAttributo = conditions.IDAttributo
                        ) OR EXISTS (
                            SELECT 1
                            FROM dbo.TModelliIstanzeRecord AS records
                            INNER JOIN @IDAttributi AS attributes ON attributes.IDAttributo = records.IDAttributo
                        )
                            THROW 50004, 'Impossibile eliminare la versione: gli attributi sono utilizzati da condizioni o record.', 1;

                        DELETE media
                        FROM dbo.TModelliClassiAttributiMedia AS media
                        INNER JOIN @IDAttributi AS attributes ON attributes.IDAttributo = media.IDAttributo;

                        DELETE valuesTable
                        FROM dbo.TModelliClassiAttributiValues AS valuesTable
                        INNER JOIN @IDAttributi AS attributes ON attributes.IDAttributo = valuesTable.IDAttributo;

                        DELETE attributes
                        FROM dbo.TModelliClassiAttributi AS attributes
                        INNER JOIN @IDClassi AS classes ON classes.IDClasse = attributes.IDClasse;

                        DELETE classes
                        FROM dbo.TModelliClassi AS classes
                        INNER JOIN @IDClassi AS selectedClasses ON selectedClasses.IDClasse = classes.IDClasse;

                        DELETE FROM dbo.TModelliVersioni
                        WHERE IDVersione = @IDVersione;

                        COMMIT TRANSACTION;
                    END TRY
                    BEGIN CATCH
                        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                        THROW;
                    END CATCH;
                `, function (queryError) {
                    if (queryError) {
                        reject(JSON.stringify(new exception(sender, queryError.message, queryError.name, queryError.stack)));
                    } else {
                        resolve(true);
                    }
                });
            });
        }
        catch (err) {
            reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
        }
    });
    return customPromise;
}
function GetForms(myRequest) {
    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myLanguageContext = myRequest.LanguageContext;
    var myOffsetRows = myRequest.OffsetRows;
    var myNextRows = myRequest.NextRows;
    var myFilter = myRequest.Filter;

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
                    request.input('Filter', sql.NVarChar(sql.MAX), myFilter);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_FORMS_LIST", function (err, response) {
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
                                            resultdata: resultData,
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
function DeleteForms(myRequest) {

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
function PostForms(myRequest) {

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

    //console.log(myRequest);

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

                        const requestCheckArtworkOrdine = new sql.Request();
                        requestCheckArtworkOrdine.query("SELECT COUNT(*) AS CheckRichiestaAssistenza FROM dbo.TRichiesteAssistenza WHERE IDModelloIstanza = " + myIDModelloIstanza, (err, response) => {
                            if (err) {
                                RollBack(conn); reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
                            } else {

                                var CheckRichiestaAssistenza = response.recordset[0].CheckRichiestaAssistenza;

                                if (CheckRichiestaAssistenza == 0) {
                                    /* 1. Registrazione nuova richiesta in tabella dbo.TRichiesteAssistenza */
                                    const requestPostRichiestaAssistenza = new sql.Request();
                                    requestPostRichiestaAssistenza.input('IDModelloIstanza', sql.Int, myIDModelloIstanza);
                                    requestPostRichiestaAssistenza.input('IdAccount', sql.Int, myIdAccount);
                                    requestPostRichiestaAssistenza.query("INSERT INTO TRichiesteAssistenza (IDModelloIstanza, IDIstanziatore) OUTPUT INSERTED.IDRichiestaAssistenza VALUES (@IDModelloIstanza, @IdAccount)", (err, response) => {

                                        if (err) {
                                            RollBack(conn); reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
                                        } else {

                                            var IDRecord = response.recordset[0].IDRichiestaAssistenza;
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

                                                        business.PutFlowAccess(IDRecord, IDNode, StrGetOwner, StrGetEditors, myIdAccount, null, sql).then(listOf => {

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
function PostModel(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myLanguageContext = myRequest.LanguageContext;
    var myRequestBody = JSON.stringify(myRequest.RequestBody);

    console.log('myIdAttore: ' + myIdAttore);
    console.log('myIdAccount: ' + myIdAccount);
    console.log('myLanguageContext: ' + myLanguageContext);
    console.log('myRequestBody: ' + myRequestBody);

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {
                    var request = new sql.Request();

                    request.input('IDCliente', sql.Int, parseInt(myIdAttore));
                    request.input('IDIstanziatore', sql.Int, myIdAccount);
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.input('RequestBody', sql.NVarChar(sql.MAX), myRequestBody);
                    request.output('Status', sql.NVarChar(500));

                    request.execute("SP_POST_MODEL", function (err, response) {
                        if (err) {
                            reject(
                                new exception(sender, err.message, err.name, err.stack)
                            );
                        } else {
                            if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                                resolve("OK");
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
function RollBack(conn) {
    conn.query("ROLLBACK", () => conn.close());
}

module.exports = {
    GetForms,
    GetFormsVersion,
    CreateFormsVersion,
    DeleteFormsVersion,
    DeleteForms,
    PostForms,
    PostModel,
}
