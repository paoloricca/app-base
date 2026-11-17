const sql = require('mssql/msnodesqlv8');
const tedious = require('tedious');
const connection = require('../../config.db');

const descriptionColumns = {
    IT: 'Description_IT',
    GB: 'Description_GB',
    ES: 'Description_ES',
    CN: 'Description_CN'
};

function positiveInteger(value, name) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number <= 0) {
        throw new Error(name + ' non valido');
    }
    return number;
}

function withPool(config, callback) {
    const pool = new sql.ConnectionPool(config);
    pool.on('error', error => {
        console.error('[forms-origin] Errore pool SQL:', error.message);
    });

    return pool.connect()
        .then(() => callback(pool))
        .finally(() => {
            if (pool.connected) {
                return pool.close();
            }
        });
}

function databasePoolConfig() {
    return Object.assign({}, connection, {
        connectionTimeout: 10000,
        requestTimeout: 15000,
        pool: { min: 0, max: 2, idleTimeoutMillis: 10000 }
    });
}

function splitConnectionString(connectionString) {
    const parts = [];
    let part = '';
    let inBraces = false;
    let quote = null;

    for (let index = 0; index < connectionString.length; index += 1) {
        const character = connectionString[index];
        if (inBraces && character === '}' && connectionString[index + 1] === '}') {
            part += '}}';
            index += 1;
        } else if (character === '{' && !quote) {
            inBraces = true;
            part += character;
        } else if (character === '}' && inBraces) {
            inBraces = false;
            part += character;
        } else if ((character === '"' || character === "'") && !inBraces) {
            if (quote === character && connectionString[index + 1] === character) {
                part += character + character;
                index += 1;
            } else {
                quote = quote === character ? null : (quote || character);
                part += character;
            }
        } else if (character === ';' && !inBraces && !quote) {
            parts.push(part);
            part = '';
        } else {
            part += character;
        }
    }
    if (inBraces || quote) {
        throw new Error('La stringa di connessione non è formattata correttamente.');
    }
    if (part.trim()) {
        parts.push(part);
    }

    const values = Object.create(null);
    parts.forEach(item => {
        const separator = item.indexOf('=');
        if (separator <= 0) {
            return;
        }
        const name = item.slice(0, separator).trim().toLowerCase().replace(/[\s_]/g, '');
        let value = item.slice(separator + 1).trim();
        if (value.startsWith('{') && value.endsWith('}')) {
            value = value.slice(1, -1).replace(/}}/g, '}');
        } else if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1).replace(/""/g, '"').replace(/''/g, "'");
        }
        values[name] = value;
    });
    return values;
}

function connectionBoolean(value, defaultValue) {
    if (value == null || value === '') {
        return defaultValue;
    }
    return /^(yes|true|1|sspi|mandatory|strict)$/i.test(value);
}

function customPoolConfig(connectionString) {
    if (typeof connectionString !== 'string' || !connectionString.trim() ||
        connectionString.length > 4000) {
        throw new Error('La connessione SQL Server non è valida.');
    }

    const values = splitConnectionString(connectionString.trim());
    const serverValue = values.server || values.datasource || values.address ||
        values.addr || values.networkaddress;
    if (!serverValue) {
        throw new Error('La stringa di connessione deve indicare Server o Data Source.');
    }

    let server = serverValue.replace(/^tcp:/i, '').trim();
    let port = Number(values.port) || null;
    const serverPort = server.match(/^(.*),(\d+)$/);
    if (serverPort) {
        server = serverPort[1];
        port = Number(serverPort[2]);
    }
    if (!server || (port != null && (!Number.isInteger(port) || port < 1 || port > 65535))) {
        throw new Error('Server o porta SQL Server non validi.');
    }

    const trustedConnection = connectionBoolean(
        values.trustedconnection || values.integratedsecurity,
        false
    );
    if (trustedConnection) {
        if (!values.driver) {
            throw new Error(
                'La connessione Windows integrata richiede il parametro Driver ODBC installato sul server.'
            );
        }
        return {
            driver: 'msnodesqlv8',
            config: {
                connectionString: connectionString.trim(),
                connectionTimeout: 10000,
                requestTimeout: 15000,
                pool: { min: 0, max: 1, idleTimeoutMillis: 10000 }
            }
        };
    }

    const user = values.uid || values.userid || values.user || values.username;
    const password = values.pwd == null ? values.password : values.pwd;
    if (!user || password == null) {
        throw new Error('La connessione SQL Server deve contenere UID e PWD.');
    }

    const options = {
        encrypt: connectionBoolean(values.encrypt, true),
        trustServerCertificate: connectionBoolean(values.trustservercertificate, true)
    };
    const instanceName = values.instancename || (server.indexOf('\\') >= 0
        ? server.slice(server.indexOf('\\') + 1)
        : null);
    if (server.indexOf('\\') >= 0) {
        server = server.slice(0, server.indexOf('\\'));
    }
    if (instanceName && !port) {
        options.instanceName = instanceName;
    }

    return {
        driver: 'tedious',
        config: {
            server: server,
            port: port || 1433,
            user: user,
            password: password,
            database: values.database || values.initialcatalog || 'master',
            options: options,
            connectionTimeout: 10000,
            requestTimeout: 15000,
            pool: { min: 0, max: 1, idleTimeoutMillis: 10000 }
        }
    };
}

