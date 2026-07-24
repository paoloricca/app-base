class RequestWorkflowNodeOwner {
    constructor(
        IdAttore, IdAccount, IdEventoTransizione, LanguageContext, RequestBody
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdEventoTransizione = IdEventoTransizione;
        this.LanguageContext = LanguageContext;
        this.RequestBody = RequestBody;
    }
}
module.exports = RequestWorkflowNodeOwner;