# Governed Cryptographic Identity

TKeeper treats a key as a governed cryptographic identity.

Authentication identifies the caller, while key possession enables cryptographic action. A governed cryptographic identity adds a declared authority boundary: which actions the identity may authorize and which verifiable proof represents that authorization.

The identity is defined by:

- the key
- the authorities attached to that key
- the typed intents those authorities understand
- the policy that governs those intents
- the proof format downstream systems verify

Examples:

- a treasury identity that may sign only understood transaction intents
- a CA identity that may sign only certificate requests matching its authority policy
- an AI-agent identity that may sign only typed tool/action intents declared by an authority document attached to the key
- an internal-service identity that may sign only typed commands accepted by a backend
- a key lifecycle operation accepted by a quorum

These outputs matter because other systems trust them. TKeeper places controls before the output exists.

For AI agents, the model is not "sign whatever tool call the agent produced." The tool or action shape should be represented as a typed authority document, or manifest, attached to the key. TKeeper materializes the request into an intent, evaluates the declared policy and effects, and signs only the exact approved intent.

## Why this matters

Many automated systems can already decide what they want to do. The risky part is when the system can make the decision real.

TKeeper separates the request from the authority to complete it:

```text
Requesting an action is not the same as being allowed to authorize it as this cryptographic identity.
```

The caller submits an intent. TKeeper checks authentication, permissions, authority rules, key lifecycle state, optional four-eye approvals, audit requirements, quorum participation, and platform-specific cryptographic constraints.

Only then does it produce the signature, certificate, or key operation result.

## Enforcement boundary

TKeeper is strongest when the downstream system requires the cryptographic proof before executing the effect.

Good integration shape:

```text
1. Caller prepares intent
2. TKeeper approves or rejects the intent
3. TKeeper returns proof only if approved
4. Downstream system verifies proof
5. Downstream system executes the effect
```

Weak integration shape:

```text
1. Caller asks TKeeper for an opinion
2. Downstream system can ignore the answer
```

If the downstream system can bypass the governed identity, TKeeper cannot enforce that boundary by itself.

## Verifier contract

A valid signature proves that the corresponding key signed specific bytes. A secure integration must also decide what those bytes mean and whether they are acceptable now.

The verifier should:

- trust the expected identity or public key, not any mathematically valid key
- reconstruct or validate the exact intent that will be executed
- bind the proof to the correct environment, target, and operation
- enforce nonce, expiry, sequence, or idempotency rules where replay matters
- reject fields or effects that were not covered by the governed intent

TKeeper cannot repair a verifier that accepts a different payload, ignores unsigned fields, or allows the same proof to authorize unintended repeats.

## Authority path

The authority path is the part of the system where an intent becomes a consequence.

TKeeper keeps these pieces together:

| Stage | Question |
| --- | --- |
| Intent | What exact action is being requested, and is it understood? |
| Policy | Is this action allowed for this key identity, caller, and authority? |
| Quorum | Do enough peers accept the same action? |
| Audit | Can the decision be recorded before the effect? |
| Proof | What cryptographic output binds this identity to the approved action? |

If these pieces split apart, control weakens. A valid signature over the wrong data, a policy check not bound to the signed action, or an unverifiable approval record can all create bypasses.

## Relation to external risk systems

TKeeper does not need to be the system that detects every risk.

Other systems may provide verdicts:

- prompt-injection detection
- AML or KYT checks
- fraud scoring
- business approvals
- SIEM or SOAR decisions
- human review

TKeeper's job is to make the final cryptographic action depend on the accepted verdict and local policy state. The integration must bind that verdict to the same intent that is ultimately signed and executed.
