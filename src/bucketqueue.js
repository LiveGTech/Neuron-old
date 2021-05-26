/*
    Neuron
 
    Copyright (C) LiveG. All Rights Reserved.
 
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

var config = require("./config");

const MAX_BUCKET_CACHE_SIZE = config.data.maxBucketCacheSize || 8589934592; // 8 GiB default

exports.cachedFiles = [];
exports.cachedSize = 0;
exports.filesToCommit = [];
exports.filePathsToRequest = [];

exports.requestRetrievalState = {
    UNFULFILLED: 0,
    INITIAL_INFO_RECEIVED: 1,
    TX_IN_PROGRESS: 2,
    FULFILLED: 3
};

exports.evictFiles = function(spaceToReserve) {
    while (exports.cachedFiles.length > 0) {
        if (exports.cachedSize < MAX_BUCKET_CACHE_SIZE - spaceToReserve) {
            break;
        }

        exports.cachedSize -= exports.cachedFiles[0].size;
        exports.filesToCommit = exports.filesToCommit.filter((i) => i.path != exports.cachedFiles[0].path);

        exports.filesToCommit.push(exports.cachedFiles.shift());
    }
};

exports.requestFile = function(path) {
    for (var i = exports.cachedFiles.length - 1; i >= 0; i--) {
        if (exports.cachedFiles[i].path == path) {
            return Promise.resolve(exports.cachedFiles[i]);
        }
    }

    for (var i = 0; i < exports.filePathsToRequest; i++) {
        if (exports.filePathsToRequest[i].path == path) {
            return exports.filePathsToRequest[i].promise;
        }
    }

    var request = {
        path,
        state: exports.requestRetrievalState.UNFULFILLED,
        bytesTransferred: 0,
        bytesTotal: null,
        data: null
    };

    request.promise = new Promise(function(resolve, reject) {
        setInterval(function requestStatePoller() {
            if (request.state == exports.requestRetrievalState.FULFILLED) {
                clearImmediate(requestStatePoller);
                resolve();
            }
        });
    });

    exports.filePathsToRequest.push(request);
};