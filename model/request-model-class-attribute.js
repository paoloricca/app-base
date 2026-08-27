class RequestModelClassAttribute {
    constructor(IdAttore, IdAccount, LanguageContext, IDAttributo, IDClasse, IDTipoDati, ValoreMinimo, Visibile, Obbligatorio,
        Description_IT, Description_GB, Description_ES, Description_CN, Lunghezza, LunghezzaDecimale, NumeroRighe, Ordine,
        FileTypes, FileWeight, FileNumber) {

        this.IdAttore = IdAttore;
        this.IdAccount = IdAccount;
        this.LanguageContext = LanguageContext;
        this.IDAttributo = IDAttributo;
        this.IDClasse = IDClasse;
        this.IDTipoDati = IDTipoDati;
        this.ValoreMinimo = ValoreMinimo;
        this.Visibile = Visibile;
        this.Obbligatorio = Obbligatorio;
        this.Description_IT = Description_IT;
        this.Description_GB = Description_GB;
        this.Description_ES = Description_ES;
        this.Description_CN = Description_CN;
        this.Lunghezza = Lunghezza;
        this.LunghezzaDecimale = LunghezzaDecimale;
        this.NumeroRighe = NumeroRighe;
        this.Ordine = Ordine;
        this.FileTypes = FileTypes;
        this.FileWeight = FileWeight;
        this.FileNumber = FileNumber;
    }
}
module.exports = RequestModelClassAttribute;