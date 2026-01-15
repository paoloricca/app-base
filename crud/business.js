const express = require('express');

var exception = require('../model/exception');

function DeleteProcessRecord(IDProcesso, IDRecord, IDAccount, sql) {

    const sender = arguments.callee.name;

    const customPromiseDeleteProcessRecord = new Promise((resolve, reject) => {
        try {

            var request = new sql.Request();

            request.input('IDAccount', sql.Int, parseInt(IDAccount));
            request.input('IDProcesso', sql.Int, parseInt(IDProcesso));
            request.input('IDRecord', sql.Int, parseInt(IDRecord));
            request.output('Status', sql.NVarChar(500))

            request.execute("SP_DELETE_PROCESS_RECORD", function (err, response) {
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
        catch (err) {
            reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
        } 
    });
    return customPromiseDeleteProcessRecord
}
function DeleteIdModelloIstanza(IDModelloIstanza, IDAccount, sql) {

    const sender = arguments.callee.name;

    const customPromiseDeleteIdModelloIstanza = new Promise((resolve, reject) => {
        try {

            var request = new sql.Request();

            request.input('IDAccount', sql.Int, parseInt(IDAccount));
            request.input('IDModelloIstanza', sql.Int, parseInt(IDModelloIstanza));
            request.output('Status', sql.NVarChar(500))

            request.execute("SP_DELETE_ISTANZA_MODELLO", function (err, response) {
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
        catch (err) {
            reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
        } 
    });
    return customPromiseDeleteIdModelloIstanza

}
function GetStartNode(IDProcesso, IDAttore, LanguageContext, sql) {
    const sender = arguments.callee.name;

    const customPromiseGetEditors = new Promise((resolve, reject) => {
        try {

            var request = new sql.Request();

            request.input('IDAttore', sql.Int, parseInt(IDAttore));
            request.input('IDProcesso', sql.Int, parseInt(IDProcesso));
            request.input('LanguageContext', sql.NVarChar(2), LanguageContext);
            request.output('Result', sql.NVarChar(500))
            request.output('Status', sql.NVarChar(2))

            request.execute("SP_GET_START_NODE", function (err, response) {
                if (err) {
                    reject(
                        new exception(sender, err.message, err.name, err.stack)
                    );
                } else {
                    if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                        resolve(JSON.parse(JSON.stringify(response.output)).Result)
                    } else {
                        reject(
                            new exception(sender, JSON.parse(JSON.stringify(response.output)).Status, null, null)
                        );
                    }
                }
            });
        }
        catch (err) {
            reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
        }
    });

    return customPromiseGetEditors
}
function GetOwner(IDNode, IDRecord, IDAccount, sql) {

    const sender = arguments.callee.name;

    const customPromiseGetOwner = new Promise((resolve, reject) => {
        try {

            var request = new sql.Request();

            request.input('IDAccount', sql.Int, parseInt(IDAccount));
            request.input('IDNode', sql.Int, parseInt(IDNode));
            request.input('IDRecord', sql.Int, parseInt(IDRecord));
            request.output('Result', sql.NVarChar(500))
            request.output('Status', sql.NVarChar(2))

            request.execute("SP_GET_OWNER", function (err, response) {
                if (err) {
                    reject(
                        new exception(sender, err.message, err.name, err.stack)
                    );
                } else {
                    if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                        resolve(JSON.parse(JSON.stringify(response.output)).Result)
                    } else {
                        reject(
                            new exception(sender, JSON.parse(JSON.stringify(response.output)).Status, null, null)
                        );
                    }
                }
            });

            ///* Verifica owner (TEventiTransizioniOwner) */
            //var request = new sql.Request();
            //request.query("SELECT * FROM TEventiTransizioniOwner Where IDEventoTransizione = " + IDNode, (err, response) => {
            //    if (err) {
            //        reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
            //    } else {
            //        if
            //            (response.recordset[0].IsCreator) {
            //            resolve("@" + IDAccount);
            //        } else if
            //            (response.recordset[0].IsAdminOwnerSelectedNode) {

            //            var StrGetOwner = "";
            //            var request = new sql.Request();

            //            request.query("SELECT Owner FROM TEventiStati Where IDRecord = " + IDRecord + " AND IDEventoTransizione = " + response.recordset[0].IsAdminOwnerSelectedNode, (err, response) => {
            //                if (err) {
            //                    reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
            //                } else {

            //                    var OwnerStatoSelezionato = response.recordset[0].Owner;
            //                    const ArOwnerIDAccount = (OwnerStatoSelezionato || "").toString().split("@");
            //                    ArOwnerIDAccount.forEach(IDAccount => {

            //                        /* Estrazione IDGruppoOperativo del profilo utente predefinito */
            //                        var request = new sql.Request();
            //                        request.query("SELECT IDGruppoOperativo FROM TProfiliUtenteRisorse Where IDAccount = " + IDAccount + " AND IsDefault = 'True'", (err, response) => {
            //                            if (err) {
            //                                reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
            //                            } else {
            //                                const GruppoOperativoPredefinito = response.recordset[0].IDGruppoOperativo;

            //                                /* Estrazione responsabile gruppo di lavoro */
            //                                var request = new sql.Request();
            //                                request.query("SELECT Supervisor AS IDAccount FROM TGruppiOperativi Where IDGruppoOperativo = " + GruppoOperativoPredefinito, (err, response) => {
            //                                    if (err) {
            //                                        reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
            //                                    } else {
            //                                        const ResponsabileGruppoOperativo = response.recordset[0].IDAccount;
            //                                        if (StrGetOwner.indexOf("@" + ResponsabileGruppoOperativo) === -1) {
            //                                            StrGetOwner += "@" + ResponsabileGruppoOperativo.toString()
            //                                        }
            //                                        resolve(StrGetOwner);
            //                                    }
            //                                });
            //                            }
            //                        });
            //                    });
            //                }
            //            });


            //        } else if
            //            (response.recordset[0].IsOwnerSelectedNode) {
            //            /* Estrazione owner stato selezionato */
            //            var StrGetOwner = "";
            //            var request = new sql.Request();
            //            request.query("SELECT Owner FROM TEventiStati Where IDRecord = " + IDRecord + " AND IDEventoTransizione = " + response.recordset[0].IsOwnerSelectedNode, (err, response) => {
            //                if (err) {
            //                    reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
            //                } else {
            //                    var OwnerStatoSelezionato = response.recordset[0].Owner;
            //                    const ArOwnerIDAccount = (OwnerStatoSelezionato || "").toString().split("@");
            //                    ArOwnerIDAccount.forEach(IDAccount => {
            //                        if (StrGetOwner.indexOf("@" + IDAccount) === -1) {
            //                            StrGetOwner += "@" + IDAccount.toString()
            //                        }
            //                    });
            //                    resolve(StrGetOwner);
            //                }
            //            });
            //        } else if
            //            (response.recordset[0].IsSelectedProfile) {
            //            /* Estrazione di tutti gli account collegati al profilo selezionato */
            //            var StrGetOwner = "";
            //            var request = new sql.Request();
            //            request.query("SELECT IDAccount FROM TProfiliUtenteRisorse Where IDProfiloUtente = " + response.recordset[0].IsSelectedProfile, (err, response) => {
            //                if (err) {
            //                    reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
            //                } else {
            //                    response.recordset.forEach(ItemOf => {
            //                        if (StrGetOwner.indexOf("@" + ItemOf.IDAccount) === -1) {
            //                            StrGetOwner += "@" + ItemOf.IDAccount.toString()
            //                        }
            //                    });
            //                    resolve(StrGetOwner);
            //                }
            //            });
            //        } else if
            //            (response.recordset[0].IsUsersFromAdminProfileCreator) {
            //            /* Estrazione di tutti gli Utenti del profilo associato all'utente che ha creato l'oggetto */
            //            var StrGetOwner = "";
            //            var request = new sql.Request();
            //            request.query("SELECT IDProfiloUtente FROM TProfiliUtenteRisorse Where IDAccount = " + IDAccount + " AND IsDefault = 'True'", (err, response) => {
            //                if (err) {
            //                    reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
            //                } else {

            //                    IDProfiloUtente = response.recordset[0].IDProfiloUtente;

            //                    var request = new sql.Request();
            //                    request.query("SELECT IDAccount FROM TProfiliUtenteRisorse Where IDProfiloUtente = " + IDProfiloUtente, (err, response) => {
            //                        if (err) {
            //                            reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
            //                        } else {
            //                            response.recordset.forEach(ItemOf => {
            //                                if (StrGetOwner.indexOf("@" + ItemOf.IDAccount) === -1) {
            //                                    StrGetOwner += "@" + ItemOf.IDAccount.toString()
            //                                }
            //                            });
            //                            resolve(StrGetOwner);
            //                        }
            //                    });
            //                }
            //            });

            //        } else if
            //            (response.recordset[0].IsAdminOfCreator) {

            //            /* Estrazione IDGruppoOperativo dell'utente che ha creato l'oggetto */
            //            var StrGetOwner = "";
            //            var request = new sql.Request();
            //            request.query("SELECT IDGruppoOperativo FROM TProfiliUtenteRisorse Where IDAccount = " + IDAccount + " AND IsDefault = 'True'", (err, response) => {
            //                if (err) {
            //                    reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
            //                } else {
            //                    const GruppoOperativoPredefinito = response.recordset[0].IDGruppoOperativo;

            //                    /* Estrazione responsabile gruppo di lavoro */
            //                    var request = new sql.Request();
            //                    request.query("SELECT Supervisor AS IDAccount FROM TGruppiOperativi Where IDGruppoOperativo = " + GruppoOperativoPredefinito, (err, response) => {
            //                        if (err) {
            //                            reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
            //                        } else {
            //                            const ResponsabileGruppoOperativo = response.recordset[0].IDAccount;
            //                            if (StrGetOwner.indexOf("@" + ResponsabileGruppoOperativo) === -1) {
            //                                StrGetOwner += "@" + ResponsabileGruppoOperativo.toString()
            //                            }
            //                            resolve(StrGetOwner);
            //                        }
            //                    });
            //                }
            //            });

            //        } 
            //    }
            //});           

        }
        catch (err) {
            reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
            }
        });
    return customPromiseGetOwner
}
function GetEditors(IDProcesso, IDNode, IDAccount, sql) {

    const sender = arguments.callee.name;

    const customPromiseGetEditors = new Promise((resolve, reject) => {
        try {

            var request = new sql.Request();

            request.input('IDAccount', sql.Int, parseInt(IDAccount));
            request.input('IDNode', sql.Int, parseInt(IDNode));
            request.input('IDProcesso', sql.Int, parseInt(IDProcesso));
            request.output('Result', sql.NVarChar(500))
            request.output('Status', sql.NVarChar(2))

            request.execute("SP_GET_EDITORS", function (err, response) {
                if (err) {
                    reject(
                        new exception(sender, err.message, err.name, err.stack)
                    );
                } else {
                    if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                        resolve(JSON.parse(JSON.stringify(response.output)).Result)
                    } else {
                        reject(
                            new exception(sender, JSON.parse(JSON.stringify(response.output)).Status, null, null)
                        );
                    }
                }
            });
        }
        catch (err) {
            reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
        }
    });
    
    return customPromiseGetEditors
}
function PutFlowAccess(IDRecord, IDNode, Owner, Editors, sql) {

    const sender = arguments.callee.name;

    const customPromisePutFlowAccess = new Promise((resolve, reject) => {
        try {

            var request = new sql.Request();

            request.input('IDRecord', sql.Int, parseInt(IDRecord));
            request.input('IDNode', sql.Int, parseInt(IDNode));
            request.input('Owner', sql.NVarChar(500), Owner);
            request.input('Editors', sql.NVarChar(500), Editors);
            request.output('Status', sql.NVarChar(500))

            request.execute("SP_PUT_FLOW_ACCESS", function (err, response) {
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
        catch (err) {
            reject(JSON.stringify(new exception(sender, err.message, err.name, err.stack)));
        } 
    });
    return customPromisePutFlowAccess
}
module.exports = {
    GetStartNode,
    GetOwner,
    GetEditors,
    PutFlowAccess,
    DeleteIdModelloIstanza,
    DeleteProcessRecord,
}
