![TKeeper logo](assets/keeper-banner.png)

<div align="center">

# TKeeper

[TKeeper Labs](https://tkeeper.org) • [exploit.org](https://exploit.org) • [Documentation](docs/README.md) • [OpenAPI](openapi.yaml)

</div>

TKeeper is a governed cryptographic identity layer for machines, agents, services, and workflows.

A TKeeper identity combines:

- cryptographic key material, held locally or split across peers
- an authority manifest that defines which typed actions the identity can authorize
- controls for callers, policy, approvals, quorum, lifecycle, and audit

Traditional access control decides whether a caller may reach an API. TKeeper also decides whether the selected identity may authorize the exact requested action.

For typed authorities, the enforcement contract is:

```text
No understood and approved intent -> no cryptographic proof -> no effect.
```

## How it works

```text
request
-> governed identity
-> understood intent
-> authority and controls
-> mono or threshold cryptographic operation
-> proof
-> downstream verification
-> effect
```

TKeeper produces a signature, certificate, or key lifecycle result only after the request passes the identity's controls. The downstream system must verify the expected identity and exact intent before executing the effect.

TKeeper is not a generic secrets manager, business risk engine, or replacement for host and network security. If the same effect can bypass the governed proof, TKeeper cannot enforce that path.

## Use cases

| Use case | What the identity governs |
| --- | --- |
| AI agents | typed tool and production actions, spending, signed decisions |
| Crypto assets | exact EVM and Bitcoin transactions, treasury workflows |
| Certificates | X.509 issuance and workload identity operations |
| Internal systems | typed commands, privileged automation, break-glass flows |

See [Use Cases](docs/use-cases/README.md).

## Quorum modes

| Mode | Use when |
| --- | --- |
| `mono` | local key material is acceptable, while authority, policy, and audit controls are still required |
| `threshold` | one compromised node must not be able to authorize as the identity |

In threshold mode, key authority is split across peers. A coordinator can start an operation, but peers validate the same intent before contributing. Use threshold mode for high-stakes identities that must not depend on one node.

See [Quorum Modes](docs/security-model/quorum-modes.md).

## Authorities

Authorities define what a key identity may authorize.

| Authority type | Use |
| --- | --- |
| `arbitrary` | raw signing; high-risk, no semantic intent in TKeeper |
| `custom` | typed JSON commands, internal systems, AI-agent actions |
| `evm.transaction` | governed EVM transaction signing |
| `bitcoin.transaction` | governed Bitcoin transaction signing |
| `x509.tbs-certificate` | governed certificate issuance |

Concrete authorities use digest-pinned authority documents that act as capability manifests. TKeeper materializes the command into an intent, evaluates policy, and signs only when the final decision is `ALLOW`.

See [Signing and Authorities](docs/signing-and-authorities/README.md).

## Documentation

- [Product Overview](docs/overview/README.md)
- [Use Cases](docs/use-cases/README.md)
- [Getting Started](docs/getting-started/README.md)
- [Deployment](docs/deployment/README.md)
- [Security Model](docs/security-model/README.md)
- [Status and Limitations](docs/overview/status-and-limitations.md)
- [Cryptographic Identities](docs/key-management/README.md)
- [Signing and Authorities](docs/signing-and-authorities/README.md)
- [Crypto Platforms](docs/crypto-platforms/README.md)
- [API Reference](docs/api-reference/README.md)
- [Operations](docs/operations/README.md)

## Build

Cryptographic implementations are selected at build time.

| Platform | Provides |
| --- | --- |
| `ecc` | `SECP256K1`, `P256`, `ED25519`, ECDSA, FROST, BIP-340/Taproot, ECIES support |
| `pqc` | `MLDSA44`, `MLDSA65`, `MLDSA87`, threshold ML-DSA DKG and signing |

A deployable artifact must include at least one platform.

Build all production features and platforms:

```bash
./gradlew :build -Pkeeper.features=all -Pkeeper.platforms=all
```

Build only what you need:

```bash
./gradlew :build -Pkeeper.features=authority-evm -Pkeeper.platforms=ecc
```

See [Build and Features](docs/deployment/build-and-features.md).

## Security references

- [TKeeper Threat Model](docs/security-model/threat-model.md)
- [Anvil](https://github.com/exploit-org/anvil) for protocol-level cryptographic components

## API

The HTTP contract is described by [openapi.yaml](openapi.yaml).

Java integrations can use [`org.exploit:tkeeper-sdk:2.3.0`](sdk/README.md).

If an SDK helper disagrees with OpenAPI, treat OpenAPI as the source of truth.

## Verification

Build a selected production artifact and run its root, SDK, feature, and platform unit tests:

```bash
./gradlew build -Pkeeper.features=all -Pkeeper.platforms=all
```

Run the complete release gate:

```bash
./gradlew releaseGate
```

`releaseGate` runs every module's unit tests, verifies artifact isolation, builds `exploit/tkeeper:dev` and `exploit/tkeeper:production-it`, and runs the functional integration suite. Performance benchmarks remain separate. Do not deploy either test image as production runtime.

See [integration-tests](integration-tests/README.md).

## License

Apache License 2.0. See [LICENSE.md](LICENSE.md).
