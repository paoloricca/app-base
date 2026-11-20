const sql = require('mssql/msnodesqlv8');
const connection = require('../../config.db');
const math = require('../../controls/ux/calculated-fields');

function isCalculated(field) {
    return field.IsCalculated === true || field.IsCalculated === 1 || field.IsCalculated === '1';
}

function applySummaryCalculations(rows, attributes, conditions, recordValues) {
    const fields = new Map(attributes.map(field => [Number(field.IDAttributo), field]));
    const summaries = attributes.filter(field => isCalculated(field) &&
        (field.IsSummary === true || field.IsSummary === 1 || field.IsSummary === '1') &&
        Number(field.NumeroCicliMin || 0) < 2);
    if (!summaries.length) return rows;

    const rules = new Map();
    conditions.forEach(condition => {
        const id = Number(condition.IDAttributoCalcolato);
        if (!rules.has(id)) rules.set(id, []);
        rules.get(id).push(condition);
    });
    const recordsByInstance = new Map();
    recordValues.forEach(value => {
        const instance = Number(value.IDModelloIstanza);
        const classId = Number(value.IDClasse);
        const recordId = Number(value.IDRecord);
        if (!recordsByInstance.has(instance)) recordsByInstance.set(instance, new Map());
        const classes = recordsByInstance.get(instance);
        if (!classes.has(classId)) classes.set(classId, new Map());
        const records = classes.get(classId);
        if (!records.has(recordId)) records.set(recordId, new Map());
        if (value.IDAttributo != null) {
            const values = records.get(recordId);
            const attributeId = Number(value.IDAttributo);
            if (values.has(attributeId)) throw new Error('Duplicate calculation source value.');
            values.set(attributeId, value.RecordValue);
        }
    });

    rows.forEach(row => {
        let summary;
        try {
            summary = row.SummaryJson ? JSON.parse(row.SummaryJson) : [];
        } catch (error) {
            throw new Error('Invalid summary data returned for record ' + row.IDModelloIstanza + '.');
        }
        if (!Array.isArray(summary)) throw new Error('Invalid summary data returned for record ' + row.IDModelloIstanza + '.');
        const classes = recordsByInstance.get(Number(row.IDModelloIstanza)) || new Map();
        const calculated = new Map();
        const visiting = new Set();
        function sourceValues(id) {
            const field = fields.get(id);
            if (!field) throw new Error('Calculation source ' + id + ' is unavailable.');
            const records = Array.from((classes.get(Number(field.IDClasse)) || new Map()).values());
            const multiple = Number(field.NumeroCicliMin || 0) > 1;
            if (isCalculated(field)) {
                if (!multiple) return [evaluate(id)];
                return records.length ? Array(records.length).fill(evaluate(id)) : [];
            }
            if (!multiple) return [records.length ? records[records.length - 1].get(id) : null];
            return records.map(record => record.get(id));
        }
        function evaluate(id) {
            if (calculated.has(id)) return calculated.get(id);
            if (visiting.has(id)) throw new Error('Circular calculation reference.');
            const field = fields.get(id);
            if (!field) throw new Error('Calculation source ' + id + ' is unavailable.');
            visiting.add(id);
            try {
                const precision = Number(field.IDTipoDati) === 2 ? 0 :
                    (field.LunghezzaDecimale == null || field.LunghezzaDecimale === ''
                        ? NaN : Number(field.LunghezzaDecimale));
                const result = math.calculate(rules.get(id), sourceValues, precision);
                calculated.set(id, result);
                return result;
            } finally {
                visiting.delete(id);
            }
        }
        summaries.forEach(field => {
            const id = Number(field.IDAttributo);
            summary = summary.filter(value => Number(value.IDAttributo) !== id);
            try {
                summary.push({ IDAttributo: id, Value: evaluate(id) });
            } catch (error) {
                summary.push({ IDAttributo: id, CalculationError: error.message });
            }
        });
        row.SummaryJson = JSON.stringify(summary);
    });
    return rows;
}

