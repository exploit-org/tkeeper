# TKeeper

**TKeeper** is a threshold signature service that provides a simple REST API for distributed signing using **GG20 (Threshold ECDSA)** and **FROST (Threshold Schnorr)** protocols. The service abstracts the complexity of multiparty computation: to sign a message, a client just needs to send a single HTTP request.

It is suitable for custody systems, MPC-based wallets, and backend services that require distributed key management and signing without exposing private keys to any single participant.

We avoid using high-level abstractions such as `BigInteger` for handling sensitive data. All arithmetic operations on secret shares and cryptographic material are performed through low-level bindings over **libgmp**, allowing precise memory control and zeroing. For highly sensitive values (such as private key shares), **SecretBox** from **libsodium** is used for encryption in memory. The memory encryption key is generated every time application is started. For local persistent storage, TKeeper uses **RocksDB**, with all secret data encrypted with your **seal** key before being written to disk.

---

## Requirements

TKeeper depends on several native libraries for cryptographic operations. Make sure the following are installed on the system:

- [libsodium](https://github.com/jedisct1/libsodium) – used for secure memory handling and Ed25519 point ops
- [libgmp](https://gmplib.org/) – used for arbitrary-precision arithmetic
- [libsecp256k1](https://github.com/bitcoin-core/secp256k1) – used for Secp256k1 point ops

Make sure these libraries are available in your environment and linked correctly.
___

## Documentation
See [docs](docs) for detailed documentation on, or visit [docs.exploit.org/tkeeper](https://docs.exploit.org/tkeeper) for
user-friendly documentation.