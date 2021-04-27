const host = require("./function-host-mockup");
const functions = require("./functions");

functions.forEach(fn => host(fn).then(({ res }) => console.log("Function returned response", res)));
