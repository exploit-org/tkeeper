# Status and Limitations

These boundaries are part of the security contract, not implementation footnotes.

## Current shape

TKeeper currently provides:

- mono and threshold key modes
- governed signing
- key lifecycle operations: DKG, import, refresh, rotate, destroy
- authority-based signing commands
- four-eye control for supported operations
- signed audit records and audit sink enforcement
- build-time feature selection
- build-time cryptographic platform selection
- ECC and ML-DSA platform support
- optional ECIES support when the ECIES feature is built
- optional ECC and ML-DSA peer-share recovery when the recovery feature is built

## Build-time module limits

Features and platforms are selected when the artifact is built.

If a feature is missing, the related endpoint or command type is unavailable. If a required platform is missing, the build should fail early or the runtime cannot find the algorithm provider.

Use the build docs before deploying a custom artifact:

- [Build and Features](../deployment/build-and-features.md)

## ML-DSA limits

Threshold ML-DSA signing is probabilistic. A healthy operation can abort during rejection sampling and retry with fresh session state.

The retry cap is controlled by:

```text
keeper.session.mldsa.max-rounds
```

The default is `12`.

If the cap is exhausted, TKeeper returns `SESSION_MAX_ROUNDS_EXCEEDED`. This is an availability outcome. It does not automatically prove that a peer is dead or malicious.

ML-DSA refresh advances the generation while carrying each peer's existing share and public key forward unchanged. It does not replace shares or refresh cryptographic material. Use rotate or a new DKG when new ML-DSA material is required.

## Failure injection

Failure injection is only for integration tests.

The integration image includes every default production feature, the explicit recovery and
development-authentication features, every platform, both recovery platform modules, and the
test-only failure-injection module. Regular production builds do not include failure injection;
recovery is included only when selected.

Do not deploy the integration image as a production runtime.

## Trusted dealer import

Trusted dealer import intentionally starts from reconstructed or externally held key material. Use it only when that trust model is acceptable.

Threshold mode after trusted dealer import still requires quorum for later operations, but the import path itself depends on the dealer and the imported material being trusted.

## Policy limits

TKeeper can enforce only the boundaries it controls.

It cannot prevent an action if:

- the downstream system accepts another key
- the caller can bypass the governed proof
- policy is checked but not bound to the signed intent
- broad permissions allow unintended operations
- operators enable dev authentication without protecting its token and permissions as production credentials

Cryptographic validity alone does not establish business validity, freshness, or replay safety. The verifier must accept the expected key, validate the exact governed payload, and enforce any nonce, expiry, environment, or idempotency rules required by the action.

## Operational limits

Threshold cryptography adds distributed-system failure modes:

- peers can be unavailable
- sessions can time out
- one peer can see a partial operation while another does not
- consistency repair may be needed after crashes or partitions
- latency depends on quorum participation and protocol rounds

These costs must be included in availability targets and incident runbooks.

Quorum is not backup. Each peer has local state and independent seal dependencies; recovery must preserve enough shares without collapsing them into one administrative failure domain.

Do not assume mixed-version peer compatibility. Validate the exact upgrade path and keep the cluster on a consistent artifact, feature set, and platform set.

## Security review boundary

TKeeper relies on Anvil for protocol-level cryptographic implementations. Review TKeeper docs for product behavior and operational controls. Review Anvil materials for protocol-level assumptions, proofs, and implementation details.