function runTediousQuery(config, queryText, parameterValue) {
    return new Promise((resolve, reject) => {
        const options = Object.assign({}, config.options, {
            database: config.database,
            port: config.port,
            connectTimeout: config.connectionTimeout,
            requestTimeout: config.requestTimeout
        });
        if (options.instanceName) {
            delete options.port;
        }
        const externalConnection = new tedious.Connection({
            server: config.server,
            authentication: {
                type: 'default',
                options: {
                    userName: config.user,
                    password: config.password
                }
            },
            options: options
        });
        const rows = [];
        let settled = false;

        function finish(error) {
            if (settled) {
                return;
            }
            settled = true;
            externalConnection.close();
            if (error) {
                reject(error);
            } else {
                resolve({ recordset: rows });
            }
        }

        externalConnection.on('error', error => finish(error));
        externalConnection.connect(error => {
            if (error) {
                finish(error);
                return;
            }

            const request = new tedious.Request(queryText, requestError => finish(requestError));
            request.on('row', columns => {
                const row = {};
                columns.forEach(column => {
                    row[column.metadata.colName] = column.value;
                });
                rows.push(row);
            });
            if (parameterValue !== undefined) {
                request.addParameter('QueryText', tedious.TYPES.NVarChar, parameterValue, {
                    length: parameterValue.length
                });
            }
            externalConnection.execSql(request);
        });
    });
}

function executeExternalQuery(connectionString, queryText, parameterValue) {
    const parsed = customPoolConfig(connectionString);
    if (parsed.driver === 'tedious') {
        return runTediousQuery(parsed.config, queryText, parameterValue);
    }

    return withPool(parsed.config, async pool => {
        const request = pool.request();
        if (parameterValue !== undefined) {
            request.input('QueryText', sql.NVarChar(sql.MAX), parameterValue);
        }
        return request.query(queryText);
    });
}

function outputStatus(result) {
    if (!result.output || result.output.Status !== 'OK') {
        throw new Error(result.output && result.output.Status || 'Operazione origine dati non riuscita.');
    }
}

function internalRequest(pool) {
    const request = new sql.Request(pool);
    request.timeout = 15000;
    return request;
}

function isReadOnlyQuery(queryText) {
    if (typeof queryText !== 'string' || !queryText.trim() || queryText.length > 20000) {
        return false;
    }

    let sqlCode = queryText
        .replace(/--[^\r\n]*/g, ' ')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/'(?:''|[^'])*'/g, ' ')
        .replace(/"(?:\"\"|[^"])*"/g, ' ')
        .replace(/\[(?:\]\]|[^\]])*\]/g, ' ');
    sqlCode = sqlCode.trim().replace(/;\s*$/, '').trim();

    return /^(SELECT|WITH)\b/i.test(sqlCode) &&
        !/[;]/.test(sqlCode) &&
        !/\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|TRUNCATE|EXEC(?:UTE)?|GRANT|REVOKE|BACKUP|RESTORE|DBCC|SHUTDOWN|WAITFOR|INTO|OPENROWSET|OPENQUERY|OPENDATASOURCE|BULK|USE|DECLARE|SET)\b/i.test(sqlCode);
}

