const host = require("./function-host-mockup");
const fn = require("./function");

host(fn).then(({ res }) => console.log("Function returned response", res));
