
const express = require('express');
var exception = require('../model/exception');
const config = require('../utils/config')
const soap = require('soap');

function GetArticoliNew(myRequest) {

    const sender = arguments.callee.name;

    var myLanguageContext = myRequest.LanguageContext;
    var myOffsetRows = myRequest.OffsetRows;
    var myNextRows = myRequest.NextRows;

    const customPromise = new Promise((resolve, reject) => {
        try {
            /* Crea l'istanza del Web Service Client */
            soap.createClient(config.SapWebServiceURL, function (err, client) {
                if (err) {
                    reject(JSON.stringify(
                        new exception(sender, err.message, err.name, err.stack))
                    );
                } else {
                    /* Invoca il Web Service Method */
                    client.GetArticoliNew({ myLanguageContext, myOffsetRows, myNextRows }, function (err, result) {
                        if (err) {
                            reject(JSON.stringify(
                                new exception(sender, err.message, err.name, err.stack))
                            );
                        } else {

                            var response = JSON.parse(JSON.stringify(result));
                            var resultStatus = response.GetArticoliNewResult.Status;
                            var resultError = response.GetArticoliNewResult.Error;

                            if (resultStatus == "OK") {

                                /* Inizializza i dati ricevuti dal Web Service */
                                var resultData = response.GetArticoliNewResult.Result.diffgram.Data.Articolo;

                                /* Valorizza l'oggetto restituito al route */
                                resolve(JSON.stringify(resultData));

                            } else {
                                reject(JSON.stringify(
                                    new exception(sender, resultError, sender, "internal error"))
                                );
                            }
                        }
                    });
                }
            });
        }
        catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
    return customPromise
}
module.exports = {
    GetArticoliNew,
}