async function attachCalculatedSummaries(rows, processId, actorId) {
    if (!rows.length) return rows;
    const ids = rows.map(row => Number(row.IDModelloIstanza));
    if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
        throw new Error('Invalid summary record ID.');
    }
    const pool = await sql.connect(connection);
    const result = await new sql.Request(pool)
        .input('ProcessId', sql.Int, Number(processId))
        .input('ActorId', sql.Int, Number(actorId))
        .input('Ids', sql.NVarChar(sql.MAX), JSON.stringify(ids))
        .query(`
            DECLARE @VersionId INT = (SELECT IDVersione FROM dbo.TProcessi
                WHERE IDProcesso = @ProcessId AND IsProcess = 1);
            IF EXISTS (
                SELECT 1 FROM dbo.TModelliClassiAttributi A
                JOIN dbo.TModelliClassi C ON C.IDClasse = A.IDClasse
                WHERE C.IDVersione = @VersionId AND C.IsVisible = 1 AND C.Visibile = 1
                  AND A.IsVisible = 1 AND A.Visibile = 1 AND A.IsSummary = 1
                  AND A.IsCalculated = 1 AND ISNULL(C.NumeroCicliMin, 0) < 2
            )
            BEGIN
                SELECT A.IDAttributo, A.IDClasse, A.IDTipoDati, A.IsCalculated,
                       A.IsSummary, A.LunghezzaDecimale, C.NumeroCicliMin
                FROM dbo.TModelliClassiAttributi A
                JOIN dbo.TModelliClassi C ON C.IDClasse = A.IDClasse
                WHERE C.IDVersione = @VersionId AND C.IsVisible = 1 AND C.Visibile = 1
                  AND A.IsVisible = 1 AND A.Visibile = 1 AND A.IDTipoDati IN (2, 3, 9);

                SELECT D.IDAttributoCalcolato, D.IDAttributo, D.Operazione
                FROM dbo.TModelliClassiAttributiCondizioni D
                JOIN dbo.TModelliClassiAttributi A ON A.IDAttributo = D.IDAttributoCalcolato
                JOIN dbo.TModelliClassi C ON C.IDClasse = A.IDClasse
                WHERE C.IDVersione = @VersionId
                ORDER BY D.Id;

                SELECT I.IDModelloIstanza, R.IDClasse, R.IDRecord, A.IDAttributo, V.RecordValue
                FROM dbo.TModelliIstanze I
                JOIN OPENJSON(@Ids) J ON I.IDModelloIstanza = TRY_CONVERT(INT, J.value)
                JOIN dbo.TModelliIstanzeRecords R ON R.IDModelloIstanza = I.IDModelloIstanza
                JOIN dbo.TModelliClassi C ON C.IDClasse = R.IDClasse AND C.IDVersione = @VersionId
                LEFT JOIN dbo.TModelliClassiAttributi A ON A.IDClasse = C.IDClasse
                    AND A.IDTipoDati IN (2, 3, 9) AND ISNULL(A.IsCalculated, 0) = 0
                    AND A.IsVisible = 1 AND A.Visibile = 1
                    AND EXISTS (SELECT 1 FROM dbo.TModelliClassiAttributiCondizioni D
                                WHERE D.IDAttributo = A.IDAttributo AND D.IDAttributoCalcolato IS NOT NULL)
                LEFT JOIN dbo.TModelliIstanzeRecord V ON V.IDRecord = R.IDRecord
                    AND V.IDAttributo = A.IDAttributo
                WHERE I.IDVersione = @VersionId AND I.IDCliente = @ActorId AND I.IsVisible = 1
                  AND C.IsVisible = 1 AND C.Visibile = 1
                ORDER BY I.IDModelloIstanza, R.IDClasse, R.IDRecord, A.IDAttributo;
            END
        `);
    if (!result.recordsets.length) return rows;
    return applySummaryCalculations(rows, result.recordsets[0], result.recordsets[1], result.recordsets[2]);
}

module.exports = { applySummaryCalculations, attachCalculatedSummaries };
