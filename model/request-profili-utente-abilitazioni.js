class RequestProfiliUtenteAbilitazioni {
    constructor(
        IdAttore, IdAccount, IdGruppoOperativo, IdProfiloUtente, IdProcesso, IdProcessoAzione, LanguageContext, OffsetRows, NextRows, RequestBody
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdGruppoOperativo = IdGruppoOperativo;
        this.IdProfiloUtente = IdProfiloUtente;
        this.IdProcesso = IdProcesso;
        this.IdProcessoAzione = IdProcessoAzione;
        this.LanguageContext = LanguageContext;
        this.OffsetRows = OffsetRows;
        this.NextRows = NextRows;
        this.RequestBody = RequestBody
    }
}
module.exports = RequestProfiliUtenteAbilitazioni;