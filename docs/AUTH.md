# Authorization

TKeeper uses JWT (JSON Web Tokens) for authorization.  
Currently, only asymmetric algorithms (`RS256`, `ES256`, etc.) are supported, verified via JWKS.

---

## Configuration

Authorization is configured under `keeper.auth`:

```yaml
keeper:
  auth:
    type: jwt
    allowAnonymous: false

    jwt:
      jwks-location: "https://example.com/.well-known/jwks.json"
      refresh: 5m
```

- `type`: must be set to `jwt`
- `allowAnonymous`: allows unauthenticated access when `true` (not recommended for production)
- `jwt.jwks-location`: required URL to the JWKS (RFC 7517) endpoint
- `jwt.refresh`: optional interval for JWKS refresh (default is no periodic reload)

---

## Supported Algorithms

TKeeper supports the following algorithms for JWT verification:

- `RS256`
- `ES256`, `ES384`, etc. (ECDSA over P-256/P-384)

Symmetric algorithms like `HS256` are **not supported**.

The JWKS must follow the standard structure and include public keys. Example snippet:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "-pdv2XRHAWpYVZ3Ao-gS3",
      "n": "...",
      "e": "...",
      "x5c": ["..."],
      "x5t": "..."
    }
  ]
}
```

TKeeper selects the key for verification based on the `kid` header field.

---

## JWT Structure

### Header

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "-pdv2XRHAWpYVZ3Ao-gS3"
}
```

- `alg`: must match supported algorithms (e.g., `RS256`)
- `kid`: used to match the JWKS key

### Payload

```json
{
  "iss": "issuer",
  "sub": "subject",
  "aud": "audience",
  "iat": 1749586417,
  "exp": 1749672817,
  "permissions": [
    "tkeeper.key.my-key-id.sign",
    "tkeeper.key.another-key-id.sign",
    "tkeeper.key.my-key-id.verify",
    "tkeeper.key.my-key-id.public"
  ]
}
```

- `permissions` is **required** and must list allowed operations

---

## Supported Permissions

| Permission                       | Description                        |
|----------------------------------|------------------------------------|
| `tkeeper.key.<keyId>.public`     | Access public key for given key ID |
| `tkeeper.key.<keyId>.sign`       | Perform signature using key ID     |
| `tkeeper.key.<keyId>.verify`     | Verify signature using key ID      |
| `tkeeper.system.unseal`          | Submit unseal payloads             |
| `tkeeper.system.seal`            | Seal the storage                   |
| `tkeeper.system.init`            | Perform system initialization      |
| `tkeeper.system.status`          | View system-level status           |
| `tkeeper.storage.write`          | Persist new key manually           |
| `tkeeper.storage.delete`         | Delete key from all instances      |
| `tkeeper.dkg.generate`           | Generate key                       |
| `tkeeper.dkg.generate.overwrite` | Allow overwrite on key generation  |
| `tkeeper.integrity.regen`        | Recalculate keeper integrity keys  |

> Permission checks are strict. If a required permission is missing, the request will be denied.

> To give access to all group permissions (e.g all system operations) you can use `*` wildcard. For example: `tkeeper.system.*`

---

## Notes

- Only tokens with valid signature and non-expired timestamps will be accepted
- JWKS keys are cached in memory and refreshed based on the configured interval
- `allowAnonymous = true` can be used in development or isolated environments

> More authentication methods may be supported in future releases.