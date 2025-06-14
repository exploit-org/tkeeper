# Initialization

Before using TKeeper, the system must be initialized.  
This step sets up the initial key material and assigns the local peer’s identity.

## Endpoint

**POST** `/v1/keeper/system/init`

### Request body

```json
{
  "peerId": 1,
  "threshold": 2,
  "total": 2
}
```

- `peerId`: unique index ≥ 1 — this is the Shamir share index for the local peer
- `threshold`: minimum number of shares required to reconstruct the key
- `total`: total number of shares to generate

This allows flexible configurations like 2-of-3, 3-of-5, etc.

### Response (when `seal.type = shamir`)

```json
{
  "threshold": 3,
  "total": 5,
  "shares64": [
    "AQ==:ALcjf8EK6KChwJlpUZ2NDZCeEIuiNrtSeVNKlaWqx8+P:AQVS75RHWIpzH18ei3r+ZOOTBgEBJYyf9XQ/o5IeskIV",
    "Ag==:ANPzrIWbxIlJhkjJr9jN8zdzt/DisiOgyJCxj2qxWmMc:AQVS75RHWIpzH18ei3r+ZOOTBgEBJYyf9XQ/o5IeskIV",
    "Aw==:DcYTeBIyNBiRwrR92Y/wbxqYGoXPrI34PrzJ4+MXNOE=:AQVS75RHWIpzH18ei3r+ZOOTBgEBJYyf9XQ/o5IeskIV",
    "BA==:b0CTwPzitfUhxWbSlc/O/ri9Co3ab1nzReuMNX1iyQg=:AQVS75RHWIpzH18ei3r+ZOOTBgEBJYyf9XQ/o5IeskIV",
    "BQ==:APMQPcwUfYRsFvHCIpKPKgK7IL/5rN9kxDH+Ms1hit18:AQVS75RHWIpzH18ei3r+ZOOTBgEBJYyf9XQ/o5IeskIV"
  ]
}
```

### Explanation

- `threshold` and `total` reflect the Shamir configuration (NOT KEEPER'S BUT SEAL'S)
- `shares64` is a list of base64-encoded sealed shares in the format:

  ```
  <index_base64>:<sealed_share_base64>:<seal_salt_base64>
  ```

Each share must be securely delivered to its designated peer for unsealing.  
Further instructions for submitting shares are provided in the [SEAL & UNSEAL](seal.md) section.

> If `seal.type = aws` or `google`, this endpoint returns no shares, and no manual unseal is required.