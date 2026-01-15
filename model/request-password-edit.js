class RequestPasswordEdit {
    constructor(LanguageContext, IdAccount, Email, ActualPassword, ConfirmPassword) {
        this.LanguageContext = LanguageContext;
        this.IdAccount = IdAccount;
        this.Email = Email;
        this.ActualPassword = ActualPassword;
        this.ConfirmPassword = ConfirmPassword;
    }
}
module.exports = RequestPasswordEdit;