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
