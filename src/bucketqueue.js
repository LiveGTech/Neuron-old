/*
    Neuron
 
    Copyright (C) LiveG. All Rights Reserved.
 
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

const fs = require("fs");

var config = require("./config");

const MAX_BUCKET_CACHE_SIZE = config.data.maxBucketCacheSize || 8589934592; // 8 GiB default
const QUEUE_PATH = config.resolvePath("identity:queue.bson");

exports.cachedFiles = [];
exports.cachedSize = 0;
exports.fileCommitQueue = [];
exports.filesToRequest = [];

exports.requestRetrievalState = {
    UNFULFILLED: 0,
    INITIAL_INFO_RECEIVED: 1,
    TX_IN_PROGRESS: 2,
    FULFILLED: 3,
    ERR_NONEXISTENT: -1
};

// Called when space is needed, and so files in cache need to be evicted
exports.evictFiles = function(spaceToReserve) {
    while (exports.cachedFiles.length > 0) {
        if (exports.cachedSize < MAX_BUCKET_CACHE_SIZE - spaceToReserve) {
            break;
        }

        exports.cachedSize -= exports.cachedFiles[0].size;
        exports.fileCommitQueue = exports.fileCommitQueue.filter((i) => i.path != exports.cachedFiles[0].path);

        exports.fileCommitQueue.push(exports.cachedFiles.shift());
    }
};

// Called when the first file which has been committed to cold storage is no longer needed in cache
exports.dequeueFirstCommittedFile = function() {
    var committedFile = exports.fileCommitQueue.shift();

    fs.rmSync(config.resolvePath(committedFile.path));
};

// Use `txCallback` callback for directly streaming data to a client
exports.requestFile = function(path, txCallback = function() {}) {
    for (var i = exports.cachedFiles.length - 1; i >= 0; i--) {
        if (exports.cachedFiles[i].path == path) {
            return Promise.resolve(exports.cachedFiles[i]);
        }
    }

    for (var i = 0; i < exports.filesToRequest; i++) {
        if (exports.filesToRequest[i].path == path) {
            return exports.filesToRequest[i].promise;
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
        var lastBytesTransferred = 0;

        var requestStatePoller = setInterval(function() {
            if (request.bytesTransferred != lastBytesTransferred) {
                txCallback(request);

                lastBytesTransferred = request.bytesTransferred;
            }

            if ([
                exports.requestRetrievalState.FULFILLED,
                exports.requestRetrievalState.ERR_NONEXISTENT
            ].includes(request.state)) {
                clearInterval(requestStatePoller);

                var requestIndex = exports.filesToRequest.indexOf(request);

                if (requestIndex >= 0) {
                    exports.filesToRequest.splice(requestIndex, 1);
                }
            }

            if (request.state == exports.requestRetrievalState.FULFILLED) {
                resolve(request);

                return;
            }

            if (request.state == exports.requestRetrievalState.ERR_NONEXISTENT) {
                reject(request);

                return;
            }
        });
    });

    exports.filesToRequest.push(request);

    return request.promise;
};

// Used to register files which have been saved to cache storage but not yet registered
exports.cacheFile = function(path, size) {
    exports.evictFiles(size);

    for (var i = exports.cachedFiles.length - 1; i >= 0; i--) {
        if (exports.cachedFiles[i].path == path) {
            exports.cachedFiles.splice(i);

            break;
        }
    }

    exports.cachedFiles.push({path, size});
};

exports.load = function() {
    if (!fs.existsSync(QUEUE_PATH)) {
        return; // No queue yet, so start with an empty one
    }

    var contents = BSON.deseralise(fs.readFileSync(QUEUE_PATH));

    exports.cachedFiles = contents.cachedFiles;
    exports.fileCommitQueue = contents.fileCommitQueue;
};

exports.save = function() {
    var contents = {};

    contents.cachedFiles = exports.cachedFiles;
    contents.fileCommitQueue = exports.fileCommitQueue;

    fs.writeFileSync(QUEUE_PATH, contents);
};