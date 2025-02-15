
const express = require('express');
var exception = require('../model/exception');

function logout(req) {

    const sender = arguments.callee.name;

    const customPromise = new Promise((resolve, reject) => {
        try {
            req.session.destroy();
            //res.redirect('/login');
            resolve(JSON.stringify("OK"));
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
    logout,
}
