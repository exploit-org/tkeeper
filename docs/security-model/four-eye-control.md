# Four Eye Control

Four-eye control can be unconditional at the key level or selected by an authority policy for a particular typed signing intent. In both cases, TKeeper requires the configured number of distinct approver signatures before continuing.

## Key policy shape

```json
{
  "fourEye": {
    "mode": "STRICT",
    "m": 2,
    "n": 3,
    "keys": [
      {
        "algorithm": "SECP256K1",
        "publicKey64": "..."
      },
      {
        "algorithm": "P256",
        "publicKey64": "..."
      },
      {
        "algorithm": "ED25519",
        "publicKey64": "..."
      }
    ]
  }
}
```

Rules:

- `mode` is `STRICT` or `LENIENT`; omitted values default to `STRICT`
- `m` must be at least `2`
- `m` cannot be greater than `n`
- `keys.size` must equal `n`
- duplicate approver keys are rejected
- approver public keys must decode under the declared algorithm
- approver algorithms must be present in the runtime artifact; ECC provides `SECP256K1`, `P256`, and `ED25519`, while the optional PQC platform adds `MLDSA44`, `MLDSA65`, and `MLDSA87`

`STRICT` preserves the original behavior: approvals are required for every operation protected by the key policy, including signing, decrypting, rotating, refreshing, and destroying a generation.

`LENIENT` protects key lifecycle changes: `ROTATE`, `REFRESH`, and generation destruction. Signing and decryption proceed without key-bound approvals. Initial `CREATE` has no stored key policy to enforce; a `fourEye` policy supplied during creation protects later operations. Authentication, permissions, authority policies, and audit checks still apply.

## Policy-driven approvals

An authority manifest can require approvals only when a particular allow rule matches. Approver public keys are declared once under `policy.approvers`; each rule selects a threshold and a set of approver ids:

```yaml
policy:
  id: payment-policy
  fallback: DENY
  approvers:
    operator-a:
      algorithm: SECP256K1
      publicKey64: "..."
    operator-b:
      algorithm: P256
      publicKey64: "..."
    compliance:
      algorithm: ED25519
      publicKey64: "..."
  allow:
    - id: approve-payment
      where:
        - "purpose == 'payment'"
      approvals:
        threshold: 2
        approvers: [operator-a, operator-b]
    - id: compliance-review
      where:
        - "purpose == 'payment'"
      approvals:
        threshold: 1
        approvers: [compliance]
```

If both rules match, both approval groups must be satisfied. Requirements from a key-level `fourEye` policy are cumulative with authority-policy requirements; one approval payload can carry proofs for every group.

An `ALLOW_WITH_REQUIREMENTS` fallback uses the same model:

```yaml
policy:
  id: guarded-fallback
  fallback: ALLOW_WITH_REQUIREMENTS
  approvers:
    operator:
      algorithm: ED25519
      publicKey64: "..."
  fallbackApprovals:
    threshold: 1
    approvers: [operator]
```

For an authority-policy challenge, TKeeper returns `APPROVAL_REQUIRED` with the `policyId`, rule or fallback `source`, and `threshold` for every required group. The public keys remain in the authority manifest. Sign the canonical request hash with enough keys from every group, attach all proofs to the same request, and resubmit it unchanged.

Policy-driven approvals apply to typed signing through the selected authority. Arbitrary signing does not evaluate an authority policy. The audit event retains the `ALLOW_WITH_REQUIREMENTS` decision and its requirements after successful approval.

## Approval model

Approvers sign a hash of the exact operation body. TKeeper verifies the submitted proofs before continuing to signing, DKG, destroy, or decrypt.

Approval payload:

```json
{
  "approvals": {
    "keeperId": 1,
    "nonce": "unique-nonce",
    "timestamp": 1760000000000,
    "proofs": [
      {
        "fingerprint": "...",
        "signature64": "..."
      }
    ]
  }
}
```

At the coordinator boundary, the nonce is one-time and is consumed only after enough signatures verify. Consumed nonces are persisted in RocksDB for `keeper.approval.ttl`, so a coordinator restart does not reopen the replay window. The timestamp must not be in the future and must fit the same TTL.

Threshold protocol retries reuse the same approval. Non-coordinator peers therefore verify its signatures, approved request fields, and TTL without independently consuming the nonce. If the coordinator is compromised, it can replay an approval with those same fields only while it remains fresh; see the threat model.

The coordinator peer id in `approvals.keeperId` must match the peer coordinating the operation.

## Signature algorithms

| Approver key | Approval signature |
| --- | --- |
| `SECP256K1` | ECDSA |
| `P256` | ECDSA |
| `ED25519` | EdDSA |
| `MLDSA44` | ML-DSA |
| `MLDSA65` | ML-DSA |
| `MLDSA87` | ML-DSA |

The approver fingerprint is:

```text
base64(sha256(encoded-public-key))
```

## Building `hashForSigning`

