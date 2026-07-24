# For AI Agents

Use TKeeper when an AI agent or autonomous workflow can request actions with real consequences and the executing backend can require cryptographic authorization.

The agent should not receive a raw signing key and should not get arbitrary signing for whatever JSON it emits. The expected tool or action shape should be declared as an authority document attached to the key identity.

## Model

```text
agent proposes typed action
-> TKeeper materializes intent
-> policy and external verdicts approve or deny
-> TKeeper signs exact approved intent
-> backend verifies proof before executing
```

Good candidates:

- tool calls that change production state
- spending or payment actions
- sensitive internal operations
- signed agent decisions
- actions requiring human approval

## What TKeeper enforces

TKeeper does not decide whether every AI output is safe. External systems can detect prompt injection, classify risk, or require human approval.

TKeeper enforces the final boundary: the agent identity cannot produce proof unless the typed action is accepted.

## Authority shape

Use `custom` typed authorities for agent-specific actions. The authority document should define:

- accepted fields
- effect extraction
- policy variables
- allow and deny rules

Avoid `arbitrary` for agent tool calls unless raw signing is explicitly accepted by the security model.

Treat the authority document as the agent identity's capability manifest. A change to the tool schema, effect mapping, or policy is a security change and should produce a new digest-pinned artifact.

## Integration contract

The tool backend should:

- accept only the expected agent identity or public key
- reconstruct the same typed action that TKeeper approved
- reject action fields that were not covered by the authority schema
- bind the action to its target environment and resource
- enforce expiry, nonce, or idempotency rules for repeatable tool calls
- execute only after proof verification succeeds

A signature does not prove that the model was safe, that its reasoning was correct, or that prompt injection did not occur. It proves authorization by the governed identity for the signed action.

## Bypass condition

```text
agent can perform the same action directly without the governed identity
```

In that topology, TKeeper can record or advise but cannot prevent the direct action.
