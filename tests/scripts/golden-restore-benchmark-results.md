# Golden snapshot restore — migration benchmark (local)

Recorded on branch `enhancement/api-tests-golden-snapshot-restore`, SQLite, macOS.
Golden snapshot pre-captured; timings exclude capture cost.

**Migration:** 7 document-service suites switched from `builder.cleanup()` (legacy) to `destroyTestSetup()` (golden restore):

- `relations/no-dp.test.api.ts`
- `relations/i18n.test.api.ts`
- `relations/bidirectional-relations.test.api.ts`
- `relations/unidirectional-relations.test.api.ts`
- `relations/invisible-relation-republish.test.api.ts`
- `dp/basic-no-dp.test.api.ts`
- `dp/dz-component-relation.test.api.ts`

All document-service suites now use golden restore (28/28).

## Seven migrated files only (7 suites, 35 tests)

| Run      | BEFORE (legacy teardown) | AFTER (golden restore) |
| -------- | ------------------------ | ---------------------- |
| 1        | 19.92 s                  | 11.62 s                |
| 2        | 20.55 s                  | 11.92 s                |
| 3        | 17.25 s                  | 11.86 s                |
| **Mean** | **19.24 s**              | **11.80 s**            |

**~39% faster (~7.4 s saved)** on this slice. Teardown was the dominant cost for these relation/dp suites.

## Full `document-service/` folder (28 suites, 617 tests)

| Run      | BEFORE (21 golden + 7 legacy) | AFTER (all golden) |
| -------- | ----------------------------- | ------------------ |
| 1        | 84.91 s                       | 80.26 s            |
| 2        | 87.25 s                       | 82.24 s            |
| 3        | 85.05 s                       | 81.76 s            |
| **Mean** | **85.74 s**                   | **81.42 s**        |

**~5% faster (~4.3 s saved)** on the full document-service folder. Most suites were already on golden restore; the win is diluted across test execution time.

## CI shard expectation

Jest shard 1/4 has ~58 files; document-service is ~10–14 per shard. Migrating these 7 files adds golden teardown to ~2–3 files per shard that were still legacy. **Expect sub-minute shard wall-clock improvement**, likely lost in CI variance (~1 min jitter). Shard 1/4 was not used as a clean benchmark (unrelated users-permissions cookie test failures).

## Reproduce

```bash
chmod +x tests/scripts/benchmark-golden-restore.sh

# Full document-service
./tests/scripts/benchmark-golden-restore.sh before-migration document-service 3
# … apply migration …
./tests/scripts/benchmark-golden-restore.sh after-migration document-service 3
```

Raw logs: `test-apps/.golden/benchmark-results/`

## Verdict

Worth migrating the remaining document-service suites: clear win on the migrated slice (~39%), modest win on the full folder (~5%). Further CI gains need either more suites outside document-service on golden restore (risky without filesystem-restore hardening) or caching `.golden` across shard jobs to avoid repeated capture boots.
