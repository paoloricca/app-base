const express = require('express');
var exception = require('../model/exception');
const sql = require('mssql/msnodesqlv8');
const config = require('../utils/config')
var connection = require('../config.db');
const business = require('../crud/business');

function GetWorkflow(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdProcesso = myRequest.IdProcesso;
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
                    request.input('IdAttore', sql.Int, myIdAttore);
                    request.input('IdAccount', sql.Int, myIdAccount);
                    request.input('IdProcesso', sql.Int, myIdProcesso);
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_WORKFLOW_LIST", function (err, response) {
                        if (err) {
                            reject(
                                new exception(sender, err.message, err.name, err.stack)
                            );
                        } else {
                            //console.log("response: " + JSON.stringify(response));
                            if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                                var myResponse = JSON.stringify(response);

                                if (JSON.parse(myResponse).recordsets.length > 0) {

                                    //console.log("recordsets[0]: " + JSON.parse(myResponse).recordsets[0]);

                                    var resultStates = JSON.stringify(response.recordsets[0]);
                                    var resultTransitions = JSON.stringify(response.recordsets[1]);

                                    //console.log("resultStates: " + resultStates);
                                    //console.log("resultTransitions: " + resultTransitions);

                                    resolve(
                                        {
                                            states: resultStates,
                                            transitions: resultTransitions
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
function GetWorkflowNodeOwner(myRequest)
{
    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdEventoTransizione = myRequest.IdEventoTransizione;
    var myLanguageContext = myRequest.LanguageContext;

    //console.log(myIdAttore)
    //console.log(myIdAccount)
    //console.log(myIdEventoTransizione)
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
                    request.input('IdEventoTransizione', sql.Int, parseInt(myIdEventoTransizione));
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(2))

                    request.execute("SP_GET_WORKFLOW_NODE_OWNER", function (err, response) {
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
function PostWorkflowNodeOwner(myRequest) {
    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdEventoTransizione = myRequest.IdEventoTransizione;
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
                    request.input('IdAttore', sql.Int, myIdAttore);
                    request.input('IdAccount', sql.Int, myIdAccount);
                    request.input('IdEventoTransizione', sql.Int, myIdEventoTransizione);
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);

                    request.input('IsCreator', sql.NVarChar(50), myRequest.RequestBody.IsCreator);
                    request.input('IsAdminOwnerSelectedNode', sql.NVarChar(50), myRequest.RequestBody.IsAdminOwnerSelectedNode);
                    request.input('IsAdminOfCreator', sql.NVarChar(50), myRequest.RequestBody.IsAdminOfCreator);
                    request.input('IsOwnerSelectedNode', sql.NVarChar(50), myRequest.RequestBody.IsOwnerSelectedNode);
                    request.input('IsCreatorSelectedNode', sql.NVarChar(50), myRequest.RequestBody.IsCreatorSelectedNode);
                    request.input('IsSelectedProfile', sql.NVarChar(50), myRequest.RequestBody.IsSelectedProfile);
                    request.input('IsUsersFromAdminProfileCreator', sql.NVarChar(50), myRequest.RequestBody.IsUsersFromAdminProfileCreator);

                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_POST_WORKFLOW_NODE_OWNER", function (err, response) {
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
function PostWorkflowNodeLink(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myLanguageContext = myRequest.LanguageContext;
    var myIdEventoDirezione = myRequest.IdEventoDirezione;

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {
                    var request = new sql.Request();
                    request.input('IdAttore', sql.Int, myIdAttore);
                    request.input('IdAccount', sql.Int, myIdAccount);
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.input('IdEventoDirezione', sql.Int, myIdEventoDirezione);

                    request.input('Code_IT', sql.NVarChar(50), myRequest.Code_IT);
                    request.input('Code_GB', sql.NVarChar(50), myRequest.Code_GB);
                    request.input('Code_ES', sql.NVarChar(50), myRequest.Code_ES);
                    request.input('Code_CN', sql.NVarChar(50), myRequest.Code_CN);
                    request.input('Text_IT', sql.NVarChar(50), myRequest.Text_IT);
                    request.input('Text_GB', sql.NVarChar(50), myRequest.Text_GB);
                    request.input('Text_ES', sql.NVarChar(50), myRequest.Text_ES);
                    request.input('Text_CN', sql.NVarChar(50), myRequest.Text_CN);
                    request.input('IsAvailableNote', sql.NVarChar(50), myRequest.IsAvailableNote);
                    request.input('RequiredConfirmation', sql.NVarChar(50), myRequest.RequiredConfirmation);

                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_POST_WORKFLOW_NODE_LINK", function (err, response) {
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
function PutWorkflowNodeState(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myLanguageContext = myRequest.LanguageContext;
    var myIdEventoTransizione = myRequest.IdEventoTransizione;

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {
                    var request = new sql.Request();
                    request.input('IdAttore', sql.Int, myIdAttore);
                    request.input('IdAccount', sql.Int, myIdAccount);
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.input('IdEventoTransizione', sql.Int, myIdEventoTransizione);

                    request.input('Code_IT', sql.NVarChar(50), myRequest.Code_IT);
                    request.input('Code_GB', sql.NVarChar(50), myRequest.Code_GB);
                    request.input('Code_ES', sql.NVarChar(50), myRequest.Code_ES);
                    request.input('Code_CN', sql.NVarChar(50), myRequest.Code_CN);
                    request.input('Text_IT', sql.NVarChar(50), myRequest.Text_IT);
                    request.input('Text_GB', sql.NVarChar(50), myRequest.Text_GB);
                    request.input('Text_ES', sql.NVarChar(50), myRequest.Text_ES);
                    request.input('Text_CN', sql.NVarChar(50), myRequest.Text_CN);

                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_PUT_WORKFLOW_NODE_STATE", function (err, response) {
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
function GetWorkflowNodeStates(myRequest)
{
    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdProcesso = myRequest.IdProcesso;
    var myLanguageContext = myRequest.LanguageContext;

    //console.log(myIdAttore)
    //console.log(myIdAccount)
    //console.log(myIdProcesso)
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
                    request.input('IdProcesso', sql.Int, parseInt(myIdProcesso));
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(2))

                    request.execute("SP_GET_WORKFLOW_NODE_STATES", function (err, response) {
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
function GetWorkflowTransitionsByIdProcesso(myRequest) {
    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdProcesso = myRequest.IdProcesso;
    var myLanguageContext = myRequest.LanguageContext;

    //console.log(myIdAttore)
    //console.log(myIdAccount)
    //console.log(myIdProcesso)
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
                    request.input('IdProcesso', sql.Int, parseInt(myIdProcesso));
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(2))

                    request.execute("SP_GET_WORKFLOW_TRANSITIONS_BY_IDPROCESSO", function (err, response) {
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
function PutWorkflowUpdateNodePosition(myRequest) {
    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdEventoTransizione = myRequest.IdEventoTransizione;
    var myXPos = myRequest.XPos;
    var myYPos = myRequest.YPos;
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
                    request.input('IdAttore', sql.Int, myIdAttore);
                    request.input('IdAccount', sql.Int, myIdAccount);
                    request.input('IdEventoTransizione', sql.Int, myIdEventoTransizione);
                    request.input('XPos', sql.NVarChar(50), myXPos);
                    request.input('YPos', sql.NVarChar(50), myYPos);
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_PUT_WORKFLOW_UPDATE_NODE_POSITION", function (err, response) {
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
function PostWorkflowNewNode(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdProcesso = myRequest.IdProcesso;
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
                    request.input('IdAttore', sql.Int, myIdAttore);
                    request.input('IdAccount', sql.Int, myIdAccount);
                    request.input('IdProcesso', sql.Int, myIdProcesso);
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_POST_WORKFLOW_NEW_NODE", function (err, response) {
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
function DeleteWorkflowDelLink(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdEventoDirezione = myRequest.IdEventoDirezione;
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
                    request.input('IdAttore', sql.Int, myIdAttore);
                    request.input('IdAccount', sql.Int, myIdAccount);
                    request.input('IdEventoDirezione', sql.Int, myIdEventoDirezione);
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_DELETE_WORKFLOW_DEL_LINK", function (err, response) {
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
function DeleteWorkflowDelState(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdEventoTransizione = myRequest.IdEventoTransizione;
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
                    request.input('IdAttore', sql.Int, myIdAttore);
                    request.input('IdAccount', sql.Int, myIdAccount);
                    request.input('IdEventoTransizione', sql.Int, myIdEventoTransizione);
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_DELETE_WORKFLOW_DEL_STATE", function (err, response) {
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
function PostWorkflowLinkNode(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdTransizioneStart = myRequest.IdTransizioneStart;
    var myIdTransizioneEnd = myRequest.IdTransizioneEnd;
    var myLanguageContext = myRequest.LanguageContext;

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
                    request.input('IdAttore', sql.Int, myIdAttore);
                    request.input('IdAccount', sql.Int, myIdAccount);
                    request.input('IdTransizioneStart', sql.Int, myIdTransizioneStart);
                    request.input('IdTransizioneEnd', sql.Int, myIdTransizioneEnd);
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_POST_WORKFLOW_LINK_NODE", function (err, response) {
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
    GetWorkflow,
    GetWorkflowActions,
    GetHasWorkflowTransitions,
    GetWorkflowTransitions,
    GetWorkflowNodeOwner,
    PostWorkflowNodeOwner,
    PostWorkflowNodeLink,
    PutWorkflowNodeState,
    GetWorkflowHistory,
    GetWorkflowTransitionsByIdProcesso,
    GetWorkflowNodeStates,
    PutWorkflowUpdateNodePosition,
    PostWorkflow,
    PostWorkflowNewNode,
    PostWorkflowLinkNode,
    DeleteWorkflowDelState,
    DeleteWorkflowDelLink,
}
