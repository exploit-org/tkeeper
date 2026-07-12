# Integration tests

The integration suites run against a multi-node TKeeper cluster managed by Docker Compose and Testcontainers. The harness waits for public API ports and prefixes collected container logs by service name.

## Requirements

- Java 25
- Docker Engine
- `docker-compose` or `docker compose`
- Colima on macOS; the Gradle harness configures its Docker socket

## Build the integration image

From the repository root:

```bash
./gradlew dockerBuildIntegration
```

Do not pass `keeper.features` or `keeper.platforms`. The dedicated integration classpath always includes:

- every production feature
- `platform-ecc` and `platform-pqc`
- the test-only `:integration-tests:failure-injection` module

Regular `shadowJar` and `dockerBuild` artifacts do not include failure injection. Never deploy the integration image as a production runtime.

## Run suites

Functional tests:

```bash
./gradlew :integration-tests:functional:test
```

One class:

```bash
./gradlew :integration-tests:functional:test \
  --tests 'org.exploit.test.functional.SignatureTests'
```

Performance tests are separate:

```bash
./gradlew :integration-tests:performance:test
```

The functional suite is split by boundary:

| Class | Coverage |
| --- | --- |
| `SignatureTests` | ECC and ML-DSA signing and verification |
| `KeyLifecycleTests` | create, refresh, rotate, and PQC-specific lifecycle behavior |
| `AuthorityPolicyTests` | typed authority materialization and policy decisions |
| `FailureInjectionTests` | corruption, demotion, and consistency recovery |
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

## macOS

The current Gradle harness expects Colima. It uses `COLIMA_SOCKET_ENV` when set, otherwise `~/.colima/default/docker.sock`, and configures the Testcontainers socket override automatically.
