# Signatures

TKeeper provides threshold-based digital signatures using secure multiparty computation (MPC).  
Each operation is distributed — no full private key is ever reconstructed on any node.

---

## Supported Signature Schemes

| Session Type | Curve       | Signature Algorithm |
|--------------|-------------|---------------------|
| `GG20`       | `SECP256K1` | `ECDSA`             |
| `FROST`      | `SECP256K1` | `SCHNORR`           |
| `FROST`      | `ED25519`   | `SCHNORR`           |

- Signature type is determined based on `sessionType` + `curve`
- You may override the type for verification explicitly using `sigType`

---

## Authorization

Signing and verification require fine-grained permissions.

### Required Permissions

| Action     | Permission                             |
|------------|----------------------------------------|
| Sign       | `tkeeper.key.{keyId}.sign`             |
| Verify     | `tkeeper.key.{keyId}.verify`           |
| Public Key | `tkeeper.key.{keyId}.public` (if used) |

See [auth.md](auth.md) for full permission list and structure.

---

## Signing

### Endpoint

**POST** `/v1/keeper/sign`

Performs a threshold signature over one or more messages.

#### Request Body

```json
{
  "keyId": "my-key-id",
  "curve": "SECP256K1",
  "type": "GG20",
  "operations": {
    "message1": "base64-encoded data",
    "message2": "base64-encoded data"
  }
}
```

#### Fields

- `keyId`: identifier of the key to sign with
- `curve`: elliptic curve (`SECP256K1` or `ED25519`)
- `type`: session type (`GG20` or `FROST`)
- `operations`: map of operation ID → base64-encoded message

#### Constraints

- For `GG20`: only one operation is allowed
- For `FROST`: multiple operations are supported in a single request

> This reflects the protocol behavior: GG20 is round-heavy and supports only one message per session.

---

## Verification

### Endpoint

**POST** `/v1/keeper/sign/verify`

Verifies a signature against a key.

#### Request Body

```json
{
  "sigType": "SCHNORR",
  "curve": "SECP256K1",
  "keyId": "my-key-id",
  "data64": "base64-encoded message",
  "signature64": "base64-encoded signature"
}
```

#### Fields

- `sigType`: optional; can be `ECDSA` or `SCHNORR`
- `curve`: elliptic curve used
- `keyId`: key to verify against
- `data64`: base64-encoded original message
- `signature64`: base64-encoded signature

If `sigType` is not provided, it falls back to:

- `SECP256K1` → `ECDSA`
- `ED25519` → `SCHNORR`

#### Response

```json
{
  "valid": true
}
```

---

## Signature Response Format

### Signature Result (`/sign`)

```json
{
  "code": "SUCCESS",
  "signature": {
    "message1": "base64-encoded signature",
    "message2": "base64-encoded signature"
  }
}
```

- `code`: `SUCCESS` or `FAILED`
- `signature`: map of operation ID → base64-encoded signature

Each operation ID matches the one used in the `operations` field of the request.

> `GG20` always returns a single operation.

---

## Signature Encoding

All signatures are raw byte arrays, base64-encoded.

### ECDSA (via GG20)

- Format: `r || s || recId`
- Size: 65 bytes
    - `r`: 32 bytes
    - `s`: 32 bytes
    - `recId`: 1 byte (0–3)

> ⚠ Not DER-encoded. This is the uncompressed ECDSA format with recovery ID, commonly used in Ethereum.

### SCHNORR (via FROST)

- Format: `r || s`
- Size: 64 bytes
    - `r`: 32 bytes
    - `s`: 32 bytes

Standard Schnorr signature format (e.g., BIP-340 / EdDSA compatible).