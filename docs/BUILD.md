# Building
## Requirements

TKeeper depends on several native libraries for cryptographic operations. Make sure the following are installed on the system:

- [libsodium](https://github.com/jedisct1/libsodium) – used for secure memory handling and Ed25519 point ops
- [libgmp](https://gmplib.org/) – used for arbitrary-precision arithmetic
- [libsecp256k1](https://github.com/bitcoin-core/secp256k1) – used for Secp256k1 point ops

Make sure these libraries are available in your environment and linked correctly.

> TKeeper doesn't require this libs on Windows x64, Linux x64, and macos Apple Silicon, as it includes precompiled native dependencies for these platforms.

---
## Build with Gradle

To build the application JAR:

```bash
./gradlew clean build
```

The output JAR will be located at:

```
build/libs/quarkus-app
```
To run it:

```bash
java -jar quarkus-run.jar
````

## Build with Docker

Dockerfile is located at `src/main/docker/Dockerfile.jvm`.

To build the Docker image:

```bash
docker build -f src/main/docker/Dockerfile.jvm -t tkeeper:latest .
```

This will produce a JVM-based container image ready to run TKeeper with default settings.

---