`APPROVAL_REQUIRED` describes the required groups; it does not return a ready-to-sign hash. After receiving the challenge:

1. Create one approval envelope with the coordinator peer id, a fresh nonce, and the current Unix timestamp in milliseconds.
2. Put that envelope on the exact request that will be submitted, initially with an empty `proofs` array.
3. Calculate `hashForSigning` from the request fields and the envelope metadata as described below.
4. Have the required approvers sign the raw 32-byte hash.
5. Add every proof to the same envelope and submit the request unchanged. Adding `proofs` does not change `hashForSigning`.

With the Java SDK, the request model constructs the preimage:

```java
var approvals = Approvals.template(
        coordinatorPeerId,
        UUID.randomUUID().toString(),
        Instant.now().toEpochMilli()
);
var request = Sign.builder(keyId, command)
        .approvals(approvals)
        .build();

byte[] hashForSigning = request.hashForSigning();
byte[] signature = signWithApproverKey(hashForSigning);

request.addProof(new Approvals.Proof(
        approverFingerprint64,
        Base64.getEncoder().encodeToString(signature)
));
client.signature().sign(request);
```

`signWithApproverKey` represents the caller's key-custody or signing system; it is not an SDK method.

For a sign request, non-Java clients construct this preimage object directly:

```json
{
  "keeperId": 1,
  "keyId": "payments-key",
  "command": {
    "type": "custom",
    "authorityId": "payments",
    "artifact": {
      "scheme": "ECDSA",
      "hash": "SHA256",
      "typed": {
        "purpose": "payment",
        "amount": "1000"
      }
    }
  },
  "nonce": "018f-example-unique-nonce",
  "timestamp": 1760000000000
}
```

This is not the complete HTTP request: the `approvals` wrapper and `approvals.proofs` are deliberately absent. `keeperId`, `nonce`, and `timestamp` are copied from `approvals`; every other field is copied from the submitted operation. Optional fields such as `tweak`, `generation`, `policy`, and `assetOwner` are included only when non-null.

## Canonical encoding

TKeeper uses canonical JSON for approval hashes.

Canonicalization rules for SDKs and non-Java clients:

- serialize compact UTF-8 JSON with no insignificant whitespace
- omit fields whose value is `null`
- sort JSON object field names lexicographically at every object level
- sort map entries by key
- preserve JSON array element order exactly as supplied
- apply the same object-field sorting to objects inside arrays
- keep string values byte-exact, including base64 strings, enum names, nonce, and tweak

Do not sort arrays globally. Arrays are ordered data.

The canonical UTF-8 payload for the sign example above is:

```json
{"command":{"artifact":{"hash":"SHA256","scheme":"ECDSA","typed":{"amount":"1000","purpose":"payment"}},"authorityId":"payments","type":"custom"},"keeperId":1,"keyId":"payments-key","nonce":"018f-example-unique-nonce","timestamp":1760000000000}
```

Its SHA-256 digest in hexadecimal is `ad0a5caa1cf84dcfb4b0012ac5af306ebb8938b1cafe4f0ab0d4e6232b135e9b`. Implementations can use this as a conformance vector.

The approval hash is:

```text
hashForSigning = SHA-256(UTF-8(canonical-json))
```

Approvers sign those raw 32 bytes, not their hexadecimal or base64 representation. Do not add another application-level SHA-256 pass. For ECDSA this means signing the supplied digest directly; Ed25519 and ML-DSA receive the 32 bytes as their message.

## Signed fields

| Operation | Fields |
| --- | --- |
| DKG | `keeperId`, `keyId`, `algorithm`, `authorities`, `mode`, optional `policy`, optional `assetOwner`, `nonce`, `timestamp` |
| Sign | `keeperId`, `keyId`, `command`, optional `tweak`, `nonce`, `timestamp` |
| ECIES decrypt | `keeperId`, `keyId`, optional `generation`, `algorithm`, `ciphertext64`, optional `tweak`, `nonce`, `timestamp` |
| Destroy | `keeperId`, `keyId`, `generation`, `nonce`, `timestamp` |

Each row is the complete top-level preimage field set for that operation. Nested values such as `command`, `authorities`, and `policy` are recursively canonicalized. The table describes logical fields, not serialization order; serialization order is defined by canonicalization.

## Security notes

- Four-eye approvals do not replace TKeeper authentication or permissions.
- Approver keys should be stored separately from TKeeper peers.
- Any change to the approved request body requires new approvals.
- Approval signatures are only as trustworthy as approver key custody.
- Approval tooling should render the canonical operation from the signed fields. A trusted human summary that is not bound to the approval hash can mislead the approver.
- Nonce uniqueness prevents approval reuse inside TKeeper; downstream replay rules are still required for the resulting cryptographic proof.

## Common failures

### Approvals fail after changing the request

Create a new approval for the exact request body.

### Duplicate approver keys fail

`n` is the number of distinct approvers.

### Approval nonce is rejected on second use

Approval nonces are one-time.
