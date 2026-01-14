# Content Manager Performance Improvements

## Problem

Customers with deeply nested content (9+ levels of components) experience slow admin panel load times. This was not a significant issue in V4.

## Why V5 Is Slower Than V4

V5 introduced architectural changes that compound with deeply nested content:

1. **Validation Pipeline** - V5 runs 4 schema traversals per request (filters, sort, fields, populate) that V4 didn't have
2. **Document Service Layers** - New middleware, ID translation, and transformation layers add overhead
3. **Document ID System** - Requires extra DB lookups to translate documentId → entity id

## Changes in This PR

| Change                     | File(s)                                                             | Impact                                                                   |
| -------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Parallel array traversal   | `packages/core/utils/src/traverse-entity.ts`                        | Processes component/relation arrays concurrently instead of sequentially |
| Model caching              | `packages/core/utils/src/model-cache.ts`                            | Caches `getModel()` calls to avoid redundant lookups                     |
| Lazy + parallel validation | `packages/core/core/src/services/document-service/repository.ts`    | Skips empty param validation, runs remainder in parallel                 |
| Batch config loading       | `packages/core/content-manager/server/src/services/components.ts`   | Single DB query for all component configs instead of N queries           |
| Map-based status indexing  | `packages/core/content-manager/server/src/controllers/relations.ts` |                                                                          |

#### Why Populate Depth Limiting Causes Data Loss

The admin UI sends full form state on save. If we only load depth 1-4:

1. User opens edit view → levels 5+ not loaded
2. User saves → form sends only levels 1-4
3. Server's `deleteOldComponents()` treats missing level 5+ as "removed"
4. **Data gets deleted**

Fixing this requires lazy loading in the admin UI - a larger refactor.

## Benchmark Infrastructure

Added in `examples/empty/`:

- 9-level nested component schema for testing
- Bootstrap script that auto-generates test data
- `perf-benchmark.mjs` for measuring endpoint response times

## Next Steps

1. **Merge safe optimizations** - parallel traversal, caching, lazy validation
2. **Track populate depth fix** - requires admin UI lazy loading (separate epic)
3. **Consider validation caching** - cache validation results for repeated populate structures
