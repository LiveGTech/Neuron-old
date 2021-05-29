/*
    Neuron
 
    Copyright (C) LiveG. All Rights Reserved.
 
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

var main = require("../src/main");
var fileMgmt = require("../src/filemgmt");
var bucketQueue = require("../src/bucketqueue");

console.log("Save file 1");
fileMgmt.saveFile("shared:test1.txt", "1".repeat(100));

console.log("Retrieve file 1");
fileMgmt.loadFile("shared:test1.txt").then(function(data) {
    console.log("Received file 1");
    console.log(data);
});

console.log("Save file 2");
fileMgmt.saveFile("shared:test2.txt", "2".repeat(100));

console.log("Get queue");
console.log(bucketQueue.mergeQueues());

console.log("Resolve saved file 2");
bucketQueue.resolveCommit(bucketQueue.mergeQueues()[0]?.timestamp);

console.log("Get queue");
console.log(bucketQueue.mergeQueues());

console.log("Retrieve file 2");
fileMgmt.loadFile("shared:test2.txt").then(function(data) {
    console.log("Received file 2");
    console.log(data);
});

console.log("Get queue");
console.log(bucketQueue.mergeQueues());

console.log("Tx file 2 to fulfil request");
bucketQueue.initRequest(bucketQueue.mergeQueues()[1]?.timestamp, {
    fileType: "file",
    bytesTotal: 100
});

bucketQueue.txRequestData(
    bucketQueue.mergeQueues()[1]?.timestamp,
    new Uint16Array(100).fill("2".charCodeAt(0)),
    0
);

console.log("Get queue");
console.log(bucketQueue.mergeQueues());

console.log("Create empty folder and child folder");
fileMgmt.createFolder("shared:empty/subfolder");

console.log("Get queue");
console.log(bucketQueue.mergeQueues());

console.log("Check existence of folder");
fileMgmt.checkFileExists("shared:empty").then(function(type) {
    console.log("Checked existence");
    console.log(type);
}).catch(function() {
    console.error("Does not exist");
});

console.log("Get queue");
console.log(bucketQueue.mergeQueues());

console.log("Respond existence");
bucketQueue.initRequest(bucketQueue.mergeQueues()[2]?.timestamp, {
    fileType: "folder",
    bytesTotal: 0
});