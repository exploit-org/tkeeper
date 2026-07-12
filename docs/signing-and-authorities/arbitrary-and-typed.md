# Arbitrary and Typed Authorities

## `arbitrary`

`arbitrary` is raw signing. TKeeper checks that the key identity allows `arbitrary`, then signs the bytes from the command.

Use it for:

- local demos
- compatibility with systems that already govern the payload elsewhere
- narrow raw-signing cases accepted by policy and security review

Do not use it when TKeeper is expected to understand the business effect. Raw bytes do not tell TKeeper whether the action moves funds, changes production, issues a certificate, or approves a tool call.

## `custom`

`custom` is for typed JSON commands. The authority document defines the expected command shape and the effects exposed to policy.

Use it for:

- AI-agent tool or action intents
- internal service commands
- business-specific approvals
- workflows where a backend verifies TKeeper proof before execution

Only declared fields are available to policy. The executing backend must not derive additional effects from undeclared fields in the submitted JSON.

## Decision rule

| Need | Use |
| --- | --- |
| Sign bytes with no semantic policy in TKeeper | `arbitrary` |
| Govern a typed business action | `custom` |
| Govern an EVM transaction | `evm.transaction` |
| Govern a Bitcoin transaction | `bitcoin.transaction` |
| Govern certificate issuance | `x509.tbs-certificate` |

`arbitrary` cannot be mixed with concrete authorities on the same key identity.

Do not describe an `arbitrary` integration as governed intent unless another trusted layer defines, validates, and binds the meaning of the signed bytes.
