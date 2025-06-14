# TKeeper API

This document describes all public REST endpoints exposed by TKeeper.  
Each endpoint enforces permission checks (see [auth.md](auth.md)) and assumes that the node is unsealed and ready, unless stated otherwise.

---

## Base Path

```
/v1/keeper
```

---

## 1. System Control

### `POST /system/init`

Initializes TKeeper with the peer ID, threshold, and total number of nodes.

- See: [init.md](init.md)

### `PUT /system/unseal`

Submits one or more Shamir shares to reconstruct the local key share (manual unseal).  
Returns unsealing progress.

- See: [seal.md](seal.md)

### `PUT /system/seal`

Seals the local key share, removing it from memory.  
Used to force the node back into a locked state.

- Permissions: `tkeeper.system.seal`

### `GET /system/status`

Returns current sealing status.

```json
{
  "sealedBy": "shamir | aws | google",
  "state": "UNINITIALIZED | SEALED | UNSEALED",
  "progress": {
    "threshold": 3,
    "total": 5,
    "progress": 2,
    "ready": false
  }
}
```

---

## 2. Key Generation

### `POST /dkg/generate`

Triggers distributed key generation (or key share refreshing).

- Request body: see [keygen.md](keygen.md)
- Supports:
    - `overwrite: true` (requires `tkeeper.dkg.generate.overwrite`)
    - `refresh: true` for share refreshing
- Requires all peers to be online

---

## 3. Signatures

### `POST /sign`

Performs threshold signing using the specified key and MPC scheme.

- Supports:
    - `GG20` (1 operation max)
    - `FROST` (multiple operations allowed)
- See: [sign.md](sign.md)

### `POST /sign/verify`

Verifies a signature against a public key.

- See: [sign.md](sign.md)

---

## 4. Public Interface

### `GET /publicKey?keyId=...`

Returns the public key for the given key ID.

```json
{
  "data64": "base64-encoded public key"
}
```

- Requires: `tkeeper.key.{keyId}.public`

### `GET /peerId`

Returns the current node’s `peerId`.

```json
{
  "serviceId": 2,
  "result": 2
}
```

### `GET /ping`

Returns basic readiness status:

```json
{
  "ready": true
}
```

- `true`: node is initialized and unsealed

---

## 5. Integrity

### `POST /integrity/regen`

Regenerates the internal integrity key used to authenticate internal peer-to-peer messages.  
Used for re-keying or recovery.

- Permission: `tkeeper.integrity.regen`

---

## 6. Storage (Trusted Dealer)

### `POST /storage/store`

Injects a full private key into the system. The current node acts as a **trusted dealer**, splits the key into Shamir shares, and distributes them to all online peers.

- All nodes must be online during this operation
- Each peer receives and stores only its own share
- See: [store.md](store.md)
- Permission: `tkeeper.storage.write`

### `DELETE /storage/delete?keyId=...`

Deletes the distributed key from **all peers**. The initiating node contacts every participant and removes the stored share.

- All nodes must be online
- If any peer is unreachable, the operation fails
- Permission: `tkeeper.storage.delete`

---

## Permissions Overview

Each endpoint requires a specific permission token.  
For the full list and structure, refer to [auth.md](auth.md).
