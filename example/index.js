// This will work with the domain & audience specified in local.settings.json and the current token you provide in token.json
const host = require("./function-host-mockup");
const functions = require("./functions");

functions.forEach(fn => host(fn).then(({ res }) => console.log("Function returned response", res)));
