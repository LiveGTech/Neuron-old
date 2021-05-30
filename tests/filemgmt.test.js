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
                console.log(`dummyStorageNode: Saving file at ${queueItem.path}: length ${queueItem.size}`);
                console.log("dummyStorageNode:", bucketQueue.resolveCommit(queueItem.timestamp, 0, queueItem.size));
            } else {
                console.log(`dummyStorageNode: Saving folder at ${queueItem.path}`);
                bucketQueue.resolveFolderCommit(queueItem.timestamp);
            }
        } else if (queueItem.type == "delete") {
            console.log(`dummyStorageNode: Deleting file at ${queueItem.path}`);

            bucketQueue.resolveDelete(queueItem.timestamp);
        } else if (queueItem.type == "move") {
            console.log(`dummyStorageNode: Moving file at ${queueItem.path} to ${queueItem.newPath}`);
        } else if (queueItem.type == "request") {
            console.log(`dummyStorageNode: Received request for file at ${queueItem.path}`);

            bucketQueue.initRequest(queueItem.timestamp, {
                fileType: "file",
                bytesTotal: queueItem.path.length
            });

            bucketQueue.txRequestData(queueItem.timestamp, new TextEncoder().encode(queueItem.path), 0);
        }

        syncTimestamp = queueItem.timestamp;
    });
});

function performFileCrud(number) {
    console.log(`Save file ${number}`);
    fileMgmt.saveFile(`shared:test${number}.txt`, String(number).repeat(100));

    console.log(`Request file ${number}`);

    return fileMgmt.loadFile(`shared:test${number}.txt`).then(function(data) {
        console.log(`Received requested file ${number}`);
        console.log(data);
    });
}

function performFileMove(number) {
    console.log(`Move file ${number}`);
    fileMgmt.moveFile(`shared:test${number}.txt`, `shared:movetest${number}.txt`);

    console.log(`Request moved or copied file ${number}`);

    return fileMgmt.loadFile(`shared:movetest${number}.txt`).then(function(data) {
        console.log(`Received requested moved file ${number}`);
        console.log(data);
    }).then(function() {
        setTimeout(function() {
            console.log(`Delete requested moved file ${number}`);
            fileMgmt.deleteFile(`shared:movetest${number}.txt`);
        }, 1000);
    });
}

fileMgmt.createFolder("shared:folder");

var promiseChain = Promise.resolve();

for (var i = 0; i < 10; i++) {
    (function(i) {
        promiseChain.then(function() {
            return performFileCrud(i);
        });
    })(i);
}

promiseChain = promiseChain.then(function() {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            resolve();
        }, 1000);
    });
});

for (var i = 0; i < 10; i++) {
    (function(i) {
        promiseChain.then(function() {
            return performFileMove(i);
        });
    })(i);
}

setTimeout(function() {
    clearInterval(dummyStorageNode);

    console.log("Ended test in given timeframe");
}, 3000);