/*
    Neuron
 
    Copyright (C) LiveG. All Rights Reserved.
 
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");

var config = require("./config");

const MAX_BUCKET_CACHE_SIZE = config.data.maxBucketCacheSize || 8 * 1024 * 1024 * 1024; // 8 GiB default
const MAX_EVICTION_QUEUE_TIME = config.data.maxEvictionQueueTime || 60 * 60 * 1000; // 1 hr default
const REQUEST_TIMEOUT = 10 * 1000; // 10 secs default
const QUEUE_PATH = config.resolvePath("identity:queue.bson");

exports.cachedFiles = [];
exports.cachedSize = 0;
exports.fileCommitQueue = [];
exports.fileDeleteQueue = [];
exports.filesToRequest = [];
exports.queueMinTimestamp = 0;

exports.requestRetrievalState = {
    UNFULFILLED: 0,
    INITIAL_INFO_RECEIVED: 1,
    TX_IN_PROGRESS: 2,
    FULFILLED: 3,
    ERR_NOT_FOUND: -1
};

// Called when space is needed, and so files in cache need to be evicted
exports.evictFiles = function(spaceToReserve) {
    while (exports.cachedFiles.length > 0) {
        console.log(exports.cachedSize, MAX_BUCKET_CACHE_SIZE - spaceToReserve);
        if (exports.cachedSize < MAX_BUCKET_CACHE_SIZE - spaceToReserve) {
            break;
        }

        exports.cachedSize -= exports.cachedFiles[0].size;
        exports.fileCommitQueue = exports.fileCommitQueue.filter((i) => i.path != exports.cachedFiles[0].path);

        exports.cachedFiles[0].alreadyCommittedOnce = false;
        exports.cachedFiles[0].timestamp = new Date().getTime();

        exports.fileCommitQueue.push(exports.cachedFiles.shift());
    }

    for (var i = 0; i < exports.fileCommitQueue.length; i++) {
        if (exports.fileCommitQueue[i].alreadyCommittedOnce && exports.fileCommitQueue[i].timestamp < new Date().getTime() - MAX_EVICTION_QUEUE_TIME) {
            if (fs.existsSync(config.resolvePath(exports.fileCommitQueue[i].path))) {
                fs.rmSync(config.resolvePath(exports.fileCommitQueue[i].path));
            }

            exports.queueMinTimestamp = exports.fileCommitQueue[i].timestamp; // So long as storage node has files newer than this time, they're working
            exports.fileCommitQueue[i] = null; // Remove if certain that all storage nodes have committed this file
        }
    }

    exports.fileCommitQueue = exports.fileCommitQueue.filter((i) => i != null);
};

exports.deleteFile = function(path, size) {
    for (var i = exports.cachedFiles.length - 1; i >= 0; i--) {
        if (exports.cachedFiles[i].path == path) {
            exports.cachedFiles.splice(i);

            break;
        }
    }

    exports.fileDeleteQueue.push({
        path,
        size,
        timestamp: new Date().getTime
    });

    for (var i = 0; i < exports.fileDeleteQueue.length; i++) {
        if (exports.fileDeleteQueue[i].alreadyCommittedOnce && exports.fileDeleteQueue[i].timestamp < new Date().getTime() - MAX_EVICTION_QUEUE_TIME) {
            exports.queueMinTimestamp = exports.fileDeleteQueue[i].timestamp; // So long as storage node has files newer than this time, they're working
            exports.fileDeleteQueue[i] = null; // Remove if certain that all storage nodes have committed this file
        }
    }

    exports.fileDeleteQueue = exports.fileDeleteQueue.filter((i) => i != null);
};

// Use `txCallback` callback for directly streaming data to a client
exports.requestFile = function(filePath, txCallback = function() {}) {
    for (var i = exports.cachedFiles.length - 1; i >= 0; i--) {
        if (exports.cachedFiles[i].path == filePath) {
            var request = {
                ...exports.cachedFiles[i],
                state: exports.requestRetrievalState.FULFILLED,
            };

            if (fs.statSync(config.resolvePath(filePath)).isDirectory()) {
                request.fileType = "folder";
                request.bytesTransferred = 0;
                request.bytesTotal = 0;
                request.data = new ArrayBuffer(0);
            } else {
                var fileContents = fs.readFileSync(config.resolvePath(filePath));

                request.fileType = "file";
                request.bytesTransferred = fileContents.length;
                request.bytesTotal = fileContents.length;
                request.data = fileContents;
            }

            txCallback(request);

            return Promise.resolve(request);
        }
    }

    for (var i = 0; i < exports.filesToRequest; i++) {
        if (exports.filesToRequest[i].path == filePath) {
            return exports.filesToRequest[i].promise;
        }
    }

    var request = {
        path: filePath,
        fileType: null,
        timestamp: new Date().getTime(),
        state: exports.requestRetrievalState.UNFULFILLED,
        bytesTransferred: 0,
        bytesTotal: null,
        data: null
    };

    request.promise = new Promise(function(resolve, reject) {
        var lastBytesTransferred = null; // Initial callback will give file tx info but no data
        var lastTransferTime = new Date();

        var requestStatePoller = setInterval(function() {
            var requestIndex = exports.filesToRequest.indexOf(request);

            if (lastTransferTime.getTime() < new Date().getTime() - REQUEST_TIMEOUT) {
                request.state = exports.requestRetrievalState.ERR_NOT_FOUND; // No response, so mark as not found
            }

            if (request.bytesTransferred != lastBytesTransferred) {
                if (txCallback(request)) {
                    request.state = exports.requestRetrievalState.FULFILLED; // Callback wants to cancel tx, so mark it as fulfilled
                }

                lastBytesTransferred = request.bytesTransferred;

                lastTransferTime = new Date(); // Data received, so update last transfer time
            }

            if ([
                exports.requestRetrievalState.FULFILLED,
                exports.requestRetrievalState.ERR_NOT_FOUND
            ].includes(request.state)) {
                clearInterval(requestStatePoller);

                if (requestIndex >= 0) {
                    exports.filesToRequest.splice(requestIndex, 1);
                }
            }

            if (request.state == exports.requestRetrievalState.FULFILLED) {
                mkdirp.sync(path.dirname(config.resolvePath(filePath)));

                if (request.fileType == "file") {
                    fs.writeFileSync(config.resolvePath(filePath), request.data);
                    exports.cacheFile(filePath, request.data.length);
                } else if (request.fileType == "folder") {
                    exports.cacheFolder(filePath);
                }

                resolve(request);

                return;
            }

            if (request.state == exports.requestRetrievalState.ERR_NOT_FOUND) {
                reject(request);

                return;
            }
        });
    });

    exports.filesToRequest.push(request);

    return request.promise;
};

// Used to register files which have been saved to cache storage but not yet registered
exports.cacheFile = function(filePath, size) {
    exports.evictFiles(size);

    for (var i = exports.cachedFiles.length - 1; i >= 0; i--) {
        if (exports.cachedFiles[i].path == filePath) {
            exports.cachedFiles.splice(i, 1);

            break;
        }
    }

    exports.cachedFiles.push({
        fileType: "file",
        path: filePath,
        size,
        timestamp: new Date().getTime
    });

    exports.cachedSize += size;
};

exports.cacheFolder = function(filePath) {
    for (var i = exports.cachedFiles.length - 1; i >= 0; i--) {
        if (exports.cachedFiles[i].path == filePath) {
            exports.cachedFiles.splice(i, 1);

            break;
        }
    }

    exports.cachedFiles.push({
        fileType: "folder",
        path: filePath,
        size: 0,
        timestamp: new Date().getTime
    });
};

exports.load = function() {
    if (!fs.existsSync(QUEUE_PATH)) {
        return; // No queue yet, so start with an empty one
    }

    var contents = BSON.deseralise(fs.readFileSync(QUEUE_PATH));

    exports.cachedFiles = contents.cachedFiles;
    exports.cachedSize = contents.cachedSize;
    exports.fileCommitQueue = contents.fileCommitQueue;
    exports.queueMinTimestamp = contents.fileCommitQueueMinimumTime;
    exports.fileDeleteQueue = contents.fileDeleteQueue;
};

exports.save = function() {
    var contents = {};

    contents.cachedFiles = exports.cachedFiles;
    contents.cachedSize = exports.cachedSize;
    contents.fileCommitQueue = exports.fileCommitQueue;
    contents.fileCommitQueueMinimumTime = exports.queueMinTimestamp;
    contents.fileDeleteQueue = exports.fileDeleteQueue;

    fs.writeFileSync(QUEUE_PATH, contents);
};

exports.mergeQueues = function() {
    var mergedQueue = [];

    for (var i = 0; i < exports.fileCommitQueue.length; i++) {
        mergedQueue.push({
            type: "commit",
            fileType: exports.fileCommitQueue[i].fileType,
            path: exports.fileCommitQueue[i].path,
            timestamp: exports.fileCommitQueue[i].timestamp
        });
    }

    for (var i = 0; i < exports.fileDeleteQueue.length; i++) {
        mergedQueue.push({
            type: "delete",
            path: exports.fileDeleteQueue[i].path,
            timestamp: exports.fileDeleteQueue[i].timestamp
        });
    }

    for (var i = 0; i < exports.filesToRequest.length; i++) {
        mergedQueue.push({
            type: "request",
            path: exports.filesToRequest[i].path,
            timestamp: exports.filesToRequest[i].timestamp,
            initialised: exports.filesToRequest[i].state == exports.requestRetrievalState.INITIAL_INFO_RECEIVED,
            bytesTransferred: exports.filesToRequest[i].bytesTransferred
        });
    }

    return mergedQueue;
};

exports.getFromQueueAtTimestamp = function(queue, timestamp) {
    for (var i = 0; i < queue.length; i++) {
        if (queue[i].timestamp == timestamp) {
            return queue[i];
        }
    }

    return null; // May already have been performed
};

exports.resolveCommit = function(timestamp) {
    var item = exports.getFromQueueAtTimestamp(exports.fileCommitQueue, timestamp);

    if (item == null) {
        return; // Has been since removed
    }

    item.alreadyCommittedOnce = true;
};

exports.resolveDelete = function(timestamp) {
    var item = exports.getFromQueueAtTimestamp(exports.fileDeleteQueue, timestamp);

    if (item == null) {
        return; // Has been since removed
    }

    item.alreadyCommittedOnce = true;
};

exports.initRequest = function(timestamp, info) {
    var item = exports.getFromQueueAtTimestamp(exports.filesToRequest, timestamp);

    if (item == null) {
        return; // Has been since resolved, possibly by another storage node
    }

    if (item.state != exports.requestRetrievalState.UNFULFILLED) {
        return; // Already being transferred, possibly by another storage node
    }

    item.state = info.bytesTotal == 0 ? exports.requestRetrievalState.FULFILLED : exports.requestRetrievalState.INITIAL_INFO_RECEIVED;
    item.fileType = info.fileType || "file";
    item.bytesTotal = info.bytesTotal;
    item.data = new ArrayBuffer(info.bytesTotal);
};

exports.txRequestData = function(timestamp, dataChunk, previousBytesTransferred) {
    var item = exports.getFromQueueAtTimestamp(exports.filesToRequest, timestamp);

    if (item == null) {
        return; // Has been since resolved, possibly by another storage node
    }

    if (![
        exports.requestRetrievalState.INITIAL_INFO_RECEIVED,
        exports.requestRetrievalState.TX_IN_PROGRESS
    ].includes(item.state) || item.bytesTransferred != previousBytesTransferred) {
        return; // Another storage node may be at a different transfer point
    }

    for (var i = 0; i < dataChunk.length; i++) {
        item.data[previousBytesTransferred + i] = dataChunk[i];
    }

    item.bytesTransferred += dataChunk.length;

    if (item.bytesTransferred >= item.bytesTotal) {
        item.state = exports.requestRetrievalState.FULFILLED;
        item.bytesTotal = item.bytesTransferred;
    }
};

exports.txRequestMarkNotFound = function(timestamp) {
    var item = exports.getFromQueueAtTimestamp(exports.filesToRequest, timestamp);

    if (item == null) {
        return; // Has been since resolved, possibly by another storage node
    }

    item.state = exports.requestRetrievalState.ERR_NOT_FOUND;
};