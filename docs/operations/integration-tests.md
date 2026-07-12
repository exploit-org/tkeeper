# Integration Tests

The integration image is built with:

```bash
./gradlew dockerBuildIntegration
```

Do not pass `keeper.features` or `keeper.platforms` to this task. The integration artifact uses its own classpath and includes:

- every production feature
- every platform
- the test-only failure-injection module

Regular `shadowJar` and `dockerBuild` do not include failure injection.

See [`../../integration-tests/README.md`](../../integration-tests/README.md) for local requirements and Testcontainers setup.
