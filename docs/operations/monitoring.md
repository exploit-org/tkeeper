# Monitoring

Monitor the authority path, not only process uptime. A ready node can still be unable to authorize an action because policy, audit, platform, or quorum state is failing.

Use service logs, API outcomes, signed audit events, and infrastructure telemetry together. Do not treat audit logs as a high-volume metrics transport or ordinary logs as compliance evidence.

## Core signals

| Area | Measure | Why it matters |
| --- | --- | --- |
| Node | liveness, readiness, sealed state, restart-required state | distinguishes process health from operational availability |
| Public API | request rate, latency, status, stable error enum | shows caller-visible health |
| Identity use | sign/decrypt outcomes by key id, authority, scheme, algorithm, and mode | finds failures isolated to an identity or crypto path |
| Authority | invalid authority/artifact/intent and policy decisions | detects schema drift, missing features, and denied actions |
| Quorum | peer availability, session latency, timeouts, `dead`, `imposters` | shows loss of threshold capacity or Byzantine evidence |
| Lifecycle | create, import, promote, rotate, refresh, destroy, consistency repair | these operations change custody or key state |
| Audit | sink availability, write latency, rejected events, verification failures | audit enforcement may block protected operations |

Avoid high-cardinality labels for raw payloads, signatures, nonces, tokens, or arbitrary error details. Key ids and authority ids may also be sensitive inventory; expose them only to the monitoring boundary that needs them.

## Separate denial from outage

Do not combine all non-success outcomes into one availability rate.

- `UNAUTHENTICATED`, `ACCESS_DENIED`, and `POLICY_VIOLATION` are security decisions. Spikes may indicate attack, client drift, or a policy rollout problem.
- `KEEPER_SEALED`, audit failures, peer loss, timeouts, and exhausted session attempts are availability outcomes.
- `INVALID_AUTHORITY_ARTIFACT` or a missing algorithm provider often indicates artifact/configuration drift.
- `imposters` is security evidence; an empty list is inconclusive.

Define signing availability over well-formed, authenticated, authorized requests that policy would allow. Track denied requests separately so a successful security control is not reported as downtime.

## Quorum capacity

Alert before the cluster loses quorum. Track healthy and unsealed peers against the configured threshold, not just against total node count.

Useful views:

- remaining peer failures before quorum loss
- session success and latency by protocol
- peer-specific timeout or imposter frequency
- generation consistency and repair events
- version, feature, and platform drift between peers

A single unhealthy peer may not break a `t-of-n` operation, but it removes fault tolerance and should not remain invisible until the next peer fails.

## ML-DSA

Threshold ML-DSA requires separate retry telemetry:

- attempts per completed signature
- end-to-end signing latency
- `SESSION_MAX_ROUNDS_EXCEEDED` rate
- request deadline exhaustion
- correlation with peer or generation changes

An isolated rejection-sampling abort is expected. A sustained shift in the attempt distribution or repeated exhaustion is an availability incident and may justify protocol-level investigation. Raising `keeper.session.mldsa.max-rounds` increases worst-case latency and work; it is not a substitute for diagnosis.

## Audit

Monitor both delivery and integrity:

- at least one required sink accepts events
- write latency remains below the configured timeout
- verification of stored audit records succeeds
- sink backpressure and reconnects do not accumulate
- integrity-key rotation is expected and recorded

If audit enforcement is enabled, alert before sink failure consumes the entire operation timeout budget.

## Page immediately

- a production node starts with developer authentication
- an integration artifact or failure-injection surface appears in production
- the internal API becomes reachable outside the peer network
- the cluster is at or below quorum capacity for a high-impact identity
- required audit sinks cannot accept events
- audit verification fails
- an unexpected import, promotion, destroy, integrity-key rotation, or consistency repair occurs
- `imposters` is non-empty
- policy or authority changes unexpectedly enable raw `arbitrary` signing

Route expected business denials to security analytics unless their volume or source crosses an incident threshold; do not page on every rejected request.
