class RequestProfiloUtenteRisorse {
    constructor(
        IdAttore, IdAccount, IdGruppoOperativo, IdProfiloUtente, IsDefault, LanguageContext, OffsetRows, NextRows, RequestBody
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdGruppoOperativo = IdGruppoOperativo;
        this.IdProfiloUtente = IdProfiloUtente;
        this.IsDefault = IsDefault;
        this.LanguageContext = LanguageContext;
        this.OffsetRows = OffsetRows;
        this.NextRows = NextRows;
        this.RequestBody = RequestBody
    }
}
module.exports = RequestProfiloUtenteRisorse;