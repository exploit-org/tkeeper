# Trusted Dealer

Trusted dealer imports an existing private key into the current quorum mode.

In mono mode, TKeeper stores the full key material locally and records the matching public side state.

In threshold mode, TKeeper splits the key into peer shares and distributes them to the cluster.

Endpoint:

```http
POST /v2/keeper/storage/store
```

Body:

```json
{
  "keyId": "imported-secp256k1",
  "algorithm": "SECP256K1",
  "value64": "base64-raw-private-key",
  "authorities": [
    { "id": "arbitrary" }
  ]
}
```

`authorities` is a JSON array of key authorities.

`value64` is base64 of the raw private key bytes. For Ed25519, import the standard seed bytes.

Required permission:

```text
tkeeper.storage.write
```

Important details:

- the dealer sees the raw private key
- threshold mode splits the raw key into peer shares
- mono mode stores the raw key locally
- algorithm-specific public side state is stored too: ECC commitments or the aggregate ML-DSA public key
- the imported key can sign and verify like a DKG-created key
- for `ED25519`, import the standard seed, not an expanded private scalar

Response:

```http
200 OK
```

Use trusted dealer only for bringing an existing key into TKeeper. For new keys, prefer DKG.

## Frequent Problems

### Imported key exists but signing fails

Trusted dealer import must store the algorithm-specific public side state with the imported material. Without ECC commitments or the ML-DSA public key, public key checks and later protocols cannot prove the same key state.

### Wrong algorithm

The raw private key must match the declared algorithm and its expected encoding.
