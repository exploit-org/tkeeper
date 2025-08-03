# Configuration

TKeeper is configured via environment variables or a YAML/JSON configuration file.
YAML configuration file should be placed at `./config/application.yaml`, relatively to 

## Required

- `KEEPER_DATABASE_PATH` – absolute path to the RocksDB database directory. This is required.

## Example YAML Configuration

```yaml
keeper:
  database-path: ${KEEPER_DATABASE_PATH}

  session:
    gg20:
      expire: 15m
    frost:
      expire: 5m

  peers:
    - id: 2
      public-url: 'http://localhost:7072'

  seal:
    type: shamir

    shamir:
      total: 3
      threshold: 2

  auth:
    type: jwt
    allow-anonymous: false

    jwt:
      jwks-location: "https://auth.example.com/.well-known/jwks.json"
      refresh: 5m

  ssl:
    enabled: true
    trust-store-path: /secure/truststore.p12
    trust-store-password: changeit
```

## Session Expiration

- `session.gg20.expire` and `session.frost.expire` control how long GG20 and FROST sessions remain active after the last operation.
- Sessions are automatically cleaned up after inactivity to free memory and ensure stale data is removed.

## Peers

- `peers` define the list of participants (other nodes) in the threshold signing protocol.
- Each peer entry must include:
    - `id`: unique index ≥ 1 assigned during key initialization (Shamir share index).
    - `public-url`: the HTTP endpoint where this peer is reachable.

> Detailed peer setup is covered in the key generation section.

## Seal Configuration

The `seal` block defines how the local key share is encrypted and stored on disk.

> **Only one `type` must be configured.** The `type` value determines which sealing provider is active.

### Available `type` values:

- `shamir`: local sealing using Shamir Secret Sharing.
- `aws`: sealing via AWS KMS.
- `google`: sealing via Google Cloud KMS.

Depending on the selected type, the corresponding sub-section (`shamir`, `aws`, or `google`) must be present.

### shamir

Used for manual sealing with local shares.

```yaml
seal:
  type: shamir
  shamir:
    total: 3
    threshold: 2
```

- `total`: number of shares to split the key into.
- `threshold`: minimum number of shares required to reconstruct the key.

> Manual `unseal` is required at application startup.

### aws

Used to seal and unseal using AWS KMS. Requires the key ARN and region.

```yaml
seal:
  type: aws
  aws:
    key-id: "arn:aws:kms:..."
    region: "eu-west-1"
```

- Authentication uses [default AWS Java SDK credential chain](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/credentials.html), including:
    - Environment variables.
    - IAM roles (e.g., EC2, ECS).
    - AWS config/profile files.

> Unseal is automatic at startup.

### google

Used to seal and unseal using Google Cloud KMS.

```yaml
seal:
  type: google
  google:
    project: "..."
    location: "..."
    key-ring: "..."
    crypto-key: "..."
```

- Authentication uses [Application Default Credentials (ADC)](https://cloud.google.com/docs/authentication/production), supporting:
    - Service accounts.
    - GCE/GKE metadata server.
    - Local credentials file.

> Unseal is automatic at startup.

See [seal.md](seal.md) for more details on sealing and unsealing.

---

## Authentication
Basic authentication settings are defined under the `keeper.auth` block:

```yaml
keeper:
  auth:
    type: jwt
    allowAnonymous: false

    jwt:
      jwks-location: "https://example.com/.well-known/jwks.json"
      refresh: 5m
```

- `type`: authentication provider type. Currently, only `jwt` is supported.
- `allowAnonymous`: whether unauthenticated requests are allowed.
- `jwt.jwks-location`: URL of the JWKS endpoint for public key retrieval.
- `jwt.refresh`: optional refresh interval for reloading the JWKS.

See [auth.md](auth.md) for authentication options and JWT integration.

---

## SSL
Outgoing SSL settings are defined under the `keeper.ssl` block:

```yaml
keeper:
  ssl:
    enabled: true
    trust-store-path: /secure/truststore.p12
    trust-store-password: changeit
```

- `enabled`: whether non-default SSL truststore should be enabled.
- `trust-store-path`: path to PKCS12\JKS truststore file.
- `trust-store-password`: password to truststore file, previously specified in `trust-store-path`.
