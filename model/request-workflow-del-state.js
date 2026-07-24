class RequestWorkflowDelState {
    constructor(
        IdAttore, IdAccount, IdEventoTransizione, LanguageContext
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdEventoTransizione = IdEventoTransizione;
        this.LanguageContext = LanguageContext;
    }
}
module.exports = RequestWorkflowDelState;