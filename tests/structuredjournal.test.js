/*
    Neuron
 
    Copyright (C) LiveG. All Rights Reserved.
 
    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

var structs = require("../src/structs");

var structuredJournal = new structs.StructuredJournal();

structuredJournal.addRevision(["test", "path"], "example", {reason: "initial"});
structuredJournal.addRevision(["test", "path"], "new", {reason: "initial"});
structuredJournal.addRevision(["test", "secondary"], "other", {reason: "initial"});

console.log("First revision");
console.log(structuredJournal.getRevisionContents(0));
console.log("Latest revision");
console.log(structuredJournal.getRevisionContents(2));

structuredJournal.restoreRevision(0);

console.log("Restored first revision");
console.log(structuredJournal.getLatestRevisionContents());

structuredJournal.addRevision(["test", "path"], "afterRestore", {reason: "afterRestore"});
structuredJournal.addRevision(["test", "secondary"], "another", {reason: "afterRestore"});

structuredJournal.purgeRevisions({reason: "reset"});

console.log("Purged");
console.log(structuredJournal.getLatestRevisionContents());
console.log("Get first from purge");
console.log(structuredJournal.getRevisionContents(0));