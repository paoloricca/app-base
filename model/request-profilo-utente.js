class RequestProfiloUtente {
    constructor(
        IdAttore, IdAccount, IdProfiloUtente, LanguageContext, OffsetRows, NextRows, RequestBody
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdProfiloUtente = IdProfiloUtente;
        this.LanguageContext = LanguageContext;
        this.OffsetRows = OffsetRows;
        this.NextRows = NextRows;
        this.RequestBody = RequestBody
    }
}
module.exports = RequestProfiloUtente;