function validateQuery(queryText) {
    if (!isReadOnlyQuery(queryText)) {
        throw new Error('Inserire una singola query di sola lettura (SELECT o WITH).');
    }
}

async function getClassOrigin(idAttoreValue, idClasseValue, languageContext) {
    const idAttore = positiveInteger(idAttoreValue, 'IDAttore');
    const idClasse = positiveInteger(idClasseValue, 'IDClasse');

    return withPool(databasePoolConfig(), async pool => {
        const request = internalRequest(pool)
            .input('IDAttore', sql.Int, idAttore)
            .input('IDClasse', sql.Int, idClasse)
            .input('LanguageContext', sql.NVarChar(2), descriptionColumns[languageContext] ? languageContext : 'IT')
            .output('Status', sql.NVarChar(500));
        const result = await request.execute('dbo.SP_GET_MODEL_CLASS_ORIGIN');
        outputStatus(result);

        return {
            origin: result.recordsets[0] && result.recordsets[0][0] || null,
            attributes: result.recordsets[1] || []
        };
    });
}

async function getClassOriginRows(idAttoreValue, idClasseValue, languageContext, allowedAttributeIds) {
    const config = await getClassOrigin(idAttoreValue, idClasseValue, languageContext);
    if (!config.origin) {
        return { description: '', columns: [], rows: [] };
    }
    if (Number(config.origin.TipoOrigine) !== 1) {
        throw new Error('Il tipo di origine dati configurato non è supportato.');
    }

    const allowedIds = new Set((allowedAttributeIds || []).map(Number));
    const mappings = config.attributes.filter(attribute =>
        allowedIds.has(Number(attribute.IDAttributo)) && attribute.CampoDinamico
    );
    if (!mappings.length) {
        return { description: config.origin.Descrizione || '', columns: [], rows: [] };
    }

    validateQuery(config.origin.TestoOrigine);
    const result = await executeExternalQuery(
        config.origin.Connessione,
        config.origin.TestoOrigine
    );
    const rows = result.recordset || [];
    const columns = mappings.map(attribute => ({
        name: attribute.CampoDinamico,
        IDAttributo: Number(attribute.IDAttributo),
        Description: attribute.Description || ''
    }));

    const sourceColumnNames = rows.length
        ? Object.keys(rows[0]).reduce((names, name) => {
            names[name.toLocaleLowerCase()] = name;
            return names;
        }, Object.create(null))
        : null;
    if (sourceColumnNames) {
        columns.forEach(column => {
            if (!Object.prototype.hasOwnProperty.call(
                sourceColumnNames,
                column.name.toLocaleLowerCase()
            )) {
                throw new Error('La query non restituisce la colonna associata "' + column.name + '".');
            }
        });
    }

    return {
        description: config.origin.Descrizione || '',
        columns,
        rows: rows.map(row => {
            const values = Object.create(null);
            columns.forEach(column => {
                const sourceName = sourceColumnNames &&
                    sourceColumnNames[column.name.toLocaleLowerCase()];
                values[column.name] = sourceName ? row[sourceName] : null;
            });
            return values;
        })
    };
}

async function testConnection(connectionString) {
    await executeExternalQuery(connectionString, 'SELECT 1 AS ConnectionTest');
    return { connected: true };
}

async function getQueryColumns(connectionString, queryText) {
    validateQuery(queryText);
    const result = await executeExternalQuery(
        connectionString,
        'EXEC sys.sp_describe_first_result_set @tsql = @QueryText',
        queryText.trim()
    );
    const rows = result.recordset || [];
    const columns = rows
        .filter(row => row.is_hidden !== true && row.name != null)
        .map(row => String(row.name));

    if (!columns.length) {
        throw new Error('La query non restituisce colonne con nome.');
    }
    if (columns.some(name => !name.trim() || name.length > 50)) {
        throw new Error('Ogni colonna della query deve avere un nome compreso entro 50 caratteri.');
    }
    const normalizedNames = columns.map(name => name.toLocaleLowerCase());
    if (new Set(normalizedNames).size !== normalizedNames.length) {
        throw new Error('La query restituisce nomi di colonna duplicati: assegnare alias univoci.');
    }

    return columns;
}

