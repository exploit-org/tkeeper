# ECC

The `ecc` platform provides:

- `SECP256K1`
- `P256`
- `ED25519`
- ECDSA signing for Secp256k1, P-256
- FROST signing for all curves
- Schnorr, BIP-340, and Taproot signing for Secp256k1
- deterministic ECC key derivation
- ECIES support for compatible curves

Features that currently require `ecc`:

- `authority-evm`
- `authority-bitcoin`
- `authority-x509`
- `ecies`

Build example:

```bash
./gradlew shadowJar -Pkeeper.features=authority-evm,ecies -Pkeeper.platforms=ecc
```
