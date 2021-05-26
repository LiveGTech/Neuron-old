/*
    Neuron
 
    Copyright (C) LiveG. All Rights Reserved.
 
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

const fs = require("fs");
const sha256 = require("crypto-js/sha256");

var common = require("./common");

// Base structure class for use with other structures
exports.Struct = class {
    constructor(path = null) {
        this.path = path;

        this.data = {};
        this.unsavedChanges = false;
        this.lastAccess = new Date();
    }

    loadFromFile() {
        if (this.path == null) {
            return;
        }

        var contents = fs.readFileSync(this.path);

        this.data = BSON.deserialize(contents);
        this.lastAccess = new Date();
        this.unsavedChanges = false;
    }

    saveToFile() {
        if (this.path == null) {
            return;
        }

        var contents = BSON.serialize(this.data);

        fs.writeFileSync(this.path, contents);

        this.unsavedChanges = false;
    }

    calculateSize() {
        return BSON.serialize(this.data).length;
    }
}

// Used for storing/retrieving indexable key-value information at best case O(log n) time complexity
exports.BinaryTree = class extends exports.Struct {
    constructor(path) {
        super(path);

        this.data = {nodes: [], rootNodeIndex: 0};
    }

    loadFromFile() {
        super.loadFromFile();

        this.data.nodes = this.data.nodes || [];
        this.data.rootNodeIndex = this.data.rootNodeIndex || 0;
    }

    findNode(key, rootNodeIndex = this.data.rootNodeIndex) {
        var currentNode = this.data.nodes[rootNodeIndex];
        var currentNodeIndex = rootNodeIndex;
        var closestNodeIndex = null;
        var closestNode = null;

        this.lastAccess = new Date();

        while (true) {
            currentNode = this.data.nodes[currentNodeIndex];

            if (currentNode == undefined) {
                return {closestNode, exists: false}; // Node doesn't exist
            }

            var comparison = this.constructor.compareData(key, currentNode.key);

            closestNodeIndex = currentNodeIndex;
            closestNode = {...this.data.nodes[closestNodeIndex], exists: true, index: closestNodeIndex};

            if (comparison == -1) {
                currentNodeIndex = currentNode.less;

                continue;
            }

            if (comparison == 1) {
                currentNodeIndex = currentNode.greater;

                continue;
            }

            return {...currentNode, exists: true, index: currentNodeIndex}; // Node successfully found
        }
    }

    insertNode(key, value, rootNodeIndex = this.data.rootNodeIndex) {
        var node = this.findNode(key, rootNodeIndex);

        if (node.exists) {
            throw new ReferenceError("Node already exists");
        }

        var closestNode = node.closestNode;

        this.data.nodes.push({key, value});

        if (closestNode == null) { // Closest (parent) node doesn't exist, so set root instead
            this.data.rootNodeIndex = this.data.nodes.length - 1;

            return;
        }

        var comparison = this.constructor.compareData(key, closestNode.key);

        if (comparison == -1) {
            this.data.nodes[closestNode.index].less = this.data.nodes.length - 1;
        }

        if (comparison == 1) {
            this.data.nodes[closestNode.index].greater = this.data.nodes.length - 1;
        }

        this.lastAccess = new Date();
        this.unsavedChanges = true;
    }

    updateNode(key, value, merge = true, rootNodeIndex = this.data.rootNodeIndex) {
        var node = this.findNode(key, rootNodeIndex);

        if (!node.exists) {
            throw new ReferenceError("Node does not exist");
        }

        if (merge) {
            this.data.nodes[node.index] = {...node.value, ...value};
        } else {
            this.data.nodes[node.index] = value;
        }
    }

    upsertNode(key, value, merge = true, rootNodeIndex = this.data.rootNodeIndex) {
        var node = this.findNode(key, rootNodeIndex);

        if (node.exists) {
            this.updateNode(key, value, merge, node.index);
        } else {
            this.insertNode(key, value, node.index);
        }
    }

    static compareData(a, b) {
        if (a < b) {
            return -1;
        }

        if (a > b) {
            return 1;
        }

        return 0;
    }
}

// Used for storing document data with revisions, such as with the case of collaborative document editing
exports.StructuredJournal = class extends exports.Struct {
    constructor(path) {
        super(path);

        this.data = {contents: {}, revisions: []};
    }

    loadFromFile() {
        super.loadFromFile();

        this.data.contents = this.data.contents || {};
        this.data.revisions = this.data.revisions || [];
    }

    getRevision(index) {
        if (index < 0) {
            throw new TypeError("Revisions start at index 0");
        }

        if (index >= this.data.revisions.length) {
            throw new ReferenceError("Revision does not exist this far");
        }

        this.lastAccess = new Date();

        return this.data.revisions[index];
    }

    getAllRevisions() {
        this.lastAccess = new Date();

        return this.data.revisions;
    }

    getRevisionLength() {
        this.lastAccess = new Date();

        return this.data.revisions.length;
    }

    getLatestRevision() {
        this.lastAccess = new Date();

        return this.data.revisions[this.data.revisions.length - 1];
    }

    getRevisionContents(index) {
        var revisionContents = {};

        if (index < 0) {
            throw new TypeError("Revisions start at index 0");
        }

        if (index >= this.data.revisions.length) {
            throw new ReferenceError("Revision does not exist this far");
        }

        for (var i = 0; i <= index; i++) {
            if (this.data.revisions[i].path.length == 0) {
                revisionContents = this.data.revisions[i].data;

                continue;
            }

            common.mutateByIndexPath(revisionContents, this.data.revisions[i].path, this.data.revisions[i].data);
        }

        this.lastAccess = new Date();

        return revisionContents;
    }

    getLatestRevisionContents() {
        this.lastAccess = new Date();

        return this.data.contents;
    }

    getRevisionsSince(date) {
        var minimumTimestamp = date.getTime();
        var revisions = [];

        for (var i = this.data.revisions.length - 1; i >= 0; i--) {
            if (this.data.revisions[i].timestamp >= minimumTimestamp) {
                revisions.unshift(this.data.revisions[i]); // Inserting from reverse so that revisions are in chronological order
            }
        }

        this.lastAccess = new Date();

        return revisions;
    }

    getRevisionIndexAtDate(date) {
        var futureTimestamp = date.getTime();

        this.lastAccess = new Date();

        for (var i = this.data.revisions.length - 1; i >= 0; i--) {
            if (this.data.revisions[i].timestamp <= futureTimestamp) {
                return i;
            }
        }

        return null;
    }

    // `data` refers to document data, whereas `metadata` refers to revision info, such as author
    addRevision(path, data, metadata) {
        this.data.revisions.push({
            path,
            data,
            metadata,
            timestamp: new Date().getTime()
        });

        this.data.contents = this.getRevisionContents(this.data.revisions.length - 1);
        this.data.revisions[this.data.revisions.length - 1].hash = sha256(JSON.stringify(this.data.contents)).toString(); // So client side can check if most recent changes have been applied

        this.lastAccess = new Date();
        this.unsavedChanges = true;
    }

    purgeRevisions(metadata = {}) {
        this.data.revisions = [{
            path: [],
            data: this.data.contents,
            metadata,
            timestamp: new Date().getTime()
        }];

        this.data.revisions[0].hash = sha256(JSON.stringify(this.data.contents)).toString(); // So client side can verify revision

        this.lastAccess = new Date();
        this.unsavedChanges = true;
    }

    restoreRevision(index) {
        this.data.contents = this.getRevisionContents(index);
        this.data.revisions = this.data.revisions.slice(0, index + 1);

        this.lastAccess = new Date();
        this.unsavedChanges = true;
    }
};