async function saveClassOrigin(idAttoreValue, idClasseValue, body) {
    const idAttore = positiveInteger(idAttoreValue, 'IDAttore');
    const idClasse = positiveInteger(idClasseValue, 'IDClasse');
    const description = String(body.Descrizione || '').trim();
    const connectionString = String(body.Connessione || '');
    const queryText = String(body.TestoOrigine || '');
    const originType = Number(body.TipoOrigine);
    const rawMappings = typeof body.Mappings === 'string'
        ? JSON.parse(body.Mappings)
        : body.Mappings;

    if (!description || description.length > 50) {
        throw new Error('La descrizione è obbligatoria e non può superare 50 caratteri.');
    }
    if (!connectionString.trim()) {
        throw new Error('La connessione è obbligatoria.');
    }
    if (!queryText.trim()) {
        throw new Error('Il testo origine è obbligatorio.');
    }
    if (![1, 2, 3].includes(originType)) {
        throw new Error('Il tipo di origine non è valido.');
    }
    if (connectionString.length > 4000 || queryText.length > 20000) {
        throw new Error('La connessione o il testo origine supera la lunghezza consentita.');
    }
    if (!Array.isArray(rawMappings)) {
        throw new Error('L’associazione dei campi non è valida.');
    }

    const mappings = [];
    const seenAttributeIds = new Set();
    const seenDynamicFields = new Set();
    rawMappings.forEach(mapping => {
        if (!mapping || typeof mapping !== 'object') {
            throw new Error('L’associazione dei campi non è valida.');
        }
        const idAttributo = positiveInteger(mapping.IDAttributo, 'IDAttributo');
        const dynamicField = String(mapping.CampoDinamico || '').trim();
        if (seenAttributeIds.has(idAttributo)) {
            throw new Error('Un campo di sistema è presente più volte.');
        }
        seenAttributeIds.add(idAttributo);
        if (dynamicField.length > 50) {
            throw new Error('Il nome della colonna dinamica non può superare 50 caratteri.');
        }
        if (!dynamicField) {
            throw new Error('Ogni campo di sistema deve essere associato a una colonna dinamica.');
        }
        const normalizedDynamicField = dynamicField.toLowerCase();
        if (seenDynamicFields.has(normalizedDynamicField)) {
            throw new Error('Più campi di sistema non possono essere associati alla stessa colonna dinamica.');
        }
        seenDynamicFields.add(normalizedDynamicField);
        mappings.push({ IDAttributo: idAttributo, CampoDinamico: dynamicField });
    });

    return withPool(databasePoolConfig(), async pool => {
        const request = internalRequest(pool)
            .input('IDAttore', sql.Int, idAttore)
            .input('IDClasse', sql.Int, idClasse)
            .input('Descrizione', sql.NVarChar(50), description)
            .input('TipoOrigine', sql.Int, originType)
            .input('Connessione', sql.NVarChar(sql.MAX), connectionString)
            .input('TestoOrigine', sql.NVarChar(sql.MAX), queryText)
            .input('MappingsJSON', sql.NVarChar(sql.MAX), JSON.stringify(mappings))
            .output('IDOrigineDato', sql.Int)
            .output('Status', sql.NVarChar(500));
        const result = await request.execute('dbo.SP_POST_MODEL_CLASS_ORIGIN');
        outputStatus(result);
        return { Id: result.output.IDOrigineDato };
    });
}

async function deleteClassOrigin(idAttoreValue, idClasseValue) {
    const idAttore = positiveInteger(idAttoreValue, 'IDAttore');
    const idClasse = positiveInteger(idClasseValue, 'IDClasse');

    return withPool(databasePoolConfig(), async pool => {
        const request = internalRequest(pool)
            .input('IDAttore', sql.Int, idAttore)
            .input('IDClasse', sql.Int, idClasse)
            .output('Status', sql.NVarChar(500));
        const result = await request.execute('dbo.SP_DELETE_MODEL_CLASS_ORIGIN');
        outputStatus(result);
        return true;
    });
}

module.exports = {
    getClassOrigin,
    getClassOriginRows,
    testConnection,
    getQueryColumns,
    saveClassOrigin,
    deleteClassOrigin
};
