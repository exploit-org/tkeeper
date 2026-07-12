# Threat Model

This page covers TKeeper service-level threats and residual risks.

TKeeper's security boundary is the governed cryptographic identity. With a concrete authority, an identity can authorize an action only after TKeeper materializes the intent, accepts the authority and policy decision, passes audit and key controls, and produces proof that the downstream system verifies before execution. An `arbitrary` authority is raw signing and does not provide this semantic guarantee.

For protocol-level details in FROST, GG20, threshold ML-DSA, ECIES, ZK proofs, nonce handling, Paillier, and elliptic-curve math, use the Anvil threat model:

[Anvil THREAT_MODEL.md](https://github.com/exploit-org/anvil/blob/main/THREAT_MODEL.md)

## Scope

In scope:

- client authentication and authorization
- authority policy
- four eye approvals
- peer authentication and Byzantine behavior
- seal and unseal
- local key share storage
- key lifecycle operations
- trusted dealer import
- audit log integrity and sink enforcement
- UI exposure through `:features:ui`

Out of scope:

- compromise of at least `threshold` peers
- downstream systems that execute effects without verifying TKeeper proof
- bad authority policies approved by operators
- physical side channels
- host hardening
- kernel, container runtime, and hypervisor compromise
- bugs inside cloud KMS, HSM firmware, or external identity providers

## Assumptions

TKeeper runs as a cluster of peers. Each peer has one local key share. A threshold operation needs enough peers to participate.

Compromising fewer than `threshold` peers must not give the attacker a usable private key. Compromising at least `threshold` peers breaks the threshold model.

All protected operations run only after the keeper is unsealed.

Production artifacts include only explicitly selected platforms and features. The dedicated integration artifact additionally contains failure-injection controls and must not be deployed as a production image.

Authorities are part of the signing boundary. A key either uses `arbitrary` for raw signing or uses concrete authority policies. `arbitrary` cannot be mixed with concrete authorities on the same key.

Concrete authorities use digest-pinned OCI references. Tags are mutable and are only useful for local development.

Audit events are signed with the integrity key. When audit is enabled, at least one configured sink must accept the event.

## Assets

| Asset | Confidentiality | Integrity | Availability |
| --- | --- | --- | --- |
| Local key shares | Critical | Critical | High |
| DEK | Critical | Critical | High |
| KEK or unseal material | Critical | Critical | High |
| Shamir unseal shares | Critical | Critical | High |
| HSM or cloud KMS credentials | Critical | Critical | High |
| JWT signing keys and JWKS | High | Critical | High |
| Key metadata and authorities | Low | Critical | High |
| Public keys and commitments | Public | Critical | High |
| Authority OCI artifacts | Low | Critical | High |
| Four eye approver keys | High | Critical | Medium |
| Audit records | Low | Critical | High |
| Session context | Low | Critical | High |

## Trust boundaries

Client to Keeper:

Requests are untrusted until authenticated and authorized. JWT mode validates token signature, `kid`, audience, configured issuer, token lifetime, and subject. Dev token mode is for controlled environments.

Keeper to Keeper:

Internal peer calls happen inside the cluster boundary. Requests and authenticated responses are signed and bound to the peer identities, request nonce, request hash, status, and body. Actor credentials are forwarded only to internal operation entrypoints that enforce their permissions. Peers still verify protocol data. Bad FROST, GG20, ML-DSA, or ECIES contributions are rejected. Protocols report an imposter only where the sender can be identified; a normal ML-DSA rejection-sampling abort is not Byzantine evidence.

Keeper to OCI registry:

Authorities are loaded only from explicitly allowed OCI registries. Digest-pinned references protect against tag drift. The authority id inside the artifact must match the id configured on the key.

Keeper to seal provider:

Seal providers protect the DEK. Built-in providers are Shamir and HSM. External providers are AWS and Google Cloud features.

Keeper storage:

Stored key material is AEAD-encrypted. New generations use a separate encrypt-then-sign version store whose signature is bound to the record id. Legacy generations remain readable for compatibility and migrate only through an explicit lifecycle operation.

Browser to UI:

`:features:ui` exposes the control-plane UI. It uses the same external API permissions as direct API clients. CSP configuration controls what the browser may load or connect to.

## Threats

### T-1: Client Impersonation

Attack:

An attacker uses a forged or stolen token to call signing, decrypt, lifecycle, or inventory APIs.

Mitigation:

- JWT signature and `kid` are checked against JWKS.
- Audience, configured issuer, lifetime, and subject are checked.
- Permissions are enforced per operation.
- Key operations use key-scoped permissions such as `tkeeper.key.<keyId>.sign`.

Residual risk:

A compromised IdP or long-lived token gives the attacker the permissions inside that token until it expires or is revoked.

### T-2: Permission Misconfiguration

Attack:

A principal gets broad permissions and uses a key or lifecycle operation outside its intended scope.

Mitigation:

- Permissions are explicit.
- Key operations can be scoped per key.
- Deny entries can restrict broad grants.
- Destructive operations use separate permissions.

Residual risk:

An operator can still grant broad access. Review wildcard grants before production use.

### T-3: Authority Downgrade

Attack:

An attacker tries to create or import a key with `arbitrary` authority and concrete authorities together, or tries to move a key from typed policy to raw signing.

Mitigation:

- `arbitrary` must be the only authority on a key.
- Concrete authorities require OCI references.
- Authority ids are validated.
- Authority policy is evaluated before signing starts.
- Asset Inventory exposes key authorities for review and export.

Residual risk:

An authorized operator can create a raw-signing key on purpose. Treat `arbitrary` keys as high risk.

### T-4: Authority Artifact Tampering

Attack:

An attacker changes the authority artifact in the registry or points a key at a different policy.

Mitigation:

- Production references use `@sha256:...`.
- `oras.allowed-registries` restricts outbound pulls to exact registry authorities.
- TKeeper verifies the loaded authority id against the configured id.
- Authority metadata is part of signed key state.
- Audit logs record authority-related operations.

Residual risk:

If a bad policy is approved and pushed under its digest, TKeeper will enforce that bad policy. Review authority artifacts before attaching them to keys.

### T-5: Policy or Intent Modeling Gap

Attack:

The policy sees a weak model of the requested action and allows a command whose real effect is unsafe.

Mitigation:

- Typed authorities materialize commands into policy input.
- EVM, Bitcoin, X.509, and custom authorities have separate intent builders.
- `arbitrary` is isolated from typed authority keys.

Residual risk:

Policy can only enforce the effects it can model. Raw bytes give policy almost no semantic context. Custom authorities ignore undeclared JSON fields, so a backend that acts on those fields can create a policy bypass.

### T-6: Four Eye Replay or Bypass

Attack:

An attacker reuses approval proofs for another request or tries to submit duplicate approvers.

Mitigation:

- Approvers sign a hash of the exact operation fields.
- The hash includes nonce and timestamp.
- Duplicate approver keys are rejected.
- `m` must be at least `2`, and `m` cannot exceed `n`.

Residual risk:

Compromised approver keys can approve malicious requests. Store approver keys separately from TKeeper peers.

### T-7: Byzantine Peer During Signing

Attack:

A peer sends invalid FROST, GG20, or threshold ML-DSA data to corrupt a signature or bias the result.

Mitigation:

- FROST verifies peer proof material and signing contributions.
- FROST signing nonces are atomically consumed and cannot produce a second partial signature.
- GG20 verifies the ZK proof flow used by the protocol; MtA responses expose only the ciphertext and proof, never the respondent mask or encryption randomness.
- GG20 signing state emits at most one partial signature.
- FROST and GG20 session clients are destroyed on success, abort, expiry, and shutdown.
- Threshold ML-DSA binds commitments, reveals, participants, message context, and partial responses, then verifies the combined standard ML-DSA signature.
- Identified bad peers are returned as `imposters`.
- Signing restarts with fresh session state where the protocol reports an imposter.

Residual risk:

Byzantine peers can cause availability loss by aborting sessions. Threshold ML-DSA does not provide identifiable abort for every failure. A defect that exposes an MtA mask or permits reuse of FROST/GG20 signing state can invalidate the threshold confidentiality assumption; affected key generations require rotation, not refresh.

### T-8: Byzantine Peer During ECIES Decrypt

Attack:

A peer returns a forged partial decrypt.

Mitigation:

- Each partial decrypt carries a DLEQ proof.
- The coordinator verifies the proof against the ciphertext point, derived peer public share, and partial decrypt.
- Bad partial decrypts are skipped and reported as imposters.
- Decrypt succeeds only if enough honest partial decrypts remain.

Residual risk:

Too many unavailable or dishonest peers can stop decryption.

### T-9: Local Storage Read or Tamper

Attack:

An attacker reads RocksDB files or changes stored records.

Mitigation:

- Key shares are encrypted at rest.
- The DEK is wrapped by seal material.
- Signed records protect integrity-sensitive state.
- A sealed keeper refuses protected operations.

Residual risk:

Memory forensics against an unsealed keeper can expose runtime secrets. A complete rollback or deletion of the local database cannot be detected solely by keys and signatures stored in that same database. Use host storage controls, encrypted swap, durable external audit export, and independently protected backups.

### T-10: Unseal Material Compromise

Attack:

An attacker obtains enough Shamir shares, HSM access, or cloud KMS rights to unwrap the DEK.

Mitigation:

- Shamir uses configurable `threshold` and `total`.
- HSM keeps wrapping keys outside TKeeper storage.
- AWS and Google Cloud providers rely on provider IAM and KMS audit logs.
- Auto-unseal can be disabled.

Residual risk:

Seal providers move trust into operators, HSM policy, or cloud IAM. Treat that material like root recovery access.

### T-11: Audit Tampering or Sink Failure

Attack:

An attacker edits audit logs or makes sinks unavailable.

Mitigation:

- Audit events are Ed25519-signed payloads.
- Verification uses the integrity public key version recorded in the event.
- If audit is enabled, protected operations require at least one available sink.
- If all configured sinks fail or time out while writing, the operation fails.

Residual risk:

Deployments without audit enabled lose this control.

### T-12: Trusted Dealer Abuse

Attack:

An authorized caller imports weak or unauthorized key material through trusted dealer flow.

Mitigation:

- Trusted dealer import is separately permissioned.
- Import runs through key metadata, authorities, commitments, and audit.
- Stored key records are integrity-protected.

Residual risk:

Trusted dealer mode trusts the importer to bring valid key material. Use it only for migration or recovery flows that need it.

### T-13: Key Lifecycle Abuse

Attack:

An attacker rotates, refreshes, destroys, or runs consistency repair on a key to cause denial of service or move the key into an unexpected state.

Mitigation:

- Lifecycle operations use separate permissions.
- Destructive operations are audit-logged.
- Key metadata and active generations are integrity-protected.
- Refresh writes a new signed generation and never overwrites a legacy generation in place.
- ECC refresh reshapes the existing secret shares without changing the public key. Rotate creates new key material.
- ML-DSA refresh creates a new generation with the same per-peer share and public key; it does not refresh cryptographic material. ML-DSA rotate runs a new DKG and creates a new key.
- Consistency repair is an explicit API, not part of normal signing flow.

Residual risk:

Authorized lifecycle operators can still break availability. A compromised ML-DSA share remains compromised after refresh; use rotate when new cryptographic material is required. Keep lifecycle permissions narrower than signing permissions.

### T-14: UI Exposure

Attack:

An attacker uses the UI to trigger privileged operations from a browser session.

Mitigation:

- UI calls the same authenticated external APIs.
- UI can be disabled.
- CSP limits script, connect, image, and form targets.
- Browser-originated operations still require permissions and approvals.

Residual risk:

Bad CSP or weak browser session handling can expose operators to web attacks. Keep UI access narrow.

### T-15: Probabilistic ML-DSA Signing Exhaustion

Attack or failure:

A healthy threshold ML-DSA signing operation repeatedly aborts during rejection sampling, or an attacker amplifies the cost by submitting many authorized signing requests.

Mitigation:

- Each retry creates fresh session state and fresh signing randomness.
- `keeper.session.mldsa.max-rounds` bounds complete signing attempts; it defaults to `12`.
- Session expiry and caller-side deadlines bound retained state and end-to-end latency.
- Exhaustion fails closed with `SESSION_MAX_ROUNDS_EXCEEDED`; no signature is returned.

Residual risk:

Threshold ML-DSA is probabilistic and does not provide a hard success-latency guarantee. Exhaustion with empty `dead` and `imposters` sets is not proof of corruption. Monitor retry counts and latency; increasing the attempt cap trades availability for resource use and worst-case response time.

### T-16: Integration Artifact in Production

Attack:

An operator deploys the integration image, exposing the failure-injection module used to corrupt, demote, delete, or replace test key state.

Mitigation:

- Regular `shadowJar` and `dockerBuild` include only selected production platforms and features.
- `:integration-tests:failure-injection` is wired only into `shadowJarIntegration` and `dockerBuildIntegration`.
- The integration image uses the separate `exploit/tkeeper:dev` tag.

Residual risk:

Build separation cannot prevent an operator from deploying the wrong artifact. Production admission and release policy must reject the integration jar and `exploit/tkeeper:dev` image.

### T-17: Downstream Proof Misuse

Attack:

A downstream service accepts a valid signature for the wrong identity, executes a payload that differs from the governed intent, relies on unsigned fields, or replays a previously valid proof.

Mitigation:

- Verifiers pin the expected identity or public key.
- The executed effect is reconstructed from the exact governed command.
- Security-relevant context is included in the signed intent or checked before execution.
- Nonces, expiry, sequence numbers, or idempotency keys are enforced where replay matters.
- Custom-authority integrations reject or ignore undeclared fields before execution.

Residual risk:

TKeeper cannot enforce a downstream path that misinterprets or bypasses its proof. Cryptographic validity does not establish business validity, freshness, or correct environment by itself.

## Security properties

| Property | Mechanism |
| --- | --- |
| No unilateral key use in threshold mode | `t-of-n` threshold protocols |
| No key reconstruction in normal threshold flows | FROST, GG20, threshold ML-DSA, and threshold ECIES use shares |
| Raw signing isolated | `arbitrary` cannot be mixed with concrete authorities |
| Typed signing policy | authorities materialize commands before signing |
| Authority immutability | digest-pinned OCI references |
| Four eye binding | approver signatures over operation hash |
| Byzantine detection | protocol proofs, DLEQ checks, imposter reporting |
| Sealed state | protected operations refused until unseal |
| Storage confidentiality | DEK/KEK envelope encryption |
| Storage integrity | signed key and metadata records |
| Audit integrity | Ed25519-signed events |

## Operational checklist

- Use short-lived JWTs.
- Configure the expected JWT issuer and audience explicitly.
- Keep dev token mode out of production.
- Avoid broad wildcard permissions.
- Treat `arbitrary` keys as raw signing keys.
- Use digest-pinned OCI authorities.
- Review Asset Inventory exports.
- Distribute Shamir shares across separate operators.
- Restrict HSM, AWS KMS, and Google Cloud KMS access to TKeeper identities.
- Enable audit with more than one sink.
- Watch `imposters` and `dead` fields after failed threshold operations.
- Put rate limiting in front of public endpoints.
