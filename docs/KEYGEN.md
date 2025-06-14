# Distributed Key Generation (DKG)

TKeeper supports distributed key generation (DKG) via `/v1/keeper/dkg/generate`.  
This process creates a shared private key without ever assembling it in one place. Each peer receives only its individual share, and the public key is derived collectively.

---

## Endpoint

**POST** `/v1/keeper/dkg/generate`

### Request Body

```json
{
  "keyId": "my-key-id",
  "curve": "SECP256K1",
  "overwrite": false,
  "refresh": false
}
```

### Parameters

- `keyId`: unique name for the key
- `curve`: elliptic curve to use (`SECP256K1` or `ED25519`)
- `overwrite`: allows replacing an existing key (requires permission `tkeeper.dkg.generate.overwrite` For permission details, see [auth.md](auth.md).)
- `refresh`: triggers re-randomization of shares without changing the public key (see [Share Refreshing](#share-refreshing))

---

## Supported Curves

- `SECP256K1` – used in Bitcoin, Ethereum, and many blockchain applications
- `ED25519` – fast and compact; used in Solana, TON, and modern cryptographic systems

---

## Requirements

- **All participating nodes must be online** during key generation
- Key material is split among participants using verifiable secret sharing
- No node can reconstruct the full key on its own

---

## How It Works

The DKG mechanism is based on **Shamir's Secret Sharing** combined with **elliptic curve commitments** for verifiability.

Each node:

1. Generates a random polynomial of degree `threshold - 1`.
2. Uses this polynomial to compute:
    - **Commitments**: public curve points proving the correctness of each coefficient.
    - **Shares**: private values intended for other nodes.
3. Broadcasts its commitments to all participants.
4. Sends the corresponding share privately to each node.

Each recipient:

- Verifies the received share against the sender's commitments.
- Aggregates all valid shares (one from each peer) to compute its **final key share**.

Once the process completes, all nodes hold a unique share of the same private key, and the public key is collectively derived from the commitments.

> No node ever knows the full secret. The key is implicitly defined by the sum of all valid shares.

---

## Share Refreshing

Enabling `refresh: true` triggers **re-randomization** of the shares, without changing the actual key.

- Used for operational security (e.g., periodic rotation)
- Produces new shares using the same public key
- All nodes must be online for refreshing to succeed

This is useful for:
- Replacing compromised or lost shares
- Strengthening resilience by refreshing the distribution