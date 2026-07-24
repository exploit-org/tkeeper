# Failure Injection

Failure injection is test-only. It is wired into the integration artifact and must not be deployed in production.

It is used for scenarios such as:

- metadata tampering
- authority mutation
- policy mutation
- key material corruption
- pending generation deletion
- peer demotion and promotion recovery
- PQC share corruption and consistency repair

Build the integration image with:

```bash
./gradlew dockerBuildIntegration
```

Production builds use `shadowJar` or `dockerBuild` and do not include failure injection.
