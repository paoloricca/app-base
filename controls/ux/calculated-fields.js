(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CalculatedFieldMath = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    function gcd(a, b) {
        a = a < 0n ? -a : a;
        b = b < 0n ? -b : b;
        while (b !== 0n) {
            var remainder = a % b;
            a = b;
            b = remainder;
        }
        return a;
    }

    function fraction(numerator, denominator) {
        if (denominator === 0n) throw new Error('Division by zero.');
        if (denominator < 0n) {
            numerator = -numerator;
            denominator = -denominator;
        }
        var divisor = gcd(numerator, denominator);
        return { n: numerator / divisor, d: denominator / divisor };
    }

    function parse(value) {
        if (value == null || String(value).trim() === '') return fraction(0n, 1n);
        var text = String(value).trim().replace(',', '.');
        if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) throw new Error('Invalid numeric value.');
        var negative = text.charAt(0) === '-';
        if (negative) text = text.slice(1);
        var parts = text.split('.');
        var decimals = parts[1] || '';
        var numerator = BigInt((parts[0] || '0') + decimals);
        return fraction(negative ? -numerator : numerator, 10n ** BigInt(decimals.length));
    }

    function add(a, b) {
        return fraction(a.n * b.d + b.n * a.d, a.d * b.d);
    }

    function format(value, precision) {
        if (!Number.isSafeInteger(precision) || precision < 0 || precision > 12) {
            throw new Error('Invalid decimal precision.');
        }
        var scale = 10n ** BigInt(precision);
        var absolute = value.n < 0n ? -value.n : value.n;
        var scaled = absolute * scale;
        var rounded = scaled / value.d;
        if ((scaled % value.d) * 2n >= value.d) rounded += 1n;
        var digits = rounded.toString().padStart(precision + 1, '0');
        var sign = value.n < 0n && rounded !== 0n ? '-' : '';
        return sign + (precision
            ? digits.slice(0, -precision) + '.' + digits.slice(-precision)
            : digits);
    }

    function calculate(conditions, valuesForField, precision) {
        if (!Array.isArray(conditions) || !conditions.length) {
            throw new Error('The calculated field has no conditions.');
        }
        if ([1, 6].indexOf(Number(conditions[0].Operazione)) === -1) {
            throw new Error('The first calculation operation must be equal or add.');
        }
        var result = fraction(0n, 1n);
        conditions.forEach(function (condition) {
            var values = valuesForField(Number(condition.IDAttributo));
            if (!Array.isArray(values)) throw new Error('Calculation source is unavailable.');
            var operand = values.reduce(function (sum, value) { return add(sum, parse(value)); }, fraction(0n, 1n));
            switch (Number(condition.Operazione)) {
                case 1: result = add(result, operand); break;
                case 2: result = add(result, fraction(-operand.n, operand.d)); break;
                case 3: result = fraction(result.n * operand.n, result.d * operand.d); break;
                case 4: result = fraction(result.n * operand.d, result.d * operand.n); break;
                case 6: result = operand; break;
                default: throw new Error('Invalid calculation operation.');
            }
        });
        return format(result, precision);
    }

    function concatenate(conditions, valueForCondition) {
        if (!Array.isArray(conditions) || !conditions.length) {
            throw new Error('The calculated field has no conditions.');
        }
        return conditions.map(function (condition) {
            var width = Number(condition.Cifre);
            var padding = condition.Valore == null ? '' : String(condition.Valore);
            if (Number(condition.Operazione) !== 5 ||
                !Number.isInteger(width) || width < 2 || width > 20 || width % 2 !== 0 ||
                (condition.SpaziVuoti !== 'left' && condition.SpaziVuoti !== 'right') ||
                padding.length > 2) {
                throw new Error('Invalid text calculation condition.');
            }
            var value = valueForCondition(condition);
            if (value == null) throw new Error('Calculation source is unavailable.');
            value = String(value);
            var count = Math.max(0, width - value.length);
            var fill = padding || ' ';
            var repeated = fill.repeat(Math.ceil(count / fill.length)).slice(0, count);
            return condition.SpaziVuoti === 'left' ? repeated + value : value + repeated;
        }).join('');
    }

    function dateIntervalMinutes(source) {
        if (source === 'interval_days') return 1440;
        if (source === 'interval_hours') return 60;
        if (source === 'interval_minutes') return 1;
        return 0;
    }

    function validateDateConditions(conditions) {
        if (!Array.isArray(conditions) || !conditions.length) {
            throw new Error('The calculated field has no conditions.');
        }
        var kind = 'date';
        conditions.forEach(function (condition, index) {
            if (!condition || typeof condition !== 'object') throw new Error('Invalid date condition.');
            var operation = Number(condition.Operazione);
            var source = condition.Sorgente;
            if (index === 0 && operation !== 1 && operation !== 6) {
                throw new Error('The first calculation operation must be equal or add.');
            }
            if (dateIntervalMinutes(source)) {
                var count = Number(condition.Cifre);
                if ((operation !== 1 && operation !== 2 && !(index === 0 && operation === 6)) ||
                    condition.Cifre == null || String(condition.Cifre).trim() === '' ||
                    !Number.isSafeInteger(count) || count < 0 || count > 2147483647 ||
                    condition.IDStatoWorkflow != null) {
                    throw new Error('Invalid date interval.');
                }
            } else {
                if ((source !== 'date_now' && source !== 'date_state') ||
                    condition.Cifre != null ||
                    (source === 'date_now' && condition.IDStatoWorkflow != null) ||
                    (source === 'date_state' && (!Number.isSafeInteger(Number(condition.IDStatoWorkflow)) ||
                        Number(condition.IDStatoWorkflow) <= 0))) {
                    throw new Error('Invalid date calculation source.');
                }
                if (index === 0 || operation === 6) {
                    kind = 'date';
                } else if (operation === 2 && kind === 'date') {
                    kind = 'duration';
                } else {
                    throw new Error('Invalid date calculation operation.');
                }
            }
            if (condition.IDAttributo != null || condition.SpaziVuoti != null || condition.Valore != null) {
                throw new Error('Invalid date condition.');
            }
        });
    }

    function calculateDate(conditions, context) {
        validateDateConditions(conditions);
        if (!context || !Array.isArray(context.States)) {
            throw new Error('Invalid date calculation context.');
        }
        function parseDate(value) {
            var match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/.exec(value || '');
            if (!match) throw new Error('Invalid calculation date.');
            var date = new Date(0);
            date.setUTCFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
            date.setUTCHours(Number(match[4]), Number(match[5]), Number(match[6]), 0);
            if (date.getUTCFullYear() !== Number(match[1]) || date.getUTCMonth() !== Number(match[2]) - 1 ||
                date.getUTCDate() !== Number(match[3]) || date.getUTCHours() !== Number(match[4]) ||
                date.getUTCMinutes() !== Number(match[5]) || date.getUTCSeconds() !== Number(match[6])) {
                throw new Error('Invalid calculation date.');
            }
            return date.getTime();
        }
        var now = parseDate(context.Now);
        var result = null;
        var missing = false;
        var kind = 'date';
        conditions.forEach(function (condition, index) {
            var operation = Number(condition.Operazione);
            var source = condition.Sorgente;
            var unit = dateIntervalMinutes(source);
            if (unit) {
                var count = Number(condition.Cifre);
                if (index === 0) result = now;
                if (!missing) result += (operation === 2 ? -1 : 1) * count * unit *
                    (kind === 'date' ? 60000 : 60);
            } else {
                var value = context.Now;
                if (source === 'date_state') {
                    var stateId = Number(condition.IDStatoWorkflow);
                    var state = context.States.find(function (item) {
                        return Number(item.IDEventoTransizione) === stateId;
                    });
                    if (!Number.isSafeInteger(stateId) || stateId <= 0 || !state) {
                        throw new Error('Calculation workflow state is unavailable.');
                    }
                    var nextDate = conditions.slice(index + 1).find(function (next) {
                        return next.Sorgente === 'date_now' || next.Sorgente === 'date_state';
                    });
                    if (operation !== 2 && nextDate && Number(nextDate.Operazione) === 2) {
                        if (!Object.prototype.hasOwnProperty.call(state, 'LastDate')) {
                            throw new Error('Latest workflow state date is unavailable.');
                        }
                        value = state.LastDate;
                    } else {
                        value = state.Date;
                    }
                }
                var operandMissing = value == null || value === '';
                var operand = operandMissing ? null : parseDate(value);
                if (index > 0 && operation === 2) {
                    missing = missing || operandMissing;
                    result = missing ? null : (result - operand) / 1000;
                    kind = 'duration';
                } else {
                    missing = operandMissing;
                    result = missing ? null : operand;
                    kind = 'date';
                }
            }
            if (!missing && (!Number.isSafeInteger(result) || (kind === 'date' &&
                (!Number.isFinite(new Date(result).getTime()) ||
                new Date(result).getUTCFullYear() < 1 || new Date(result).getUTCFullYear() > 9999)))) {
                throw new Error('Calculated date is out of range.');
            }
        });
        if (missing) return '';
        var two = function (number) { return String(number).padStart(2, '0'); };
        if (kind === 'duration') {
            var minutes = Math.floor(Math.abs(result) / 60);
            var days = Math.floor(minutes / 1440);
            return (result < 0 && minutes ? '-' : '') + days + ' giorni ' +
                two(Math.floor(minutes % 1440 / 60)) + ':' + two(minutes % 60);
        }
        var date = new Date(result);
        return two(date.getUTCDate()) + '/' + two(date.getUTCMonth() + 1) + '/' +
            String(date.getUTCFullYear()).padStart(4, '0') + ' ' +
            two(date.getUTCHours()) + ':' + two(date.getUTCMinutes());
    }

    function errorMessage(error, language) {
        if (/first calculation operation/i.test(error.message)) {
            return {
                IT: 'La prima operazione deve essere Uguale o Somma.',
                GB: 'The first operation must be Equal or Add.',
                ES: 'La primera operación debe ser Igual o Suma.',
                CN: '第一個運算必須是等於或加法。'
            }[language] || 'The first operation must be Equal or Add.';
        }
        if (/division by zero/i.test(error.message)) {
            return {
                IT: 'Impossibile calcolare: divisione per zero.',
                GB: 'Cannot calculate: division by zero.',
                ES: 'No se puede calcular: división por cero.',
                CN: '無法計算：除數為零。'
            }[language] || 'Division by zero.';
        }
        return ({
            IT: 'Impossibile calcolare il campo: ',
            GB: 'Cannot calculate the field: ',
            ES: 'No se puede calcular el campo: ',
            CN: '無法計算欄位：'
        }[language] || 'Cannot calculate the field: ') + error.message;
    }

    return { calculate: calculate, calculateDate: calculateDate, validateDateConditions: validateDateConditions,
        concatenate: concatenate, errorMessage: errorMessage };
}));
