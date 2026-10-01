# Experimental nested dynamic zone benchmarks

This branch contains a feasibility prototype, not a release-ready implementation.
It enables component-owned dynamic zones in the two CTB server validators and
adds focused validator tests plus two local API benchmark suites. It does not add
a depth/cycle guard, UI support, or complete GraphQL/lifecycle coverage.

The suites exercise Document Service creation, reads and full-tree updates, and
fully populated REST reads. They record warm-up counts, raw timing samples,
p50/p95, SQL statement counts and response sizes. The extended suite checks exact
nested ordering, values, topology and retained component IDs.

The extended matrix covers one through four DZ levels, 130/500/1,000 content
leaves, and two/five/ten actual leaf component types. Its documents have Draft &
Publish disabled. The SQLite-specific metadata and results are not evidence for
other databases, concurrent load, realistic media/relations, or admin rendering.

After installing and building the repository, run from the repository root:

```sh
yarn test:api tests/api/core/strapi/dynamiczones/nested-dz-performance.test.api.js --db=sqlite

BENCHMARK_RESULTS_PATH=.agents/work/experiments/nested-dz-performance/extended-results-run1.json yarn test:api tests/api/core/strapi/dynamiczones/nested-dz-performance-extended.test.api.js --db=sqlite

BENCHMARK_REVERSE_ORDER=1 BENCHMARK_RESULTS_PATH=.agents/work/experiments/nested-dz-performance/extended-results-run2.json yarn test:api tests/api/core/strapi/dynamiczones/nested-dz-performance-extended.test.api.js --db=sqlite --no-generate-app
```

The first two commands regenerate the test app. The final command deliberately
reuses it and reverses the scenario order. Avoid concurrent builds or benchmarks.
Generated results stay in the ignored `.agents/work/` directory.

Measurements from 1 October 2026 were made on `deedbb9ec033c102b7734a974dcab500c7ea0eef`
plus this prototype. For independent publication, unrelated architecture-only
history was excluded: the branch starts at its underlying develop revision
`a82c2d8bab32d61eb8399f6f3b244cbcc03cca13`, whose runtime and test infrastructure
match that measurement baseline. Provenance fields in the harness identify the
original measurement baseline.
