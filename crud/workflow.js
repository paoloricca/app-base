const express = require('express');
var exception = require('../model/exception');
const sql = require('mssql/msnodesqlv8');
const config = require('../utils/config')
var connection = require('../config.db');
const business = require('../crud/business');
const { minimumIntervalMessage } = require('../utils/workflow-timing-message');

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
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_WORKFLOW_AZIONI", function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
                            if (response.output.Status !== 'OK') {
                                reject(JSON.stringify(new exception(sender, response.output.Status, null, null)));
                                return;
                            }
                            var myResponse = JSON.stringify(response);

                            if (JSON.parse(myResponse).recordset && JSON.parse(myResponse).recordset.length > 0) {

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
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_WORKFLOW_NODE_OWNER", function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
                            if (response.output.Status !== 'OK') {
                                reject(JSON.stringify(new exception(sender, response.output.Status, null, null)));
                                return;
                            }
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
                    request.input('ChatAllParticipants', sql.Bit, myRequest.RequestBody.ChatAllParticipants === true || myRequest.RequestBody.ChatAllParticipants === 'true');

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
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_WORKFLOW_TRANSITIONS_BY_IDPROCESSO", function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
                            var status = JSON.parse(JSON.stringify(response.output)).Status;
                            if (status != 'OK') {
                                reject(
                                    JSON.stringify(new exception(sender, status, null, null))
                                );
                                return;
                            }

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
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_WORKFLOW_TRANSITIONS", function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
                            if (response.output.Status !== 'OK') {
                                reject(JSON.stringify(new exception(sender, response.output.Status, null, null)));
                                return;
                            }
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
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_HAS_WORKFLOW_TRANSITIONS", function (err, response) {
                        if (err) {
                            reject(
                                JSON.stringify(new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {
                            var myResponse = JSON.stringify(response);
                            const status = JSON.parse(myResponse).output.Status;
                            if (status !== 'OK' && status !== 'KO') {
                                reject(JSON.stringify(new exception(sender, status, null, null)));
                                return;
                            }
                            resolve(JSON.stringify(status));
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
async function PostWorkflow(myRequest) {
    const sender = 'PostWorkflow';
    let transaction;
    let started = false;
    let aborted = false;
    try {
        const pool = await sql.connect(connection);
        transaction = new sql.Transaction(pool);
        transaction.on('rollback', function (wasAborted) { aborted = wasAborted; });
        await transaction.begin();
        started = true;
        const context = await new sql.Request(transaction)
            .input('Process', sql.Int, Number(myRequest.IdProcesso))
            .input('Record', sql.Int, Number(myRequest.IdRecord))
            .query(`
                SELECT P.IDModello, P.IDVersione, P.IDVersioneWorkflow AS ProcessVersion,
                       PR.IDVersioneWorkflow AS RecordVersion
                FROM dbo.TProcessi AS P
                LEFT JOIN dbo.TProcessiWorkflowRecord AS PR WITH (UPDLOCK, HOLDLOCK)
                    ON PR.IDProcesso = P.IDProcesso AND PR.IDRecord = @Record
                WHERE P.IDProcesso = @Process;
            `);
        const process = context.recordset[0];
        if (!process) throw new Error('Processo non trovato.');
        const dynamic = process.IDModello != null && process.IDVersione != null;
        const workflowVersion = dynamic ? process.RecordVersion : process.ProcessVersion;
        let currentState = null;
        if (dynamic) {
            if (!workflowVersion) throw new Error('Occorrenza workflow non trovata.');
            const state = await new sql.Request(transaction)
                .input('Record', sql.Int, Number(myRequest.IdRecord))
                .input('Version', sql.Int, workflowVersion)
                .query(`
                    SELECT TOP (1) S.IDEventoStato, S.IDEventoTransizione
                    FROM dbo.TEventiStati AS S WITH (UPDLOCK, HOLDLOCK)
                    INNER JOIN dbo.TEventiTransizioni AS N ON N.IDEventoTransizione = S.IDEventoTransizione
                    WHERE S.IDRecord = @Record AND N.IDVersioneWorkflow = @Version
                    ORDER BY S.DataIstanza DESC, S.IDEventoStato DESC;
                `);
            currentState = state.recordset[0];
            if (!currentState) throw new Error('Stato corrente non trovato.');
        }
        const transitions = await new sql.Request(transaction)
            .input('IdAttore', sql.Int, Number(myRequest.IdAttore))
            .input('IdAccount', sql.Int, Number(myRequest.IdAccount))
            .input('IdProfiloUtente', sql.Int, Number(myRequest.IdProfiloUtente || 0))
            .input('IdRecord', sql.Int, Number(myRequest.IdRecord))
            .input('IdProcesso', sql.Int, Number(myRequest.IdProcesso))
            .input('LanguageContext', sql.VarChar(2), myRequest.LanguageContext)
            .output('Status', sql.VarChar(500))
            .execute('SP_GET_WORKFLOW_TRANSITIONS');
        if (transitions.output.Status !== 'OK') throw new Error(transitions.output.Status || 'Errore nel caricamento delle transizioni.');
        const selected = (transitions.recordset || []).find(function (item) {
            return String(item.IDEventoDirezione) === String(myRequest.IdEventoDirezione) &&
                (!dynamic || Number(item.IDTransizioneStart) === Number(currentState.IDEventoTransizione));
        });
        if (!selected) throw new Error('Operazione non autorizzata: stato non applicabile da questo utente.');
        if (dynamic) {
            const missingField = await new sql.Request(transaction)
                .input('Process', sql.Int, Number(myRequest.IdProcesso))
                .input('Record', sql.Int, Number(myRequest.IdRecord))
                .input('Node', sql.Int, Number(currentState.IDEventoTransizione))
                .input('LanguageContext', sql.VarChar(2), myRequest.LanguageContext)
                .query(`
                    ;WITH MissingFields AS (
                        SELECT StateAction.IDEventoAzione,
                            Configured.IDAttributo,
                            COALESCE(NULLIF(CASE @LanguageContext
                                WHEN 'IT' THEN Attribute.Description_IT
                                WHEN 'GB' THEN Attribute.Description_GB
                                WHEN 'ES' THEN Attribute.Description_ES
                                WHEN 'CN' THEN Attribute.Description_CN
                            END, N''), NULLIF(Attribute.Description_IT, N''),
                            NULLIF(Attribute.Description_GB, N''), NULLIF(Attribute.Description_ES, N''),
                            Attribute.Description_CN) AS Description
                        FROM dbo.TEventiTransizioniAzioni AS StateAction
                        INNER JOIN dbo.TProcessiAzioni AS ProcessAction
                            ON ProcessAction.IDProcessoAzione = StateAction.IDProcessoAzione
                        INNER JOIN dbo.TEventiTransizioniAzioniAttributi AS Configured
                            ON Configured.IDEventoAzione = StateAction.IDEventoAzione
                        INNER JOIN dbo.TModelliClassiAttributi AS Attribute
                            ON Attribute.IDAttributo = Configured.IDAttributo
                        LEFT JOIN dbo.TModelliIstanzeRecords AS ClassRecord
                            ON ClassRecord.IDModelloIstanza = @Record
                            AND ClassRecord.IDClasse = Attribute.IDClasse
                        LEFT JOIN dbo.TModelliIstanzeRecord AS FieldValue
                            ON FieldValue.IDRecord = ClassRecord.IDRecord
                            AND FieldValue.IDAttributo = Configured.IDAttributo
                        WHERE StateAction.IDProcesso = @Process
                            AND StateAction.IDEventoTransizione = @Node
                            AND ProcessAction.Codice = 'Modifica'
                            AND NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(MAX), FieldValue.RecordValue))), N'') IS NULL
                    )
                    SELECT TOP (1) MissingField.IDAttributo, MissingField.Description,
                        AssignedUsers.Names AS AssignedUsers
                    FROM MissingFields AS MissingField
                    OUTER APPLY (
                        SELECT STUFF((
                            SELECT DISTINCT N', ' + NULLIF(
                                LTRIM(RTRIM(CONCAT(Login.Nome, N' ', Login.Cognome))), N'')
                            FROM dbo.TEventiTransizioniAzioni AS AssignedAction
                            INNER JOIN dbo.TProfiliUtente AS Profile
                                ON Profile.IDOwner = AssignedAction.IDOwner
                                AND Profile.IDGruppoOperativo = AssignedAction.IDGruppoOperativo
                                AND Profile.IDProfiloUtente = AssignedAction.IDProfiloUtente
                                AND Profile.IsVisible = 1
                            INNER JOIN dbo.TProfiliUtenteRisorse AS ProfileAccount
                                ON ProfileAccount.IDOwner = Profile.IDOwner
                                AND ProfileAccount.IDGruppoOperativo = Profile.IDGruppoOperativo
                                AND ProfileAccount.IDProfiloUtente = Profile.IDProfiloUtente
                            INNER JOIN dbo.VW_LOGIN AS Login
                                ON Login.IDAccount = ProfileAccount.IDAccount
                                AND Login.IsVisible = 1
                            WHERE AssignedAction.IDEventoAzione IN (
                                SELECT MissingAction.IDEventoAzione
                                FROM MissingFields AS MissingAction
                                WHERE MissingAction.IDAttributo = MissingField.IDAttributo
                            )
                                AND (ISNULL(AssignedAction.IsCreator, 0) = 0
                                    OR ProfileAccount.IDAccount = (
                                        SELECT Instance.IDIstanziatore
                                        FROM dbo.TModelliIstanze AS Instance
                                        WHERE Instance.IDModelloIstanza = @Record
                                    ))
                            FOR XML PATH(''), TYPE
                        ).value('.', 'NVARCHAR(MAX)'), 1, 2, N'') AS Names
                    ) AS AssignedUsers
                    ORDER BY MissingField.IDAttributo;
                `);
            if (missingField.recordset.length) {
                const fieldName = missingField.recordset[0].Description ||
                    ('#' + missingField.recordset[0].IDAttributo);
                const assignedUsers = missingField.recordset[0].AssignedUsers || {
                    IT: 'nessun utente assegnato',
                    GB: 'no users assigned',
                    ES: 'ningún usuario asignado',
                    CN: '未分配用户'
                }[myRequest.LanguageContext] || 'nessun utente assegnato';
                const messages = {
                    IT: 'È necessario compilare il campo (' + fieldName +
                        ') prima di cambiare stato: l\'operazione è incarico a (' + assignedUsers + ').',
                    GB: 'You must fill in the field (' + fieldName +
                        ') before changing state: the operation is assigned to (' + assignedUsers + ').',
                    ES: 'Es necesario completar el campo (' + fieldName +
                        ') antes de cambiar el estado: la operación está asignada a (' + assignedUsers + ').',
                    CN: '更改状态前必须填写字段（' + fieldName +
                        '）：此操作分配给（' + assignedUsers + '）。'
                };
                throw new Error(messages[myRequest.LanguageContext] || messages.IT);
            }
        }
        const noteAvailable = [true, 1, '1', 'true'].includes(selected.IsAvailableNote);
        const note = String(myRequest.Note || '').trim();
        const attachments = Array.isArray(myRequest.Attachments) ? myRequest.Attachments : [];
        if (attachments.length && !noteAvailable) {
            throw new Error('Gli allegati sono consentiti solo per transizioni con nota.');
        }
        if (myRequest.PostNoteAsMessage === true && note && !noteAvailable) {
            throw new Error('La nota non e consentita per questa transizione.');
        }
        if (dynamic) {
            const check = await new sql.Request(transaction)
                .input('Mode', sql.VarChar(10), 'CHECK')
                .input('IDProcesso', sql.Int, Number(myRequest.IdProcesso))
                .input('IDRecord', sql.Int, Number(myRequest.IdRecord))
                .input('IDStatoAtteso', sql.Int, currentState.IDEventoStato)
                .output('CanSwitch', sql.Bit)
                .execute('SP_PROCESS_WORKFLOW_TIMING');
            if (!check.output.CanSwitch) {
                const timing = await new sql.Request(transaction)
                    .input('Node', sql.Int, currentState.IDEventoTransizione)
                    .query(`
                        SELECT ValidityTime, ValidityType
                        FROM dbo.TEventiTransizioniTiming WITH (HOLDLOCK)
                        WHERE IDEventoTransizione = @Node AND TimingType = 0 AND TimingActive = 1;
                    `);
                if (timing.recordset.length !== 1) {
                    throw new Error('Configurazione intervallo minimo non valida.');
                }
                const minimum = timing.recordset[0];
                throw new Error(minimumIntervalMessage(myRequest.LanguageContext, minimum.ValidityTime, minimum.ValidityType));
            }
        }
        const node = Number(selected.IDTransizioneEnd);
        const owner = await new sql.Request(transaction)
            .input('IDAccount', sql.Int, Number(myRequest.IdAccount))
            .input('IDNode', sql.Int, node)
            .input('IDRecord', sql.Int, Number(myRequest.IdRecord))
            .output('Result', sql.NVarChar(sql.MAX))
            .output('Status', sql.NVarChar(500)).execute('SP_GET_OWNER');
        if (owner.output.Status !== 'OK') throw new Error(owner.output.Status || 'Errore nel calcolo degli owner.');
        const editors = await new sql.Request(transaction)
            .input('IDAccount', sql.Int, Number(myRequest.IdAccount))
            .input('IDNode', sql.Int, node)
            .input('IDProcesso', sql.Int, Number(myRequest.IdProcesso))
            .output('Result', sql.NVarChar(sql.MAX))
            .output('Status', sql.NVarChar(500)).execute('SP_GET_EDITORS');
        if (editors.output.Status !== 'OK') throw new Error(editors.output.Status || 'Errore nel calcolo degli editor.');
        const saved = await new sql.Request(transaction)
            .input('IDRecord', sql.Int, Number(myRequest.IdRecord))
            .input('IDNode', sql.Int, node)
            .input('Owner', sql.NVarChar(sql.MAX), owner.output.Result)
            .input('Editors', sql.NVarChar(sql.MAX), editors.output.Result)
            .input('IdAccount', sql.Int, Number(myRequest.IdAccount))
            .input('AvailableNote', sql.NVarChar(sql.MAX),
                myRequest.PostNoteAsMessage ? null : (myRequest.Note || null))
            .output('Status', sql.NVarChar(500)).execute('SP_PUT_FLOW_ACCESS');
        if (saved.output.Status !== 'OK') throw new Error(saved.output.Status || 'Errore nella registrazione dello stato.');

        let notificationAccounts = [];
        const messageCreated = noteAvailable && myRequest.PostNoteAsMessage === true &&
            (note.length > 0 || attachments.length > 0);
        if (messageCreated) {
            const state = await new sql.Request(transaction)
                .input('Record', sql.Int, Number(myRequest.IdRecord))
                .input('Node', sql.Int, node)
                .input('Version', sql.Int, workflowVersion)
                .query(`
                    SELECT TOP (1) S.IDEventoStato
                    FROM dbo.TEventiStati AS S WITH (UPDLOCK, HOLDLOCK)
                    INNER JOIN dbo.TEventiTransizioni AS N ON N.IDEventoTransizione = S.IDEventoTransizione
                    WHERE S.IDRecord = @Record AND S.IDEventoTransizione = @Node
                      AND N.IDVersioneWorkflow = @Version
                    ORDER BY S.DataIstanza DESC, S.IDEventoStato DESC;
                `);
            if (!state.recordset.length) throw new Error('Stato workflow registrato non trovato.');
            const message = await new sql.Request(transaction)
                .input('IDProcesso', sql.Int, Number(myRequest.IdProcesso))
                .input('IDRecord', sql.Int, Number(myRequest.IdRecord))
                .input('IDEventoStato', sql.Int, state.recordset[0].IDEventoStato)
                .input('IDAccount', sql.Int, Number(myRequest.IdAccount))
                .input('IDAttore', sql.Int, Number(myRequest.IdAttore))
                .input('Text', sql.NVarChar(sql.MAX), note)
                .input('Attachments', sql.NVarChar(sql.MAX), JSON.stringify(attachments))
                .execute('SP_POST_WORKFLOW_APPLY_MESSAGE');
            notificationAccounts = (message.recordset || []).map(row => Number(row.IDDestinatario));
        }
        await transaction.commit();
        started = false;
        return { notificationAccounts, messageCreated };
    } catch (error) {
        let transactionRolledBack = aborted;
        if (started && !aborted) {
            try {
                await transaction.rollback();
                transactionRolledBack = true;
            } catch (rollbackError) {
                const wrapped = new exception(sender, error.message + ' (rollback: ' + rollbackError.message + ')',
                    error.name, error.stack);
                wrapped.code = error.code;
                wrapped.transactionRolledBack = false;
                throw wrapped;
            }
        }
        const wrapped = new exception(sender, error.message, error.name, error.stack);
        wrapped.code = error.code;
        wrapped.transactionRolledBack = transactionRolledBack;
        throw wrapped;
    }
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
