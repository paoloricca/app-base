class baseRequest {
    constructor(LanguageContext, Email, SecurityKey, ConfirmPassword) {
        this.LanguageContext = LanguageContext;
        this.Email = Email;
        this.SecurityKey = SecurityKey;
        this.ConfirmPassword = ConfirmPassword;
    }
}
module.exports = baseRequest;