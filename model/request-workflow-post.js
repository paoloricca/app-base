class RequestWorkflowPost {
    constructor(
        IdAttore, IdAccount, IdProcesso, IdRecord, IdEventoDirezione, Note, LanguageContext, RequestBody
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdProcesso = IdProcesso;
        this.IdRecord = IdRecord;
        this.IdEventoDirezione = IdEventoDirezione;
        this.Note = Note;
        this.LanguageContext = LanguageContext;
        this.RequestBody = RequestBody
    }
}
module.exports = RequestWorkflowPost;