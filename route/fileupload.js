const express = require('express');
const FileUpload = express.Router();
const bodyParser = require('body-parser');
const formidable = require('formidable');
//var requestUtenti = require('../model/request-utenti');
var response = require('../model/response');
var mediaFile = require('../model/media-file');
//const crud = require('../crud/utenti');
const fs = require('fs');
const path = require('path');
const sessionUtil = require('../utils/session')
const session = require('express-session');

FileUpload.get('/control-fileupload-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controls/ux/control.ux.fileupload.js');
    res.sendFile(filePath);
});
FileUpload.post('/fileupload', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.set('Access-Control-Allow-Origin', '*');
        try {
            let form = new formidable.IncomingForm();
            form.parse(req, function (err, fields, files) {
                //console.log(files.filetoupload[0].filepath);
                const { dirname } = require('path');
                const appDir = dirname(require.main.filename);

                //console.log(files.length);
                //console.log(files);
                //console.log(files['file-0'][0]);
                //console.log(files['file-0'][0].filepath);

                if (files['file-0'] != undefined) {
                    let oldpath = files['file-0'][0].filepath;
                    let newpath = appDir + '/files/' + files['file-0'][0].newFilename + '.' + files['file-0'][0].originalFilename.substring(files['file-0'][0].originalFilename.lastIndexOf('.') + 1);
                    //console.log(oldpath);
                    //console.log(newpath);
                    try {
                        fs.rename(oldpath, newpath, function (err) {
                            res.status(200).json(
                                new response('OK',
                                    JSON.stringify(
                                        new mediaFile(
                                            files['file-0'][0].originalFilename,
                                            files['file-0'][0].newFilename,
                                            files['file-0'][0].mimetype,
                                            files['file-0'][0].originalFilename.substring(files['file-0'][0].originalFilename.lastIndexOf('.') + 1)
                                        )
                                    ),
                                    err)
                            )
                            res.end();
                        });
                    } catch (err) {
                        res.status(200).json(new response('ERR', null, err.message));
                        res.end();
                    }
                } else {
                    switch (req.session.user.LanguageContext) {
                        case "IT": strError = "File non valido"; break;
                        case "GB": strError = "Invalid file"; break;
                    }
                    res.status(200).json(new response('ERR', null, strError));
                    res.end();
                }
            });
        }
        catch (err) {
            res.status(200).json(new response('ERR', null, err.message));
            res.end();
        }
    };
});
module.exports = FileUpload;