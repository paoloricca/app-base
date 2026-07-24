class RequestRichiesteAssistenza {
    constructor(
        IdAttore, IdAccount, LanguageContext, OffsetRows, NextRows, Filter, IdWorkedOn, RequestBody
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.LanguageContext = LanguageContext;
        this.OffsetRows = OffsetRows;
        this.NextRows = NextRows;
        this.Filter = Filter;
        this.IdWorkedOn = IdWorkedOn;
        this.RequestBody = RequestBody
    }
}
module.exports = RequestRichiesteAssistenza;