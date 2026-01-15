    const express = require('express');
    const config = require('../utils/config')
    const PasswordRecovery = express.Router();
    const bodyParser = require('body-parser');
    const cors = require('cors');
    const fs = require('fs');
    const path = require('path');
    const session = require('express-session');
    var modelRequest = require('../model/request-security-key');
    var modelResponse = require('../model/response');
    const crud = require('../crud/password-recovery');
    const nodemailer = require('nodemailer');

PasswordRecovery.get('/password-recovery-script', (req, res) => {
    const filePath = path.resolve(__dirname, '../controller/password-recovery.js');
    res.sendFile(filePath);
});
PasswordRecovery.get('/password-recovery', function (req, res) {
    res.render('password-recovery', {
        LanguageContext: 'IT',
        error: null
    });
});
PasswordRecovery.get('/password-recovery/:LanguageContext', function (req, res) {
    res.render('password-recovery', {
        LanguageContext: req.params.LanguageContext,
        error: null
    });
});
PasswordRecovery.post('/password-recovery', function (req, res) {
    res.set('Access-Control-Allow-Origin', '*');
    var myRequest = new modelRequest(
        req.body.LanguageContext,
        req.body.email
    );
    /* Chiama la crud necessaria per il caricamento degli articoli */
    crud.GeneraCodiceVerifica(myRequest).then(listOf => {
        var data = JSON.parse(JSON.stringify(listOf));

        var SecurityKey = listOf;
        var htmlBody;
        var subjectBody;

        if (req.body.LanguageContext == "IT") {
            subjectBody = "Ciao, ecco il tuo codice di sicurezza: ";
            htmlBody = "Ciao,<br>inserisci questo codice per completare il ripristino della password:<br><br><b>" + SecurityKey + "</b><br><br>Se non hai richiesto questo codice, ti consigliamo di modificare la tua password al pi&ugrave; presto.<br><br>Grazie, il tuo supporto &egrave; prezioso per mantenere sicuro il tuo account.<br><i><b>Il team DC Group</b></i>";
        }
        if (req.body.LanguageContext == "GB") {
            subjectBody = "Hi, here is your security code: ";
            htmlBody = "Hi,<br>Enter this code to complete your reset password:<br><br><b>" + SecurityKey + "</b><br><br>If you have not requested this code, we recommend to change your password as soon as possible.<br><br>Thank you a lot, your support is invaluable for keeping your account safe.<br><i><b>The DC Group team</b></i>";
        }
        if (req.body.LanguageContext == "ES") {
            subjectBody = "Hola, aqu&iacute; est&acute; tu c&oacute;digo de seguridad: ";
            htmlBody = "Hola,<br>Ingrese este c&oacute;digo para completar el restablecimiento de su contrase&ntilde;a:<br><br><b>" + SecurityKey + "</b><br><br>Si no ha solicitado este c&oacute;digo, le recomendamos que cambie su contrase&oacute;a lo antes posible.<br><br>Gracias, su apoyo es invaluable para mantener su cuenta segura.<br><i><b>El equipo del Grupo DC</b></i>";
        }
        if (req.body.LanguageContext == "CN") {
            subjectBody = "这是您的验证码: ";
            htmlBody = "请输入验证码以完成密码重置:<br><br><b>" + SecurityKey + "</b><br><br>如果您并未申请此验证码，建议您尽快修改密码.<br><br>感谢您的支持，这对协助我们保障账户安全非常重要<br><i><b>谢谢，--- DC Group 团队</b></i>";
        }

        /* Invio e-mail per inoltro codice di sicurezza */
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
                subject: subjectBody + SecurityKey,
                html: htmlBody
            });
            res.status(200).render('verify-securitykey', {
                email: req.body.email,
                LanguageContext: req.body.LanguageContext,
                error: null
            });
        }
        main().catch(console.error);
    }).catch(err => {
        if (JSON.parse(err).message.indexOf('!') == -1) {
            res.render('verify-securitykey', {
                email: req.body.email,
                LanguageContext: req.body.LanguageContext,
                error: JSON.parse(err).message
            });
        } else {
            res.render('password-recovery', {
                email: req.params.email,
                LanguageContext: req.body.LanguageContext,
                error: JSON.parse(err).message
            });
        }
    }).finally(() => {
    })
});
PasswordRecovery.get('/password-reset/:LanguageContext', function (req, res) {
    res.render('password-reset', {
        LanguageContext: req.params.LanguageContext,
        email: req.session.user.Email,
        error: null
    });
});
PasswordRecovery.post('/password-reset', function (req, res) {
    res.set('Access-Control-Allow-Origin', '*');

    if (req.body.NewPassword == "" || req.body.ConfirmPassword == "" || (req.body.NewPassword != req.body.ConfirmPassword)) {
        var strError;
        if (req.body.LanguageContext == "IT") {
            strError = "Password non confermata!";
        } else if (req.body.LanguageContext == "GB") {
            strError = "Unconfirmed password!";
        }
        else if (req.body.LanguageContext == "ES") {
            strError = "Contrase&ntilde;a no confirmada!";
        }
        else if (req.body.LanguageContext == "CN") {
            strError = "密碼未確認！";
        }
        res.status(200).render('password-reset', {
            email: req.body.email,
            LanguageContext: req.body.LanguageContext,
            error: strError
        });
        return false;
    }
    var myRequest = new modelRequest(
        req.body.LanguageContext,
        req.body.email,
        null,
        req.body.ConfirmPassword,
    );
    /* Chiama la crud necessaria per il reset della password */
    crud.ReimpostaPassword(myRequest).then(listOf => {
        if (listOf == "OK") {

            /* Chiude la corrente sessione di lavoro */
            req.session.destroy();

            var htmlBody;
            var subjectBody;

            if (req.body.LanguageContext == "IT") {
                subjectBody = "Ciao, hai reimpostato correttamente la password della tua Web App DC";
                htmlBody = "Ciao,<br>hai reimpostato correttamente la password della tua Web App DC.<br><br>Grazie, il tuo supporto &egrave; prezioso per mantenere sicuro il tuo account.<br><i><b>Il team DC Group</b></i>";
            }
            if (req.body.LanguageContext == "GB") {
                subjectBody = "Hi, DC Web App password has successfully reset";
                htmlBody = "Hi,<br>your DC Web App password has been reset.<br><br>Thank you a lot, your support is invaluable for keeping your account safe.<br><i><b>The DC Group team</b></i>";
            }
            if (req.body.LanguageContext == "ES") {
                subjectBody = "Hola, ha restablecido correctamente su contrase&ntilde;a de DC Web App";
                htmlBody = "Hola,<br>ha restablecido correctamente su contrase&ntilde;a de DC Web App.<br><br>Gracias, su apoyo es invaluable para mantener su cuenta segura.<br><i><b>El equipo del Grupo DC</b></i>";
            }
            if (req.body.LanguageContext == "CN") {
                subjectBody = "您已成功重置了Web App DC 的密码";
                htmlBody = "您已成功重置了Web App DC 的密码.<br><br>感谢您的支持，这对协助我们保障账户安全非常重要.<br><i><b>谢谢，--- DC Group 团队</b></i>";
            }
            /* Invio e-mail per inoltro codice di sicurezza */
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
                res.status(200).render('password-reset-summary', {
                    email: req.body.email,
                    LanguageContext: req.body.LanguageContext,
                });
            }
            main().catch(console.error);
        }
    }).catch(err => {
        res.status(200).render('password-reset', {
            email: req.body.email,
            LanguageContext: req.body.LanguageContext,
            error: JSON.parse(err).message
        });
    }).finally(() => {
    })
});
PasswordRecovery.post('/verify-securitykey', function (req, res) {
    res.set('Access-Control-Allow-Origin', '*');
    var myRequest = new modelRequest(
        req.body.LanguageContext,
        req.body.email,
        req.body.SecurityKey
    );
    /* Chiama la crud necessaria per la verifica del codice di sicurezza */
    crud.VerificaCodiceSicurezza(myRequest).then(listOf => {
        if (listOf == "OK") {
            res.status(200).render('password-reset', {
                email: req.body.email,
                LanguageContext: req.body.LanguageContext,
                error: null
            });
        }
    }).catch(err => {
        res.status(200).render('verify-securitykey', {
            email: req.body.email,
            LanguageContext: req.body.LanguageContext,
            error: JSON.parse(err).message
        });
    }).finally(() => {
    })
});

module.exports = PasswordRecovery;