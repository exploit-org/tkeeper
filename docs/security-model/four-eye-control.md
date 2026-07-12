# Four Eye Control

Four-eye control is a key policy. It requires `m` distinct approver signatures from `n` configured approver keys before TKeeper continues.

## Policy shape

```json
{
  "fourEye": {
    "mode": "STRICT",
    "m": 2,
    "n": 3,
    "keys": [
      {
        "algorithm": "SECP256K1",
        "publicKey64": "..."
      },
      {
        "algorithm": "P256",
        "publicKey64": "..."
      },
      {
        "algorithm": "ED25519",
        "publicKey64": "..."
      }
    ]
  }
}
```

Rules:

- `mode` is `STRICT` or `LENIENT`; omitted values default to `STRICT`
- `m` must be at least `2`
- `m` cannot be greater than `n`
- `keys.size` must equal `n`
- duplicate approver keys are rejected
- approver public keys must decode under the declared algorithm
- supported approver algorithms are `SECP256K1`, `P256`, and `ED25519`

`STRICT` preserves the original behavior: approvals are required for every operation protected by the key policy, including signing, decrypting, rotating, refreshing, and destroying a generation.

`LENIENT` requires approvals only for `ROTATE` and `REFRESH`. Signing, decrypting, destroying, and other operations do not use this four-eye policy. Authentication, permissions, authority policies, and audit checks still apply.

## Approval model

Approvers sign a hash of the exact operation body. TKeeper verifies the submitted proofs before continuing to signing, DKG, destroy, or decrypt.

Approval payload:

```json
{
  "approvals": {
    "keeperId": 1,
    "nonce": "unique-nonce",
    "timestamp": 1760000000000,
    "proofs": [
      {
        "fingerprint": "...",
        "signature64": "..."
      }
    ]
  }
}
```

The nonce is one-time. The timestamp must not be in the future and must fit `keeper.approval.ttl`.

The coordinator peer id in `approvals.keeperId` must match the peer coordinating the operation.

## Signature algorithms

| Approver key | Approval signature |
| --- | --- |
| `SECP256K1` | ECDSA |
| `P256` | ECDSA |
| `ED25519` | EdDSA |

The approver fingerprint is:

```text
base64(sha256(encoded-public-key))
```

## Canonical approval hash

TKeeper uses canonical JSON for approval hashes.

Canonicalization rules for SDKs and non-Java clients:

- serialize compact UTF-8 JSON with no insignificant whitespace
- omit fields whose value is `null`
- sort JSON object field names lexicographically at every object level
- sort map entries by key
- preserve JSON array element order exactly as supplied
- apply the same object-field sorting to objects inside arrays
- keep string values byte-exact, including base64 strings, enum names, nonce, and tweak

Do not sort arrays globally. Arrays are ordered data.

The approval hash is:

```text
sha256(canonical-json-bytes)
```

Approvers sign that 32-byte hash. `approvals.proofs` is not part of the hash.

## Signed fields

| Operation | Fields |
| --- | --- |
| DKG | `keeperId`, `keyId`, `algorithm`, `authorities`, `mode`, optional `policy`, optional `assetOwner`, `nonce`, `timestamp` |
| Sign | `keeperId`, `keyId`, `command`, optional `tweak`, `nonce`, `timestamp` |
| ECIES decrypt | `keeperId`, `keyId`, optional `generation`, `algorithm`, `ciphertext64`, optional `tweak`, `nonce`, `timestamp` |
| Destroy | `keeperId`, `keyId`, `generation`, `nonce`, `timestamp` |

The table describes logical fields, not serialization order. Serialization order is defined by canonicalization.

## Security notes

- Four-eye approvals do not replace TKeeper authentication or permissions.
- Approver keys should be stored separately from TKeeper peers.
- Any change to the approved request body requires new approvals.
- Approval signatures are only as trustworthy as approver key custody.
- Approval tooling should render the canonical operation from the signed fields. A trusted human summary that is not bound to the approval hash can mislead the approver.
- Nonce uniqueness prevents approval reuse inside TKeeper; downstream replay rules are still required for the resulting cryptographic proof.

## Common failures

### Approvals fail after changing the request

Create a new approval for the exact request body.

### Duplicate approver keys fail

`n` is the number of distinct approvers.

### Approval nonce is rejected on second use

Approval nonces are one-time.
