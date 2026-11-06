function parseTiming(body) {
    if (!body || !Array.isArray(body.intervals) || body.intervals.length !== 2) {
        throw new Error('Configurazione intervalli non valida.');
    }

    const intervals = body.intervals.map(function (item, type) {
        if (!item || item.type !== type || typeof item.active !== 'boolean') {
            throw new Error('Configurazione intervalli non valida.');
        }
        if (!item.active) {
            return { type: type, active: false, validityType: null, validityTime: null, target: null };
        }
        if ((item.validityType !== 0 && item.validityType !== 1) ||
            !Number.isInteger(item.validityTime) || item.validityTime < 0 ||
            item.validityTime > 2147483647 ||
            (type === 1 && (!Number.isInteger(item.target) || item.target <= 0 || item.target > 2147483647))) {
            throw new Error('Inserire una durata intera valida e selezionare lo stato automatico.');
        }
        return {
            type: type,
            active: true,
            validityType: item.validityType,
            validityTime: item.validityTime,
            target: type === 1 ? item.target : null
        };
    });

    if (intervals[0].active && intervals[1].active) {
        const hours = function (item) {
            return item.validityTime * (item.validityType === 1 ? 24 : 1);
        };
        if (hours(intervals[1]) < hours(intervals[0])) {
            throw new Error('L’intervallo massimo non può essere inferiore all’intervallo minimo.');
        }
    }
    return intervals;
}

module.exports = { parseTiming };
