# Build & Docker Image

TKeeper is built for Java 25.

Build the jar:

```bash
./gradlew shadowJar
```

This produces the core artifact only. Select at least one platform for a usable cryptographic runtime; without one, TKeeper has no key algorithm providers.

The jar lands under:

```text
build/libs/tkeeper-2.2.0.jar
```

Build with all production feature modules:

```bash
./gradlew shadowJar -Pkeeper.features=all -Pkeeper.platforms=all
```

This is equivalent to:

```bash
./gradlew shadowJar -Pkeeper.features.all=true -Pkeeper.platforms.all=true
```

Build with a small feature set:

```bash
./gradlew shadowJar -Pkeeper.features=authority-evm,authority-bitcoin,authority-x509,ecies,ui -Pkeeper.platforms=ecc
```

Single feature property:

```bash
./gradlew shadowJar -Pkeeper.feature.authority.evm=true -Pkeeper.platform.ecc=true
```

Feature modules are added separately at build time, so you include only the functionality your environment needs and avoid expanding the potential attack surface unnecessarily.

Feature names in `keeper.features` match the child project name. The module is `:features:authority-evm`; the build flag is `authority-evm`.

Platforms contain algorithm implementations and are selected independently from features:

| Platform | Gradle module | Build value |
| --- | --- | --- |
| Elliptic-curve algorithms | `:platform-ecc` | `ecc` |
| ML-DSA algorithms | `:platform-pqc` | `pqc` |

Features with cryptographic platform dependencies require the matching platform explicitly. The build fails early instead of producing a jar with an incomplete runtime graph. `authority-bitcoin`, `authority-evm`, `authority-x509`, and `ecies` currently require `-Pkeeper.platforms=ecc`.

Selection properties:

| Scope | Features | Platforms |
| --- | --- | --- |
| Runtime jar | `keeper.features` | `keeper.platforms` |
| Docker build | `keeper.docker.features` | `keeper.docker.platforms` |
| Select all | `keeper.features.all=true` | `keeper.platforms.all=true` |

Comma-separated selectors accept short names such as `ecies` and `ecc`; `all` selects every production module in that category.

Production features:

| Feature | Gradle name |
| --- | --- |
| AWS seal provider | `:features:seal-aws` |
| Google Cloud seal provider | `:features:seal-gcloud` |
| Bitcoin authorities | `:features:authority-bitcoin` |
| EVM authorities | `:features:authority-evm` |
| X.509 authorities | `:features:authority-x509` |
| Threshold ECIES | `:features:ecies` |
| Control-plane UI | `:features:ui` |

Build the Docker image:

```bash
./gradlew dockerBuild -Pkeeper.features=all -Pkeeper.platforms=all
```

The production Docker task tags:

```text
exploit/tkeeper:2.2.0
exploit/tkeeper:latest
```

The integration image task tags:

```text
exploit/tkeeper:dev
```

The feature and platform sets are build-time only.

The Dockerfile uses Red Hat UBI OpenJDK 25. It also adds the JVM flag needed by the FFI Java API:

```text
--enable-native-access=ALL-UNNAMED
```

Run the jar directly:

```bash
java \
  --enable-native-access=ALL-UNNAMED \
  -Dkeeper.config.location=/etc/tkeeper \
  -Dkeeper.dev.config.location=/etc/tkeeper \
  -jar build/libs/tkeeper-2.2.0.jar
```

Run the Docker image:

```bash
docker run --rm \
  -p 8080:8080 \
  -p 9090:9090 \
  -v "$PWD/config:/etc/tkeeper:ro" \
  -v "$PWD/data:/var/lib/tkeeper" \
  -e KEEPER_CONFIG_LOCATION=/etc/tkeeper \
  exploit/tkeeper:2.2.0
```

Build the integration image with:

```bash
./gradlew dockerBuildIntegration
```

This task does not need `keeper.features` or `keeper.platforms`. It uses `shadowJarIntegration`, which always contains every production feature, every platform, and the test-only `:integration-tests:failure-injection` module. `dockerBuild` and regular `shadowJar` never include failure injection.

## Frequent Problems

### Feature endpoint returns 404

The feature jar is not in the runtime jar.

Rebuild with the feature:

```bash
./gradlew shadowJar -Pkeeper.features=ecies,authority-evm -Pkeeper.platforms=ecc
```

### Feature requires a platform

Add the platform named by the Gradle error. For example:

```bash
./gradlew shadowJar -Pkeeper.features=authority-evm -Pkeeper.platforms=ecc
```

### Native access warning at startup

Add:

```text
--enable-native-access=ALL-UNNAMED
```

The Docker image already does this.
