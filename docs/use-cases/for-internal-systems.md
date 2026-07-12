# For Internal Systems

Use TKeeper when an internal system should execute a sensitive action only after verifying authorization by a specific machine or workflow identity.

Flow:

```text
internal command
-> typed authority
-> policy
-> signature proof
-> backend verifies proof and executes
```

Good candidates:

- production maintenance actions
- typed service-to-service commands
- protected data export approval
- break-glass workflows
- privileged automation
- custom business approvals

Usually this uses `custom` typed authorities. The authority document defines the command shape and effects exposed to policy.

## Integration contract

The executing service should define a canonical command that contains every field that changes the effect. Typical context includes the operation, target resource, environment, requester, expiry, and nonce.

The service must then:

- accept only the expected TKeeper identity
- verify proof over the exact command it will execute
- reject or ignore no security-relevant unsigned fields
- enforce replay and idempotency rules
- keep any alternate administrative path at least as strongly controlled

For `custom` authorities, only declared fields become policy inputs. Do not let the backend act on extra JSON fields that TKeeper did not govern.

Relevant docs:

- [Arbitrary and Typed Authorities](../signing-and-authorities/arbitrary-and-typed.md)
- [Authorities](../signing-and-authorities/authorities.md)
- [Permissions](../api-reference/permissions.md)
