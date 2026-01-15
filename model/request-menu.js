class RequestMenu {
    constructor(
        IdAttore, IdAccount, LanguageContext, IdProcesso, RequestBody
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.LanguageContext = LanguageContext;
        this.IdProcesso = IdProcesso;
        this.RequestBody = RequestBody;
    }
}
module.exports = RequestMenu;