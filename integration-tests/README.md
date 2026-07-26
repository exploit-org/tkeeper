# Integration tests

The integration suites run against multi-node TKeeper clusters managed by Testcontainers. Most functional tests use Docker Compose; production transport tests use an isolated generated-TLS topology.

## Requirements

- Java 25
- Docker Engine
- `docker-compose` or `docker compose`
- Colima on macOS; the Gradle harness configures its Docker socket

## Run suites

Run the complete release verification, including all module tests, artifact isolation, test-container builds, and functional tests:

```bash
./gradlew releaseGate
```

Performance benchmarks are intentionally excluded from `releaseGate`.

Build both required images from the repository root:

```bash
./gradlew buildTestContainers
```

This builds:

- `exploit/tkeeper:dev` contains all features plus failure injection for the Compose suites;
- `exploit/tkeeper:production-it` uses the production UBI Dockerfile and a production-only ECC jar for transport security tests.

Run all functional tests:

```bash
./gradlew :integration-tests:functional:test
```

Functional tests do not rebuild the images. Re-run `buildTestContainers` after changing application code, dependencies, or Dockerfiles. Repeated and filtered test runs reuse the current images but always execute when requested.

Run one class with:

```bash
./gradlew :integration-tests:functional:test \
  --tests 'org.exploit.test.functional.SignatureTests'
```

Performance tests are separate and do not use the automatic functional-suite image build:

```bash
./gradlew :integration-tests:performance:test
```

Do not pass `keeper.features` or `keeper.platforms`. The dedicated integration classpath always includes:

- every production feature
- the explicit opt-in `:features:auth-dev` module
- `platform-ecc` and `platform-pqc`
- the test-only `:integration-tests:failure-injection` module

Regular `shadowJar` and `dockerBuild` artifacts do not include failure injection. Never deploy the integration image as a production runtime.

Verify that the production transport test artifact excludes `auth-dev` and failure injection while the integration artifact contains both:

```bash
./gradlew artifactIsolationTest
```

The functional suite is split by boundary:

| Class | Coverage |
| --- | --- |
| `SignatureTests` | ECC and ML-DSA signing and verification |
| `KeyLifecycleTests` | create, refresh, rotate, and PQC-specific lifecycle behavior |
| `AuthorityPolicyTests` | typed authority materialization and policy decisions |
| `FailureInjectionTests` | corruption, demotion, and consistency recovery |
| `ProductionTransportSecurityTests` | generated PKI, public HTTPS/JWT, HTTPS JWKS rotation, internal mTLS/SPKI, and fail-closed startup variants |
| `QuorumPromotionTests` | mono-to-threshold promotion |
| `KeyImportTests` | trusted-dealer import |
| `FourEyeControlTests` | approval binding and replay rejection |
| `SealManagerTests` | seal and unseal providers |
| `ECIESTests` | optional ECIES paths |

See the [functional test sources](functional/src/test/kotlin/org/exploit/test/functional/) for the complete set.

## Test topology

- client index `3` targets a peer with coordinator endpoints disabled
- client index `2` targets a peer using the HSM seal provider
- test execution is single-fork and JUnit parallel execution is disabled

When diagnosing a cluster failure, use the prefixed `keeper-1`, `keeper-2`, and `keeper-3` logs to identify the peer and protocol stage that failed.

## Production transport coverage

`ProductionTransportSecurityTests` starts a separate three-node topology from the production UBI image and a jar that excludes development authentication and failure injection. The fixture generates an ephemeral CA, per-peer PKCS12 identities, trust stores, JWT signing keys, and an HTTPS JWKS endpoint for every run. No private test credentials are stored in the repository.

The topology exercises:

- public HTTP/2 over TLS 1.2 and 1.3, rejection of plaintext, wrong CAs, and wrong hostnames;
- JWT claim, signature, algorithm, subject, audience, permission, and development-token negatives;
- HTTPS JWKS rotation, old-key revocation, and last-known-good retention on every peer;
- internal mTLS client-certificate presence, CA, EKU, signed peer authentication, and distinct SPKI bindings;
- outbound peer TLS CA and hostname validation through the real keeper Jetty client;
- threshold DKG/sign/verify, peer restart, and recovery after TLS or pin failures;
- PEM hot rotation with continuous new connections and a deliberately mismatched cert/key interval;
- fail-closed startup for unsafe TLS, peer URL, JWKS/OIDC URL, and SPKI configurations.

The migration suites additionally verify V1 transaction logging, readiness/sealed behavior, audit continuity, persistence across container restart, and rejection of synthetic migration roots.

Run only this class with:

```bash
./gradlew :integration-tests:functional:test \
  --tests 'org.exploit.test.functional.ProductionTransportSecurityTests'
```

## macOS

The current Gradle harness expects Colima. It uses `COLIMA_SOCKET_ENV` when set, otherwise `~/.colima/default/docker.sock`, and configures the Testcontainers socket override automatically.
