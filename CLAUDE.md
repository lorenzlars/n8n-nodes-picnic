# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm test             # Run all tests (vitest)
npm run build        # Compile TypeScript → dist/
npm run clean        # Delete dist/

# Run a single test file
npx vitest run tests/auth-cache.test.ts
```

The `prepublishOnly` script runs `clean` + `build` automatically before `npm publish`.

## Architecture

This is an **n8n community node** that wraps the [`picnic-api`](https://www.npmjs.com/package/picnic-api) npm package (v3.x). The compiled output in `dist/` is what n8n loads at runtime.

### Entry points registered with n8n (`package.json → "n8n"`)

| Type | File |
|------|------|
| Credential | `dist/credentials/PicnicApi.credentials.js` |
| Node | `dist/nodes/Picnic/Picnic.node.js` |

### Source layout (`src/`)

```
credentials/PicnicApi.credentials.ts   Credential definition (fields only, no logic)
nodes/Picnic/
  Picnic.node.ts        Main node – execute() loop, auth flow, retry logic
  auth-cache.ts         In-process Map cache for login tokens (TTL: 6 h, configurable via PICNIC_AUTH_CACHE_TTL_MS)
  login.ts              ensurePicnicAuthenticated() – skips login if authKey already set
  client-methods.ts     callClientMethod() – resolves method name aliases across picnic-api versions
types/picnic-api.d.ts   Hand-written type declarations for picnic-api (package ships no types)
```

### Auth flow in `Picnic.node.ts`

Two credential modes are supported:

1. **Email + password** – `ensurePicnicAuthenticated` calls `client.login()`, the resulting `client.authKey` is cached in `auth-cache` (keyed by `userId|countryCode|apiVersion`).
2. **Static `authKey`** – login is skipped entirely; if the key expires server-side and `userId`/`password` are also present, the retry path re-logs in and caches the fresh token.

On every operation call the order of preference for the auth key is:
`cachedAuthKey` → `configuredAuthKey` → fresh login

**Retry on 401/403:** `isLikelyAuthError()` matches error messages from picnic-api (which always embeds the HTTP status code in the message, e.g. `"401 Unauthorized"`). When matched, the cache entry is cleared, a fresh login is performed, the new token is cached, and the operation is retried once.

### picnic-api compatibility

`callClientMethod` accepts a list of candidate method names (e.g. `['getShoppingCart', 'getCart']`) and calls the first one that exists on the runtime object. This handles API renames across picnic-api versions without requiring a version check.

## Release process

Releases are driven by [Release Please](https://github.com/googleapis/release-please) via `.github/workflows/release-please.yml`. When a release PR is merged, `.github/workflows/publish.yml` publishes to npm (requires `NPM_TOKEN` secret).
