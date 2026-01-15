class RequestIdModelloIstanzaRecordMedia {
    constructor(IdRecord, IdAttributo, IdAccount, originalFilename, newFilename, mimetype, LanguageContext) {
        this.IdRecord = IdRecord;
        this.IdAttributo = IdAttributo;
        this.IdAccount = IdAccount;
        this.originalFilename = originalFilename;
        this.newFilename = newFilename;
        this.mimetype = mimetype;
        this.LanguageContext = LanguageContext;
    }
}
module.exports = RequestIdModelloIstanzaRecordMedia;