/*
    Neuron
 
    Copyright (C) LiveG. All Rights Reserved.
 
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

const os = require("os");
const express = require("express");

var config = require("./config");

const SERVER_DEFAULT_PORT = 8080;

const app = express();

app.use(function(req, res, next) {
    res.set("X-Powered-By", "LiveG Neuron");
    next();
});

app.get("/", function(req, res) {
    res.redirect(config.data.defaultRedirect || "https://liveg.tech");
})

exports.start = function(port = config.data.port) {
    app.listen(port || SERVER_DEFAULT_PORT, function() {
        console.log(`Neuron started: ${os.hostname()}:${config.data.port || SERVER_DEFAULT_PORT}`);
    });
}