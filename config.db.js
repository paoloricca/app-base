var path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

var connection = {
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    options: {
        encrypt: process.env.DB_ENCRYPT !== 'false'
    },
    beforeConnect: (config) => {
        config.conn_str += ";TrustServerCertificate=Yes;MultipleActiveResultSets=True";
    }
};

module.exports = connection;