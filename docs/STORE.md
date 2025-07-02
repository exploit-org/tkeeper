# Manual Key Injection (Trusted Dealer Mode)

TKeeper provides a controlled fallback mechanism to inject a full private key into the network.  
This is done by submitting the complete key to **one trusted node**, which splits the key and distributes shares to all online participants.

> ⚠ This bypasses the cryptographic guarantees of DKG.  
> Use only in tightly controlled environments or recovery scenarios.

---

## Endpoint: Store

**POST** `/v1/keeper/storage/store`

Called on a **single node** designated as a **trusted dealer**.  
That node must be able to reach all other TKeeper peers.

### Request Body

```json
{
  "keyId": "my-key-id",
  "curve": "SECP256K1",
  "value64": "base64-encoded full private key"
}
```

#### Fields

- `keyId`: identifier for the key being injected
- `curve`: `SECP256K1` or `ED25519`
- `value64`: base64-encoded full private key value (e.g., 32-byte seed)

### What Happens Internally

1. The node decodes the key and validates it.
2. It performs **Shamir Secret Sharing** using the configured `threshold` and `total`.
3. It sends each share to the corresponding peer based on their `peerId`.
4. Each node saves **only its own share**, encrypted via the configured seal mechanism.
5. If any node is offline or unreachable, the process fails.

> All nodes must be online during this process.

### Permission Required

- `tkeeper.storage.write`

---

## Endpoint: Delete

**DELETE** `/v1/keeper/storage/delete?keyId=...`

Removes the sealed key from local storage.

- Permission: `tkeeper.storage.delete`

---

## Ed25519 Note

For Ed25519, the `value64` must contain the original 32-byte **seed**,  
**not** a clamped or expanded private key.

> Clamping and public key derivation are handled internally after the share is stored.

---

## Use Cases

Trusted dealer mode may be useful in:

- Migrating keys from external HSMs or custodians
- Deploying deterministic test keys
- Recovery operations where the original key is known

However, this mode **removes the trust separation** provided by MPC.  
Only use it when distributed key generation (DKG) is not an option.