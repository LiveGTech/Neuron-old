#!/usr/bin/env node

/*
    Neuron
 
    Copyright (C) LiveG. All Rights Reserved.
 
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

var config = require("./config");
var bucketQueue = require("./bucketqueue");
var server = require("./server");

config.init();
bucketQueue.load();
server.start();