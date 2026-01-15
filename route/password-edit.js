const express = require('express');
const config = require('../utils/config')
const PasswordEdit = express.Router();
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const sessionUtil = require('../utils/session')
var requestPasswordEdit = require('../model/request-password-edit');
var modelResponse = require('../model/response');
const crud = require('../crud/password-recovery');
const nodemailer = require('nodemailer');

PasswordEdit.get('/password-edit-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controller/password-edit.js');
    res.sendFile(filePath);
});
PasswordEdit.get('/password-edit', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.render('password-edit', {
            user: req.session.user,
            LanguageContext: 'IT',
            error: null
        });
    }
});
PasswordEdit.get('/password-edit/:LanguageContext', function (req, res) {
    if (req.session.user) {
        res.render('password-edit', {
            user: req.session.user,
            LanguageContext: req.params.LanguageContext,
            error: null
        });
    }
});
PasswordEdit.post('/password-edit', function (req, res) {
    if (req.session.user) {
        res.set('Access-Control-Allow-Origin', '*');

        if (req.body.ActualPassword == "" || req.body.NewPassword == "" || req.body.ConfirmPassword == "") {
            var strError;
            if (req.body.LanguageContext == "IT") {
                strError = "Valorizzare tutti i campi richiesti";
            } else if (req.body.LanguageContext == "GB") {
                strError = "Please, fill in all required fields";
            }
            else if (req.body.LanguageContext == "ES") {
                strError = "Por favor, rellene todos los campos obligatorios";
            }
            else if (req.body.LanguageContext == "CN") {
                strError = "請填寫所有必填欄位";
            }
            res.status(200).render('password-edit', {
                user: req.session.user,
                LanguageContext: req.body.LanguageContext,
                error: strError
            });
            return false;
        }
        if (req.body.NewPassword != req.body.ConfirmPassword) {
            var strError;
            if (req.body.LanguageContext == "IT") {
                strError = "Password non confermata";
            }
            else if (req.body.LanguageContext == "GB") {
                strError = "Unconfirmed password";
            }
            else if (req.body.LanguageContext == "ES") {
                strError = "Contrase&ntilde;a no confirmada";
            }
            else if (req.body.LanguageContext == "CN") {
                strError = "密碼未確認";
            }
            res.status(200).render('password-edit', {
                user: req.session.user,
                LanguageContext: req.body.LanguageContext,
                error: strError
            });
            return false;
        }
        var myRequest = new requestPasswordEdit(
            req.body.LanguageContext,
            req.session.user.IdAccount,
            req.session.user.Email,
            req.body.ActualPassword,
            req.body.ConfirmPassword,
        );

        /* Chiama la crud necessaria per la modifica della password */
        crud.ModificaPassword(myRequest).then(response => {

            if (response == "OK") {

                /* Chiude la corrente sessione di lavoro */
                req.session.destroy();

                var htmlBody;
                var subjectBody;

                if (req.body.LanguageContext == "IT") {
                    subjectBody = "Ciao, hai modificato correttamente la password della tua Web App DC";
                    htmlBody = "Ciao,<br>hai modificato correttamente la password della tua Web App DC.<br><br>Grazie, il tuo supporto &egrave; prezioso per mantenere sicuro il tuo account.<br><i><b>Il team DC Group</b></i>";
                }
                if (req.body.LanguageContext == "GB") {
                    subjectBody = "Hi, DC Web App password has successfully updated";
                    htmlBody = "Hi,<br>your DC Web App password has been updated.<br><br>Thank you a lot, your support is invaluable for keeping your account safe.<br><i><b>The DC Group team</b></i>";
                }
                if (req.body.LanguageContext == "ES") {
                    subjectBody = "Hola, la contrase&ntilde;a de DC Web App se cambi&oacute; correctamente";
                    htmlBody = "Hola,<br>la contrase&ntilde;a de DC Web App se cambi&oacute; correctamente.<br><br>Gracias, su apoyo es invaluable para mantener su cuenta segura.<br><i><b>El equipo del Grupo DC</b></i>";
                }
                if (req.body.LanguageContext == "CN") {
                    subjectBody = "您已成功修改了Web App DC 的密码";
                    htmlBody = "您已成功修改了Web App DC 的密码.<br><br>感谢您的支持，这对协助我们保障账户安全非常重要.<br><i><b>谢谢，--- DC Group 团队</b></i>";
                }
                /* Invio e-mail per conferma modifica password */
                const transporter = nodemailer.createTransport({
                    host: "smtp-mail.outlook.com",
                    port: 587,
                    secure: false,
                    auth: {
                        user: "no-reply@dcgroupitalia.com",
                        pass: "Dc.nor.2021",
                    },
                });
                async function main() {
                    const info = await transporter.sendMail({
                        from: "no-reply@dcgroupitalia.com",
                        //to: "it@dcgroupitalia.com",
                        to: "paolo.ricca@dcgroupitalia.com",
                        //to: req.body.email,
                        subject: subjectBody,
                        html: htmlBody
                    });
                    res.status(200).render('password-edit-summary', {
                        email: req.body.email,
                        LanguageContext: req.body.LanguageContext,
                        error: null
                    });
                }
                main().catch(console.error);
            }
        }).catch(err => {
            res.status(200).render('password-edit', {
                user: req.session.user,
                email: req.body.email,
                LanguageContext: req.body.LanguageContext,
                error: JSON.parse(err).message
            });
        }).finally(() => {
        })
    }
});
PasswordEdit.get('/password-change', function (req, res) {
    if (sessionUtil.verifyUser(req, res)) {
        res.render('password-change', {
            user: req.session.user,
            LanguageContext: 'IT',
            error: null
        });
    }
});
PasswordEdit.get('/password-change/:LanguageContext', function (req, res) {
    if (req.session.user) {
        res.render('password-change', {
            user: req.session.user,
            LanguageContext: req.params.LanguageContext,
            error: null
        });
    }
});
PasswordEdit.post('/password-change', function (req, res) {
    if (req.session.user) {
        res.set('Access-Control-Allow-Origin', '*');

        if (req.body.ActualPassword == "" || req.body.NewPassword == "" || req.body.ConfirmPassword == "") {
            var strError;
            if (req.body.LanguageContext == "IT") {
                strError = "Valorizzare tutti i campi richiesti";
            } else if (req.body.LanguageContext == "GB") {
                strError = "Please, fill in all required fields";
            }
            else if (req.body.LanguageContext == "ES") {
                strError = "Por favor, rellene todos los campos obligatorios";
            }
            else if (req.body.LanguageContext == "CN") {
                strError = "請填寫所有必填欄位";
            }
            res.status(200).render('password-change', {
                user: req.session.user,
                LanguageContext: req.body.LanguageContext,
                error: strError
            });
            return false;
        }
        if (req.body.NewPassword != req.body.ConfirmPassword) {
            var strError;
            if (req.body.LanguageContext == "IT") {
                strError = "Password non confermata";
            }
            else if (req.body.LanguageContext == "GB") {
                strError = "Unconfirmed password";
            }
            else if (req.body.LanguageContext == "ES") {
                strError = "Contrase&ntilde;a no confirmada";
            }
            else if (req.body.LanguageContext == "CN") {
                strError = "密碼未確認";
            }
            res.status(200).render('password-change', {
                user: req.session.user,
                LanguageContext: req.body.LanguageContext,
                error: strError
            });
            return false;
        }
        var myRequest = new requestPasswordEdit(
            req.body.LanguageContext,
            req.session.user.IdAccount,
            req.session.user.Email,
            null,
            req.body.ConfirmPassword,
        );

        /* Chiama la crud necessaria per la modifica della password */
        crud.ReimpostaPassword(myRequest).then(response => {

            if (response == "OK") {

                /* Chiude la corrente sessione di lavoro */
                req.session.destroy();

                var htmlBody;
                var subjectBody;

                if (req.body.LanguageContext == "IT") {
                    subjectBody = "Ciao, hai modificato correttamente la password della tua Web App DC";
                    htmlBody = "Ciao,<br>hai modificato correttamente la password della tua Web App DC.<br><br>Grazie, il tuo supporto &egrave; prezioso per mantenere sicuro il tuo account.<br><i><b>Il team DC Group</b></i>";
                }
                if (req.body.LanguageContext == "GB") {
                    subjectBody = "Hi, DC Web App password has successfully updated";
                    htmlBody = "Hi,<br>your DC Web App password has been updated.<br><br>Thank you a lot, your support is invaluable for keeping your account safe.<br><i><b>The DC Group team</b></i>";
                }
                if (req.body.LanguageContext == "ES") {
                    subjectBody = "Hola, la contrase&ntilde;a de DC Web App se cambi&oacute; correctamente";
                    htmlBody = "Hola,<br>la contrase&ntilde;a de DC Web App se cambi&oacute; correctamente.<br><br>Gracias, su apoyo es invaluable para mantener su cuenta segura.<br><i><b>El equipo del Grupo DC</b></i>";
                }
                if (req.body.LanguageContext == "CN") {
                    subjectBody = "您已成功修改了Web App DC 的密码";
                    htmlBody = "您已成功修改了Web App DC 的密码.<br><br>感谢您的支持，这对协助我们保障账户安全非常重要.<br><i><b>谢谢，--- DC Group 团队</b></i>";
                }
                /* Invio e-mail per conferma modifica password */
                const transporter = nodemailer.createTransport({
                    host: "smtp-mail.outlook.com",
                    port: 587,
                    secure: false,
                    auth: {
                        user: "no-reply@dcgroupitalia.com",
                        pass: "Dc.nor.2021",
                    },
                });
                async function main() {
                    const info = await transporter.sendMail({
                        from: "no-reply@dcgroupitalia.com",
                        //to: "it@dcgroupitalia.com",
                        to: "paolo.ricca@dcgroupitalia.com",
                        //to: req.body.email,
                        subject: subjectBody,
                        html: htmlBody
                    });
                    res.status(200).render('password-edit-summary', {
                        email: req.body.email,
                        LanguageContext: req.body.LanguageContext,
                        error: null
                    });
                }
                main().catch(console.error);
            }
        }).catch(err => {
            res.status(200).render('password-change', {
                user: req.session.user,
                email: req.body.email,
                LanguageContext: req.body.LanguageContext,
                error: JSON.parse(err).message
            });
        }).finally(() => {
        })
    }
});

module.exports = PasswordEdit;