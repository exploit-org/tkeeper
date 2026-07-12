# Bitcoin Authorities

Bitcoin authority support lives in the `authority-bitcoin` feature and currently requires the `ecc` platform.

Build example:

```bash
./gradlew shadowJar -Pkeeper.features=authority-bitcoin -Pkeeper.platforms=ecc
```

A Bitcoin authority lets TKeeper parse unsigned transaction data, previous transactions, signing input, sighash settings, and policy effects before signing.

Use Bitcoin authorities for:

- governed UTXO spending
- treasury withdrawals
- fee and output policy
- external risk verdicts before signing

## Enforcement boundary

Policy evaluation depends on the unsigned transaction, the selected input and sighash mode, and the previous transactions needed to understand input values. Missing or unclassifiable data must not be treated as a harmless unknown effect.

TKeeper does not select coins, construct change, choose fees, broadcast transactions, or track confirmations. The wallet or custody service must broadcast the exact approved transaction and ensure that its sighash choice covers the fields the policy assumes are fixed.

See [Authorities](authorities.md) for authority documents and policy format.
