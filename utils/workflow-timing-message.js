function minimumIntervalMessage(language, validityTime, validityType) {
    if (!Number.isInteger(validityTime) || validityTime < 0 ||
        (validityType !== 0 && validityType !== 1)) {
        throw new Error('Configurazione intervallo minimo non valida.');
    }

    const labels = {
        IT: {
            message: 'Non è possibile cambiare stato prima della scadenza dell’intervallo minimo.',
            hours: ['ora', 'ore'], days: ['giorno', 'giorni']
        },
        GB: {
            message: 'The state cannot be changed before the minimum interval has elapsed.',
            hours: ['hour', 'hours'], days: ['day', 'days']
        },
        ES: {
            message: 'No se puede cambiar de estado antes de que transcurra el intervalo mínimo.',
            hours: ['hora', 'horas'], days: ['día', 'días']
        },
        CN: {
            message: '最短間隔到期前無法變更狀態。',
            hours: ['小時', '小時'], days: ['天', '天']
        }
    };
    const label = labels[language] || labels.GB;
    const units = validityType === 0 ? label.hours : label.days;
    return label.message + ' (' + validityTime + ' ' + units[validityTime === 1 ? 0 : 1] + ')';
}

module.exports = { minimumIntervalMessage };
