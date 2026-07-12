# OpenAPI

The OpenAPI file is the source of truth:

- [`../../openapi.yaml`](../../openapi.yaml)

It describes:

- routes
- request bodies
- response bodies
- error responses
- authentication headers
- permission templates
- algorithm and scheme enums

If generated SDK helpers disagree with OpenAPI, treat OpenAPI as the current contract and update the SDK.
