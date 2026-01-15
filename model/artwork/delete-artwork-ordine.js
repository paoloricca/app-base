class DeleteArtworkOrdine {
    constructor(
        IdAttore, IdAccount, IDModelloIstanza, IDProcesso, IDRecord, LanguageContext, RequestBody
    ) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IDModelloIstanza = IDModelloIstanza;
        this.IDProcesso = IDProcesso;
        this.IDRecord = IDRecord;
        this.LanguageContext = LanguageContext;
        this.RequestBody = RequestBody
    }
}
module.exports = DeleteArtworkOrdine;