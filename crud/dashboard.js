const sql = require('mssql/msnodesqlv8');
const exception = require('../model/exception');
const connection = require('../config.db');

function getDashboardData(mode, options) {
    const sender = 'SP_GET_USER_WORKFLOW_DASHBOARD';

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
            request.input('Mode', sql.VarChar(12), mode);
            request.input('IdAttore', sql.Int, options.IdAttore);
            request.input('IdAccount', sql.Int, options.IdAccount);
            request.input('IdProcesso', sql.Int, options.IdProcesso);
            request.input('IdProcessoParent', sql.Int, options.IdProcessoParent);
            request.input('PageIndex', sql.Int, options.PageIndex);
            request.input('PageSize', sql.Int, options.PageSize);
            request.input('StateId', sql.Int, options.StateId);
            request.input('LanguageContext', sql.VarChar(2), options.LanguageContext);
            request.output('Status', sql.NVarChar(500));

            request.execute(sender, function (queryError, result) {
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

                if (mode === 'PROCESSES') {
                    resolve(result.recordset || []);
                    return;
                }

                if (mode === 'CARDS') {
                    resolve(result.recordset || []);
                    return;
                }

                const recordsets = result.recordsets || [];
                resolve({
                    states: recordsets[0] || [],
                    rows: recordsets[1] || [],
                    totalRecord: recordsets[2] && recordsets[2][0]
                        ? recordsets[2][0].TotalRecord
                        : 0
                });
            });
        });
    });
}

function getProcesses(IdAttore, IdAccount, LanguageContext, IdProcessoParent) {
    return getDashboardData('PROCESSES', {
        IdAttore,
        IdAccount,
        LanguageContext,
        IdProcessoParent,
        IdProcesso: null,
        PageIndex: 1,
        PageSize: 20,
        StateId: null
    });
}

function getProcessCards(IdAttore, IdAccount, LanguageContext) {
    return getDashboardData('CARDS', {
        IdAttore,
        IdAccount,
        LanguageContext,
        IdProcessoParent: null,
        IdProcesso: null,
        PageIndex: 1,
        PageSize: 20,
        StateId: null
    });
}

function getRecords(IdAttore, IdAccount, LanguageContext, IdProcesso, PageIndex, PageSize, StateId) {
    return getDashboardData('RECORDS', {
        IdAttore,
        IdAccount,
        LanguageContext,
        IdProcesso,
        IdProcessoParent: null,
        PageIndex,
        PageSize,
        StateId
    });
}

module.exports = {
    getProcesses,
    getProcessCards,
    getRecords
};
