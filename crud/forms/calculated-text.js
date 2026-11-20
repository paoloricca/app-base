const sql = require('mssql/msnodesqlv8');
const connection = require('../../config.db');
const math = require('../../controls/ux/calculated-fields');

function request(db, options) {
    return new sql.Request(db)
        .input('VersionId', sql.Int, Number(options.versionId))
        .input('ProcessId', sql.Int, options.processId ? Number(options.processId) : null)
        .input('InstanceId', sql.Int, options.instanceId ? Number(options.instanceId) : null)
        .input('ActorId', sql.Int, Number(options.actorId))
        .input('AccountId', sql.Int, Number(options.accountId));
}

async function context(db, options, lock) {
    const result = await request(db, options).query(`
        DECLARE @ModelId INT = (SELECT IDModello FROM dbo.TModelliVersioni WHERE IDVersione = @VersionId);
        DECLARE @SelectedProcess INT = @ProcessId, @Creator INT = @AccountId;
        IF @ModelId IS NULL THROW 51000, 'Model version not found.', 1;
        IF @SelectedProcess IS NULL
        BEGIN
            IF (SELECT COUNT(*) FROM dbo.TProcessi WHERE IDModello = @ModelId AND IsProcess = 1) <> 1
                THROW 51001, 'Cannot identify the process for this model.', 1;
            SELECT @SelectedProcess = IDProcesso FROM dbo.TProcessi WHERE IDModello = @ModelId AND IsProcess = 1;
        END;
        IF (SELECT COUNT(*) FROM dbo.TProcessi WHERE IDModello = @ModelId AND IsProcess = 1) <> 1
            THROW 51005, 'Cannot calculate a process sequence when the model is shared by multiple processes.', 1;
        IF NOT EXISTS (
            SELECT 1 FROM dbo.TProcessi P
            JOIN dbo.VW_AUTORIZZAZIONI V ON V.IDProcesso = P.IDProcesso
            JOIN dbo.TProcessiAzioni A ON A.IDProcessoAzione = V.IDProcessoAzione
            WHERE P.IDProcesso = @SelectedProcess AND P.IDModello = @ModelId AND P.IsProcess = 1
              AND V.IDAccountAutenticated = @AccountId
              AND A.Codice IN ('Lettura', 'Visualizza', 'Anteprima', 'Inserimento', 'Modifica')
        ) THROW 51002, 'Process read is not authorized.', 1;
        ${lock ? 'DECLARE @LockProbe INT; SELECT TOP (1) @LockProbe = IDModelloIstanza FROM dbo.TModelliIstanze WITH (TABLOCKX, HOLDLOCK);' : ''}
        IF @InstanceId IS NOT NULL
        BEGIN
            SELECT @Creator = I.IDIstanziatore FROM dbo.TModelliIstanze I
            WHERE I.IDModelloIstanza = @InstanceId AND I.IDVersione = @VersionId
              AND I.IDCliente = @ActorId AND I.IsVisible = 1;
            IF @@ROWCOUNT = 0 OR @Creator IS NULL THROW 51003, 'Instance not found or access denied.', 1;
        END;
        SELECT @SelectedProcess AS ProcessId, @Creator AS Creator,
               COUNT_BIG(*) + CASE WHEN @InstanceId IS NULL THEN 1 ELSE 0 END AS ProcessSequence,
               SUM(CONVERT(BIGINT, CASE WHEN I.IDIstanziatore = @Creator THEN 1 ELSE 0 END))
                   + CASE WHEN @InstanceId IS NULL THEN 1 ELSE 0 END AS OperatorSequence
        FROM dbo.TModelliIstanze I ${lock ? 'WITH (TABLOCKX, HOLDLOCK)' : ''}
        JOIN dbo.TModelliVersioni V ON V.IDVersione = I.IDVersione
        WHERE V.IDModello = @ModelId AND I.IDCliente = @ActorId
          AND (@InstanceId IS NULL OR I.IDModelloIstanza <= @InstanceId);
    `);
    const data = result.recordset[0];
    if (data.OperatorSequence == null) data.OperatorSequence = options.instanceId ? 0 : 1;
    return data;
}

async function preview(options) {
    const pool = await sql.connect(connection);
    return context(pool, options, false);
}

async function writeProcessValue(db, options, recordId, fieldId, value) {
    const result = await new sql.Request(db)
        .input('IdProcesso', sql.Int, Number(options.processId))
        .input('IDRecord', sql.Int, Number(recordId))
        .input('IDAttributo', sql.Int, Number(fieldId))
        .input('RecordValue', sql.NVarChar(sql.MAX), value)
        .input('IdAttore', sql.Int, Number(options.actorId))
        .input('IdAccount', sql.Int, Number(options.accountId))
        .input('IdProfiloUtente', sql.Int, options.profileId || null)
        .input('IdGruppoOperativo', sql.Int, options.groupId || null)
        .output('Status', sql.NVarChar(500))
        .execute('SP_PUT_PROCESS_FORM_VALUE');
    if (!result.output || result.output.Status !== 'OK') {
        throw new Error(result.output && result.output.Status || 'Unable to save the field.');
    }
}

