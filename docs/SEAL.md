# Seal & Unseal

TKeeper encrypts and stores the local private key share using one of the supported seal mechanisms.  
The behavior depends on the selected `seal.type` in configuration.

---

## Default Behavior

On startup, TKeeper attempts to automatically unseal the local key share.

- If `seal.type = aws` or `google`: **unseal is automatic**
- If `seal.type = shamir`: **manual unseal is required**, and signing operations are locked until it is completed. Better for full access and vendor lock-in prevention.

---

## Supported Seal Types

### `shamir`

- Key share is encrypted and split into multiple sealed shares
- Manual unsealing is required after startup
- Shares are generated during `/init` and must be submitted to the node

### `aws`

- Share is encrypted using AWS KMS
- TKeeper decrypts it automatically on startup
- No manual input is required

### `google`

- Share is encrypted using Google Cloud KMS
- TKeeper uses ADC to decrypt at startup
- No manual action is required

More on sealing configuration: see [config.md](config.md)

---

## Manual Unseal (`shamir` only)

When `seal.type = shamir`, the key share must be reconstructed from multiple sealed shares.  
This process can be interactive (one share per peer) or done all at once (e.g. in single-operator setups).

### Endpoint

**POST** `/v1/keeper/system/unseal`

### Request body

```json
{
  "payload64": "<index>:<sealed_share>:<salt>",
  "payloads64": [
    "<index>:<sealed_share>:<salt>",
    ...
  ],
  "reset": false
}
```

- `payload64`: a single share (optional)
- `payloads64`: multiple shares (optional)
- `reset`: if `true`, clears previous progress and starts from scratch

At least one of `payload64` or `payloads64` must be provided.

You may:
- Submit one share at a time (`payload64`)
- Submit multiple at once (`payloads64`)
- Or both

> One peer can provide all shares, but this breaks the purpose of threshold trust and should be used only for testing or solo setups.

### Response

```json
{
  "threshold": 3,
  "total": 5,
  "progress": 2,
  "ready": false
}
```

#### Fields

- `threshold`: required number of shares to unlock the key
- `total`: number of total configured shares
- `progress`: how many valid shares have been submitted so far
- `ready`: becomes `true` when the threshold is reached and the key is successfully reconstructed

Once `ready: true`, the node becomes operational and can sign requests.

---

## Security Note

- All sealed key material is encrypted before disk storage
- Decrypted shares live only in locked (mlock’ed) memory
- Unsealing must be repeated after every application restart (for `shamir`)