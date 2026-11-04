const sql = require('mssql/msnodesqlv8');
const exception = require('../model/exception');
const connection = require('../config.db');

function getBreadcrumb(languageContext, pageUrl) {
    const sender = 'breadcrumb';

    return new Promise((resolve, reject) => {
        sql.connect(connection, function (connectionError, pool) {
            if (connectionError) {
                reject(new exception(sender, connectionError.message, connectionError.name, connectionError.stack));
                return;
            }

            const request = new sql.Request(pool);
            request.input('PageUrl', sql.NVarChar(255), pageUrl);
            request.input('LanguageContext', sql.NVarChar(2), languageContext);
            request.execute('dbo.SP_GET_BREADCRUMB', function (queryError, result) {
                if (queryError) {
                    reject(new exception(sender, queryError.message, queryError.name, queryError.stack));
                    return;
                }
                resolve(result.recordset.map(function (row) {
                    return row.Description;
                }).join(' / '));
            });
        });
    });
}

module.exports = {
    getBreadcrumb
};
