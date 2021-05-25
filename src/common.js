/*
    Neuron
 
    Copyright (C) LiveG. All Rights Reserved.
 
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

exports.getByIndexPath = function(object, path) {
    if (path.length == 0) {
        return object;
    }

    return exports.getByIndexPath(object[path[0]], path.slice(1));
};

function mutateByIndexPathRecursive(object, path, value) {
    if (object[path[0]] == undefined) {
        object[path[0]] = {};
    }

    if (path.length == 1) {
        return object[path[0]] = value;
    }

    return exports.mutateByIndexPath(object[path[0]], path.slice(1), value);
}

exports.mutateByIndexPath = function(object, path, value) {
    if (path.length == 0) {
        throw new ReferenceError("Path to find object property cannot be empty");
    }

    mutateByIndexPathRecursive(object, path, value);
};