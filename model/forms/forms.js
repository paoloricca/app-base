class RequestRichiesteAssistenza {
    constructor(
        IdAttore, IdAccount, LanguageContext, OffsetRows, NextRows, Filter, RequestBody
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.LanguageContext = LanguageContext;
        this.OffsetRows = OffsetRows;
        this.NextRows = NextRows;
        this.Filter = Filter;
        this.RequestBody = RequestBody
    }
}
module.exports = RequestRichiesteAssistenza;