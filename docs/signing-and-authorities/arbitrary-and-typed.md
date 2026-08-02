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

Start with the [typed authority example and matching command](authorities.md#custom-authority-example). It shows the field shapes and each CEL helper category in context.

Use it for:

- AI-agent tool or action intents
- internal service commands
- business-specific approvals
- workflows where a backend verifies TKeeper proof before execution

Only declared fields are available to policy. The executing backend must not derive additional effects from undeclared fields in the submitted JSON.

## Custom authority config

```yaml
type: custom
config:
  fields:
    amount:
      type: bigint
    currency:
      type: string
    customer:
      type: object
      fields:
        id:
          type: string
        country:
          type: string
          required: false
          default: UNKNOWN
  effects:
    - type: payment.transfer
      fields:
        asset: "$currency"
        amount: "$amount"
        customerId: "$customer.id"
```

Field rules:

- JSON root must be an object
- unknown fields are rejected before policy evaluation
- `effects` is reserved
- `required` defaults to `true`
- `nullable` defaults to `false`
- optional missing fields without a default become CEL `null`
- config typos and invalid defaults reject the authority

Supported types:

| Type | CEL/runtime value |
| --- | --- |
| `string` | string |
| `bool` | boolean |
| `int` | signed 32-bit integer |
| `bigint` | arbitrary-precision integer |
| `decimal` | arbitrary-precision decimal |
| `time` | instant |
| `bytes` | bytes decoded from Base64 |
| `object` | nested object with declared `fields` |
| `list` | list whose element schema is declared in `items` |

`bigint` requires an integral JSON number and `decimal` requires a JSON number. Preserve large values when constructing JSON; do not pass them through an IEEE-754 `double`. `bytes` accepts Base64 strings. `time` accepts ISO-8601 instant strings such as `2030-01-02T03:04:05Z`.

Effect mapping strings beginning with `$` resolve declared field paths. `$$value` produces the literal string `$value`.

The declared fields and `effects` become strict CEL roots. See [Authorities](authorities.md#strict-cel-roots) and [CEL Functions](cel-functions.md).

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
