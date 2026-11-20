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

    function errorMessage(error, language) {
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

    return { calculate: calculate, concatenate: concatenate, errorMessage: errorMessage };
}));
