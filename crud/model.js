const express = require('express');
var exception = require('../model/exception');
const sql = require('mssql/msnodesqlv8');
const config = require('../utils/config')
var connection = require('../config.db');
function GetModelClass(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdVersione = myRequest.IdVersione;
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

                    request.input('IdVersione', sql.Int, parseInt(myIdVersione));
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_MODEL_CLASS", function (err, response) {
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
function GetModelClassAttribute(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdVersione = myRequest.IdVersione;
    var myIdClasse = myRequest.IdClasse;
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

                    request.input('IdClasse', sql.Int, parseInt(myIdClasse));
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_MODEL_CLASS_ATTRIBUTE", function (err, response) {
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
function GetModelClassAttributeValues(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdAccount = myRequest.IdAccount;
    var myIdVersione = myRequest.IdVersione;
    var myIdClasse = myRequest.IdClasse;
    var myIdAttributo = myRequest.IdAttributo;
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

                    request.input('IdAttributo', sql.Int, parseInt(myIdAttributo));
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500))

                    request.execute("SP_GET_MODEL_CLASS_ATTRIBUTE_VALUES", function (err, response) {
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
function PostIdModelloIstanza(myRequest) {

    const sender = arguments.callee.name;

    var myIdAttore = myRequest.IdAttore;
    var myIdVersione = myRequest.IdVersione;
    var myIdAccount = myRequest.IdAccount;
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

                    request.input('IDCliente', sql.Int, parseInt(myIdAttore));
                    request.input('IDVersione', sql.Int, myIdVersione);
                    request.input('IDIstanziatore', sql.Int, myIdAccount);
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('IDModelloIstanza', sql.Int);
                    request.output('Status', sql.NVarChar(500));

                    request.execute("SP_POST_IDMODELLO_ISTANZA", function (err, response) {
                        if (err) {
                            reject(
                                new exception(sender, err.message, err.name, err.stack)
                            );
                        } else {
                            if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                                resolve(
                                    JSON.parse(JSON.stringify(response.output)).IDModelloIstanza
                                );
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
function PostIdModelloIstanzaRecord(myRequest) {

    const sender = arguments.callee.name;

    var myIdRecord = myRequest.IdRecord;
    var myIdAttributo = myRequest.IdAttributo;
    var myIdAccount = myRequest.IdAccount;
    var myRecordValue = myRequest.RecordValue
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

                    request.input('IDRecord', sql.Int, parseInt(myIdRecord));
                    request.input('IDAttributo', sql.Int, myIdAttributo);
                    request.input('IDIstanziatore', sql.Int, myIdAccount);
                    request.input('RecordValue', sql.NVarChar('MAX'), myRecordValue);
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500));

                    request.execute("SP_POST_IDMODELLO_ISTANZA_RECORD", function (err, response) {
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
function PostIdModelloIstanzaRecordMedia(myRequest) {

    const sender = arguments.callee.name;

    var myIdRecord = myRequest.IdRecord;
    var myIdAttributo = myRequest.IdAttributo;
    var myIdAccount = myRequest.IdAccount;
    var myOriginalFilename = myRequest.originalFilename;
    var myNewFilename = myRequest.newFilename;
    var myMimeType = myRequest.mimetype;
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

                    request.input('IDRecord', sql.Int, parseInt(myIdRecord));
                    request.input('IDAttributo', sql.Int, myIdAttributo);
                    request.input('IDIstanziatore', sql.Int, myIdAccount);
                    request.input('OriginalFilename', sql.NVarChar('MAX'), myOriginalFilename);
                    request.input('NewFilename', sql.NVarChar('MAX'), myNewFilename);
                    request.input('MimeType', sql.NVarChar('MAX'), myMimeType);
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500));

                    request.execute("SP_POST_IDMODELLO_ISTANZA_RECORD_MEDIA", function (err, response) {
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
function DeleteIdModelloIstanzaRecordMedia(myRequest) {

    const sender = arguments.callee.name;

    var myIdRecord = myRequest.IdRecord;
    var myIdAttributo = myRequest.IdAttributo;
    var myIdAccount = myRequest.IdAccount;
    var myOriginalFilename = myRequest.originalFilename;
    var myNewFilename = myRequest.newFilename;
    var myMimeType = myRequest.mimetype;
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

                    request.input('IDIstanziatore', sql.Int, myIdAccount);
                    request.input('NewFilename', sql.NVarChar('MAX'), myNewFilename);
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('Status', sql.NVarChar(500));

                    request.execute("SP_DELETE_IDMODELLO_ISTANZA_RECORD_MEDIA", function (err, response) {
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
function GetIdModelloIstanzaRecord(myRequest) {

    const sender = arguments.callee.name;

    var myIdModelloIstanza = myRequest.IdModelloIstanza;
    var myIdClasse = myRequest.IdClasse;
    var myIdAccount = myRequest.IdAccount;
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

                    request.input('IDModelloIstanza', sql.Int, parseInt(myIdModelloIstanza));
                    request.input('IDClasse', sql.Int, myIdClasse);
                    request.input('IDIstanziatore', sql.Int, myIdAccount);
                    request.input('LanguageContext', sql.NVarChar(2), myLanguageContext);
                    request.output('IDRecord', sql.Int);
                    request.output('Status', sql.NVarChar(500));

                    request.execute("SP_GET_IDMODELLO_ISTANZA_RECORD", function (err, response) {
                        if (err) {
                            reject(
                                new exception(sender, err.message, err.name, err.stack)
                            );
                        } else {
                            if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                                resolve(
                                    JSON.parse(JSON.stringify(response.output)).IDRecord
                                );
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
function GetIdModelloIstanzaRecordValue(myRequest) {

    const sender = arguments.callee.name;

    var myIdRecord = myRequest.IdRecord;
    var myIdAttributo = myRequest.IdAttributo;

    const customPromise = new Promise((resolve, reject) => {
        try {
            sql.connect(connection, function (err) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {
                    var request = new sql.Request();

                    request.input('IDRecord', sql.Int, parseInt(myIdRecord));
                    request.input('IDAttributo', sql.Int, myIdAttributo);
                    request.output('RecordValue', sql.NVarChar('MAX'));
                    request.output('Status', sql.NVarChar(500));

                    request.execute("SP_GET_IDMODELLO_ISTANZA_RECORD_VALUE", function (err, response) {
                        if (err) {
                            reject(
                                new exception(sender, err.message, err.name, err.stack)
                            );
                        } else {
                            if (JSON.parse(JSON.stringify(response.output)).Status == 'OK') {
                                resolve(
                                    JSON.parse(JSON.stringify(response.output)).RecordValue
                                );
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
    GetModelClass,
    GetModelClassAttribute,
    GetModelClassAttributeValues,
    PostIdModelloIstanza,
    PostIdModelloIstanzaRecord,
    PostIdModelloIstanzaRecordMedia,
    DeleteIdModelloIstanzaRecordMedia,
    GetIdModelloIstanzaRecord,
    GetIdModelloIstanzaRecordValue,
}
