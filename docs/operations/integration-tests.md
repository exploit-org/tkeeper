# Integration Tests

Run the complete release verification with:

```bash
./gradlew releaseGate
```

This runs all root and module unit tests, verifies production/test artifact isolation, builds both test images, and executes the functional integration suite. Performance benchmarks remain separate.

Build both test images from the repository root:

```bash
./gradlew buildTestContainers
```

This creates `exploit/tkeeper:dev` and `exploit/tkeeper:production-it`. Run the complete functional suite with:

```bash
./gradlew :integration-tests:functional:test
```

Functional tests reuse the current images and do not rebuild them. Re-run `buildTestContainers` after changing application code, dependencies, or Dockerfiles. The test task always executes when requested instead of treating the external container state as `UP-TO-DATE`.

Run one class with:

```bash
./gradlew :integration-tests:functional:test \
  --tests 'org.exploit.test.functional.ProductionTransportSecurityTests'
```

Do not pass `keeper.features` or `keeper.platforms` to `buildTestContainers`. The development integration artifact uses its own classpath and includes:

- every production feature
- development authentication
- every platform
- the test-only failure-injection module

The production transport test image uses the production UBI Dockerfile and excludes development authentication and failure injection. Regular `shadowJar` and `dockerBuild` also exclude failure injection.

See [`../../integration-tests/README.md`](../../integration-tests/README.md) for local requirements and Testcontainers setup.
