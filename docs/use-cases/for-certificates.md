# For Certificates

Use TKeeper when use of a CA key must depend on an understood TBS certificate and explicit issuance policy.

Flow:

```text
certificate request
-> X.509 authority policy
-> optional four-eye approval
-> CA key signature
-> certificate accepted by downstream systems
```

Good candidates:

- internal CA operations
- workload identity certificates
- service certificates
- agent certificates
- high-risk certificate requests requiring approval

The boundary is the CA key identity. If issuing a certificate requires TKeeper, certificate creation can be tied to permissions, authority policy, quorum mode, and audit.

## Integration contract

The CA or enrollment service constructs the DER-encoded TBS certificate. TKeeper exposes supported certificate fields to policy and returns the CA signature after approval.

The surrounding PKI remains responsible for:

- authenticating and authorizing the enrollment request
- proof-of-possession checks where required
- serial-number allocation and uniqueness
- assembling and publishing the final certificate
- certificate transparency, revocation, renewal, and inventory

Relying systems must trust the expected CA identity and validate the finished certificate. A TKeeper signature does not make an otherwise invalid certificate acceptable.

Relevant docs:

- [X.509 Authorities](../signing-and-authorities/x509.md)
- [Four Eye Control](../security-model/four-eye-control.md)
- [Audit Logging](../security-model/audit-logging.md)
