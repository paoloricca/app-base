const sql = require('mssql/msnodesqlv8');
const connection = require('../../config.db');

async function attachConditions(attributes) {
    if (!Array.isArray(attributes)) return attributes;
    const calculated = attributes.filter(attribute =>
        attribute.IsCalculated === true || attribute.IsCalculated === 1 ||
        attribute.IsCalculated === '1');
    if (!calculated.length) return attributes;

    const ids = calculated.map(attribute => Number(attribute.IDAttributo));
    if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
        throw new Error('Invalid calculated field ID.');
    }

    const pool = await sql.connect(connection);
    const result = await new sql.Request(pool)
        .input('Ids', sql.NVarChar(sql.MAX), JSON.stringify(ids))
        .query(`
            SELECT IDAttributoCalcolato, IDAttributo, Operazione, Sorgente, Cifre, SpaziVuoti, Valore
            FROM dbo.TModelliClassiAttributiCondizioni
            WHERE IDAttributoCalcolato IN
                (SELECT CONVERT(INT, value) FROM OPENJSON(@Ids))
            ORDER BY Id
        `);
    const byId = new Map(calculated.map(attribute => [Number(attribute.IDAttributo), []]));
    result.recordset.forEach(condition => {
        const rule = {
            IDAttributo: condition.IDAttributo,
            Operazione: condition.Operazione
        };
        if (condition.Sorgente != null) {
            rule.Sorgente = condition.Sorgente;
            rule.Cifre = condition.Cifre;
            rule.SpaziVuoti = condition.SpaziVuoti;
            rule.Valore = condition.Valore;
        }
        byId.get(Number(condition.IDAttributoCalcolato)).push(rule);
    });
    calculated.forEach(attribute => {
        attribute.CalculationConditions = byId.get(Number(attribute.IDAttributo));
    });
    return attributes;
}

module.exports = { attachConditions };
