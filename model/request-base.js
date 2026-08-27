class RequestBase {
    constructor(IdAttore, IdAccount, LanguageContext, RequestBody) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.LanguageContext = LanguageContext;
        this.RequestBody = RequestBody;
    }
}
module.exports = RequestBase;