# AGENTS.md

Guidelines for AI coding agents working in this repository.

## Project Overview

n8n community node package (`n8n-nodes-picnic`) that wraps the `picnic-api` npm
package to provide Picnic grocery service operations within n8n workflows.
Single-package TypeScript repo (not a monorepo). Compiles to CommonJS for n8n.

## Build / Test / Lint Commands

```bash
npm run build          # tsc + copy assets to dist/
npm run clean          # rm -rf dist
npm test               # vitest run  (single CI-friendly run)
npm run test:watch     # vitest      (watch mode)
```

### Running a single test file

```bash
npx vitest run tests/auth-cache.test.ts
```

### Running a single test by name

```bash
npx vitest run -t "returns undefined for missing key"
```

### Type-checking only (no emit)

```bash
npx tsc --noEmit
```

### Linting / Formatting

No ESLint or Prettier is configured. Rely on TypeScript `strict: true` for
static analysis. Follow the existing formatting conventions manually.

## Code Style

### Formatting

- 2-space indentation
- Single quotes for strings
- Trailing commas in multi-line structures
- Semicolons at end of statements
- Opening brace on the same line (`} else {` style)

### Imports

- Use `import type { ... }` for type-only imports (separate statement)
- Use named imports; avoid default imports for own code
- Order: external type imports, external runtime imports, relative imports
- No blank lines between import groups

```typescript
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { buildAuthCacheKey, getCachedAuthKey } from './auth-cache';
```

### TypeScript

- Strict mode is enabled — never use `any`; use `unknown` for truly unknown types
- Use `interface` for behavioral contracts and public APIs
- Use `type` for data shapes and local aliases
- Use `as` casts (not angle-bracket syntax)
- Explicitly type `Promise<T>` return types on async functions
- Dynamic imports use `await import('...')` pattern

### Naming Conventions

| Category          | Convention           | Examples                                    |
|-------------------|----------------------|---------------------------------------------|
| Files (utilities) | `kebab-case`         | `auth-cache.ts`, `client-methods.ts`        |
| Files (n8n node)  | `PascalCase` + suffix| `Picnic.node.ts`, `PicnicApi.credentials.ts`|
| Classes           | `PascalCase`         | `Picnic`, `PicnicApi`                       |
| Functions/vars    | `camelCase`          | `getCachedAuthKey`, `authKey`               |
| Constants         | `SCREAMING_SNAKE`    | `DEFAULT_AUTH_CACHE_TTL_MS`                 |
| Booleans          | `is`/`has` prefix    | `isLikelyAuthError`, `hasConfiguredAuthKey` |
| Interfaces        | `PascalCase` (no `I` prefix for own types) | `PicnicLoginClient`     |

### Functions

- Use `function` declarations for named module-level functions
- Use arrow functions only for inline callbacks
- Class methods use standard method syntax (no arrow function properties)

```typescript
// Module-level: function declaration
export function buildAuthCacheKey(email: string, country: string): string { ... }

// Inline: arrow function
items.filter((key) => key !== 'constructor');
```

### Exports

- Named exports only — no default exports in own code
- Barrel re-exports via `export * from '...'` in `src/index.ts`
- Keep internal/private functions unexported (module-private by omission)

### Error Handling

- Utility modules throw plain `Error` with descriptive messages
- Node code wraps errors in `NodeOperationError` (n8n framework) with `itemIndex`
- Use `continueOnFail()` pattern in the main `execute()` method
- Auth errors trigger a single retry after clearing the auth cache
- Error classification uses string matching on error messages

```typescript
function isLikelyAuthError(error: unknown): boolean {
  const message = (error as Error).message?.toLowerCase?.() ?? '';
  return message.includes('unauthorized') || message.includes('401');
}
```

### Comments

- Minimal — code should be self-documenting through naming and types
- No JSDoc; no file-level headers
- Use inline comments only for non-obvious values or strategic intent

```typescript
const DEFAULT_AUTH_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
```

### Async

- `async/await` exclusively — no `.then()/.catch()` chains
- All async functions declare `Promise<T>` return types

## Project Structure

```
src/
  index.ts                          # Barrel re-export
  credentials/
    PicnicApi.credentials.ts        # n8n credential type definition
  nodes/Picnic/
    Picnic.node.ts                  # Main n8n node implementation
    auth-cache.ts                   # In-memory auth token cache with TTL
    client-methods.ts               # Version-resilient method caller
    login.ts                        # Authentication helper
    picnic.svg                      # Node icon
  types/
    picnic-api.d.ts                 # Ambient module declaration for picnic-api
tests/
  auth-cache.test.ts
  client-methods.test.ts
  picnic-api-contract.test.ts       # Contract test against real picnic-api module
  picnic-login.test.ts
```

## Testing Patterns

- Tests live in `tests/` and import directly from `src/` (not `dist/`)
- Test files use `*.test.ts` naming
- Use Vitest builtins: `vi.fn()`, `vi.useFakeTimers()`, `vi.stubEnv()`
- Testable logic is extracted into small pure modules; the main node class
  is not directly tested (depends on n8n framework types)
- The `picnic-api-contract.test.ts` file validates the real `picnic-api`
  module exports expected methods (guards against upstream breaking changes)

## CI/CD

- **PRs**: GitHub Actions runs `npm ci && npm run build && npm test` (Node 20)
- **Releases**: release-please on `main` auto-creates version-bump PRs
- **Publishing**: Dispatched workflows publish to npm and GitHub Packages

## Key Dependencies

| Package        | Role                    |
|----------------|-------------------------|
| `picnic-api`   | Picnic grocery API client (runtime) |
| `n8n-workflow`  | n8n framework types (peer dependency) |
| `typescript`   | Compiler (dev)          |
| `vitest`       | Test framework (dev)    |
