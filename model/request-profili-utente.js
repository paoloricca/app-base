class RequestProfiliUtente {
    constructor(
        IdAttore, IdAccount, IdGruppoOperativo, LanguageContext, OffsetRows, NextRows, RequestBody
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdGruppoOperativo = IdGruppoOperativo;
        this.LanguageContext = LanguageContext;
        this.OffsetRows = OffsetRows;
        this.NextRows = NextRows;
        this.RequestBody = RequestBody
    }
}
module.exports = RequestProfiliUtente;