class RequestWorkflowNewNode {
    constructor(
        IdAttore, IdAccount, IdProcesso, LanguageContext
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdProcesso = IdProcesso;
        this.LanguageContext = LanguageContext;
    }
}
module.exports = RequestWorkflowNewNode;