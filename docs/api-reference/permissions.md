# Permissions

Permissions are explicit strings. Most key permissions are scoped by key id.

## Key permissions

```text
tkeeper.key.{keyId}.public
tkeeper.key.{keyId}.sign
tkeeper.key.{keyId}.verify
tkeeper.key.{keyId}.encrypt
tkeeper.key.{keyId}.decrypt
tkeeper.key.{keyId}.destroy
```

Wildcards are supported:

```text
tkeeper.key.*.sign
tkeeper.key.*.*
```

Negative permissions remove broad grants:

```text
tkeeper.key.*.sign
-tkeeper.key.hot-wallet.sign
```

## System and lifecycle permissions

| Permission | Allows |
| --- | --- |
| `tkeeper.system.init` | initialize keeper |
| `tkeeper.system.unseal` | unseal keeper |
| `tkeeper.system.seal` | seal keeper |
| `tkeeper.dkg.create` | create key identity |
| `tkeeper.dkg.rotate` | rotate key identity |
| `tkeeper.dkg.refresh` | refresh key identity |
| `tkeeper.storage.write` | trusted-dealer import |
| `tkeeper.quorum.promote` | promote mono to threshold |
| `tkeeper.consistency.fix` | repair threshold state |
| `tkeeper.recover` | run share-recovery protocols |
| `tkeeper.expired.view` | read key-expiration indexes |
| `tkeeper.compliance.inventory` | read asset inventory |
| `tkeeper.integrity.rotate` | rotate audit integrity key |
| `tkeeper.audit.log.verify` | verify signed audit log lines |
| `tkeeper.control.system` | read control-plane system state |
| `tkeeper.control.sinks` | read control-plane audit sink state |

## Assignment guidance

- Give signing services only the key identities they need.
- Keep lifecycle permissions out of normal signing clients.
- Keep import permissions highly restricted.
- Restrict consistency repair, share recovery, and quorum promotion to recovery operators.
- Treat control-plane read permissions as sensitive operational metadata.
- Keep destroy permissions separate from rotate and refresh.
- Use negative permissions to carve high-risk identities out of broad grants.
- Review wildcard grants before production.

See [Authentication and Authorization](../security-model/authentication-authorization.md) for JWT claims and matching behavior.
