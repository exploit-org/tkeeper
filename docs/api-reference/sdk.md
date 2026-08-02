# Java SDK

The Java SDK provides typed modules for the public TKeeper API:

- [SDK README](../../sdk/README.md)
- Maven coordinate: `org.exploit:tkeeper-sdk:2.3.1`
- Java toolchain: 17 or newer

The SDK follows the same module boundaries as the API: system, DKG, signing, storage/import, quorum promotion, ECIES, compliance, expiration, audit, integrity, consistency, destroy, and control-plane reads.

The wire contract remains [`../../openapi.yaml`](../../openapi.yaml). Treat generated or handwritten SDK helpers as convenience code, not a competing source of truth.

## Integration rules

- Use `JwtTokenAuth` in production and scope its permissions to the required identities and operations.
- Close `TKeeperClient` to release its HTTP resources.
- Pass `KeySetAuthorities` explicitly when creating governed identities; convenience constructors without authorities select `arbitrary` raw signing.
- Build signing requests with `AuthorityCommand`. Verify converts it to a `VerificationCommand`, which retains only the material `type` and `artifact`. Verification may use any supported material type, including typed or arbitrary material, without requiring that type or payload to belong to the key's current authority manifest.
- Catch `TKeeperException` and branch on `ErrorType`, not diagnostic detail text.
- Do not retry authorization or policy denials as availability failures.
