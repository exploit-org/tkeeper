# Quorum Promotion

Quorum promotion turns an existing local key into distributed threshold key state. Use it when a key started in mono mode for adoption or bootstrap and later needs quorum protection.

## What promotion does

Promotion:

- reads the current mono key material
- splits or imports threshold shares for the selected peers
- writes threshold metadata and platform side state
- creates a pending generation
- requires restart before normal operations continue

After promotion, later signing uses threshold mode.

## What promotion does not do

Promotion does not make the original mono period retroactively threshold-secure and cannot erase every backup or captured copy of the full key. If prior exposure is possible, rotate or create a new identity instead of relying on promotion.

## Platform side state

The promotion path must store platform-specific public side state:

- ECC commitments for ECC algorithms
- aggregate ML-DSA public key for ML-DSA algorithms

Without side state, later public-key checks and threshold protocols cannot prove the same key state.

## When to use rotate instead

Use rotate or a new DKG when you need new cryptographic material instead of promoting existing material.

For ML-DSA, refresh creates a new generation with the same share and public key. Use rotate when new ML-DSA material is required.
