/*
    Neuron
 
    Copyright (C) LiveG. All Rights Reserved.
 
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

var structs = require("../src/structs");

var binaryTree = new structs.BinaryTree();

console.log("Started");

// Add random key-value pairs
for (var i = 0; i < 100000; i++) {
    binaryTree.insertNode(Math.random(), Math.random());
}

console.log("Inserted nodes");

// Search for the 500th indexed node
console.log(binaryTree.findNode(binaryTree.data.nodes[50000].key));

console.log("Found node");