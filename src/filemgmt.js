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

exports.loadFile = function(path) {
    return bucketQueue.requestFile(path).then(function(request) {
        return Promise.resolve(request.data);
    });
};

exports.loadStruct = function(path, structType = structs.Struct) {
    return bucketQueue.requestFile(path).then(function() {
        var structInstance = new structType(path);

        structInstance.loadFromFile();

        return Promise.resolve(structInstance);
    });
};

exports.saveFile = function(path, data) {
    fs.writeFileSync(config.resolvePath(path), data);
    bucketQueue.cacheFile(path, data.length);
};

exports.saveStruct = function(structInstance) {
    structInstance.saveToFile();
    bucketQueue.cacheFile(structInstance.path, structInstance.calculateSize());
};

// Works for struct too
exports.deleteFile = function(path) {
    var fileSize = fs.statSync(path).size;

    fs.rmSync(path);

    bucketQueue.deleteFile(path, fileSize);
};