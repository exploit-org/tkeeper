# Backup and recovery

Each TKeeper peer owns local state. Cluster quorum is not a backup: surviving peers may keep operations available, but they do not make loss or rollback of one peer's database harmless.

## Recovery assets

The recovery plan must account for:

| Asset | Why it is needed |
| --- | --- |
| Peer database | encrypted key shares, generations, authorities, peer identity, integrity state, and platform side state |
| Runtime configuration | peer id, cluster topology, TLS, auth, selected features, platforms, and seal provider |
| Seal dependency | Shamir shares, HSM key, or cloud KMS key and its authorization path |
| TLS and trust material | public/internal API identity and peer connectivity |
| Audit integrity public keys | verification of retained audit events across integrity-key versions |
| Authority artifacts | exact digest-pinned policy and intent documents referenced by identities |

Back up each peer independently. Do not collect enough peer databases, unseal shares, or seal credentials into one backup account or location to defeat the threshold and seal boundaries.

## Snapshot rules

- Use a storage snapshot procedure validated for the peer database. Do not assume an arbitrary live filesystem copy is consistent.
- Encrypt backups and restrict restore access as tightly as live key-share storage.
- Record the TKeeper version, artifact digest, features, platforms, peer id, and snapshot time with each backup.
- Protect backups from silent rollback or replacement and retain the audit trail for backup and restore operations.
- Test access to external HSM or KMS keys; a database backup without its seal dependency may be intentionally unrecoverable.

## Restore validation

Restore a peer in an isolated environment before reconnecting it to the cluster.

1. Use the expected TKeeper artifact and configuration for that peer id.
2. Restore the database and required TLS/trust material.
3. Confirm the configured seal provider can unseal the restored state.
4. Check node status, inventory integrity, public keys, active generations, authorities, and platform side state.
5. Compare the restored generation state with healthy peers and the audit history.
6. Rejoin only after the state difference is understood.

An older backup may represent a generation that the cluster has already rotated, refreshed, destroyed, or repaired. Do not run consistency fix as an automatic restore step; use it only when the operator can establish which quorum state is safe.

## Recovery objectives

Define and test separately:

- loss of one peer while quorum remains available
- loss of a peer database with its seal dependency intact
- seal-provider outage with peer data intact
- rollback to an older peer snapshot
- loss of an audit sink or integrity-key history
- regional failure affecting multiple peers or recovery operators

If the recovery design cannot restore enough independent shares and seal dependencies, document key loss as the expected outcome. If recovery storage contains enough material to use the identity unilaterally, document that storage as part of the key-custody boundary.
