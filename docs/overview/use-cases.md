# Use-case fit

TKeeper fits workflows where a cryptographic identity is the final authority for an action and the consumer can verify proof before producing the effect.

| Scenario | Governed intent | Verifier | TKeeper does not replace |
| --- | --- | --- | --- |
| AI agent | typed tool call, payment, or production action | tool backend or workflow engine | model security, sandboxing, or risk detection |
| Crypto assets | exact EVM or Bitcoin transaction | chain client, broadcaster, or custody backend | transaction construction, broadcast, or settlement monitoring |
| Certificates | DER-encoded TBS certificate | relying party or CA pipeline | enrollment, serial allocation, revocation, or certificate publication |
| Internal systems | typed privileged command | service that performs the command | business logic or host authorization |

Detailed integration guidance:

- [For AI Agents](../use-cases/for-ai-agents.md)
- [For Crypto Assets](../use-cases/for-crypto-assets.md)
- [For Certificates](../use-cases/for-certificates.md)
- [For Internal Systems](../use-cases/for-internal-systems.md)

## Fit test

Before adopting TKeeper, answer these questions:

1. What exact effect requires cryptographic authorization?
2. Can that effect be represented as a stable, canonical intent?
3. Which key identity is trusted to authorize it?
4. Which system verifies the proof, and what does it check besides signature validity?
5. Can the effect be produced through a path that bypasses that verifier?
6. Which context must be covered: environment, target, amount, chain, expiry, nonce, or approver verdict?
7. Is one compromised TKeeper node allowed to act as the identity?

If the effect can occur without the proof, TKeeper is advisory on that path. If the payload has no stable meaning, use of raw `arbitrary` signing must be an explicit security decision rather than a governed-intent claim.
