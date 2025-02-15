class RequestGruppiOperativi {
    constructor(
        IdAttore, IdAccount, IdGruppoOperativo, LanguageContext, OffsetRows, NextRows
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdGruppoOperativo = IdGruppoOperativo;
        this.LanguageContext = LanguageContext;
        this.OffsetRows = OffsetRows;
        this.NextRows = NextRows;
    }
}
module.exports = RequestGruppiOperativi;