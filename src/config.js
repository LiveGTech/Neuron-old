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
const CONFIG_DEFAULT_IDENTITY_PATH = "./storage/identity";
const CONFIG_DEFAULT_BUCKET_PATH = "./storage/bucket";
const CONFIG_DEFAULT_SHARED_PATH = "./storage/shared";

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

exports.resolvePath = function(bucketPath) {
    if (bucketPath.split(":").length < 2) {
        throw new TypeError("Path must be constructed of bucket identifier and location");
    }

    if (bucketPath.split(":")[0] == "identity") {
        var absolutePath = path.resolve(__dirname, exports.data.identityStorage || CONFIG_DEFAULT_IDENTITY_PATH, bucketPath.split(":")[1]);

        if (!absolutePath.startsWith(path.resolve(__dirname, exports.data.identityStorage || CONFIG_DEFAULT_IDENTITY_PATH))) {
            throw new ReferenceError("Cannot get path outside of bucket");
        }

        return absolutePath;
    }

    if (bucketPath.split(":")[0] == "bucket") {
        var absolutePath = path.resolve(__dirname, exports.data.bucketStorage || CONFIG_DEFAULT_BUCKET_PATH, bucketPath.split(":")[1]);

        if (!absolutePath.startsWith(path.resolve(__dirname, exports.data.bucketStorage || CONFIG_DEFAULT_BUCKET_PATH))) {
            throw new ReferenceError("Cannot get path outside of bucket");
        }

        return absolutePath;
    }

    if (bucketPath.split(":")[0] == "shared") {
        var absolutePath = path.resolve(__dirname, exports.data.sharedStorage || CONFIG_DEFAULT_SHARED_PATH, bucketPath.split(":")[1]);

        if (!absolutePath.startsWith(path.resolve(__dirname, exports.data.sharedStorage || CONFIG_DEFAULT_SHARED_PATH))) {
            throw new ReferenceError("Cannot get path outside of bucket");
        }

        return absolutePath;
    }
};