# Signing

Signing is where a key identity produces proof. TKeeper signs only after the command is accepted by the key's authorities and any configured policy, audit, lifecycle, and quorum controls.

## Endpoints

```http
POST /v2/keeper/sign
POST /v2/keeper/sign/verify
```

Required permissions:

```text
tkeeper.key.{keyId}.sign
tkeeper.key.{keyId}.verify
```

## Signing flow

```text
command
-> authority match
-> intent materialization
-> policy and key controls
-> audit gate
-> mono or threshold signing
-> signature proof
```

For `arbitrary`, TKeeper signs bytes after checking the key identity allows `arbitrary`.

For concrete authorities, TKeeper loads the authority document, materializes the command into an intent, extracts effects where supported, evaluates policy, and signs only when the final decision is `ALLOW`.

## Quorum modes

| Mode | Behavior |
| --- | --- |
| `mono` | signs locally with full key material after controls pass |
| `threshold` | coordinator starts a threshold protocol; private key is not reconstructed |

Threshold signing protocols:

| Scheme | Threshold protocol |
| --- | --- |
| `ECDSA` | GG20 |
| `EdDSA` | FROST |
| `SCHNORR` | FROST |
| `BIP340` | FROST |
| `TAPROOT` | FROST |
| `MLDSA` | threshold ML-DSA |

## Commands

Arbitrary command:

```json
{
  "keyId": "demo-identity",
  "command": {
    "type": "arbitrary",
    "authorityId": "arbitrary",
    "artifact": {
      "scheme": "ECDSA",
      "hash": "SHA256",
      "data64": "aGVsbG8="
    }
  }
}
```

Typed command:

```json
{
  "keyId": "payments-key",
  "command": {
    "type": "custom",
    "authorityId": "payments-small",
    "artifact": {
      "scheme": "ECDSA",
      "hash": "SHA256",
      "typed": {
        "amount": 100,
        "currency": "USD"
      }
    }
  }
}
```

EVM command:

```json
{
  "keyId": "evm-key",
  "command": {
    "type": "evm.transaction",
    "authorityId": "evm-mainnet-erc20-usdc",
    "artifact": {
      "message64": "..."
    }
  }
}
```

Bitcoin and X.509 commands follow the authority type selected by their feature modules.

## Schemes and algorithms

| Scheme | Mono | Threshold | Algorithms |
| --- | --- | --- | --- |
| `ECDSA` | local ECDSA | GG20 | `SECP256K1`, `P256` |
| `SCHNORR` | not supported | FROST | `SECP256K1`, `P256` |
| `BIP340` | local BIP340 | FROST | `SECP256K1` |
| `TAPROOT` | local Taproot key-path | FROST | `SECP256K1` |
| `EdDSA` | local EdDSA | FROST | `ED25519` |
| `MLDSA` | local ML-DSA | threshold ML-DSA | `MLDSA44`, `MLDSA65`, `MLDSA87` |

Hash methods:

| Hash | Meaning |
| --- | --- |
| `NONE` | sign bytes as-is |
| `SHA256` | hash before signing |
| `SHA512` | hash before signing |
| `KECCAK256` | hash before signing |

The command artifact decides the scheme and hash. The top-level sign request does not carry `hash` or `algorithm`.

## Response

```json
{
  "type": "ECDSA",
  "signature64": "...",
  "generation": 1,
  "imposters": []
}
```

`imposters` is meaningful for threshold protocols. Mono signatures return an empty list.

Verify response:

```json
{ "valid": true }
```

`generation` is optional on verify. If omitted, TKeeper uses the active generation.

## ML-DSA availability

Threshold ML-DSA uses probabilistic rejection sampling. A complete attempt can abort even when peers are healthy. TKeeper retries with fresh session state up to:

```text
keeper.session.mldsa.max-rounds
```

The default is `12`. Exhaustion returns `SESSION_MAX_ROUNDS_EXCEEDED`; treat it as availability first, not proof of corruption.

## Downstream verification

The downstream system should verify that the proof matches the exact command it is about to execute and the identity it intended to trust.

Signature validity alone is insufficient. The acceptance contract should cover:

- expected key identity or public key
- canonical command and every field that changes the effect
- authority, generation, and tweak context required by the integration
- environment or domain separation between test and production
- nonce, expiry, sequence, or idempotency where replay matters

If context is enforced outside the signed payload, the verifier must reject mismatches before execution. For `arbitrary`, TKeeper governs only the supplied bytes; it cannot infer omitted business context.

## Common failures

### Verify returns false

Check that `command`, `tweak`, `generation`, and `signature64` match the original sign request. For arbitrary commands, also check `hash` and `scheme` inside the command artifact.

### Authority rejects the command

`AUTHORITY_VIOLATION` means the command selected an authority that is not attached to the key. `INVALID_AUTHORITY_ARTIFACT` means the command shape does not match the selected authority or its feature is absent. `POLICY_VIOLATION` means the materialized intent was understood but policy returned `DENY`.

### No manager for scheme and algorithm

The key algorithm or quorum mode does not support the requested signature scheme.
