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
- Java **21**

---

## Runing tests
First you need to build docker image. From root project directory call:
```bash
docker build -f integration-tests/docker/Dockerfile -t exploit/tkeeper:dev .
```

Run the full test suite:

```bash
./gradlew test
```

Run a specific test class:

```bash
./gradlew test --tests "org.exploit.tkeeper.test.{ClassName}"
```

See available test classes in [tests](src/test/kotlin/)

---

## macOS notes (Colima)

On macOS, Docker **MUST** be provided by Colima. If your setup uses a non-default Docker socket, configure it via environment variables (`DOCKER_HOST`) before running tests. See [build.gradle](build.gradle) for details.

