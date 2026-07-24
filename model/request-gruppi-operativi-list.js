class RequestGruppiOperativiList {
    constructor(
        IdAttore, IdAccount, IdGruppoOperativo, LanguageContext, RequestBody
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdGruppoOperativo = IdGruppoOperativo;
        this.LanguageContext = LanguageContext;
        this.RequestBody = RequestBody
    }
}
module.exports = RequestGruppiOperativiList;