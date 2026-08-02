# Asset Inventory

Asset inventory is the read model for keys.

Use it when you need to answer:

- what keys exist
- which generation is active
- which authorities are attached
- which asset owner owns the key
- whether a key is destroyed
- whether old generations are included

Endpoint:

```http
GET /v1/keeper/compliance/inventory
```

Query params:

| Param | Meaning |
| --- | --- |
| `logicalId` | filter by key id |
| `assetOwner` | filter by owner |
| `historical` | include old generations |
| `lastSeen` | cursor |
| `limit` | max 200 |

Required permission:

```text
tkeeper.compliance.inventory
```

Example:

```bash
curl \
  -H 'X-DEV-TOKEN: dev-token' \
  'http://localhost:8080/v1/keeper/compliance/inventory?assetOwner=customer-42&historical=true'
```

Response shape:

```json
{
  "inventory": {
    "generatedAt": 1760000000000,
    "peerId": 1,
    "threshold": 2,
    "totalPeers": 3,
    "items": [
      {
        "logicalId": "deployment-signing",
        "status": "ACTIVE",
        "currentGeneration": 1,
        "authorities": [
          {
            "id": "production-deployment",
            "oci": "oci://registry.example/verdict/authorities/production-deployment@sha256:..."
          }
        ],
        "algorithm": "SECP256K1",
        "createdAt": 1760000000000,
        "updatedAt": 1760000000000,
        "policy": null,
        "hasActiveKey": true,
        "lastPendingGeneration": null,
        "assetOwner": "customer-42",
        "tampered": false
      }
    ]
  },
  "nextCursor": null,
  "hasMore": false
}
```

Asset Inventory is exportable from the control-plane UI when `:features:ui` is enabled.

See [Control Plane UI](../deployment/control-plane-ui.md).

`tampered = true` means local signed metadata failed integrity verification while inventory was being read.

Treat `tampered = true` as a security incident, not a stale-data warning. Stop relying on that node's inventory or key state until the cause is understood.

Inventory is a control-plane read model. It does not replace comparison of peer generation state, audit history, or external asset ownership records during reconciliation.

## Common problems

### Inventory is empty

Check permissions first. Then check whether the key was created on this cluster and whether you are filtering by `assetOwner`, `logicalId`, or cursor.
