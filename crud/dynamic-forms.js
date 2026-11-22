const sql = require('mssql/msnodesqlv8');
const exception = require('../model/exception');
const connection = require('../config.db');
const calculatedSummary = require('./forms/calculated-summary');
const calculatedMath = require('../controls/ux/calculated-fields');

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
    }).then(async function (result) {
        const actions = result.recordset || [];
        if (!actions.length) return actions;
        const pool = await sql.connect(connection);
        const primaryResult = await new sql.Request(pool)
            .input('IdProcesso', sql.Int, Number(IdProcesso))
            .query(`
                SELECT C.IDProcessoAzione, A.IsPrimary
                FROM dbo.TProcessiAzioniCustom AS C
                INNER JOIN dbo.TProcessiAzioni AS A
                    ON A.IDProcessoAzione = C.IDProcessoAzione
                WHERE C.IDProcesso = @IdProcesso
            `);
        const primaryById = new Map(primaryResult.recordset.map(action => [
            Number(action.IDProcessoAzione),
            action.IsPrimary === true || action.IsPrimary === 1
        ]));
        return actions.map(action => ({
            ...action,
            IsPrimary: primaryById.get(Number(action.IDProcessoAzione)) === true
        }));
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

function exportSummaryValue(row, field, language) {
    let values;
    try {
        values = row.SummaryJson ? JSON.parse(row.SummaryJson) : [];
    } catch (error) {
        throw new Error('Invalid summary data returned for record ' + row.IDModelloIstanza + '.');
    }
    if (!Array.isArray(values)) {
        throw new Error('Invalid summary data returned for record ' + row.IDModelloIstanza + '.');
    }
    const match = values.find(value => Number(value.IDAttributo) === Number(field.IDAttributo));
    if (match && match.CalculationError) {
        return calculatedMath.errorMessage(new Error(match.CalculationError), language);
    }
    return match && match.Value != null ? match.Value : '';
}

async function getExportData(
    IdProcesso, IdAttore, IdAccount, IdProfiloUtente, LanguageContext, filter
) {
    const exportLabels = {
        IT: { id: 'ID', creator: 'Creato da', status: 'Stato', total: 'Record totali' },
        GB: { id: 'ID', creator: 'Created by', status: 'Status', total: 'Total records' },
        ES: { id: 'ID', creator: 'Creado por', status: 'Estado', total: 'Registros totales' },
        CN: { id: 'ID', creator: '创建者', status: '状态', total: '记录总数' }
    };
    const labels = exportLabels[LanguageContext] || exportLabels.GB;
    const fields = (await getFields(IdProcesso, IdAccount, LanguageContext))
        .filter(field => field.IsSummary === true || field.IsSummary === 1 || field.IsSummary === '1');
    const process = await getProcessPage(IdProcesso, IdAccount, LanguageContext);
    if (!process) throw new Error('Process not found or access denied.');

    const pageSize = 100;
    const rows = [];
    let pageIndex = 1;
    let totalRecord = 0;
    do {
        const page = await getRecords(
            IdProcesso, IdAttore, IdAccount, IdProfiloUtente,
            pageIndex, pageSize, LanguageContext, filter
        );
        await calculatedSummary.attachCalculatedSummaries(
            page.rows, IdProcesso, IdAttore, IdAccount, LanguageContext
        );
        rows.push(...page.rows);
        totalRecord = Number(page.totalRecord) || rows.length;
        pageIndex++;
        if (page.rows.length < pageSize) break;
    } while (rows.length < totalRecord);

    const columns = [
        { key: 'id', label: labels.id },
        { key: 'creator', label: labels.creator },
        ...fields.map(field => ({
            key: 'field-' + field.IDAttributo,
            label: field.Description || ''
        })),
        { key: 'status', label: labels.status }
    ];
    const records = rows.map(row => {
        const values = [
            row.IDModelloIstanza,
            row.CreatedBy || '',
            ...fields.map(field => exportSummaryValue(row, field, LanguageContext)),
            row.CurrentState || ''
        ];
        return Object.fromEntries(columns.map((column, index) => [column.key, values[index]]));
    });

    return { process, columns, records, totalLabel: labels.total };
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

function getClassAttributes(
    IdProcesso, IdClasse, IdAccount, LanguageContext,
    WorkflowRecordId, WorkflowProfileId, WorkflowGroupId, ActionName
) {
    return executeProcedure('SP_GET_PROCESS_FORM_CLASS_ATTRIBUTES', {
        IdProcesso: intInput(IdProcesso),
        IdClasse: intInput(IdClasse),
        IdAccount: intInput(IdAccount),
        LanguageContext: stringInput(LanguageContext, 2),
        WorkflowRecordId: intInput(WorkflowRecordId),
        WorkflowProfileId: intInput(WorkflowProfileId),
        WorkflowGroupId: intInput(WorkflowGroupId),
        ActionName: stringInput(ActionName || '', 50)
    }).then(function (result) {
        return result.recordset || [];
    });
}

function getAttributeValues(
    IdProcesso,
    IdAttributo,
    IdAccount,
    IdGruppoOperativo,
    IdProfiloUtente,
    LanguageContext,
    ActionName,
    CurrentValue
) {
    return executeProcedure('SP_GET_PROCESS_FORM_ATTRIBUTE_VALUES', {
        IdProcesso: intInput(IdProcesso),
        IdAttributo: intInput(IdAttributo),
        IdAccount: intInput(IdAccount),
        LanguageContext: stringInput(LanguageContext, 2),
        IdGruppoOperativo: intInput(IdGruppoOperativo),
        IdProfiloUtente: intInput(IdProfiloUtente),
        ActionName: stringInput(ActionName || '', 50),
        CurrentValue: stringInput(CurrentValue || '', 4000)
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

function getClassRecords(IdProcesso, IDModelloIstanza, IDClasse, IdAttore, IdAccount) {
    return executeProcedure('SP_GET_PROCESS_FORM_CLASS_RECORDS', {
        IdProcesso: intInput(IdProcesso),
        IDModelloIstanza: intInput(IDModelloIstanza),
        IDClasse: intInput(IDClasse),
        IdAttore: intInput(IdAttore),
        IdAccount: intInput(IdAccount)
    }).then(function (result) {
        return result.recordset || [];
    });
}

function createClassRecord(IdProcesso, IDModelloIstanza, IDClasse, IdAttore, IdAccount) {
    return executeProcedure('SP_POST_PROCESS_FORM_CLASS_RECORD', {
        IdProcesso: intInput(IdProcesso),
        IDModelloIstanza: intInput(IDModelloIstanza),
        IDClasse: intInput(IDClasse),
        IdAttore: intInput(IdAttore),
        IdAccount: intInput(IdAccount)
    }, { IDRecord: sql.Int }).then(function (result) {
        return result.output.IDRecord;
    });
}

function deleteClassRecord(IdProcesso, IDRecord, IDClasse, IdAttore, IdAccount) {
    return executeProcedure('SP_DEL_PROCESS_FORM_CLASS_RECORD', {
        IdProcesso: intInput(IdProcesso),
        IDRecord: intInput(IDRecord),
        IDClasse: intInput(IDClasse),
        IdAttore: intInput(IdAttore),
        IdAccount: intInput(IdAccount)
    }).then(function () {
        return true;
    });
}

function getInstanceClassRecords(IDModelloIstanza, IDClasse, IdAttore, IdAccount) {
    return executeProcedure('SP_GET_IDMODELLO_ISTANZA_CLASS_RECORDS', {
        IDModelloIstanza: intInput(IDModelloIstanza),
        IDClasse: intInput(IDClasse),
        IdAttore: intInput(IdAttore),
        IdAccount: intInput(IdAccount)
    }).then(function (result) {
        return result.recordset || [];
    });
}

function createInstanceClassRecord(IDModelloIstanza, IDClasse, IdAttore, IdAccount) {
    return executeProcedure('SP_POST_IDMODELLO_ISTANZA_CLASS_RECORD', {
        IDModelloIstanza: intInput(IDModelloIstanza),
        IDClasse: intInput(IDClasse),
        IdAttore: intInput(IdAttore),
        IdAccount: intInput(IdAccount)
    }, { IDRecord: sql.Int }).then(function (result) {
        return result.output.IDRecord;
    });
}

function deleteInstanceClassRecord(IDRecord, IDClasse, IdAttore, IdAccount) {
    return executeProcedure('SP_DEL_IDMODELLO_ISTANZA_CLASS_RECORD', {
        IDRecord: intInput(IDRecord),
        IDClasse: intInput(IDClasse),
        IdAttore: intInput(IdAttore),
        IdAccount: intInput(IdAccount)
    }).then(function () {
        return true;
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

function saveRecordValue(
    IdProcesso, IDRecord, IDAttributo, RecordValue, IdAttore, IdAccount,
    IdProfiloUtente, IdGruppoOperativo
) {
    return executeProcedure('SP_PUT_PROCESS_FORM_VALUE', {
        IdProcesso: intInput(IdProcesso),
        IDRecord: intInput(IDRecord),
        IDAttributo: intInput(IDAttributo),
        RecordValue: stringInput(RecordValue, sql.MAX),
        IdAttore: intInput(IdAttore),
        IdAccount: intInput(IdAccount),
        IdProfiloUtente: intInput(IdProfiloUtente),
        IdGruppoOperativo: intInput(IdGruppoOperativo)
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
    getExportData,
    getModelClasses,
    getClassAttributes,
    getAttributeValues,
    createInstance,
    getClassRecord,
    getClassRecords,
    createClassRecord,
    deleteClassRecord,
    getInstanceClassRecords,
    createInstanceClassRecord,
    deleteInstanceClassRecord,
    getRecordValue,
    saveRecordValue,
    saveRecordMedia,
    deleteRecordMedia,
    deleteInstance
};
