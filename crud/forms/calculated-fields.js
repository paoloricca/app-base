const sql = require('mssql/msnodesqlv8');
const connection = require('../../config.db');

async function attachConditions(attributes) {
    if (!Array.isArray(attributes)) return attributes;
    const calculated = attributes.filter(attribute =>
        attribute.IsCalculated === true || attribute.IsCalculated === 1 ||
        attribute.IsCalculated === '1');
    if (!attributes.length) return attributes;

    const ids = attributes.map(attribute => Number(attribute.IDAttributo));
    if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
        throw new Error('Invalid calculated field ID.');
    }

    const pool = await sql.connect(connection);
    const result = await new sql.Request(pool)
        .input('Ids', sql.NVarChar(sql.MAX), JSON.stringify(ids))
        .input('CalculatedIds', sql.NVarChar(sql.MAX), JSON.stringify(
            calculated.map(attribute => Number(attribute.IDAttributo))))
        .query(`
            SELECT A.IDAttributo, CAST(CASE WHEN EXISTS (
                SELECT 1 FROM dbo.TModelliClassi C2
                JOIN dbo.TModelliClassiAttributi A2 ON A2.IDClasse = C2.IDClasse
                WHERE C2.IDVersione = C.IDVersione AND C2.IsVisible = 1 AND A2.IsVisible = 1
                  AND A2.IsCalculated = 1 AND A2.IDTipoDati = 4
            ) THEN 1 ELSE 0 END AS BIT) AS HasCalculatedDate
            FROM dbo.TModelliClassiAttributi A
            JOIN dbo.TModelliClassi C ON C.IDClasse = A.IDClasse
            WHERE A.IDAttributo IN (SELECT CONVERT(INT, value) FROM OPENJSON(@Ids));

            SELECT IDAttributoCalcolato, IDAttributo, Operazione, Sorgente, Cifre, SpaziVuoti, Valore, IDStatoWorkflow
            FROM dbo.TModelliClassiAttributiCondizioni
            WHERE IDAttributoCalcolato IN
                (SELECT CONVERT(INT, value) FROM OPENJSON(@CalculatedIds))
            ORDER BY Id
        `);
    const dateFlags = new Map(result.recordsets[0].map(row => [Number(row.IDAttributo), row.HasCalculatedDate]));
    attributes.forEach(attribute => {
        if (!dateFlags.has(Number(attribute.IDAttributo))) throw new Error('Calculation field not found.');
        attribute.HasCalculatedDate = dateFlags.get(Number(attribute.IDAttributo));
    });
    const byId = new Map(calculated.map(attribute => [Number(attribute.IDAttributo), []]));
    result.recordsets[1].forEach(condition => {
        const rule = {
            IDAttributo: condition.IDAttributo,
            Operazione: condition.Operazione
        };
        if (condition.Sorgente != null) {
            rule.Sorgente = condition.Sorgente;
            rule.Cifre = condition.Cifre;
            rule.SpaziVuoti = condition.SpaziVuoti;
            rule.Valore = condition.Valore;
            rule.IDStatoWorkflow = condition.IDStatoWorkflow;
        }
        byId.get(Number(condition.IDAttributoCalcolato)).push(rule);
    });
    calculated.forEach(attribute => {
        attribute.CalculationConditions = byId.get(Number(attribute.IDAttributo));
    });
    return attributes;
}

module.exports = { attachConditions };
