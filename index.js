const { verify } = require("jsonwebtoken");
const { promisify } = require("util");
const { readFile, writeFile } = require("fs/promises");
const { resolve } = require("path");
const got = require("got");
const { attemptPromise } = require("@jfdi/attempt");
const verifyJwt = promisify(verify);

const ensureTrailingSlash = x => ((x || "").slice(-1) !== "/" ? x + "/" : x);

const KEY_FILE = "publicKey.pem",
    keyFilePath = resolve(__dirname, KEY_FILE),
    { audience, domain, debug } = process.env,
    issuer = ensureTrailingSlash(domain),
    options = {
        audience,
        issuer
    };

const getKeyFromFile = async () => readFile(keyFilePath);

module.exports = (fn, options) => async (context, ...args) => {
    const log = debug ? context.log : () => null;

    const getKey = async () => {
        log(`Reading cached public key from file ${keyFilePath}...`);
        const [e, cachedKey] = await attemptPromise(getKeyFromFile);

        if (e) {
            log("Fetching public key from IDP...");
            const { body: fetchedKey } = await got(issuer + "pem");
            writeFile(keyFilePath, fetchedKey); // no need to await this?
            return fetchedKey;
        } else return cachedKey;
    };

    const getJwt = req => (req.headers.authorization || context.bindingData.headers.authorization || "").slice(7); // cut off "Bearer "; all headers have been lowercased before we get them!

    const key = await getKey();
    const jwt = getJwt(context.req);

    log("Verifying JWT...");
    const [e, payload] = await attemptPromise(() => verifyJwt(jwt, key, options));

    if (e) {
        log(e.message);
        context.res = { status: 401 };
    } else {
        // user passes checks if in one or all specified permitted roles, and none of the denied roles
        const checkAdditionalProperties = options => {
            const results = Object.entries(options).map(([key, entry]) => {
                const collection = payload[key];
                const check = (obj, dflt) => {
                    const { roles = [], requireAll = false } = obj;
                    const collectionIncludesRole = role => collection.includes(role);
                    const collectionMatches =
                        roles.length === 0
                            ? dflt
                            : requireAll
                            ? roles.every(collectionIncludesRole)
                            : roles.some(collectionIncludesRole);
                    return collectionMatches;
                };

                const rule = Array.isArray(entry) ? { permitted: { roles: entry, requireAll: true } } : entry;
                const { permitted = {}, denied = {} } = rule;
                const userHasPermittedRoles = check(permitted, true),
                    userHasDeniedRoles = check(denied, false),
                    passed = userHasPermittedRoles && !userHasDeniedRoles;
                // console.log(
                //     `permittedRoles ${userHasPermittedRoles}, deniedRoles ${userHasDeniedRoles}, overall ${passed}`
                // );
                return passed;
            });
            // console.log("additional check results", results);
            return results.every(Boolean);
        };

        const gotOptions = options && typeof options === "object";
        const everythingChecksOut = gotOptions ? checkAdditionalProperties(options) : true;

        if (everythingChecksOut) {
            context.user = payload;
            return fn(context, ...args);
        } else context.res = { status: 403 };
    }
};
