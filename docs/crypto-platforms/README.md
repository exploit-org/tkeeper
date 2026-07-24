# Crypto Platforms

Platforms are build-time modules. They provide key algorithms and protocol implementations. Features provide product surfaces that may depend on those platforms.

Read:

- [Platforms](platforms.md)
- [ECC](ecc.md)
- [PQC ML-DSA](pqc-mldsa.md)
- [ECIES](ecies.md)

## Quick choice

| Need | Platform |
| --- | --- |
| EVM, Bitcoin, X.509, ECIES, ECDSA, FROST | `ecc` |
| ML-DSA-44/65/87 identities | `pqc` |
| Everything | `all` |

A deployable artifact needs at least one platform.
