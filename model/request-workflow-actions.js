class RequestWorkflowActions {
    constructor(
        IdAttore, IdAccount, IdProcesso, IdRecord, IdProfiloUtente, LanguageContext, RequestBody
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdProcesso = IdProcesso;
        this.IdRecord = IdRecord;
        this.IdProfiloUtente = IdProfiloUtente;
        this.LanguageContext = LanguageContext;
        this.RequestBody = RequestBody
    }
}
module.exports = RequestWorkflowActions;