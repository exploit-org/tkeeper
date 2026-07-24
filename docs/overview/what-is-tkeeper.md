# What is TKeeper?

TKeeper is an authority layer for cryptographic identity. It treats each key as an identity with attached authorities: what the identity can authorize, how a request is understood, which policy governs it, and what proof another system should verify before execution.

It is useful when a machine action has real consequences:

- move funds
- sign a transaction
- issue a certificate
- approve a spender
- rotate, import, refresh, or destroy a key
- let an automated agent request a governed tool or production action

Classic access control answers whether a caller can reach an API. TKeeper also answers whether the selected cryptographic identity may authorize the exact requested action.

## The basic flow

```text
Caller -> typed intent -> TKeeper controls -> bound proof -> downstream effect
```

The downstream system should execute the effect only after it verifies the expected identity, proof, and exact intent. It must also enforce freshness or replay protection where the action requires it.

If TKeeper does not approve the intent, it does not produce the proof. Without the proof, the action cannot continue in systems that depend on the governed identity.

## Product boundaries

TKeeper combines governed signing, key lifecycle control, threshold cryptography, and audit at the point where an identity uses its key.

It is not a generic secrets manager, a replacement for host or network security, or a standalone fraud, AML, prompt-injection, or risk engine. It can participate in wallet, CA, KMS, and agent workflows, but it does not replace the surrounding transaction builder, certificate authority, business system, or verifier.

External systems can detect, score, or decide. TKeeper enforces the cryptographic boundary: no approval, no signature; no approval, no lifecycle operation.

## Main concepts

| Concept | Meaning |
| --- | --- |
| Intent | The exact action being requested in a form TKeeper understands |
| Authority | The declared capability attached to a key identity |
| Policy | Rules attached to the key, authority, caller, and operation |
| Quorum mode | Whether one node or a threshold of peers controls key use |
| Proof | The cryptographic output bound to the approved action |

## Quorum modes

TKeeper supports two operating modes:

| Mode | Use when |
| --- | --- |
| `mono` | You need the same authority controls with local key material |
| `threshold` | You need key shares split across peers so one node cannot act alone |

Mono is useful for development, lower-impact deployments, and bootstrap phases. Threshold mode is the safer default for high-stakes keys because key use requires quorum participation.

## Build-time platforms

Cryptographic implementations are selected at build time:

| Platform | Provides |
| --- | --- |
| `platform-ecc` | ECC algorithms and protocols such as ECDSA, FROST, BIP-340, Taproot, and ECIES |
| `platform-pqc` | ML-DSA algorithms, threshold ML-DSA DKG, and threshold ML-DSA signing |

A deployable build must include at least one platform.
