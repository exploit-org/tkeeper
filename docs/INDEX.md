# TKeeper Overview

TKeeper is a secure threshold cryptography engine built on top of multiparty computation (MPC). It allows multiple participants to cooperatively sign or encrypt messages without ever reconstructing the private key in full.

At its core, TKeeper implements two well-established threshold signature schemes:

## Distributed signing
- **GG20** – for threshold ECDSA signatures
- **FROST** – for threshold Schnorr signatures

These protocols allow distributed signing using elliptic curves (`SECP256K1` and `ED25519`), ensuring strong cryptographic guarantees while maintaining flexibility across use cases.

## Distributed encryption
* **ECIES** – EC ElGamal KEM + AEAD, backed by DLEQ proofs. Perfect forward secrecy with per-message HKDF.

To protect key material at rest, TKeeper includes a configurable **seal & unseal mechanism**. Depending on configuration, the local key share is either manually unsealed using Shamir shares, or automatically decrypted using cloud KMS providers like AWS or Google Cloud.

All access to signing, key generation, or configuration is protected by a strict **permission-based authorization model**, enforced via JWT tokens. Each request must include the necessary scope in its `permissions` field to be accepted.

TKeeper is designed to serve as the cryptographic backend for high-security systems such as custodial wallets, MPC-based payment platforms, and key orchestration services.