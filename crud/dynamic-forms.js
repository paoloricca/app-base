const sql = require('mssql/msnodesqlv8');
const exception = require('../model/exception');
const connection = require('../config.db');

function executeProcedure(procedureName, inputs, outputs) {
    const sender = procedureName;

    return new Promise((resolve, reject) => {
        sql.connect(connection, function (connectionError, pool) {
            if (connectionError) {
                reject(JSON.stringify(new exception(
                    sender,
                    connectionError.message,
                    connectionError.name,
                    connectionError.stack
                )));
                return;
            }

            const request = new sql.Request(pool);
            Object.keys(inputs || {}).forEach(function (name) {
                const input = inputs[name];
                request.input(name, input.type, input.value);
            });
            request.output('Status', sql.NVarChar(500));
            Object.keys(outputs || {}).forEach(function (name) {
                request.output(name, outputs[name]);
            });

            request.execute(procedureName, function (queryError, result) {
                if (queryError) {
                    reject(JSON.stringify(new exception(
                        sender,
                        queryError.message,
                        queryError.name,
                        queryError.stack
                    )));
                    return;
                }

                if (!result.output || result.output.Status !== 'OK') {
                    reject(JSON.stringify(new exception(
                        sender,
                        result.output ? result.output.Status : 'Stored procedure returned no status.',
                        'StoredProcedureError',
                        ''
                    )));
                    return;
                }

                resolve(result);
            });
        });
    });
}

function intInput(value) {
    return { type: sql.Int, value: value == null || value === '' ? null : Number(value) };
}

function stringInput(value, length) {
    return { type: length === sql.MAX ? sql.NVarChar(sql.MAX) : sql.NVarChar(length), value: value };
}

function getProcessPage(IdProcesso, IdAccount, LanguageContext) {
    return executeProcedure('SP_GET_PROCESS_FORM_PAGE', {
        IdProcesso: intInput(IdProcesso),
        IdAccount: intInput(IdAccount),
        LanguageContext: stringInput(LanguageContext, 2)
    }).then(function (result) {
        return result.recordset[0] || null;
    });
}

function getFields(IdProcesso, IdAccount, LanguageContext) {
    return executeProcedure('SP_GET_PROCESS_FORM_FIELDS', {
        IdProcesso: intInput(IdProcesso),
        IdAccount: intInput(IdAccount),
        LanguageContext: stringInput(LanguageContext, 2)
    }).then(function (result) {
        return result.recordset || [];
    });
}

function getActions(IdProcesso, IdAccount, LanguageContext) {
    return executeProcedure('SP_GET_PROCESS_FORM_ACTIONS', {
        IdProcesso: intInput(IdProcesso),
        IdAccount: intInput(IdAccount),
        LanguageContext: stringInput(LanguageContext, 2)
    }).then(function (result) {
        return result.recordset || [];
    });
}

function getStates(IdProcesso, IdAccount, LanguageContext) {
    return executeProcedure('SP_GET_PROCESS_FORM_STATES', {
        IdProcesso: intInput(IdProcesso),
        IdAccount: intInput(IdAccount),
        LanguageContext: stringInput(LanguageContext, 2)
    }).then(function (result) {
        return result.recordset || [];
    });
}

function getRecords(IdProcesso, IdAttore, IdAccount, IdProfiloUtente, pageIndex, pageSize, LanguageContext, filter) {
    return executeProcedure('SP_GET_PROCESS_FORM_RECORDS', {
        IdProcesso: intInput(IdProcesso),
        IdAttore: intInput(IdAttore),
        IdAccount: intInput(IdAccount),
        IdProfiloUtente: intInput(IdProfiloUtente),
        PageIndex: intInput(pageIndex),
        PageSize: intInput(pageSize),
        LanguageContext: stringInput(LanguageContext, 2),
        FilterJson: stringInput(JSON.stringify(filter || []), sql.MAX)
    }).then(function (result) {
        return {
            rows: result.recordsets[0] || [],
            totalRecord: result.recordsets[1] && result.recordsets[1][0]
                ? result.recordsets[1][0].TotalRecord
                : 0
        };
    });
}

function getModelClasses(IdProcesso, IdVersione, IdAccount, LanguageContext) {
    return executeProcedure('SP_GET_PROCESS_FORM_CLASSES', {
        IdProcesso: intInput(IdProcesso),
        IdVersione: intInput(IdVersione),
        IdAccount: intInput(IdAccount),
        LanguageContext: stringInput(LanguageContext, 2)
    }).then(function (result) {
        return result.recordset || [];
    });
}

function getClassAttributes(IdProcesso, IdClasse, IdAccount, LanguageContext) {
    return executeProcedure('SP_GET_PROCESS_FORM_CLASS_ATTRIBUTES', {
        IdProcesso: intInput(IdProcesso),
        IdClasse: intInput(IdClasse),
        IdAccount: intInput(IdAccount),
        LanguageContext: stringInput(LanguageContext, 2)
    }).then(function (result) {
        return result.recordset || [];
    });
}

