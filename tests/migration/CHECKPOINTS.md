# Local DB checkpoints (optional, debugging)

Migration tests use a **single shared database file** (e.g. SQLite) under `examples/complex/.migration-v5/`. The runner **deletes** that state at the start of every run, so to inspect a DB after a specific step:

1. Run a migration test, then **before the next run** (or in a second terminal after interrupting) copy the DB file, e.g.:

   ```bash
   cp examples/complex/.migration-v5/migration.sqlite /tmp/after-baseline.sqlite
   ```

2. You can point tools at the copy or use `sqlite3` to run queries. To resume from a checkpoint without re-running the whole harness, set `DATABASE_FILENAME` (sqlite) or the host `DATABASE_*` env vars (other engines) to point at the snapshot and boot Strapi manually — not supported as a first-class flag (by design, to avoid snapshot sprawl).

> Tip: pass `--keep-state` to `yarn test:migrations` to skip teardown and leave both the disposable apps under `examples/complex/.migration-v5/` and the compose containers running for inspection.

3. This is for **local debugging** only. CI is **not** based on stored snapshots.
