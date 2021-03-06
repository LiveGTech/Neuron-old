/*
    Neuron
 
    Copyright (C) LiveG. All Rights Reserved.
 
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

const os = require("os");
const express = require("express");

var config = require("./config");
var bucketQueue = require("./bucketqueue");

const SERVER_DEFAULT_PORT = 8080;
const SERVER_STORAGE_NODE_SECRET = config.data.storageNodeSecret || "anarchy";

const app = express();

function authenticateStorageNode(req, res, next) {
    if (req.headers.authorization != `Bearer ${SERVER_STORAGE_NODE_SECRET}`) {
        res.status(403).json({
            status: "error",
            message: "Invalid or missing storage node secret"
        });

        return;
    }

    next();
}

app.use(function(req, res, next) {
    res.set("X-Powered-By", "LiveG Neuron");
    next();
});

app.get("/", function(req, res) {
    res.redirect(config.data.defaultRedirect || "https://liveg.tech");
})

app.get("/bucketqueue", authenticateStorageNode, function(req, res) {
    res.json({
        status: "ok",
        minTimestamp: bucketQueue.queueMinTimestamp,
        items: bucketQueue.mergeQueues()
    });
});

app.get("/bucketqueue/resolvecommit", authenticateStorageNode, function(req, res) {
    bucketQueue.resolveCommit(req.params.timestamp, req.params.start, req.params.end);
    res.json({status: "ok"});
});

app.get("/bucketqueue/resolvefoldercommit", authenticateStorageNode, function(req, res) {
    bucketQueue.resolveCommit(req.params.timestamp);
    res.json({status: "ok"});
});

app.get("/bucketqueue/resolvedelete", authenticateStorageNode, function(req, res) {
    bucketQueue.resolveDelete(req.params.timestamp);
    res.json({status: "ok"});
});

app.get("/bucketqueue/resolvemove", authenticateStorageNode, function(req, res) {
    bucketQueue.resolveMove(req.params.timestamp);
    res.json({status: "ok"});
});

app.post("/bucketqueue/initrequest", authenticateStorageNode, express.json(), function(req, res) {
    bucketQueue.initRequest(req.params.timestamp, req.body);
    res.json({status: "ok"});
});

app.post("/bucketqueue/txrequestdata", authenticateStorageNode, express.raw({type: "application/octet-stream"}), function(req, res) {
    bucketQueue.txRequestData(req.params.timestamp, req.body, req.params.previousBytesTransferred);
    res.json({status: "ok"});
});

app.post("/bucketqueue/txrequestmarknotfound", authenticateStorageNode, function(req, res) {
    bucketQueue.txRequestMarkNotFound(req.params.timestamp);
    res.json({status: "ok"});
});

exports.start = function(port = config.data.port) {
    app.listen(port || SERVER_DEFAULT_PORT, function() {
        console.log(`Neuron started: ${os.hostname()}:${config.data.port || SERVER_DEFAULT_PORT}`);
    });
}