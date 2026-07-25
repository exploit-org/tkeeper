# Build and Features

TKeeper has two build-time selectors:

- features: product surface such as authorities, ECIES, UI, and seal providers
- platforms: cryptographic algorithms and protocols

A usable production artifact must include at least one platform.

## Build all production modules

```bash
./gradlew :build -Pkeeper.features=all -Pkeeper.platforms=all
```

The root `build` task runs the normal verification lifecycle and produces the deployable fat jar through `shadowJar`.

Equivalent:

```bash
./gradlew :build -Pkeeper.features.all=true -Pkeeper.platforms.all=true
```

The jar lands under:

```text
build/libs/tkeeper-2.2.0.jar
```

TKeeper requires Java 25.

## Build a smaller artifact

Example: EVM signing, ECIES, and the UI:

```bash
./gradlew :build -Pkeeper.features=authority-evm,ecies,ui -Pkeeper.platforms=ecc
```

Example: ML-DSA only:

```bash
./gradlew :build -Pkeeper.platforms=pqc
```

Feature names match child project names. The module `:features:authority-evm` is selected with `authority-evm`.

## Feature and platform matrix

| Need | Feature selector | Platform selector |
| --- | --- | --- |
| EVM transaction authority | `authority-evm` | `ecc` |
| Bitcoin transaction authority | `authority-bitcoin` | `ecc` |
| X.509 certificate authority | `authority-x509` | `ecc` |
| ECIES | `ecies` | `ecc` |
| Control-plane UI | `ui` | any required crypto platform |
| AWS KMS seal provider | `seal-aws` | any required crypto platform |
| Google Cloud KMS seal provider | `seal-gcloud` | any required crypto platform |
| Developer token authentication | `auth-dev` (explicit, non-production) | any required crypto platform |
| ML-DSA identities | none | `pqc` |
| Everything production | `all` | `all` |

Features with platform dependencies require the matching platform. The build should fail early instead of producing an artifact with a missing runtime provider.

`auth-dev` is deliberately excluded from `all`. A local-development artifact must request it explicitly:

```bash
./gradlew :build -Pkeeper.features=auth-dev -Pkeeper.platforms=ecc
```

## Selection properties

| Scope | Features | Platforms |
| --- | --- | --- |
| Runtime jar | `keeper.features` | `keeper.platforms` |
| Docker build | `keeper.docker.features` | `keeper.docker.platforms` |
| Select all | `keeper.features.all=true` | `keeper.platforms.all=true` |

Comma-separated selectors accept short names such as `ecies`, `ecc`, and `pqc`. `all` selects every production module in that category.

## Docker

Build the production Docker image:

```bash
./gradlew dockerBuild -Pkeeper.features=all -Pkeeper.platforms=all
```

Production image tags:

```text
exploit/tkeeper:2.2.0
exploit/tkeeper:latest
```

The Dockerfile adds the JVM flag required by the FFI Java API:

```text
--enable-native-access=ALL-UNNAMED
```

Run the image:

```bash
docker run --rm \
  -p 8080:8080 \
  -p 9090:9090 \
  -v "$PWD/config:/etc/tkeeper:ro" \
  -v "$PWD/data:/var/lib/tkeeper" \
  -e KEEPER_CONFIG_LOCATION=/etc/tkeeper \
  exploit/tkeeper:2.2.0
```

## Integration image

Build the integration image with:

```bash
./gradlew dockerBuildIntegration
```

Do not pass `keeper.features` or `keeper.platforms` to this task. `dockerBuildIntegration` uses a dedicated classpath containing every production feature, `auth-dev`, every platform, and the test-only failure-injection module.

Never deploy the integration image as production runtime.

## Common failures

### Feature endpoint returns 404

The feature was not included in the artifact.

Rebuild with the required feature and platform.

### No provider for algorithm

The platform was not included in the artifact.

Rebuild with the required platform, for example:

```bash
./gradlew :build -Pkeeper.features=authority-evm -Pkeeper.platforms=ecc
```

### Native access warning

Add:

```text
--enable-native-access=ALL-UNNAMED
```

The Docker image already does this.
