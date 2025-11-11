# TKeeper

TKeeper is a peer-to-peer threshold KMS with no trusted dealer. Each node stores encrypted key **shares** (Shamir secret sharing + MPC); the full private key is never reconstructed in memory or on disk.

**How it works (short):**
- Configured as **t-of-n** (t > 1 and t < n): any **t** of **n** nodes are required to perform an operation.
- Nodes use DKG/MPC to collectively generate keys and perform **signing**, **encryption**, and **decryption** without reconstructing the key.
- Shares are stored encrypted in sealed local storage (RocksDB-backed).
- **If shares are compromised**, a resharing procedure can replace them so stolen shares become useless, remaining same private key. This is possible thanks to polynomial nature of Shamir secret sharing.

**Capabilities:** distributed key generation; threshold sign; threshold encrypt; threshold decrypt.
**Security:** data remains protected as long as fewer than **t** nodes are compromised.

### What will be described in this document
This document describes TKeeper's audit logging capabilities, including the structure of audit events, integrity mechanisms, supported sinks for audit data, verification procedures, operational rules, and regulatory alignment.
## Audit logging
**AuditEvent** is the structured payload. Each line also carries a detached signature. Fields not relevant to a specific operation can appear as `null`. TKeeper does not store request bodies; when a body is provided, only a cryptographic digest is recorded.

| Field                              | Includes                                                             |
|------------------------------------|----------------------------------------------------------------------|
| `id`                               | Unique identifier of the audit event.                                |
| `peerId`                           | Identifier of the node that emitted the event.                       |
| `integrityKeyVersion`              | Version of the Ed25519 integrity key used for signature.             |
| `timestamp`                        | Event time in epoch milliseconds.                                    |
| `event`                            | Event category or name describing the action.                        |
| `auth.subject`                     | Authenticated subject for the request when applicable.               |
| `context.sid`                      | Session identifier for MPC-style operations when used.               |
| `request.method`                   | HTTP method when applicable.                                         |
| `request.path`                     | HTTP path when applicable.                                           |
| `request.remoteAddress`            | Source address observed by the server when applicable.               |
| `crypto.algo \| kid \| curve`      | Cryptographic context of the action when applicable.                 |
| `digest.purpose`                   | Label of the hashed content (for example, `audit` or `requestBody`). |
| `digest.hmacKeyVersion`            | Version of the local HMAC key used for body hashing.                 |
| `digest.bodyHash.alg`              | HMAC algorithm identifier (`HMAC_SHA256`).                           |
| `digest.bodyHash.value64`          | Base64 of HMAC-SHA256 over the request body bytes.                   |
| `outcome.statusCode`               | Operation status code.                                               |
| `outcome.error \| outcome.details` | Error type and brief details when the operation fails.               |

**SignedLine** consists of the `event` and a `signature` which is Base64 of `Ed25519(event_bytes_utf8)`.

## 3. Integrity and Signing
Every line carries a detached signature produced with Ed25519 over the exact UTF-8 JSON bytes of the *event* object.
The signature is encoded in Base64 and stored alongside the event.

The field `integrityKeyVersion` identifies the active integrity key at emission time. Multiple versions can be maintained for verification.

When a request includes a body, TKeeper records `digest.bodyHash` as HMAC-SHA256 using a local, non-exportable key together with its version. The body itself **is not stored**.

## 4. Audit Sinks and Enforcement
TKeeper supports 2 audit sinks that can operate simultaneously: **File sink** and **Socket sink**.
All produced audit lines have `NDJSON` (Newline Delimited JSON) format, e.g.:

```ndjson
{"event":{...},"signature":"..."}
{"event":{...},"signature":"..."}
```

> At least one sink must be available when audit is enabled. \
> If no sink can accept an audit line, the associated action is denied. \
> Before any secured request is processed, TKeeper verifies the availability of sinks.

### File sink
Audit lines are written to local files in NDJSON format. Files are rotated based on size and optionally time. Retention policies can be configured based on file count and age. Optionally, rotated files can be compressed with Gzip.

| Field              | Default   | Meaning                                  |
|--------------------|-----------|------------------------------------------|
| `directory`        | `audit`   | Destination directory for NDJSON files.  |
| `extension`        | `.ndjson` | Filename extension.                      |
| `maxFileSizeBytes` | `64 MiB`  | Size threshold for rotation.             |
| `prefix`           | `audit`   | File name prefix.                        |
| `rollEvery`        | —         | Time-based rotation interval when set.   |
| `maxFiles`         | `10`      | Retention count for rotated files.       |
| `retentionDays`    | —         | Retention period by age when set.        |
| `gzip`             | `false`   | Compress rotated files when enabled.     |
| `fsync`            | `false`   | Request fsync after writes when enabled. |

