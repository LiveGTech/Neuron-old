/*
    Neuron
 
    Copyright (C) LiveG. All Rights Reserved.
 
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

var main = require("../src/main");
var fileMgmt = require("../src/filemgmt");
var bucketQueue = require("../src/bucketqueue");

var syncTimestamp = 0;

var dummyStorageNode = setInterval(function() {
    bucketQueue.mergeQueues().forEach(function(queueItem) {
        if (queueItem.timestamp <= syncTimestamp) {
            return;
        }

        if (queueItem.type == "commit") {
            if (queueItem.fileType == "file") {
                console.log(`Saving file at ${queueItem.path}: length ${queueItem.size}`);
                console.log(bucketQueue.resolveCommit(queueItem.timestamp, 0, queueItem.size));
            } else {
                console.log(`Saving folder at ${queueItem.path}`);
                bucketQueue.resolveFolderCommit(queueItem.timestamp);
            }
        } else if (queueItem.type == "delete") {
            console.log(`Deleting file at ${queueItem.path}`);

            bucketQueue.resolveDelete(queueItem.timestamp);
        } else if (queueItem.type == "request") {
            console.log(`Received request for file at ${queueItem.path}`);

            bucketQueue.initRequest(queueItem.timestamp, {
                fileType: "file",
                bytesTotal: queueItem.path.length
            });

            bucketQueue.txRequestData(queueItem.timestamp, new TextEncoder().encode(queueItem.path), 0);
        }

        syncTimestamp = queueItem.timestamp;
    });
});

function performFileOperation(number) {
    console.log(`Save file ${number}`);
    fileMgmt.saveFile(`shared:test${number}.txt`, String(number).repeat(100));

    console.log(`Request file ${number}`);

    return fileMgmt.loadFile(`shared:test${number}.txt`).then(function(data) {
        console.log(`Received requested file ${number}`);
        console.log(data);
    }).then(function() {
        setTimeout(function() {
            console.log(`Delete file ${number}`);
            fileMgmt.deleteFile(`shared:test${number}.txt`);
        }, 3000);
    });
}

fileMgmt.createFolder("shared:folder")

var promiseChain = Promise.resolve();

for (var i = 0; i < 10; i++) {
    (function(i) {
        promiseChain.then(function() {
            return performFileOperation(i);
        });
    })(i);
}

setTimeout(function() {
    clearInterval(dummyStorageNode);

    console.log("Ended test in given timeframe");
}, 5000);