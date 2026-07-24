class RequestWorkflowTransitions {
    constructor(
        IdAttore, IdAccount, IdProcesso, LanguageContext, RequestBody
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdProcesso = IdProcesso;
        this.LanguageContext = LanguageContext;
        this.RequestBody = RequestBody
    }
}
module.exports = RequestWorkflowTransitions;