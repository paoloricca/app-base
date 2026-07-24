class RequestWorkflowNodeState {
    constructor(
        IdAttore, IdAccount, LanguageContext, IdEventoTransizione, Code_IT, Code_GB, Code_ES, Code_CN, Text_IT, Text_GB, Text_ES, Text_CN
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.LanguageContext = LanguageContext;
        this.IdEventoTransizione = IdEventoTransizione;
        this.Code_IT = Code_IT;
        this.Code_GB = Code_GB;
        this.Code_ES = Code_ES;
        this.Code_CN = Code_CN;
        this.Text_IT = Text_IT;
        this.Text_GB = Text_GB;
        this.Text_ES = Text_ES;
        this.Text_CN = Text_CN;
    }
}
module.exports = RequestWorkflowNodeState;