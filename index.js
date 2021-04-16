const { verify } = require("jsonwebtoken");
const { promisify } = require("util");
const { readFile, writeFile } = require("fs/promises");
const { resolve } = require("path");
const got = require("got");
const { attemptPromise } = require("@jfdi/attempt");
const verifyJwt = promisify(verify);

const getKeyFromFile = async () => readFile(keyFilePath);
const ensureTrailingSlash = x => ((x || "").slice(-1) !== "/" ? x + "/" : x);

const KEY_FILE = "publicKey.pem",
    keyFilePath = resolve(__dirname, KEY_FILE),
    { audience, domain, debug } = process.env,
    issuer = ensureTrailingSlash(domain),
    options = {
        audience,
        issuer
    };

module.exports = fn => async (context, ...args) => {
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

    const getJwt = req => req.headers.authorization.slice(7); // all headers have been lowercased before we get them!

    const key = await getKey();
    const jwt = getJwt(context.req);

    log("Verifying JWT...");
    const [e, payload] = await attemptPromise(() => verifyJwt(jwt, key, options));

    if (e) {
        context.log(e.message);
        context.res = { status: 401 };
    } else {
        context.user = payload;
        return fn(context, ...args);
    }
};
