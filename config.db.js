var connection = {
    server: "localhost",
    database: "PS",
    options: {
        trustedConnection: true, // Set to true if using Windows Authentication
        trustServerCertificate: true, // Set to true if using self-signed certificates
    },
    driver: "msnodesqlv8", // Required if using Windows Authentication
}
module.exports = connection;