class baseRequest {
    constructor(IdAttore, IdAccount, LanguageContext, OffsetRows, NextRows) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.LanguageContext = LanguageContext;
        this.OffsetRows = OffsetRows;
        this.NextRows = NextRows;
    }
}
module.exports = baseRequest;