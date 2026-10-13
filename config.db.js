var connection = {
    server: "localhost\\SQLEXPRESS",
    database: "PS",
    user: "",
    password: "",
    options: {
        trustedConnection: true, // Impostare a true se si usa l'autenticazione di Windows
        trustServerCertificate: true, // Impostare a true per certificati self-signed locali
    },
    driver: "msnodesqlv8", // Richiesto se si usa l'autenticazione di Windows
}
module.exports = connection;