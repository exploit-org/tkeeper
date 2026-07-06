# Integration Tests

This project uses **Testcontainers** to run integration tests against a multi-node TKeeper cluster defined via Docker Compose.

The test harness starts the Compose stack, waits for the keeper API ports to become available, and collects container logs with per-service prefixes (`keeper-1`, `keeper-2`, `keeper-3`).

The Compose runtime is resolved automatically:

- Prefer `docker-compose` (Compose v1) when available
- Fallback to `docker compose` (Compose v2)

---

## Requirements

- Docker Engine
- Docker Compose:
  - `docker-compose` **or**
  - `docker compose`
- Java **25**

---

## Running tests

### Build test docker image
Run from root project directory:
```bash
./gradlew dockerBuildIntegration
```
The integration image always includes all production features, `platform-ecc`, `platform-pqc`, and the test-only `:integration-tests:failure-injection` module. Regular runtime builds never include failure injection.

Do not add `-Pkeeper.features=all` or `-Pkeeper.platforms=...`; `dockerBuildIntegration` does not need them because its dedicated `shadowJarIntegration` classpath always contains the complete integration runtime.

Run the functional suite:

```bash
./gradlew :integration-tests:functional:test
```

Run a specific test class:

```bash
./gradlew :integration-tests:functional:test --tests "org.exploit.test.functional.{ClassName}"
```

Run performance tests separately:

```bash
./gradlew :integration-tests:performance:test
```

See available functional test classes in [tests](functional/src/test/kotlin/org/exploit/test/functional/).

---

## Notes
Client with `idx = 3` has disabled coordinator (so it can't make generate/rotate/refresh, sign, encrypt/decrypt, destroy & consistency fix requests)

Client with `idx = 2` uses `hsm` as seal provider

## macOS notes (Colima)

On macOS, Docker **MUST** be provided by Colima. If your setup uses a non-default Docker socket, configure it via environment variables (`DOCKER_HOST`) before running tests. See [build.gradle](build.gradle) for details.
