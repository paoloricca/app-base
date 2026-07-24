class RequestEventiTransizioniAzioni {
    constructor(
        IdAttore, IdAccount, IdGruppoOperativo, IdProfiloUtente, IdProcesso, IdProcessoAzione, IdEventoTransizione, Toggled, LanguageContext
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdGruppoOperativo = IdGruppoOperativo;
        this.IdProfiloUtente = IdProfiloUtente;
        this.IdProcesso = IdProcesso;
        this.IdProcessoAzione = IdProcessoAzione;
        this.IdEventoTransizione = IdEventoTransizione;
        this.Toggled = Toggled;
        this.LanguageContext = LanguageContext;
    }
}
module.exports = RequestEventiTransizioniAzioni;