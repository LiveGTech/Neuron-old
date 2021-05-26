/*
    Neuron
 
    Copyright (C) LiveG. All Rights Reserved.
 
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

const fs = require("fs");
const mkdirp = require("mkdirp");
const os = require("os");
const path = require("path");

const CONFIG_PATH = path.join(os.homedir(), ".config", "neuron", "config.json");
const CONFIG_DEFAULT_PATH = path.join(__dirname, "..", "defaultconfig.json");

exports.data = {};

exports.create = function(file = CONFIG_PATH) {
    var defaultConfig;

    try {
        mkdirp.sync(path.dirname(file));
    } catch (e) {
        throw new ReferenceError("Couldn't create config directory");
    }

    try {
        defaultConfig = fs.readFileSync(CONFIG_DEFAULT_PATH);
    } catch (e) {
        throw new ReferenceError("Couldn't read default configuration data");
    }

    try {
        fs.writeFileSync(file, defaultConfig);
    } catch (e) {
        throw new ReferenceError("Couldn't write new configuration file");
    }
};

exports.load = function(file = CONFIG_PATH) {
    if (!fs.existsSync(file)) {
        throw new ReferenceError("No configuration file found, please create one");
    }

    try {
        exports.data = JSON.parse(fs.readFileSync(file));
    } catch (e) {
        throw new SyntaxError("Couldn't to parse configuration file; ensure that format is correct");
    }
};

exports.init = function(file = CONFIG_PATH) {
    if (!fs.existsSync(file)) {
        exports.create(file);
    }

    exports.load(file);
};

exports.resolvePath = function(path) {
    if (path.split(":").length < 2) {
        throw new TypeError("Path must be constructed of bucket identifier and location");
    }

    if (path.split(":")[0] == "identity") {
        var absolutePath = path.resolve(__dirname, exports.data.identityStorage, path.split(":")[1]);

        if (!absolutePath.startsWith(exports.data.identityStorage)) {
            throw new ReferenceError("Cannot get path outside of bucket");
        }

        return absolutePath;
    }

    if (path.split(":")[0] == "bucket") {
        var absolutePath = path.resolve(__dirname, exports.data.bucketStorage, path.split(":")[1]);

        if (!absolutePath.startsWith(exports.data.bucketStorage)) {
            throw new ReferenceError("Cannot get path outside of bucket");
        }

        return absolutePath;
    }

    if (path.split(":")[0] == "shared") {
        var absolutePath = path.resolve(__dirname, exports.data.sharedStorage, path.split(":")[1]);

        if (!absolutePath.startsWith(exports.data.sharedStorage)) {
            throw new ReferenceError("Cannot get path outside of bucket");
        }

        return absolutePath;
    }
};