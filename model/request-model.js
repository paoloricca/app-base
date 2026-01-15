class RequestModel {
    constructor(IdAttore, IdAccount, IdVersione, IdClasse, IdAttributo, LanguageContext) {
        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.IdVersione = IdVersione;
        this.IdClasse = IdClasse;
        this.IdAttributo = IdAttributo;
        this.LanguageContext = LanguageContext;
    }
}
module.exports = RequestModel;