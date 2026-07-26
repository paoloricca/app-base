var connection = {
    server: "192.168.0.77",
    //server: "localhost",
    database: "PS",
    user: "dcsql",
    password: "kZ7pW.3U9P",
    options: {
        //trustedConnection: true, // Set to true if using Windows Authentication
        trustServerCertificate: false, // Set to true if using self-signed certificates
    },
    driver: "msnodesqlv8", // Required if using Windows Authentication
}
module.exports = connection;