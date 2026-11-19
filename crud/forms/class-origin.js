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

function isCancellationError(error) {
    const info = error && error.originalError && error.originalError.info;
    return error && (error.code === 'ECANCEL' || error.sqlstate === 'HY008' ||
        error.state === 'HY008' ||
        (info && info.sqlstate === 'HY008'));
}

function runTediousQuery(externalConnection, queryText, parameters, onRow) {
    return new Promise((resolve, reject) => {
        const rows = [];
        let settled = false;
        let cancelled = false;
        let processingError = null;

        function finish(error) {
            if (settled) {
                return;
            }
            settled = true;
            if (processingError || (error && !(cancelled && isCancellationError(error)))) {
                reject(processingError || error);
            } else {
                resolve({ recordset: rows });
            }
        }

        const request = new tedious.Request(queryText, requestError => finish(requestError));
        request.on('row', columns => {
            const row = {};
            columns.forEach(column => {
                row[column.metadata.colName] = column.value;
            });
            if (!onRow) {
                rows.push(row);
                return;
            }
            if (cancelled) return;
            try {
                cancelled = onRow(row) === false;
            } catch (error) {
                processingError = error;
                cancelled = true;
            }
            if (cancelled) request.cancel();
        });
        Object.entries(parameters || {}).forEach(([name, value]) => {
            request.addParameter(name, tedious.TYPES.NVarChar, value, {
                length: value.length
            });
        });
        externalConnection.execSql(request);
    });
}

function withExternalConnection(connectionString, callback) {
    const parsed = customPoolConfig(connectionString);
    if (parsed.driver !== 'tedious') {
        return withPool(parsed.config, pool => callback((queryText, parameters, onRow) =>
            runNativeQuery(pool, queryText, parameters, onRow)));
    }

    return new Promise((resolve, reject) => {
        const config = parsed.config;
        const options = Object.assign({}, config.options, {
            database: config.database,
            port: config.port,
            connectTimeout: config.connectionTimeout,
            requestTimeout: config.requestTimeout
        });
        if (options.instanceName) delete options.port;
        const externalConnection = new tedious.Connection({
            server: config.server,
            authentication: {
                type: 'default',
                options: { userName: config.user, password: config.password }
            },
            options: options
        });
        let settled = false;
        function finish(error, result) {
            if (settled) return;
            settled = true;
            externalConnection.close();
            if (error) reject(error);
            else resolve(result);
        }
        externalConnection.on('error', error => finish(error));
        externalConnection.connect(error => {
            if (error) {
                finish(error);
                return;
            }
            Promise.resolve().then(() => callback((queryText, parameters, onRow) =>
                runTediousQuery(externalConnection, queryText, parameters, onRow)))
                .then(result => finish(null, result), error => finish(error));
        });
    });
}

function runNativeQuery(pool, queryText, parameters, onRow) {
    const request = pool.request();
    Object.entries(parameters || {}).forEach(([name, value]) => {
        request.input(name, sql.NVarChar(sql.MAX), value);
    });
    if (!onRow) return request.query(queryText);
    return new Promise((resolve, reject) => {
        let cancelled = false;
        let processingError = null;
        let queryError = null;
        request.stream = true;
        request.on('row', row => {
            if (cancelled) return;
            try {
                cancelled = onRow(row) === false;
            } catch (error) {
                processingError = error;
                cancelled = true;
            }
            if (cancelled) request.cancel();
        });
        request.on('error', error => {
            if (!(cancelled && isCancellationError(error))) queryError = queryError || error;
        });
        request.on('done', () => {
            if (processingError || queryError) reject(processingError || queryError);
            else resolve();
        });
        request.query(queryText);
    });
}

