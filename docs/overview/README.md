# Overview

TKeeper gives machines, agents, services, and workflows a governed cryptographic identity. In TKeeper, a key is the identity boundary: its attached authorities define what the identity is allowed to authorize.

Each action must be:

- understood as a typed intent
- governed by the key's authorities and policy
- bound to cryptographic proof that a downstream system can verify before execution

The enforcement rule for typed authorities:

```text
No understood and approved intent -> no cryptographic proof -> no effect.
```

## In this section

- [What is TKeeper?](what-is-tkeeper.md)
- [Governed Cryptographic Identity](governed-cryptographic-identity.md)
- [Use Cases](use-cases.md)
- [Architecture](architecture.md)
- [Status and Limitations](status-and-limitations.md)
- [Glossary](glossary.md)

## What TKeeper governs

| Area | What TKeeper controls |
| --- | --- |
| AI agents | Typed tool/action intents, spending, production actions, signed decisions |
| Crypto assets | EVM and Bitcoin transaction signing, treasury workflows |
| Certificates | X.509 issuance and workload identity operations |
| Internal systems | Typed commands, sensitive automation, privileged operations |
| Key lifecycle | DKG, import, refresh, rotate, destroy |

## What to read next

After this overview:

- run the local flow in [Getting Started](../getting-started/README.md)
- choose a deployment shape in [Quorum Modes](../security-model/quorum-modes.md)
- select build modules in [Build and Features](../deployment/build-and-features.md)
- review guarantees and non-goals in [Threat Model](../security-model/threat-model.md)
