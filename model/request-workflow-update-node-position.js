class RequestWorkflowUpdateNodePosition {
    constructor(
        IdAttore, IdAccount, IdEventoTransizione, XPos, YPos, LanguageContext
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdEventoTransizione = IdEventoTransizione;
        this.XPos = XPos;
        this.YPos = YPos;
        this.LanguageContext = LanguageContext;
    }
}
module.exports = RequestWorkflowUpdateNodePosition;