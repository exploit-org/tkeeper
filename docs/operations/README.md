# Operations

Read:

- [Monitoring](monitoring.md)
- [Troubleshooting](troubleshooting.md)
- [Integration Tests](integration-tests.md)
- [Failure Injection](failure-injection.md)
- [Error Tracking](error-tracking.md)

Operationally, watch the authority path:

```text
auth -> permission -> authority -> policy -> audit -> quorum/session -> proof
```

If any stage fails, TKeeper should fail closed: no proof is produced.

Operational dashboards should distinguish an intentional denial from loss of service. See [Monitoring](monitoring.md) for the signals and [Troubleshooting](troubleshooting.md) for stage-by-stage diagnosis.
