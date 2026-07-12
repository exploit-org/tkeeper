# Use Cases

Every supported use case has the same enforcement shape:

```text
identity -> understood action -> policy -> proof -> verified execution
```

Read:

- [For AI Agents](for-ai-agents.md)
- [For Crypto Assets](for-crypto-assets.md)
- [For Certificates](for-certificates.md)
- [For Internal Systems](for-internal-systems.md)

The integration is a good fit when:

- the action has real consequences
- the action can be represented as an intent
- the downstream system can verify proof before execution
- bypassing the governed identity is not allowed

If the action can happen without the proof, TKeeper is not enforcing that path. If the goal is only secret storage, use a secrets manager.