### Socket sink
Audit lines are sent over a persistent TLS-encrypted TCP connection to a remote collector (e.g 
. Lines are transmitted as NDJSON with `\n` line delimiters. The connection is retried with exponential backoff when broken.

| Field                  | Default     | Meaning                              |
|------------------------|-------------|--------------------------------------|
| `host`                 | `localhost` | Collector host name.                 |
| `port`                 | `443`       | Collector TCP port.                  |
| `connectTimeoutMillis` | `2000`      | TCP connect timeout in milliseconds. |
| `readTimeoutMillis`    | `2000`      | Read timeout in milliseconds.        |
| `tcpNoDelay`           | `true`      | Disable Nagle’s algorithm.           |
| `keepAlive`            | `true`      | Enable TCP keep-alive.               |
| `soLingerSeconds`      | `0`         | Socket linger time in seconds.       |
| `tls`                  | —           | TLS configuration when present.      |

**TLS parameters**

| Field                     | Default            | Meaning                                                   |
|---------------------------|--------------------|-----------------------------------------------------------|
| `protocols`               | `TLSv1.3, TLSv1.2` | Allowed TLS versions.                                     |
| `verifyHostname`          | `true`             | Verify the server certificate against host name.          |
| `trust.mode`              | `system`           | Trust model selection; `truststore` loads a custom store. |
| `trust.path`              | —                  | Trust store path when `trust.mode` is `truststore`.       |
| `trust.password`          | —                  | Password for the trust store.                             |
| `trust.type`              | `JKS`              | Trust store type.                                         |
| `spkiPins`                | —                  | List of Base64 SPKI pins if pinning is configured.        |
| `client.keystorePath`     | —                  | Client certificate keystore path for mTLS.                |
| `client.keystorePassword` | —                  | Client keystore password.                                 |
| `client.keystoreType`     | `PKCS12`           | Client keystore type.                                     |

## 6. Verification
**All verification is performed by TKeeper.** Clients submit audit lines to the verification interface; TKeeper verifies the Ed25519 signature against the exact event bytes using the integrity key referenced by the event, and checks the HMAC body digest when present. Access to verification endpoints is restricted to authorized callers with the dedicated permission.
> You should send verify request to the same TKeeper instance, that produced the exact audit line. \
> For this, check `peerId` field in

Endpoints:
- `POST /v1/keeper/audit/verify` — verify a single `SignedLine`.
- `POST /v1/keeper/audit/verify/batch` — verify multiple `SignedLine` items.

## 7. Operational Rules
When audit is enabled, TKeeper checks that at least one audit method is available before processing a security-relevant action. If audit writing fails and no alternative method can accept the line, the action is denied and no information is returned.

## 8. Regulatory Alignment (Summary)
**ISO/IEC 27002:2022 8.15 (Logging).** Structured, integrity-protected audit trails support monitoring and investigation.  
**CIS Controls v8 – Control 8 (Audit Log Management).** Collection, protection, retention, and centralized ingestion are supported through the sinks.  
**PCI DSS v4.0 – Requirement 10.** The design provides tamper-evident audit trails and integration points for review and monitoring.  
**NIST SP 800-92.** Generation, protection, rotation, transport, and analysis align with enterprise log management guidance.  
**SOC 2 (AICPA TSC CC7).** Signed, attributable events underpin monitoring and investigative procedures.

## Appendix. Example Audit Record (NDJSON)
```json
{"event":{"id":"824e7891-c48b-4420-aca2-8285ad0f58ab","peerId":3,"integrityKeyVersion":0,"timestamp":1762366387318,"event":"event.frost.init","auth":{"subject":"keeper-1"},"context":{"sid":"df05ded8-c293-4d1b-a0c0-ba4c930afd14"},"request":{"method":"POST","path":"/v1/frost/init","remoteAddress":"/127.0.0.1:60872"},"crypto":{"kid":"INTEGRITY","curve":"ED25519"},"digest":{"purpose":"audit","hmacKeyVersion":1,"bodyHash":{"alg":"HMAC_SHA256","value64":"rhEWak/lFBaETQQVmsHO48GHd8BNjPJFfZNEHFxlGOc="}},"outcome":{"statusCode":204}},"signature":"StuFFu4QQGEWPMHbXhfUrNSl8kQ7zHp458SjyLcg3jiGXOyTswgq+bKpUvyoQx4V6tpHp1VKBOkflPgua8N9AA=="}
```