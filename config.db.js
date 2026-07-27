var connection = {
    server: "",
    //server: "localhost",
    database: "",
    user: "",
    password: "",
    options: {
        //trustedConnection: true, // Set to true if using Windows Authentication
        trustServerCertificate: false, // Set to true if using self-signed certificates
    },
    driver: "msnodesqlv8", // Required if using Windows Authentication
}
module.exports = connection;