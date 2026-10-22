const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const configPath = path.resolve(__dirname, '../config.json');
const fileConfig = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
    : {};

function readNumber(name, fallback) {
    const value = process.env[name] !== undefined ? process.env[name] : fallback;
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const number = Number(value);
    if (!Number.isFinite(number)) {
        throw new Error(`La variabile ${name} deve essere numerica.`);
    }
    return number;
}

const fileRedis = fileConfig.Redis || {};
const config = {
    Port: readNumber('PORT', fileConfig.Port) || 3000,
    SapWebServiceURL: process.env.SAP_WEB_SERVICE_URL || fileConfig.SapWebServiceURL,
    SecretKey: process.env.SESSION_SECRET || fileConfig.SecretKey,
    LanguageContext: process.env.LANGUAGE_CONTEXT || fileConfig.LanguageContext,
    OffsetRows: readNumber('OFFSET_ROWS', fileConfig.OffsetRows),
    NextRows: readNumber('NEXT_ROWS', fileConfig.NextRows),
    Redis: {
        ...fileRedis,
        url: process.env.REDIS_URL || fileRedis.url,
        host: process.env.REDIS_HOST || fileRedis.host || '127.0.0.1',
        port: readNumber('REDIS_PORT', fileRedis.port) || 6379,
        password: process.env.REDIS_PASSWORD !== undefined
            ? process.env.REDIS_PASSWORD
            : (fileRedis.password || ''),
        prefix: process.env.REDIS_PREFIX || fileRedis.prefix || 'sess:'
    }
};

module.exports = config;