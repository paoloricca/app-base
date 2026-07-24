class RequestProcessiAzioniFromWorkflowState {
    constructor(
        IdAttore, IdAccount, IdProcesso, IdProfiloUtente, IdEventoTransizione, LanguageContext
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdProcesso = IdProcesso;
        this.IdProfiloUtente = IdProfiloUtente;
        this.IdEventoTransizione = IdEventoTransizione;
        this.LanguageContext = LanguageContext;
    }
}
module.exports = RequestProcessiAzioniFromWorkflowState;