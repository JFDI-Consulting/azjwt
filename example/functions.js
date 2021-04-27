const verifyJwt = require("..");

const permitted = ["collaboration:start"],
    denied = ["level:very-lowly-indeed"];

module.exports = [
    // the short-form object syntax for checking additional JWT properties - requires all permitted roles
    verifyJwt(
        async (context, req) => {
            const { user } = context;
            context.res = { body: user };
        },
        {
            permissions: permitted
        }
    ),
    // the long-form object syntax for checking additional JWT properties - allows finer-grained specs & denied roles
    verifyJwt(
        async (context, req) => {
            const { user } = context;
            context.res = { body: user };
        },
        {
            permissions: {
                permitted: { roles: permitted, requireAll: true },
                denied: { roles: denied, requireAll: false }
            }
        }
    )
];