function executeExternalQuery(connectionString, queryText, parameters, onRow) {
    return withExternalConnection(connectionString, execute => execute(queryText, parameters, onRow));
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

function queryForConditionPushdown(queryText) {
    let masked = '';
    let depth = 0;
    let orderIndex = -1;
    let unsafe = false;
    for (let i = 0; i < queryText.length;) {
        const start = i;
        const char = queryText[i];
        if (char === "'" || char === '"' || char === '[') {
            const end = char === '[' ? ']' : char;
            i++;
            let closed = false;
            while (i < queryText.length) {
                if (queryText[i++] === end) {
                    if (queryText[i] === end) i++;
                    else { closed = true; break; }
                }
            }
            if (!closed) return null;
        } else if (char === '-' && queryText[i + 1] === '-') {
            i += 2;
            while (i < queryText.length && !/[\r\n]/.test(queryText[i])) i++;
        } else if (char === '/' && queryText[i + 1] === '*') {
            i += 2;
            let comments = 1;
            while (i < queryText.length && comments) {
                if (queryText[i] === '/' && queryText[i + 1] === '*') { comments++; i += 2; }
                else if (queryText[i] === '*' && queryText[i + 1] === '/') { comments--; i += 2; }
                else i++;
            }
            if (comments) return null;
        } else {
            if (char === '(') depth++;
            if (char === ')' && --depth < 0) return null;
            if (char === ')' || char === '(') {
                i++;
            } else if (/[A-Za-z_]/.test(char)) {
                i++;
                while (i < queryText.length && /[A-Za-z0-9_$#@]/.test(queryText[i])) i++;
                const word = queryText.slice(start, i).toUpperCase();
                if (depth === 0) {
                    if (['TOP', 'OFFSET', 'FETCH', 'OPTION', 'FOR', 'WITH'].includes(word)) unsafe = true;
                    if (word === 'ORDER') {
                        if (orderIndex !== -1) return null;
                        orderIndex = start;
                    }
                }
            } else i++;
            masked += queryText.slice(start, i);
            continue;
        }
        masked += (char === "'" || char === '"' || char === '[' ? 'x' : ' ').repeat(i - start);
    }
    if (depth !== 0 || unsafe || !/^\s*SELECT\b/i.test(masked)) return null;
    const end = masked.replace(/\s+$/, '').replace(/;\s*$/, '').length;
    const order = orderIndex < 0 ? '' : queryText.slice(orderIndex, end).trim();
    const identifier = '(?:\\[(?:\\]\\]|[^\\]])+\\]|[A-Za-z_][\\w$#]*|\\d+)';
    const sort = new RegExp('^ORDER\\s+BY\\s+' + identifier +
        '(?:\\s+(?:ASC|DESC))?(?:\\s*,\\s*' + identifier + '(?:\\s+(?:ASC|DESC))?)*\\s*$', 'i');
    if (order && !sort.test(order)) return null;
    const sortColumns = [];
    if (order) {
        const parts = new RegExp('(' + identifier + ')(?:\\s+(?:ASC|DESC))?(?:\\s*,\\s*|\\s*$)', 'gi');
        let part;
        const list = order.replace(/^ORDER\s+BY\s+/i, '');
        while ((part = parts.exec(list))) {
            sortColumns.push(part[1].startsWith('[')
                ? part[1].slice(1, -1).replace(/]]/g, ']')
                : part[1]);
        }
    }
    return { query: queryText.slice(0, orderIndex < 0 ? end : orderIndex), order, sortColumns };
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

async function getClassOriginConditions(idAttoreValue, idClasseValue, languageContext) {
    const config = await getClassOrigin(idAttoreValue, idClasseValue, languageContext);
    return loadClassOriginConditions(idAttoreValue, idClasseValue, languageContext, config);
}

async function loadClassOriginConditions(idAttoreValue, idClasseValue, languageContext, config) {
    if (!config.origin) throw new Error('Salvare prima l’origine dati.');
    return withPool(databasePoolConfig(), async pool => {
        const result = await internalRequest(pool)
            .input('IDAttore', sql.Int, positiveInteger(idAttoreValue, 'IDAttore'))
            .input('IDClasse', sql.Int, positiveInteger(idClasseValue, 'IDClasse'))
            .input('LanguageContext', sql.NVarChar(2), languageContext)
            .query(`
                SELECT A.IDAttributo, A.IDClasse, A.IDTipoDati,
                    COALESCE(NULLIF(CASE @LanguageContext
                        WHEN 'IT' THEN A.Description_IT WHEN 'GB' THEN A.Description_GB
                        WHEN 'ES' THEN A.Description_ES ELSE A.Description_CN END, ''),
                        NULLIF(A.Description_IT, ''), NULLIF(A.Description_GB, ''),
                        NULLIF(A.Description_ES, ''), A.Description_CN) AS Description
                FROM dbo.TModelliClassi AS Source
                JOIN dbo.TModelliVersioni AS V ON V.IDVersione = Source.IDVersione
                JOIN dbo.TModelli AS M ON M.IDModello = V.IDModello AND M.IDAttore = @IDAttore
                JOIN dbo.TModelliClassi AS C ON C.IDVersione = Source.IDVersione
                JOIN dbo.TModelliClassiAttributi AS A ON A.IDClasse = C.IDClasse
                WHERE Source.IDClasse = @IDClasse
                  AND C.IsVisible = 1 AND C.Visibile = 1
                  AND A.IsVisible = 1 AND A.Visibile = 1
                ORDER BY C.Ordine, A.Ordine, A.IDAttributo;
                SELECT D.CampoDinamico, D.Condizione, D.IDAttributo
                FROM dbo.TModelliClassiOriginiDatiCondizioni AS D
                JOIN dbo.TModelliClassiOriginiDati AS O ON O.Id = D.IDModelloClasseOrigineDati
                JOIN dbo.TModelliClassi AS C ON C.IDClasse = O.IDClasse
                JOIN dbo.TModelliVersioni AS V ON V.IDVersione = C.IDVersione
                JOIN dbo.TModelli AS M ON M.IDModello = V.IDModello AND M.IDAttore = @IDAttore
                WHERE O.IDClasse = @IDClasse ORDER BY D.Id;
            `);
        return { origin: config.origin, fields: result.recordsets[0], conditions: result.recordsets[1] };
    });
}

async function saveClassOriginConditions(idAttore, idClasse, languageContext, conditions) {
    if (!Array.isArray(conditions)) throw new Error('Le condizioni non sono valide.');
    const config = await getClassOriginConditions(idAttore, idClasse, languageContext);
    const availableColumns = await getQueryColumns(config.origin.Connessione, config.origin.TestoOrigine);
    const validFields = new Set(config.fields.map(field => Number(field.IDAttributo)));
    const normalized = conditions.map(condition => {
        if (!condition || typeof condition.CampoDinamico !== 'string' ||
            !availableColumns.includes(condition.CampoDinamico) ||
            ![1, 2, 3, 4].includes(Number(condition.Condizione)) ||
            !validFields.has(Number(condition.IDAttributo))) {
            throw new Error('Una condizione non è valida.');
        }
        return {
            CampoDinamico: condition.CampoDinamico,
            Condizione: Number(condition.Condizione),
            IDAttributo: Number(condition.IDAttributo)
        };
    });
    await withPool(databasePoolConfig(), async pool => {
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            const request = new sql.Request(transaction)
                .input('IDAttore', sql.Int, positiveInteger(idAttore, 'IDAttore'))
                .input('IDClasse', sql.Int, positiveInteger(idClasse, 'IDClasse'))
                .input('OriginId', sql.Int, config.origin.Id)
                .input('QueryText', sql.NVarChar(sql.MAX), config.origin.TestoOrigine)
                .input('ConnectionText', sql.NVarChar(sql.MAX), config.origin.Connessione)
                .input('Conditions', sql.NVarChar(sql.MAX), JSON.stringify(normalized));
            await request.query(`
                IF NOT EXISTS (
                    SELECT 1 FROM dbo.TModelliClassiOriginiDati AS O WITH (UPDLOCK, HOLDLOCK)
                    JOIN dbo.TModelliClassi AS C ON C.IDClasse = O.IDClasse
                    JOIN dbo.TModelliVersioni AS V ON V.IDVersione = C.IDVersione
                    JOIN dbo.TModelli AS M ON M.IDModello = V.IDModello
                    WHERE O.Id = @OriginId AND O.IDClasse = @IDClasse AND M.IDAttore = @IDAttore
                      AND O.TestoOrigine = @QueryText AND O.Connessione = @ConnectionText
                ) THROW 51000, 'L''origine è cambiata. Ricaricare la configurazione.', 1;
                IF EXISTS (
                    SELECT 1 FROM OPENJSON(@Conditions)
                    WITH (IDAttributo INT '$.IDAttributo') AS D
                    WHERE NOT EXISTS (
                        SELECT 1 FROM dbo.TModelliClassi AS Source
                        JOIN dbo.TModelliClassi AS C ON C.IDVersione = Source.IDVersione
                        JOIN dbo.TModelliClassiAttributi AS A ON A.IDClasse = C.IDClasse
                        WHERE Source.IDClasse = @IDClasse AND A.IDAttributo = D.IDAttributo
                          AND C.IsVisible = 1 AND C.Visibile = 1
                          AND A.IsVisible = 1 AND A.Visibile = 1
                    )
                ) THROW 51000, 'Un campo della condizione non è disponibile.', 1;
                DELETE FROM dbo.TModelliClassiOriginiDatiCondizioni
                WHERE IDModelloClasseOrigineDati = @OriginId;
                INSERT INTO dbo.TModelliClassiOriginiDatiCondizioni
                    (IDModelloClasseOrigineDati, CampoDinamico, Condizione, IDAttributo)
                SELECT @OriginId, CampoDinamico, Condizione, IDAttributo
                FROM OPENJSON(@Conditions)
                WITH (CampoDinamico NVARCHAR(50) '$.CampoDinamico',
                      Condizione INT '$.Condizione', IDAttributo INT '$.IDAttributo');
            `);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    });
}

async function getClassOriginRows(idAttoreValue, idClasseValue, languageContext, attributes, filters, conditionValues) {
    const config = await getClassOrigin(idAttoreValue, idClasseValue, languageContext);
    if (!config.origin) {
        return { description: '', columns: [], rows: [], limitExceeded: false };
    }
    if (Number(config.origin.TipoOrigine) !== 1) {
        throw new Error('Il tipo di origine dati configurato non è supportato.');
    }

    const allowedIds = new Set(attributes.map(attribute => Number(attribute.IDAttributo)));
    const mappings = config.attributes.filter(attribute =>
        allowedIds.has(Number(attribute.IDAttributo)) && attribute.CampoDinamico
    );
    if (!mappings.length) {
        return { description: config.origin.Descrizione || '', columns: [], rows: [], limitExceeded: false };
    }

    const columns = mappings.map(attribute => ({
        name: attribute.CampoDinamico,
        IDAttributo: Number(attribute.IDAttributo),
        Description: attribute.Description || ''
    }));

    if (!Array.isArray(filters)) throw new Error('Filtri di ricerca non validi.');
    const filterMappings = filters.map(filter => {
        if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
            throw new Error('Filtro di ricerca non valido.');
        }
        const id = positiveInteger(filter.IDAttributo, 'IDAttributo');
        const attribute = attributes.find(item => Number(item.IDAttributo) === id);
        const column = columns.find(item => item.IDAttributo === id);
        if (!attribute || (attribute.IsFilter !== true && attribute.IsFilter !== 1) ||
            !column || typeof filter.value !== 'string') {
            throw new Error('Filtro di ricerca non valido.');
        }
        return { name: column.name, value: filter.value.toLocaleLowerCase() };
    });

    const conditionConfig = await loadClassOriginConditions(idAttoreValue, idClasseValue, languageContext, config);
    if (!Array.isArray(conditionValues)) throw new Error('Valori delle condizioni non validi.');
    const valuesById = new Map();
    conditionValues.forEach(value => {
        if (!value || typeof value.value !== 'string' || !value.value.trim() ||
            valuesById.has(Number(value.IDAttributo))) {
            throw new Error('Valori delle condizioni non validi.');
        }
        valuesById.set(positiveInteger(value.IDAttributo, 'IDAttributo'), value.value.toLocaleLowerCase());
    });
    function conditionText(value, type) {
        let text = value instanceof Date ? value.toISOString() : String(value);
        if (type === 5 && /^(true|false)$/i.test(text)) {
            text = /^true$/i.test(text) ? '1' : '0';
        } else if (type === 4) {
            const localDate = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (localDate) text = localDate[3] + '-' + localDate[2] + '-' + localDate[1];
            else if (/^\d{4}-\d{2}-\d{2}T/.test(text)) text = text.slice(0, 10);
        }
        return text.toLocaleLowerCase();
    }
    const conditions = conditionConfig.conditions.map(condition => {
        const id = Number(condition.IDAttributo);
        const operator = Number(condition.Condizione);
        const field = conditionConfig.fields.find(item => Number(item.IDAttributo) === id);
        if (!field || !valuesById.has(id) ||
            !condition.CampoDinamico || ![1, 2, 3, 4].includes(operator)) {
            throw new Error('Compilare tutti i campi richiesti dalle condizioni dell’origine.');
        }
        const type = Number(field.IDTipoDati);
        return { name: condition.CampoDinamico, operator, type,
            value: conditionText(valuesById.get(id), type) };
    });
    validateQuery(config.origin.TestoOrigine);
    const rows = [];
    let sourceColumnNames = null;
    let limitExceeded = false;
    await withExternalConnection(config.origin.Connessione, async execute => {
        let queryText = config.origin.TestoOrigine;
        let parameters;
        const pushdown = queryForConditionPushdown(queryText);
        if (pushdown && conditions.length) {
            const metadata = await describeQueryColumns(execute, queryText);
            const validColumns = metadata.every(item => typeof item.name === 'string' && item.name.length > 0) &&
                new Set(metadata.map(item => item.name.toLocaleLowerCase())).size === metadata.length;
            const sortable = validColumns && pushdown.sortColumns.every(name => /^\d+$/.test(name)
                ? Number(name) > 0 && Number(name) <= metadata.length
                : metadata.some(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase()));
            const conditionColumns = conditions.map(condition => metadata.find(item =>
                item.name && item.name.toLocaleLowerCase() === condition.name.toLocaleLowerCase()));
            if (sortable && conditionColumns.every(Boolean)) {
                const predicates = [];
                parameters = {};
                conditions.forEach((condition, index) => {
                    const column = conditionColumns[index];
                    const identifier = '[' + column.name.replace(/]/g, ']]') + ']';
                    const typeName = column.system_type_name || '';
                    const isText = /^(?:n?varchar|n?char)\s*\(/i.test(typeName);
                    const isInteger = /^(?:int|smallint|tinyint)$/i.test(typeName);
                    const isBoolean = /^bit$/i.test(typeName) && condition.type === 5 &&
                        /^(?:0|1)$/.test(condition.value);
                    const comparable = ![4, 5].includes(condition.type) && (isText || isInteger) &&
                        condition.value.length <= 4000 && /^[\x20-\x7e]+$/.test(condition.value);
                    if ((!comparable && !isBoolean) || Object.keys(parameters).length >= 2000) {
                        predicates.push(identifier + ' IS NOT NULL');
                        return;
                    }
                    let name = 'OriginCondition' + index;
                    while (queryText.toLowerCase().includes('@' + name.toLowerCase())) name += '_';
                    parameters[name] = condition.value;
                    if (isBoolean) {
                        predicates.push(identifier + ' = CONVERT(bit, @' + name + ')');
                        return;
                    }
                    const expression = isInteger ? 'CONVERT(nvarchar(20), ' + identifier + ')' : identifier;
                    const comparison = condition.operator === 1
                        ? expression + ' COLLATE Latin1_General_100_CI_AI = @' + name
                        : 'CHARINDEX(@' + name + ', ' + expression + ' COLLATE Latin1_General_100_CI_AI) > 0';
                    // Non-ASCII text is retained for the definitive JavaScript comparison.
                    predicates.push(isText ? '(' + comparison + ' OR ' + identifier +
                        " COLLATE Latin1_General_100_BIN2 LIKE N'%[^ -~]%')" : '(' + comparison + ')');
                });
                queryText = 'SELECT * FROM (\n' + pushdown.query + '\n) AS OriginResults WHERE ' +
                    predicates.join(' AND ') + ' ' + pushdown.order;
            }
        }
        await execute(queryText, parameters, row => {
            if (!sourceColumnNames) {
                sourceColumnNames = Object.keys(row).reduce((names, name) => {
                    names[name.toLocaleLowerCase()] = name;
                    return names;
                }, Object.create(null));
                columns.forEach(column => {
                    if (!Object.prototype.hasOwnProperty.call(
                        sourceColumnNames,
                        column.name.toLocaleLowerCase()
                    )) {
                        throw new Error('La query non restituisce la colonna associata "' + column.name + '".');
                    }
                });
                conditions.forEach(condition => {
                    if (!Object.prototype.hasOwnProperty.call(sourceColumnNames, condition.name.toLocaleLowerCase())) {
                        throw new Error('La query non restituisce la colonna della condizione "' + condition.name + '".');
                    }
                });
            }
            const values = Object.create(null);
            columns.forEach(column => {
                values[column.name] = row[sourceColumnNames[column.name.toLocaleLowerCase()]];
            });
            const matches = filterMappings.every(filter => {
                const value = values[filter.name];
                const text = value == null ? '' : (value instanceof Date ? value.toISOString() : String(value));
                return text.toLocaleLowerCase().indexOf(filter.value) >= 0;
            });
            if (!matches || !conditions.every(condition => {
                const value = row[sourceColumnNames[condition.name.toLocaleLowerCase()]];
                if (value == null) return false;
                const text = conditionText(value, condition.type);
                if (condition.operator === 1) return text === condition.value;
                if (condition.operator === 2) return text.includes(condition.value);
                if (condition.operator === 3) return text.startsWith(condition.value);
                return text.endsWith(condition.value);
            })) return true;
            if (rows.length === 200) {
                limitExceeded = true;
                return false;
            }
            rows.push(values);
            return true;
        });
    });
    return {
        description: config.origin.Descrizione || '',
        columns,
        limitExceeded,
        rows: limitExceeded ? [] : rows
    };
}

async function testConnection(connectionString) {
    await executeExternalQuery(connectionString, 'SELECT 1 AS ConnectionTest');
    return { connected: true };
}

async function getQueryColumnMetadata(connectionString, queryText) {
    validateQuery(queryText);
    return withExternalConnection(connectionString, execute => describeQueryColumns(execute, queryText));
}

async function describeQueryColumns(execute, queryText) {
    validateQuery(queryText);
    const result = await execute(
        'EXEC sys.sp_describe_first_result_set @tsql = @QueryText',
        { QueryText: queryText.trim() }
    );
    return (result.recordset || []).filter(row => row.is_hidden !== true);
}

async function getQueryColumns(connectionString, queryText) {
    const metadata = await getQueryColumnMetadata(connectionString, queryText);
    const columns = metadata.filter(row => row.name != null).map(row => String(row.name));

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
            .input('IDClasse', sql.Int, idClasse);
        await request.query(`
            SET XACT_ABORT ON;
            BEGIN TRY
                BEGIN TRANSACTION;
                DELETE D FROM dbo.TModelliClassiOriginiDatiCondizioni AS D
                JOIN dbo.TModelliClassiOriginiDati AS O ON O.Id = D.IDModelloClasseOrigineDati
                JOIN dbo.TModelliClassi AS C ON C.IDClasse = O.IDClasse
                JOIN dbo.TModelliVersioni AS V ON V.IDVersione = C.IDVersione
                JOIN dbo.TModelli AS M ON M.IDModello = V.IDModello
                WHERE O.IDClasse = @IDClasse AND M.IDAttore = @IDAttore;
                DECLARE @Status NVARCHAR(500);
                EXEC dbo.SP_DELETE_MODEL_CLASS_ORIGIN @IDAttore, @IDClasse, @Status OUTPUT;
                IF @Status <> 'OK' THROW 51000, @Status, 1;
                COMMIT TRANSACTION;
            END TRY
            BEGIN CATCH
                IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
                THROW;
            END CATCH;
        `);
        return true;
    });
}

module.exports = {
    getClassOrigin,
    getClassOriginConditions,
    saveClassOriginConditions,
    getClassOriginRows,
    testConnection,
    getQueryColumns,
    saveClassOrigin,
    deleteClassOrigin
};
