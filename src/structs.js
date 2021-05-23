/*
    Neuron
 
    Copyright (C) LiveG. All Rights Reserved.
 
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

const fs = require("fs");

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
}

// Used for storing/retrieving key-value information at best case O(log n) time complexity
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