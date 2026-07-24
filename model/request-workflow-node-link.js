class RequestWorkflowNodeLink {
    constructor(
        IdAttore, IdAccount, LanguageContext, IdEventoDirezione, Code_IT, Code_GB, Code_ES, Code_CN, Text_IT, Text_GB, Text_ES, Text_CN, IsAvailableNote, RequiredConfirmation
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.LanguageContext = LanguageContext;
        this.IdEventoDirezione = IdEventoDirezione;
        this.Code_IT = Code_IT;
        this.Code_GB = Code_GB;
        this.Code_ES = Code_ES;
        this.Code_CN = Code_CN;
        this.Text_IT = Text_IT;
        this.Text_GB = Text_GB;
        this.Text_ES = Text_ES;
        this.Text_CN = Text_CN;
        this.IsAvailableNote = IsAvailableNote;
        this.RequiredConfirmation = RequiredConfirmation;
    }
}
module.exports = RequestWorkflowNodeLink;