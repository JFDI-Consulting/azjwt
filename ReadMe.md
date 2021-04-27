# An easy to use JWT verifier/decoder for authorisation in Azure Functions

## JWT verification in just 1.5 lines of code

### Intro

Consuming an Azure Function-based API, you might want to use an authN/authZ provider like Auth0. In this case the function app will be sent a JWT (JSON Web Token) access token in the Authorization header. Verifying the token can be a right old pain, often involving more code than the actual purpose of the function. That's why this library was born.

### Usage

The library exports a single function. _This function is not for use inside your code and does not by itself decode a JWT._ Rather, the function takes your async function, wraps it in a higher order function that performs the JWT validation & decoding, and returns you that new function that you can export from your module to the function host.

Hence, a function that starts off looking like this before JWT validation:

```javascript
module.exports = async (context, req) => {
    context.res = { body: "I don't know who the heck called me!" };
};
```

looks like this after it's been converted to validate JWTs:

```javascript
const verifyJwt = require("@jfdi/azjwt");

module.exports = verifyJwt(async (context, req) => {
    const { user } = context;
    context.res = { body: user };
});
```

In other words, the verification wrapper takes care of:

-   verification against `issuer` and `audience` claims
-   responding with a 401 unauthorised if the token isn't valid
-   and returns the decoded JWT contents to you as `context.user`.

Simples.

If you're using Auth0 RBAC, you'll get the user's role permissions in the `permissions` key of `context.user`.

Your decoded JWT will look something like this (details changed to protect the innocent):

```json
{
    "iss": "https://tenant.eu.auth0.com/",
    "sub": "iojudnfjodsfjdgkjbndkjgbkjfdgnkj",
    "aud": ["https://api.api.api"],
    "iat": 1618569192,
    "exp": 1618655592,
    "azp": "njoddjnhgjfkjgn",
    "scope": "openid profile email",
    "permissions": ["customers:list", "customer:read", "customer:edit", "customer:delete"]
}
```

### Checking Additional JWT Properties

Sommetimes additional properties are encoded into the JWT by the issuer. Auth0 does this, for example, as part of its RBAC (Role-Based Access Control) features for APIs. If a user has roles assignes, they're included in the token in a `permissions` property. You can specify additional properties to check against criteria in a second object parameter passed to the function. This object can have one of two syntaxes, shortform and longform. Here's the shortform...

```javascript
module.exports = verifyJwt(
    async (context, req) => {
        const { user } = context;
        context.res = { body: user };
    },
    {
        permissions: ["customer:create"]
    }
);
```

and here's the more versatile longform, providing for denied roles and all/some matching:

```javascript
module.exports = verifyJwt(
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
);
```

These are demonstrated in the included example.

### Prerequisites

You'll need to specify a couple of application settings for the library to pick up at runtime, or it simply won't work.

`domain` is the issuer, e.g. `https://<tenancy>.eu.auth0.com/`, which is also used to fetch the public key

`audience` is the audience expected for users of this API. In Auth0 this generally looks like a url, although it's just an ID and never actually hit as an endpoint, e.g. `https://api.myapp.io`

`debug` is an optional flag that can be set to anything truthy to turn on extra runtime context logging

There's a `local.settings.sample.json` file included to remind you what the library needs.

## Installation

Insert `@jfdi/azjwt` in your `package.json` dependencies, or

`npm i @jfdi/azjwt`
