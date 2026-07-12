# For Crypto Assets

Use TKeeper when transaction signing must depend on an understood transaction, policy, and optionally external risk or human verdicts.

Flow:

```text
transaction intent
-> authority policy
-> optional external verdicts
-> quorum signing
-> transaction signature
```

Good candidates:

- EVM transaction signing
- Bitcoin transaction signing
- treasury operations
- spender approvals
- AML, KYT, fraud, or business verdicts before signing
- threshold custody where one peer must not be enough

## Integration contract

The transaction builder remains responsible for nonce or UTXO selection, fee strategy, and constructing the final unsigned transaction. TKeeper parses the transaction supported by the selected authority, exposes normalized effects to policy, and returns a signature after approval.

The broadcaster or custody backend should:

- verify the signature against the expected key identity
- broadcast exactly the transaction that was approved
- prevent unsigned metadata from changing the transaction's meaning
- bind external AML, KYT, fraud, or business verdicts to the same transaction intent
- handle replacement, confirmation, and settlement state outside TKeeper

TKeeper does not broadcast transactions or prove that a confirmed transaction achieved the intended business outcome.

Relevant docs:

- [EVM Authorities](../signing-and-authorities/evm.md)
- [Bitcoin Authorities](../signing-and-authorities/bitcoin.md)
- [Quorum Modes](../security-model/quorum-modes.md)
