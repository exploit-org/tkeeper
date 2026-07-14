![TKeeper logo](assets/keeper-banner.png)

<div align="center">

# TKeeper

[TKeeper Labs](https://tkeeper.org) • [exploit.org](https://exploit.org) • [Documentation](docs/README.md) • [OpenAPI](openapi.yaml)

</div>

TKeeper is a governed cryptographic identity layer for machines, agents, services, and workflows.

Each key represents an identity. Its authorities define which actions that identity may authorize, how TKeeper interprets those actions, and which policy must pass before proof is produced.

For typed authorities, the enforcement contract is:

```text
No understood and approved intent -> no cryptographic proof -> no effect.
```

## What TKeeper governs

TKeeper controls when an identity may produce cryptographic proof or change its own key state:

- signatures for governed actions
- certificate signatures
- key lifecycle operations
- optional cryptographic operations such as ECIES decryption

For external actions, enforcement depends on the verifier: the downstream system must reject effects that are not backed by proof for the exact accepted intent.

## Use cases

| Use case | What TKeeper governs |
| --- | --- |
| AI agents | typed tool/action intents, spending, production actions, signed decisions |
| Crypto assets | EVM and Bitcoin transaction signing, treasury workflows |
| Certificates | X.509 issuance and workload identity operations |
| Internal systems | typed commands, privileged automation, break-glass flows |

See [Use Cases](docs/use-cases/README.md).

## Authority path

```text
request
-> key identity
-> authority
-> understood intent
-> policy and audit controls
-> mono or threshold cryptographic operation
-> proof
-> downstream verification
-> effect
```

If the action can bypass the governed identity, TKeeper cannot enforce that boundary by itself.

## Quorum modes

| Mode | Use when |
| --- | --- |
| `mono` | one node is acceptable, but TKeeper policy/audit/authority controls are still needed |
| `threshold` | one compromised node must not be enough to authorize as the identity |

In threshold mode, private key authority is split across peers. A coordinator can start an operation, but peers validate the same intent before contributing.

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

Concrete authorities use digest-pinned authority documents. TKeeper materializes the command into an intent, evaluates policy, and signs only when the final decision is `ALLOW`.

See [Signing and Authorities](docs/signing-and-authorities/README.md).

## Crypto platforms

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

## Documentation

- [Overview](docs/overview/README.md)
- [Getting Started](docs/getting-started/README.md)
- [Deployment](docs/deployment/README.md)
- [Security Model](docs/security-model/README.md)
- [Cryptographic Identities](docs/key-management/README.md)
- [Signing and Authorities](docs/signing-and-authorities/README.md)
- [Crypto Platforms](docs/crypto-platforms/README.md)
- [API Reference](docs/api-reference/README.md)
- [Operations](docs/operations/README.md)

## Security references

- [TKeeper Threat Model](docs/security-model/threat-model.md)
- [Anvil](https://github.com/exploit-org/anvil) for protocol-level cryptographic components

## API

The HTTP contract is described by [openapi.yaml](openapi.yaml).

Java integrations can use [`org.exploit:tkeeper-sdk:2.2.0`](sdk/README.md).

If an SDK helper disagrees with OpenAPI, treat OpenAPI as the source of truth.

## Tests

Integration tests run against a local cluster via Testcontainers.

Build the integration image:

```bash
./gradlew dockerBuildIntegration
```

The integration image includes every production feature, every platform, and the test-only failure-injection module. Do not deploy it as production runtime.

See [integration-tests](integration-tests/README.md).

## License

Apache License 2.0. See [LICENSE.md](LICENSE.md).
