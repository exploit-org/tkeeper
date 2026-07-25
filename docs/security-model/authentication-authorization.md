# Authentication and Authorization

External requests are authenticated before controller logic runs. Authorization is permission-string based and enforced before key material participates in the operation.

## Authentication modes

| Type | Header | Use |
| --- | --- | --- |
| `dev` | `X-DEV-TOKEN` | local development only |
| `jwt` | `X-JWT-TOKEN` | production deployments |

Do not use developer authentication in production.

## Developer authentication

Developer auth loads a separate config file from `keeper.dev.config.location`.
Its implementation lives in the optional `auth-dev` feature and is absent from normal production artifacts, including builds made with `keeper.features=all`.

Example:

```hocon
keeper.dev {
  token = "dev-token"
  permissions = [
    "tkeeper.system.init",
    "tkeeper.system.unseal",
    "tkeeper.dkg.create",
    "tkeeper.key.*.public",
    "tkeeper.key.*.sign",
    "tkeeper.key.*.verify"
  ]
}
```

Build it only into local or test artifacts:

```bash
./gradlew :build -Pkeeper.features=auth-dev -Pkeeper.platforms=ecc
```

Then enable it at runtime:

```bash
-Dkeeper.dev.enabled=true
-Dkeeper.dev.config.location=/etc/tkeeper
```

## JWT authentication

JWT auth verifies token signature and claims against configured issuer metadata.

```hocon
auth {
  type = "jwt"

  jwt {
    jwks-location = "https://issuer.example/.well-known/jwks.json"
    issuer = "https://issuer.example"
    audience = "tkeeper"
    refresh = 15m
    clock-skew = 15s
  }
}
```

Tokens must contain:

- `sub`
- `aud`
- `exp`
- `permissions` as a string list claim

If `auth.jwt.issuer` is configured, `iss` must match it. Configure issuer in production.

`aud` may be a single value or an array. TKeeper checks that it contains `auth.jwt.audience`.

`nbf` is optional. When present, TKeeper rejects the token before that time.

## Permission model

Permissions are explicit strings:

```text
tkeeper.key.{keyId}.sign
tkeeper.key.{keyId}.verify
tkeeper.key.{keyId}.public
```

Wildcards are supported:

```text
tkeeper.key.*.sign
tkeeper.key.prefix-*.sign
tkeeper.key.*.*
```

Wildcards match dot-separated permission segments. `tkeeper.key.*.sign` matches `tkeeper.key.wallet.sign`, but not `tkeeper.key.team.wallet.sign`.

Negative permissions remove access granted by a broader permission:

```text
tkeeper.key.*.sign
-tkeeper.key.hot-wallet.sign
```

This grants signing on all one-segment key ids except `hot-wallet`.

## Permission groups

| Permission | Allows |
| --- | --- |
| `tkeeper.system.init` | initialize keeper |
| `tkeeper.system.unseal` | unseal |
| `tkeeper.system.seal` | seal |
| `tkeeper.dkg.create` | create key identity |
| `tkeeper.dkg.rotate` | rotate key identity |
| `tkeeper.dkg.refresh` | refresh generation |
| `tkeeper.key.{keyId}.public` | read public key |
| `tkeeper.key.{keyId}.sign` | sign |
| `tkeeper.key.{keyId}.verify` | verify |
| `tkeeper.key.{keyId}.encrypt` | ECIES encrypt |
| `tkeeper.key.{keyId}.decrypt` | ECIES decrypt |
| `tkeeper.key.{keyId}.destroy` | destroy key generation |
| `tkeeper.storage.write` | trusted-dealer import |
| `tkeeper.consistency.fix` | run consistency fix |
| `tkeeper.expired.view` | read key-expiration indexes |
| `tkeeper.integrity.rotate` | rotate audit integrity key |
| `tkeeper.audit.log.verify` | verify signed audit log lines |
| `tkeeper.compliance.inventory` | read asset inventory |
| `tkeeper.quorum.promote` | promote mono to threshold |
| `tkeeper.control.system` | read control-plane system state |
| `tkeeper.control.sinks` | read control-plane audit sink state |

Keep destructive and lifecycle permissions narrower than signing permissions.

## Internal peer authentication

Peer-to-peer calls use TKeeper's internal request signing. This is separate from public API authentication.

Each internal request carries:

```text
X-INSTANCE-ID
X-INTENDED-FOR
X-TIMESTAMP
X-NONCE
X-KEY-ID
X-PUBLIC-KEY
X-BOOT-PROOF
X-SIGNATURE
```

The request signature binds the HTTP method, path, canonical query, body hash, intended peer, timestamp, nonce, boot proof, and any forwarded actor token. The nonce must be unique and the timestamp must be fresh.

The external JWT or dev token is forwarded only on internal operation entrypoints that independently enforce actor permissions, such as signing or DKG initialization, trusted-dealer import, destroy prepare, and consistency mutations. Protocol rounds and marker-bound commit or abort calls use peer authentication and existing session state without repeatedly forwarding the actor credential.

On first contact, a peer proves its integrity key with the shared bootstrap token. After that, the integrity key is pinned for the lifetime of the process. If `keeper.peers[].tls-spki-sha256` is configured, TKeeper first verifies that the mTLS client certificate matches the claimed peer id; this removes network-first bootstrap enrollment from the trust decision.

Authenticated internal responses carry the peer identity, request hash and nonce, response timestamp, body hash, boot proof, and `X-RESPONSE-SIGNATURE`. The caller verifies the raw status, content type, and body before completing the response future used by protocol code. Unsigned, replayed, cross-peer, or request-substituted responses are rejected.

Protected internal routes require TLS outside dev mode. Mutual TLS with per-peer SPKI binding authenticates the transport peer; signed requests and responses separately bind protocol content and session intent.

Protect the bootstrap token as cluster enrollment authority. Without mTLS SPKI binding, an attacker that can reach an unenrolled peer and knows the token may be able to pin an attacker-controlled peer identity before the legitimate peer connects.

Forwarded bearer credentials remain visible to a malicious recipient peer. Use short-lived tokens, restrict protected internal paths, and enable internal mTLS. Sender-constrained external credentials require deployment-specific mTLS, DPoP, or request-signing support and are not inferred from an ordinary bearer token.

## Common failures

### `UNAUTHENTICATED`

The token is missing, invalid, expired, has the wrong issuer or audience, or is signed by a key not present in JWKS.

### `ACCESS_DENIED`

The token is valid, but the `permissions` claim does not allow the operation. Check negative permissions too; a matching negative permission wins over a broad grant.
