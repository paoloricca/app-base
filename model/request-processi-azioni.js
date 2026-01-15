class RequestProcessiAzioni {
    constructor(
        IdAttore, IdAccount, IdProcesso, IdProfiloUtente, ActionName, LanguageContext, OffsetRows, NextRows, RequestBody
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdProcesso = IdProcesso;
        this.IdProfiloUtente = IdProfiloUtente;
        this.ActionName = ActionName;
        this.LanguageContext = LanguageContext;
        this.OffsetRows = OffsetRows;
        this.NextRows = NextRows;
        this.RequestBody = RequestBody
    }
}
module.exports = RequestProcessiAzioni;