const verifyJwt = require("..");

module.exports = verifyJwt(async (context, req) => {
    const { user } = context;
    context.res = { body: user };
});
