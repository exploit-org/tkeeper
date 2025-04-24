# BitKeeper
*Threshold Signing Vault*

## Running the application
To run an app in HTTP mode simply run:

```bash
java -jar <runner>.jar
```

To enabld **CLI** mode, run:

```bash
java -Dquarkus.profile=cli -jar <runner>.jar 
```

#### NOTE
DON'T CHANGE `%cli` PROFILE CONFIG! HTTP SERVER SHOULD NOT BE ENABLED IN THIS MODE

## Configuration
Configuration example:

```yaml
"%cli":
  quarkus:
    http:
      insecure-requests: disabled
      host-enabled: false
      ssl-port: -1

keeper:
  idx: ${KEEPER_SERVICE_IDX}
  threshold: ${KEEPER_SERVICE_THRESHOLD}
  parallelism: ${KEEPER_SERVICE_PARALLELISM:4}
  database-path: ${KEEPER_DATABASE_PATH}
  session:
    gg20:
      expire: 15m
    frost:
      expire: 5m
  private-key: ${KEEPER_PRIVATE_KEY}
  peers:
    - idx: 1
      public-url: 'https://keeper1.example.com'
      public-key: 'NOOP'
```

### Definitions
- `idx` - index of the current keeper in the network
- `threshold` - threshold defined during shamir secret sharing
- `parallelism` - number of parallel threads for keeper while broadcasts
- `database-path` - path to the database file (!file)
- `session` - session settings
  - `gg20` - settings for GG20 session
    - `expire` - expiration time of the session
  - `frost` - settings for FROST session
    - `expire` - expiration time of the session
- `private-key` - Ed25519 private key of the keeper
- `peers` - list of peers in the network
  - `idx` - index of the peer
  - `public-url` - public URL of the peer
  - `public-key` - Ed25519 public key of the peer

## CLI commands

### Storing private key share
```bash
store <publicKeyId> <privateKeyShare> <relatedFullPublicKey>
```

### Deleting key share
```bash
delete <publicKeyId>
```

**NOTE**:
All key share data should be specified in **Base64**