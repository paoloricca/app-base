
const express = require('express');
var exception = require('../model/exception');

function logout(req) {

    const sender = arguments.callee.name;

    const customPromise = new Promise((resolve, reject) => {
        try {
            if (req.session) {
                req.session.destroy((err) => {
                    if (err) {
                        reject(JSON.stringify(
                            new exception(sender, err.message, err.name, err.stack))
                        );
                    } else {
                        resolve(JSON.stringify("OK"));
                    }
                });
            } else {
                resolve(JSON.stringify("OK"));
            }
        }
        catch (err) {
            reject(JSON.stringify(
                new exception(sender, err.message, err.name, err.stack))
            );
        }
    });
    return customPromise;
}
module.exports = {
    logout,
}
