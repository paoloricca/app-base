const sql = require('mssql/msnodesqlv8');
const connection = require('../../config.db');
const math = require('../../controls/ux/calculated-fields');

function request(db, options) {
    return new sql.Request(db)
        .input('VersionId', sql.Int, Number(options.versionId))
        .input('ProcessId', sql.Int, options.processId ? Number(options.processId) : null)
        .input('InstanceId', sql.Int, options.instanceId ? Number(options.instanceId) : null)
        .input('ActorId', sql.Int, Number(options.actorId))
        .input('AccountId', sql.Int, Number(options.accountId))
        .input('ProfileId', sql.Int, options.profileId ? Number(options.profileId) : null)
        .input('GroupId', sql.Int, options.groupId ? Number(options.groupId) : null);
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

async function dateContext(db, options) {
    const result = await request(db, options)
        .input('Language', sql.VarChar(2), options.language || 'IT')
        .query(`
        DECLARE @ModelId INT, @SelectedProcess INT = @ProcessId, @WorkflowVersion INT,
                @CurrentWorkflowVersion INT, @WorkflowRecordId INT, @HasWorkflowRecord BIT = 0,
                @Legacy BIT = 0, @HasWorkflow BIT, @ObjectName NVARCHAR(MAX), @ObjectPk NVARCHAR(MAX),
                @ObjectId INT, @Lookup NVARCHAR(MAX);
        SELECT @ModelId = IDModello FROM dbo.TModelliVersioni WHERE IDVersione = @VersionId;
        IF @ModelId IS NULL THROW 51100, 'Model version not found.', 1;
        IF (SELECT COUNT(*) FROM dbo.TProcessi WHERE IDModello = @ModelId AND IsProcess = 1) <> 1
            THROW 51101, 'The model must be associated with exactly one process.', 1;
        IF @SelectedProcess IS NULL
            SELECT @SelectedProcess = IDProcesso FROM dbo.TProcessi
            WHERE IDModello = @ModelId AND IsProcess = 1;
        SELECT @CurrentWorkflowVersion = IDVersioneWorkflow, @HasWorkflow = HasWorkflow,
               @ObjectName = ObjectName, @ObjectPk = ObjectPk
        FROM dbo.TProcessi
        WHERE IDProcesso = @SelectedProcess AND IDModello = @ModelId AND IsProcess = 1;
        IF @@ROWCOUNT = 0 THROW 51102, 'Process and model version do not match.', 1;
        SET @WorkflowVersion = @CurrentWorkflowVersion;
        IF @InstanceId IS NULL AND @ProcessId IS NULL
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM dbo.TModelli WHERE IDModello = @ModelId AND IDAttore = @ActorId)
                THROW 51103, 'Model editing is not authorized.', 1;
        END
        ELSE
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM dbo.VW_AUTORIZZAZIONI V
                JOIN dbo.TProcessiAzioni A ON A.IDProcessoAzione = V.IDProcessoAzione
                WHERE V.IDProcesso = @SelectedProcess AND V.IDAccountAutenticated = @AccountId
                  AND A.Codice IN ('Lettura', 'Visualizza', 'Anteprima', 'Inserimento', 'Modifica')
            ) THROW 51104, 'Process read is not authorized.', 1;
            IF @InstanceId IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM dbo.TModelliIstanze I
                WHERE I.IDModelloIstanza = @InstanceId AND I.IDVersione = @VersionId
                  AND I.IDCliente = @ActorId AND I.IsVisible = 1
            ) THROW 51105, 'Instance not found or access denied.', 1;
        END;
        IF @InstanceId IS NOT NULL
        BEGIN
            SET @WorkflowVersion = NULL;
            SELECT @WorkflowRecordId = IDRecord, @WorkflowVersion = IDVersioneWorkflow
            FROM dbo.TProcessiWorkflowRecord
            WHERE IDProcesso = @SelectedProcess AND IDRecord = @InstanceId;
            IF @WorkflowRecordId IS NULL AND @HasWorkflow = 1
               AND (@ObjectName IS NOT NULL OR @ObjectPk IS NOT NULL)
            BEGIN
                SET @ObjectId = OBJECT_ID(@ObjectName, 'U');
                IF @ObjectId IS NULL OR NOT EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE object_id = @ObjectId AND name = @ObjectPk
                      AND is_identity = 1 AND TYPE_NAME(user_type_id) = 'int'
                ) OR NOT EXISTS (
                    SELECT 1 FROM sys.columns WHERE object_id = @ObjectId AND name = 'IDModelloIstanza'
                ) THROW 51109, 'Invalid workflow object configuration.', 1;
                SET @Lookup = N'SELECT @Record = MAX(' + QUOTENAME(@ObjectPk) + N') FROM ' +
                    QUOTENAME(OBJECT_SCHEMA_NAME(@ObjectId)) + N'.' + QUOTENAME(OBJECT_NAME(@ObjectId)) +
                    N' WHERE IDModelloIstanza = @Instance';
                EXEC sys.sp_executesql @Lookup, N'@Instance INT, @Record INT OUTPUT',
                    @Instance = @InstanceId, @Record = @WorkflowRecordId OUTPUT;
                IF @WorkflowRecordId IS NOT NULL
                BEGIN
                    SET @Legacy = 1;
                    SELECT @WorkflowVersion = IDVersioneWorkflow FROM dbo.TProcessiWorkflowRecord
                    WHERE IDProcesso = @SelectedProcess AND IDRecord = @WorkflowRecordId;
                END;
            END;
            IF @WorkflowRecordId IS NULL
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM dbo.TEventiStati S
                    LEFT JOIN dbo.TEventiTransizioni T ON T.IDEventoTransizione = S.IDEventoTransizione
                    WHERE S.IDRecord = @InstanceId AND S.IsVisible = 1 AND (
                        T.IDEventoTransizione IS NULL OR T.IDVersioneWorkflow IS NULL
                        OR T.IDVersioneWorkflow = @CurrentWorkflowVersion
                        OR EXISTS (
                            SELECT 1 FROM dbo.TModelliClassiAttributiCondizioni D
                            JOIN dbo.TModelliClassiAttributi A ON A.IDAttributo = D.IDAttributoCalcolato
                            JOIN dbo.TModelliClassi C ON C.IDClasse = A.IDClasse
                            WHERE C.IDVersione = @VersionId AND C.IsVisible = 1 AND A.IsVisible = 1
                              AND A.IsCalculated = 1 AND A.IDTipoDati = 4
                              AND D.Sorgente = 'date_state' AND D.IDStatoWorkflow = S.IDEventoTransizione
                        )
                    )
                ) THROW 51106, 'Workflow history without a process mapping is ambiguous.', 1;
                SET @WorkflowVersion = @CurrentWorkflowVersion;
            END
            ELSE
            BEGIN
                IF @WorkflowVersion IS NULL AND @Legacy = 1
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM dbo.TEventiStati S
                        LEFT JOIN dbo.TEventiTransizioni T ON T.IDEventoTransizione = S.IDEventoTransizione
                        WHERE S.IDRecord = @WorkflowRecordId AND S.IsVisible = 1
                          AND (T.IDEventoTransizione IS NULL OR T.IDVersioneWorkflow IS NULL)
                    ) OR (
                        SELECT COUNT(DISTINCT T.IDVersioneWorkflow)
                        FROM dbo.TEventiStati S
                        JOIN dbo.TEventiTransizioni T ON T.IDEventoTransizione = S.IDEventoTransizione
                        WHERE S.IDRecord = @WorkflowRecordId AND S.IsVisible = 1
                    ) > 1 THROW 51110, 'Legacy workflow history is ambiguous.', 1;
                    SELECT @WorkflowVersion = MIN(T.IDVersioneWorkflow)
                    FROM dbo.TEventiStati S
                    JOIN dbo.TEventiTransizioni T ON T.IDEventoTransizione = S.IDEventoTransizione
                    WHERE S.IDRecord = @WorkflowRecordId AND S.IsVisible = 1;
                    SET @WorkflowVersion = COALESCE(@WorkflowVersion, @CurrentWorkflowVersion);
                    IF EXISTS (
                        SELECT 1 FROM dbo.TEventiStati S
                        WHERE S.IDRecord = @WorkflowRecordId AND S.IsVisible = 1
                    ) AND EXISTS (
                        SELECT 1 FROM dbo.TProcessi P
                        WHERE P.IDProcesso <> @SelectedProcess AND P.IsProcess = 1
                          AND P.IDVersioneWorkflow = @WorkflowVersion
                    ) THROW 51111, 'Legacy workflow history is ambiguous between processes.', 1;
                END;
                IF @WorkflowVersion IS NULL THROW 51112, 'Workflow version is unavailable.', 1;
                SET @HasWorkflowRecord = 1;
            END;
            IF EXISTS (
                SELECT 1 FROM dbo.TProcessiWorkflowRecord
                WHERE @HasWorkflowRecord = 1 AND IDRecord = @WorkflowRecordId
                  AND IDProcesso <> @SelectedProcess AND IDVersioneWorkflow = @WorkflowVersion
            ) THROW 51107, 'Workflow history is ambiguous between processes.', 1;
            IF @HasWorkflowRecord = 1 AND EXISTS (
                SELECT 1 FROM dbo.TProcessi P
                WHERE P.IDProcesso <> @SelectedProcess AND P.IsProcess = 1
                  AND P.IDVersioneWorkflow = @WorkflowVersion
                  AND (P.IDModello IS NULL OR P.IDVersione IS NULL)
            ) AND EXISTS (
                SELECT 1 FROM dbo.TEventiStati S
                JOIN dbo.TEventiTransizioni T ON T.IDEventoTransizione = S.IDEventoTransizione
                WHERE S.IDRecord = @WorkflowRecordId AND S.IsVisible = 1 AND T.IDVersioneWorkflow = @WorkflowVersion
            ) THROW 51108, 'Workflow history may belong to another process.', 1;
        END;
        SELECT CONVERT(VARCHAR(19), GETDATE(), 126) AS Now;
        SELECT T.IDEventoTransizione,
               COALESCE(NULLIF(CASE @Language WHEN 'IT' THEN T.Text_IT WHEN 'GB' THEN T.Text_GB
                   WHEN 'ES' THEN T.Text_ES ELSE T.Text_CN END, ''),
                   NULLIF(T.Text_IT, ''), NULLIF(T.Text_GB, ''), NULLIF(T.Text_ES, ''),
                   NULLIF(T.Text_CN, ''), CONCAT('#', T.IDEventoTransizione)) AS Description,
               CONVERT(VARCHAR(19), MIN(S.DataIstanza), 126) AS Date,
               CONVERT(VARCHAR(19), MAX(S.DataIstanza), 126) AS LastDate
        FROM dbo.TEventiTransizioni T
        LEFT JOIN dbo.TEventiStati S ON @HasWorkflowRecord = 1 AND S.IsVisible = 1
            AND S.IDRecord = @WorkflowRecordId AND S.IDEventoTransizione = T.IDEventoTransizione
        WHERE T.IDVersioneWorkflow = @WorkflowVersion AND (
          T.IsVisible = 1
          OR (@InstanceId IS NOT NULL AND EXISTS (
              SELECT 1 FROM dbo.TModelliClassiAttributiCondizioni D
              JOIN dbo.TModelliClassiAttributi A ON A.IDAttributo = D.IDAttributoCalcolato
              JOIN dbo.TModelliClassi C ON C.IDClasse = A.IDClasse
              WHERE C.IDVersione = @VersionId AND C.IsVisible = 1 AND A.IsVisible = 1
                AND A.IsCalculated = 1 AND A.IDTipoDati = 4
                AND D.Sorgente = 'date_state' AND D.IDStatoWorkflow = T.IDEventoTransizione
          )))
        GROUP BY T.IDEventoTransizione, T.Text_IT, T.Text_GB, T.Text_ES, T.Text_CN
        ORDER BY Description, T.IDEventoTransizione;
        SELECT DISTINCT D.IDStatoWorkflow AS IDEventoTransizione,
               CASE WHEN T.IDEventoTransizione IS NULL THEN 0 ELSE 1 END AS StateExists
        FROM dbo.TModelliClassiAttributiCondizioni D
        JOIN dbo.TModelliClassiAttributi A ON A.IDAttributo = D.IDAttributoCalcolato
        JOIN dbo.TModelliClassi C ON C.IDClasse = A.IDClasse
        LEFT JOIN dbo.TEventiTransizioni T ON T.IDEventoTransizione = D.IDStatoWorkflow
        WHERE @InstanceId IS NOT NULL AND C.IDVersione = @VersionId AND C.IsVisible = 1 AND A.IsVisible = 1
          AND A.IsCalculated = 1 AND A.IDTipoDati = 4
          AND D.Sorgente = 'date_state' AND D.IDStatoWorkflow IS NOT NULL;
    `);
    const states = result.recordsets[1];
    const ids = new Set(states.map(state => Number(state.IDEventoTransizione)));
    result.recordsets[2].forEach(state => {
        if (!state.StateExists) throw new Error('Configured workflow state no longer exists.');
        if (!ids.has(Number(state.IDEventoTransizione))) {
            states.push({ IDEventoTransizione: state.IDEventoTransizione, Description: null,
                Date: null, LastDate: null });
        }
    });
    return { Now: result.recordsets[0][0].Now, States: states };
}

async function previewDate(options) {
    const pool = await sql.connect(connection);
    return dateContext(pool, options);
}

function evaluateDate(rules, context) {
    if (typeof math.calculateDate !== 'function') throw new Error('Date calculation is not available.');
    const value = math.calculateDate(rules, context);
    if (typeof value !== 'string' || (value !== '' &&
        !/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(value) &&
        !/^-?\d+ giorni (?:[01]\d|2[0-3]):[0-5]\d$/.test(value))) {
        throw new Error('Invalid calculated date result.');
    }
    return value;
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
            .input('RecordId', sql.Int, Number(options.recordId))
            .query(`SELECT A.IsCalculated, A.IDTipoDati,
                        CASE WHEN EXISTS (
                            SELECT 1 FROM dbo.TModelliClassi C2
                            JOIN dbo.TModelliClassiAttributi A2 ON A2.IDClasse = C2.IDClasse
                            WHERE C2.IDVersione = I.IDVersione AND C2.IsVisible = 1 AND A2.IsVisible = 1
                              AND A2.IsCalculated = 1 AND A2.IDTipoDati = 4
                        ) THEN 1 ELSE 0 END AS HasCalculatedDate
                    FROM dbo.TModelliClassiAttributi A WITH (HOLDLOCK)
                    LEFT JOIN dbo.TModelliIstanzeRecords R ON R.IDRecord = @RecordId
                    LEFT JOIN dbo.TModelliIstanze I ON I.IDModelloIstanza = R.IDModelloIstanza
                    WHERE A.IDAttributo = @FieldId`);
        if (!field.recordset.length) throw new Error('Field not found.');
        if (field.recordset[0].IsCalculated && [1, 4].includes(Number(field.recordset[0].IDTipoDati))) {
            throw new Error('Calculated text and date fields cannot be written directly.');
        }
        if (field.recordset[0].HasCalculatedDate) {
            throw new Error('This form contains calculated dates; use the transactional section save.');
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
    const submitted = options.fields == null ? [] : options.fields;
    if (!Array.isArray(submitted)) throw new Error('Invalid section values.');
    const pool = await sql.connect(connection);
    const transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
        const values = await context(transaction, options, true);
        const data = await request(transaction, { ...options, processId: values.ProcessId })
            .input('ClassId', sql.Int, Number(options.classId))
            .input('RecordId', sql.Int, Number(options.recordId))
            .input('HasSubmittedFields', sql.Bit, submitted.length > 0)
            .query(`
                IF NOT EXISTS (SELECT 1 FROM dbo.TModelliIstanzeRecords R
                    JOIN dbo.TModelliClassi C ON C.IDClasse = R.IDClasse
                    WHERE R.IDRecord = @RecordId AND R.IDModelloIstanza = @InstanceId
                      AND R.IDClasse = @ClassId AND C.IDVersione = @VersionId)
                    THROW 51004, 'Class record not found.', 1;
                IF NOT EXISTS (
                    SELECT 1 FROM dbo.TProcessi P
                    JOIN dbo.TModelliIstanze I ON I.IDVersione = P.IDVersione
                    JOIN dbo.TModelliIstanzeRecords R ON R.IDModelloIstanza = I.IDModelloIstanza
                    JOIN dbo.VW_AUTORIZZAZIONI V ON V.IDProcesso = P.IDProcesso
                    JOIN dbo.TProcessiAzioni PA ON PA.IDProcessoAzione = V.IDProcessoAzione
                    WHERE P.IDProcesso = @ProcessId AND P.IsProcess = 1
                      AND I.IDModelloIstanza = @InstanceId AND I.IDCliente = @ActorId
                      AND R.IDRecord = @RecordId AND R.IDClasse = @ClassId
                      AND V.IDAccountAutenticated = @AccountId AND PA.Codice IN ('Inserimento', 'Modifica')
                ) THROW 51006, 'Section edit is not authorized.', 1;
                IF NOT EXISTS (
                    SELECT 1 FROM dbo.TModelliClassiAttributi A
                    WHERE A.IDClasse = @ClassId AND A.IsVisible = 1 AND A.Visibile = 1
                      AND NOT EXISTS (
                        SELECT 1 FROM dbo.TModelliIstanzeRecords CR
                        JOIN dbo.TModelliIstanze I ON I.IDModelloIstanza = CR.IDModelloIstanza
                        JOIN dbo.TProcessiWorkflowRecord WR ON WR.IDProcesso = @ProcessId
                            AND WR.IDRecord = I.IDModelloIstanza
                        CROSS APPLY (SELECT TOP (1) S.IDEventoTransizione FROM dbo.TEventiStati S
                            WHERE S.IDRecord = WR.IDRecord ORDER BY S.DataIstanza DESC, S.IDEventoStato DESC) CurrentState
                        JOIN dbo.TEventiTransizioniAzioni SA ON SA.IDEventoTransizione = CurrentState.IDEventoTransizione
                            AND SA.IDProcesso = @ProcessId
                        JOIN dbo.TProcessiAzioni PA ON PA.IDProcessoAzione = SA.IDProcessoAzione
                        JOIN dbo.TEventiTransizioniAzioniAttributi Configured ON Configured.IDEventoAzione = SA.IDEventoAzione
                        WHERE CR.IDRecord = @RecordId AND PA.Codice = 'Modifica'
                          AND (@ProfileId IS NULL OR SA.IDProfiloUtente = @ProfileId)
                          AND (@GroupId IS NULL OR SA.IDGruppoOperativo = @GroupId)
                          AND NOT EXISTS (SELECT 1 FROM dbo.TEventiTransizioniAzioniAttributi Allowed
                              WHERE Allowed.IDEventoAzione = SA.IDEventoAzione AND Allowed.IDAttributo = A.IDAttributo)
                      )
                ) AND NOT (
                    EXISTS (SELECT 1 FROM dbo.TModelliClassiAttributi A
                        WHERE A.IDClasse = @ClassId AND A.IsVisible = 1 AND A.Visibile = 1
                          AND A.IsCalculated = 1 AND A.IDTipoDati = 4)
                    AND @HasSubmittedFields = 0
                ) THROW 51007, 'Section is read-only for the current workflow state.', 1;
                SELECT A.IDAttributo, A.IDClasse, A.IDTipoDati, A.IsCalculated,
                       A.Lunghezza, A.LunghezzaDecimale, C.NumeroCicliMin
                FROM dbo.TModelliClassiAttributi A JOIN dbo.TModelliClassi C ON C.IDClasse = A.IDClasse
                WHERE C.IDVersione = @VersionId AND
                  ((C.IsVisible = 1 AND C.Visibile = 1 AND A.IsVisible = 1 AND A.Visibile = 1)
                    OR (C.IsVisible = 1 AND A.IsVisible = 1 AND A.IsCalculated = 1 AND A.IDTipoDati = 4));
                SELECT D.IDAttributoCalcolato, D.IDAttributo, D.Operazione,
                       D.Sorgente, D.Cifre, D.SpaziVuoti, D.Valore, D.IDStatoWorkflow
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
        const dateFields = Array.from(fields.values()).filter(field => field.IsCalculated &&
            Number(field.IDTipoDati) === 4 && records.has(Number(field.IDClasse)));
        const dates = dateFields.length ? await dateContext(transaction, options) : null;
        const calculatedDates = new Map(dateFields.map(field =>
            [Number(field.IDAttributo), evaluateDate(field.rules, dates)]));
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
        for (const field of dateFields) {
            const value = calculatedDates.get(Number(field.IDAttributo));
            for (const [recordId, record] of byRecord) {
                if (!(records.get(Number(field.IDClasse)) || []).includes(record)) continue;
                await new sql.Request(transaction)
                    .input('RecordId', sql.Int, recordId)
                    .input('FieldId', sql.Int, Number(field.IDAttributo))
                    .input('Value', sql.NVarChar(sql.MAX), value)
                    .input('AccountId', sql.Int, Number(options.accountId))
                    .query(`
                        IF EXISTS (SELECT 1 FROM dbo.TModelliIstanzeRecord
                            WHERE IDRecord = @RecordId AND IDAttributo = @FieldId)
                            UPDATE dbo.TModelliIstanzeRecord SET RecordValue = @Value, DataIstanza = GETDATE()
                            WHERE IDRecord = @RecordId AND IDAttributo = @FieldId;
                        ELSE
                            INSERT dbo.TModelliIstanzeRecord (IDRecord, IDAttributo, RecordValue, DataIstanza, IDIstanziatore)
                            VALUES (@RecordId, @FieldId, @Value, GETDATE(), @AccountId);
                    `);
                record.set(Number(field.IDAttributo), value);
                if (recordId === Number(options.recordId)) {
                    saved.push({ IDAttributo: field.IDAttributo, Value: value });
                }
            }
        }
        if (dateFields.length) {
            await new sql.Request(transaction).input('InstanceId', sql.Int, Number(options.instanceId))
                .query('UPDATE dbo.TModelliIstanze SET DataIstanza = GETDATE() WHERE IDModelloIstanza = @InstanceId');
        }
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

module.exports = { preview, previewDate, save, saveRegularValue, evaluateText, evaluateDate };
