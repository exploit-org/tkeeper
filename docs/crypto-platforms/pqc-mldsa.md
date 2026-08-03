# PQC ML-DSA

The `pqc` platform provides:

- `MLDSA44`
- `MLDSA65`
- `MLDSA87`
- mono ML-DSA key generation and signing
- threshold ML-DSA DKG
- threshold ML-DSA signing
- trusted-dealer import
- quorum promotion

Build example:

```bash
./gradlew shadowJar -Pkeeper.platforms=pqc
```

## Authority model

ML-DSA changes the signature algorithm, not the authority model.

The same identity rules apply:

- attach authorities to the key identity
- materialize the command into an understood intent
- evaluate policy
- produce proof only after approval

Use `MLDSA` as the signature scheme for ML-DSA algorithms.

## Threshold protocol

Threshold signing follows the three-round construction in
[Efficient Threshold ML-DSA](https://inria.hal.science/hal-05442192v1/document):
parties commit to their sampled value, reveal it after all commitments are
fixed, and produce per-party rejection-sampled responses for a challenge bound
to the aggregate commitment and message. The combiner applies the ML-DSA norm
and hint bounds and verifies the final standard ML-DSA signature before release.

TKeeper additionally binds each attempt to an exact configured signer set, the
stored aggregate public key, materialized message, and one-shot session state.
The adversarial regressions and their limits are listed in
[Security Assurance](../security-model/security-assurance.md).

## Signing availability

Threshold ML-DSA signing can abort during rejection sampling even when peers are healthy. TKeeper retries with fresh session state up to:

```text
keeper.session.mldsa.max-rounds
```

The default is `12`.

If the cap is exhausted, TKeeper returns:

```text
SESSION_MAX_ROUNDS_EXCEEDED
```

Treat this as an availability outcome first. It is not automatic evidence that a peer is corrupt.

## Latency planning

Increasing `keeper.session.mldsa.max-rounds` increases the chance of success but also increases worst-case latency and resource use.

For production:

- keep the cap bounded
- set end-to-end request deadlines
- monitor retry counts and latency
- alert on repeated exhaustion

## Refresh and rotate

ML-DSA refresh advances the generation while carrying each peer's existing share and public key forward unchanged. It does not replace shares or refresh cryptographic material.

Use rotate or a new DKG when new ML-DSA material is required.

## Import and promotion

Trusted-dealer import and quorum promotion must store the aggregate ML-DSA public key as platform side state. Without that side state, later public-key checks and threshold protocols cannot prove the same key identity state.
