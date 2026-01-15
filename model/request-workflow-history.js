class RequestWorkflowHistory {
    constructor(
        IdAttore, IdAccount, IdProcesso, IdRecord, LanguageContext, RequestBody
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdProcesso = IdProcesso;
        this.IdRecord = IdRecord;
        this.LanguageContext = LanguageContext;
        this.RequestBody = RequestBody
    }
}
module.exports = RequestWorkflowHistory;