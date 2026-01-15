class RequestProcessi {
    constructor(
        IdAttore, IdAccount, IdProcesso, LanguageContext, OffsetRows, NextRows, RequestBody
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdProcesso = IdProcesso;
        this.LanguageContext = LanguageContext;
        this.OffsetRows = OffsetRows;
        this.NextRows = NextRows;
        this.RequestBody = RequestBody
    }
}
module.exports = RequestProcessi;