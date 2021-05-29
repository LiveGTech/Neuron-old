/*
    Neuron
 
    Copyright (C) LiveG. All Rights Reserved.
 
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

/*
    This code abstracts away the functionality of the bucket queue to provide a
    clean file management interface.
*/

const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");

var config = require("./config");
var bucketQueue = require("./bucketqueue");
var structs = require("./structs");

const NO_CACHE_BUCKETS = ["identity"];

function shouldBeCached(filePath) {
    for (var i = 0; i < NO_CACHE_BUCKETS.length; i++) {
        if (filePath.startsWith(NO_CACHE_BUCKETS[i] + ":")) {
            return false;
        }
    }

    return true;
}

// Works for structs and folders too
exports.checkFileExists = function(filePath) {
    if (!shouldBeCached(filePath)) {
        if (fs.existsSync(config.resolvePath(filePath))) {
            return Promise.resolve();
        } else {
            return Promise.reject();
        }
    }

    return bucketQueue.requestFile(filePath, function() {
        return true; // Immediately cancel request since we're looking to check if it exists only
    }).then(function(request) {
        if (request.state == bucketQueue.requestRetrievalState.ERR_NOT_FOUND) {
            return Promise.reject();
        }

        return Promise.resolve(request.fileType); // Request is resolved with file type (eg. if it's a folder)
    });
};

exports.loadFile = function(filePath) {
    if (!shouldBeCached(filePath)) {
        return Promise.resolve(fs.readFileSync(config.resolvePath(filePath)));
    }

    return bucketQueue.requestFile(filePath).then(function(request) {
        return Promise.resolve(request.data);
    });
};

exports.loadStruct = function(filePath, structType = structs.Struct) {
    if (!shouldBeCached(filePath)) {
        var structInstance = new structType(filePath);

        structInstance.loadFromFile();

        return Promise.resolve(structInstance);
    }

    return bucketQueue.requestFile(filePath).then(function() {
        var structInstance = new structType(filePath);

        structInstance.loadFromFile();

        return Promise.resolve(structInstance);
    });
};

exports.saveFile = function(filePath, data) {
    mkdirp.sync(path.dirname(config.resolvePath(filePath)));
    fs.writeFileSync(config.resolvePath(filePath), data);

    if (shouldBeCached(filePath)) {
        bucketQueue.cacheFile(filePath, data.length);
    }
};

exports.saveStruct = function(structInstance) {
    mkdirp.sync(path.dirname(config.resolvePath(filePath)));
    structInstance.saveToFile();

    if (shouldBeCached(filePath)) {
        bucketQueue.cacheFile(structInstance.filePath, structInstance.calculateSize());
    }
};

// Works for structs and folders too
exports.deleteFile = function(filePath) {
    var fileSize = fs.statSync(config.resolvePath(filePath)).size;

    fs.rmSync(config.resolvePath(filePath));

    if (shouldBeCached(filePath)) {
        bucketQueue.deleteFile(filePath, fileSize);
    }
};

exports.createFolder = function (filePath) {
    mkdirp.sync(path.dirname(config.resolvePath(filePath)));

    if (shouldBeCached(filePath)) {
        bucketQueue.cacheFolder(filePath);
    }
};