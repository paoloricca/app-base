class PostArtworkOrdine {
    constructor(
        IdAttore, IdAccount, IDModelloIstanza, IDProcesso, LanguageContext, OffsetRows, NextRows, RequestBody
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IDModelloIstanza = IDModelloIstanza;
        this.IDProcesso = IDProcesso;
        this.LanguageContext = LanguageContext;
        this.OffsetRows = OffsetRows;
        this.NextRows = NextRows;
        this.RequestBody = RequestBody
    }
}
module.exports = PostArtworkOrdine;