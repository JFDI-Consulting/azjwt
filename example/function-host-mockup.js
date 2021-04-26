const { token } = require("./token.json");

const cfg = require("../local.settings.json");
const { Values: { audience, domain } = {} } = cfg;

process.env.audience = audience;
process.env.domain = domain;

const authorization = "Bearer " + token,
    req = { headers: { authorization } },
    res = {};

const context = { req, res };

console.log("Mocking function runtime with context", context);

module.exports = async fn => {
    await fn(context, req);
    return context;
};