function getAttributeValues(IdProcesso, IdAttributo, IdAccount, LanguageContext) {
    return executeProcedure('SP_GET_PROCESS_FORM_ATTRIBUTE_VALUES', {
        IdProcesso: intInput(IdProcesso),
        IdAttributo: intInput(IdAttributo),
        IdAccount: intInput(IdAccount),
        LanguageContext: stringInput(LanguageContext, 2)
    }).then(function (result) {
        return result.recordset || [];
    });
}

function createInstance(IdProcesso, IdAttore, IdAccount, LanguageContext) {
    return executeProcedure('SP_POST_PROCESS_FORM_INSTANCE', {
        IdProcesso: intInput(IdProcesso),
        IdAttore: intInput(IdAttore),
        IdAccount: intInput(IdAccount),
        LanguageContext: stringInput(LanguageContext, 2)
    }, { IDModelloIstanza: sql.Int }).then(function (result) {
        return result.output.IDModelloIstanza;
    });
}

function getClassRecord(IdProcesso, IDModelloIstanza, IDClasse, IdAttore, IdAccount) {
    return executeProcedure('SP_GET_PROCESS_FORM_CLASS_RECORD', {
        IdProcesso: intInput(IdProcesso),
        IDModelloIstanza: intInput(IDModelloIstanza),
        IDClasse: intInput(IDClasse),
        IdAttore: intInput(IdAttore),
        IdAccount: intInput(IdAccount)
    }, { IDRecord: sql.Int }).then(function (result) {
        return result.output.IDRecord;
    });
}

function getRecordValue(IdProcesso, IDRecord, IDAttributo, IdAttore, IdAccount) {
    return executeProcedure('SP_GET_PROCESS_FORM_VALUE', {
        IdProcesso: intInput(IdProcesso),
        IDRecord: intInput(IDRecord),
        IDAttributo: intInput(IDAttributo),
        IdAttore: intInput(IdAttore),
        IdAccount: intInput(IdAccount)
    }, { RecordValue: sql.NVarChar(sql.MAX) }).then(function (result) {
        return result.output.RecordValue || '';
    });
}

function saveRecordValue(IdProcesso, IDRecord, IDAttributo, RecordValue, IdAttore, IdAccount) {
    return executeProcedure('SP_PUT_PROCESS_FORM_VALUE', {
        IdProcesso: intInput(IdProcesso),
        IDRecord: intInput(IDRecord),
        IDAttributo: intInput(IDAttributo),
        RecordValue: stringInput(RecordValue, sql.MAX),
        IdAttore: intInput(IdAttore),
        IdAccount: intInput(IdAccount)
    }).then(function () {
        return true;
    });
}

function saveRecordMedia(IdProcesso, IDRecord, IDAttributo, IdAttore, IdAccount, media) {
    return executeProcedure('SP_POST_PROCESS_FORM_MEDIA', {
        IdProcesso: intInput(IdProcesso),
        IDRecord: intInput(IDRecord),
        IDAttributo: intInput(IDAttributo),
        IdAttore: intInput(IdAttore),
        IdAccount: intInput(IdAccount),
        OriginalFilename: stringInput(media.originalFilename, sql.MAX),
        NewFilename: stringInput(media.newFilename, sql.MAX),
        MimeType: stringInput(media.mimetype, sql.MAX)
    }).then(function () {
        return true;
    });
}

function deleteRecordMedia(IdProcesso, IdAttore, IdAccount, fileName) {
    return executeProcedure('SP_DEL_PROCESS_FORM_MEDIA', {
        IdProcesso: intInput(IdProcesso),
        IdAttore: intInput(IdAttore),
        IdAccount: intInput(IdAccount),
        MediaName: stringInput(fileName, sql.MAX)
    }).then(function () {
        return true;
    });
}

function deleteInstance(IdProcesso, IDModelloIstanza, IdAttore, IdAccount) {
    return executeProcedure('SP_DEL_PROCESS_FORM_INSTANCE', {
        IdProcesso: intInput(IdProcesso),
        IDModelloIstanza: intInput(IDModelloIstanza),
        IdAttore: intInput(IdAttore),
        IdAccount: intInput(IdAccount)
    }).then(function () {
        return true;
    });
}

module.exports = {
    getProcessPage,
    getFields,
    getActions,
    getStates,
    getRecords,
    getModelClasses,
    getClassAttributes,
    getAttributeValues,
    createInstance,
    getClassRecord,
    getRecordValue,
    saveRecordValue,
    saveRecordMedia,
    deleteRecordMedia,
    deleteInstance
};
