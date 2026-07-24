class RequestWorkflowLinkNode {
    constructor(
        IdAttore, IdAccount, IdTransizioneStart, IdTransizioneEnd, LanguageContext
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdTransizioneStart = IdTransizioneStart;
        this.IdTransizioneEnd = IdTransizioneEnd;
        this.LanguageContext = LanguageContext;
    }
}
module.exports = RequestWorkflowLinkNode;