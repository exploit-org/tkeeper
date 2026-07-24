# EVM Authorities

EVM authority support lives in the `authority-evm` feature and currently requires the `ecc` platform.

Build example:

```bash
./gradlew shadowJar -Pkeeper.features=authority-evm -Pkeeper.platforms=ecc
```

An EVM authority lets TKeeper parse an unsigned serialized transaction, decode configured contract calls, expose normalized effects to policy, and sign only when the final decision is `ALLOW`.

Use EVM authorities for:

- treasury transactions
- spender approvals
- contract-specific governed actions
- policy inputs from AML, KYT, fraud, or business systems

## Enforcement boundary

The authority should pin the intended chain and describe every contract call the policy is allowed to approve. Native intent handling fails closed when TKeeper cannot map a call to a known effect.

TKeeper signs the approved transaction. The surrounding wallet or custody service remains responsible for transaction construction, nonce and gas strategy, broadcast, replacement, receipt tracking, and settlement state. It must broadcast exactly the transaction that policy approved.

External risk verdicts must be bound to the same transaction intent; a verdict for an address or amount outside the signed transaction is only advisory metadata.

See [Authorities](authorities.md) for authority documents and policy format.
