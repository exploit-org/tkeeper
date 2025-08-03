# Encrypting / Decrypting with ECIES

TKeeper provides threshold ECIES encryption/decryption.
Encryption is done with the public key and is stateless; decryption is MPC-based — the private key is never reconstructed.

## Supported curves
Currently only Weierstrass curves are supported (e.g `SECP256K1`) to be used for ECIES.

## Supported ciphers
- `AES_GCM`: AES-256 in Galois/Counter Mode (GCM)

## API

### Encryption
#### Endpoint
**POST** `/v1/keeper/ecies/encrypt`
```json
{
  "keyId": "my-key-id",
  "cipher": "AES_GCM",
  "plaintext64": "base64-encoded data"
}
```

Sample response:
```json
{
  "ciphertext64": "base64-encoded-ciphertext"
}
```

### Decryption
#### Endpoint
**POST** `/v1/keeper/ecies/decrypt`
```json
{
  "keyId": "my-key-id",
  "cipher": "AES_GCM",
  "ciphertext64": "base64-encoded-ciphertext"
}
```
Sample response:
```json
{
  "plaintext64": "base64-encoded-plaintext"
}
```