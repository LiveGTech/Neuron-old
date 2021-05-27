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

var config = require("./config");
var bucketQueue = require("./bucketqueue");
var structs = require("./structs");

const NO_CACHE_BUCKETS = ["identity"];

function shouldBeCached(path) {
    for (var i = 0; i < NO_CACHE_BUCKETS.length; i++) {
        if (path.startsWith(NO_CACHE_BUCKETS[i] + ":")) {
            return false;
        }
    }

    return true;
}

// Works for struct too
exports.checkFileExists = function(path) {
    if (!shouldBeCached(path)) {
        if (fs.existsSync(config.resolvePath(path))) {
            return Promise.resolve();
        } else {
            return Promise.reject();
        }
    }

    return bucketQueue.requestFile(path, function() {
        return true; // Immediately cancel request since we're looking to check if it exists only
    }).then(function(request) {
        if (request.state == bucketQueue.requestRetrievalState.ERR_NOT_FOUND) {
            return Promise.reject();
        }

        return Promise.resolve();
    });
};

exports.loadFile = function(path) {
    if (!shouldBeCached(path)) {
        return Promise.resolve(fs.readFileSync(config.resolvePath(path)));
    }

    return bucketQueue.requestFile(path).then(function(request) {
        return Promise.resolve(request.data);
    });
};

exports.loadStruct = function(path, structType = structs.Struct) {
    if (!shouldBeCached(path)) {
        var structInstance = new structType(path);

        structInstance.loadFromFile();

        return Promise.resolve(structInstance);
    }

    return bucketQueue.requestFile(path).then(function() {
        var structInstance = new structType(path);

        structInstance.loadFromFile();

        return Promise.resolve(structInstance);
    });
};

exports.saveFile = function(path, data) {
    fs.writeFileSync(config.resolvePath(path), data);

    if (shouldBeCached(path)) {
        bucketQueue.cacheFile(path, data.length);
    }
};

exports.saveStruct = function(structInstance) {
    structInstance.saveToFile();

    if (shouldBeCached(path)) {
        bucketQueue.cacheFile(structInstance.path, structInstance.calculateSize());
    }
};

// Works for struct too
exports.deleteFile = function(path) {
    var fileSize = fs.statSync(config.resolvePath(path)).size;

    fs.rmSync(config.resolvePath(path));

    if (shouldBeCached(path)) {
        bucketQueue.deleteFile(path, fileSize);
    }
};