async function saveRegularValue(options) {
    const pool = await sql.connect(connection);
    const transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
        const field = await new sql.Request(transaction)
            .input('FieldId', sql.Int, Number(options.fieldId))
            .query(`SELECT IsCalculated, IDTipoDati FROM dbo.TModelliClassiAttributi WITH (HOLDLOCK)
                    WHERE IDAttributo = @FieldId`);
        if (!field.recordset.length) throw new Error('Field not found.');
        if (field.recordset[0].IsCalculated && Number(field.recordset[0].IDTipoDati) === 1) {
            throw new Error('Calculated text fields cannot be written directly.');
        }
        if (options.processId) {
            await writeProcessValue(transaction, options, options.recordId, options.fieldId, options.value);
        } else {
            const result = await new sql.Request(transaction)
                .input('IDRecord', sql.Int, Number(options.recordId))
                .input('IDAttributo', sql.Int, Number(options.fieldId))
                .input('IDIstanziatore', sql.Int, Number(options.accountId))
                .input('RecordValue', sql.NVarChar(sql.MAX), options.value)
                .input('LanguageContext', sql.NVarChar(2), options.language)
                .output('Status', sql.NVarChar(500))
                .execute('SP_POST_IDMODELLO_ISTANZA_RECORD');
            if (!result.output || result.output.Status !== 'OK') {
                throw new Error(result.output && result.output.Status || 'Unable to save the field.');
            }
        }
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

function evaluateText(fieldId, fields, records, values) {
    const cache = new Map();
    const visiting = new Set();
    function sourceValues(id) {
        const field = fields.get(Number(id));
        if (!field) throw new Error('Calculation source ' + id + ' is unavailable.');
        const section = records.get(Number(field.IDClasse)) || [];
        const multiple = Number(field.NumeroCicliMin || 0) > 1;
        if (field.IsCalculated) {
            if (Number(field.IDTipoDati) === 1) {
                const stored = section.map(record => record.get(Number(id))).filter(value => value != null && value !== '');
                if (stored.length) return multiple ? stored : [stored[stored.length - 1]];
            }
            if (!multiple) return [evaluate(id)];
            return section.length ? Array(section.length).fill(evaluate(id)) : [];
        }
        if (!multiple) return [section.length ? section[section.length - 1].get(Number(id)) : ''];
        return section.map(record => record.get(Number(id)) || '');
    }
    function evaluate(id) {
        id = Number(id);
        if (cache.has(id)) return cache.get(id);
        if (visiting.has(id)) throw new Error('Circular calculation reference.');
        const field = fields.get(id);
        if (!field) throw new Error('Calculation source ' + id + ' is unavailable.');
        visiting.add(id);
        try {
            let result;
            if (Number(field.IDTipoDati) === 1) {
                result = math.concatenate(field.rules, condition => {
                    switch (condition.Sorgente) {
                        case 'operator': return values.Creator;
                        case 'process': return values.ProcessSequence;
                        case 'operator_process': return values.OperatorSequence;
                        case 'field': return sourceValues(condition.IDAttributo).join('');
                        default: throw new Error('Calculation source is unavailable.');
                    }
                });
            } else {
                const precision = Number(field.IDTipoDati) === 2 ? 0 :
                    (field.LunghezzaDecimale == null ? NaN : Number(field.LunghezzaDecimale));
                result = math.calculate(field.rules, sourceValues, precision);
            }
            cache.set(id, result);
            return result;
        } finally {
            visiting.delete(id);
        }
    }
    return evaluate(fieldId);
}

async function save(options) {
    if (!options.instanceId || !options.recordId || !options.classId) {
        throw new Error('Invalid calculated field record.');
    }
    const pool = await sql.connect(connection);
    const transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
        const values = await context(transaction, options, true);
        const data = await request(transaction, options)
            .input('ClassId', sql.Int, Number(options.classId))
            .input('RecordId', sql.Int, Number(options.recordId))
            .query(`
                IF NOT EXISTS (SELECT 1 FROM dbo.TModelliIstanzeRecords R
                    JOIN dbo.TModelliClassi C ON C.IDClasse = R.IDClasse
                    WHERE R.IDRecord = @RecordId AND R.IDModelloIstanza = @InstanceId
                      AND R.IDClasse = @ClassId AND C.IDVersione = @VersionId)
                    THROW 51004, 'Class record not found.', 1;
                SELECT A.IDAttributo, A.IDClasse, A.IDTipoDati, A.IsCalculated,
                       A.Lunghezza, A.LunghezzaDecimale, C.NumeroCicliMin
                FROM dbo.TModelliClassiAttributi A JOIN dbo.TModelliClassi C ON C.IDClasse = A.IDClasse
                WHERE C.IDVersione = @VersionId AND C.IsVisible = 1 AND C.Visibile = 1
                  AND A.IsVisible = 1 AND A.Visibile = 1;
                SELECT D.IDAttributoCalcolato, D.IDAttributo, D.Operazione,
                       D.Sorgente, D.Cifre, D.SpaziVuoti, D.Valore
                FROM dbo.TModelliClassiAttributiCondizioni D
                JOIN dbo.TModelliClassiAttributi A ON A.IDAttributo = D.IDAttributoCalcolato
                JOIN dbo.TModelliClassi C ON C.IDClasse = A.IDClasse
                WHERE C.IDVersione = @VersionId ORDER BY D.Id;
                SELECT R.IDClasse, R.IDRecord, V.IDAttributo, V.RecordValue
                FROM dbo.TModelliIstanzeRecords R
                LEFT JOIN dbo.TModelliIstanzeRecord V ON V.IDRecord = R.IDRecord
                WHERE R.IDModelloIstanza = @InstanceId ORDER BY R.IDClasse, R.IDRecord;
            `);
        const fields = new Map(data.recordsets[0].map(field => {
            field.IsCalculated = field.IsCalculated === true || field.IsCalculated === 1;
            field.rules = [];
            return [Number(field.IDAttributo), field];
        }));
        data.recordsets[1].forEach(rule => {
            const target = fields.get(Number(rule.IDAttributoCalcolato));
            if (target) target.rules.push(rule);
        });
        const records = new Map();
        const byRecord = new Map();
        data.recordsets[2].forEach(row => {
            const recordId = Number(row.IDRecord), classId = Number(row.IDClasse);
            if (!byRecord.has(recordId)) {
                const entry = new Map();
                byRecord.set(recordId, entry);
                if (!records.has(classId)) records.set(classId, []);
                records.get(classId).push(entry);
            }
            if (row.IDAttributo != null) byRecord.get(recordId).set(Number(row.IDAttributo), row.RecordValue);
        });
        const submitted = options.fields || [];
        if (!Array.isArray(submitted)) throw new Error('Invalid section values.');
        const submittedIds = new Set();
        for (const item of submitted) {
            const id = Number(item.IDAttributo);
            const field = fields.get(id);
            if (!Number.isSafeInteger(id) || submittedIds.has(id) || !field ||
                Number(field.IDClasse) !== Number(options.classId) || field.IsCalculated ||
                typeof item.Value !== 'string') {
                throw new Error('Invalid section value.');
            }
            submittedIds.add(id);
            await writeProcessValue(transaction, { ...options, processId: values.ProcessId },
                options.recordId, id, item.Value);
            byRecord.get(Number(options.recordId)).set(id, item.Value);
        }
        const saved = [];
        for (const field of fields.values()) {
            if (!field.IsCalculated || Number(field.IDTipoDati) !== 1 ||
                Number(field.IDClasse) !== Number(options.classId)) continue;
            const existing = byRecord.get(Number(options.recordId)).get(Number(field.IDAttributo));
            if (existing != null && existing !== '') {
                saved.push({ IDAttributo: field.IDAttributo, Value: existing });
                continue;
            }
            const value = evaluateText(field.IDAttributo, fields, records, values);
            if (Number(field.Lunghezza) > 0 && value.length > Number(field.Lunghezza)) {
                throw new Error('Calculated text exceeds the maximum field length.');
            }
            const collision = await request(transaction, options)
                .input('Value', sql.NVarChar(sql.MAX), value)
                .input('Creator', sql.Int, values.Creator)
                .query(`
                    SELECT TOP (1) V.IDRecord
                    FROM dbo.TModelliIstanzeRecord V
                    JOIN dbo.TModelliIstanzeRecords R ON R.IDRecord = V.IDRecord
                    JOIN dbo.TModelliIstanze I ON I.IDModelloIstanza = R.IDModelloIstanza
                    JOIN dbo.TModelliVersioni Ver ON Ver.IDVersione = I.IDVersione
                    JOIN dbo.TModelliClassiAttributi A ON A.IDAttributo = V.IDAttributo
                    WHERE Ver.IDModello = (SELECT IDModello FROM dbo.TModelliVersioni WHERE IDVersione = @VersionId)
                      AND I.IDCliente = @ActorId AND I.IDIstanziatore = @Creator
                      AND I.IDModelloIstanza <> @InstanceId AND A.IsCalculated = 1 AND A.IDTipoDati = 1
                      AND V.RecordValue = @Value;
                `);
            if (collision.recordset.length) throw new Error('The calculated value is already assigned.');
            await writeProcessValue(transaction, { ...options, processId: values.ProcessId },
                options.recordId, field.IDAttributo, value);
            byRecord.get(Number(options.recordId)).set(Number(field.IDAttributo), value);
            saved.push({ IDAttributo: field.IDAttributo, Value: value });
        }
        await transaction.commit();
        return saved;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

module.exports = { preview, save, saveRegularValue, evaluateText };
