# Signing and Authorities

Signing is an identity action. TKeeper produces a signature only after the requested action is understood through an authority and allowed by policy.

Read:

- [Signing](signing.md)
- [Authorities](authorities.md)
- [Arbitrary and Typed Authorities](arbitrary-and-typed.md)
- [EVM Authorities](evm.md)
- [Bitcoin Authorities](bitcoin.md)
- [X.509 Authorities](x509.md)

## Core rule

```text
command -> authority -> intent -> policy -> proof
```

Use `arbitrary` only when raw signing is intentional. Use concrete authorities when TKeeper must understand and govern the action.

The consumer remains part of the security boundary: it must trust the expected identity, verify the exact intent, and prevent replay where the action requires freshness.
