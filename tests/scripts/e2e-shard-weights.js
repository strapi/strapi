'use strict';

/**
 * Rebuild tests/e2e/shard-weights.json from the JUnit reports the e2e CI jobs upload.
 *
 *   gh run download <run-id> --repo strapi/strapi --pattern '*-e2e-junit-*' --dir <dir>
 *   node tests/scripts/e2e-shard-weights.js <dir> [<dir> ...]
 *
 * Each artifact is named `<edition>-e2e-junit-<project>-<job index>` and holds one
 * `playwright-<domain>-<port>.xml` per domain the job ran. A file's weight is the time its tests
 * took, in seconds, averaged over every run passed in. The shard planner
 * (tests/utils/runners/shard-plan.js) only compares weights, so rough numbers are fine.
 */

const fs = require('node:fs');
const path = require('node:path');

const OUTPUT = path.join(__dirname, '..', 'e2e', 'shard-weights.json');

const readReports = (root) => {
  const totals = {};

  for (const artifact of fs.readdirSync(root)) {
    const match = /^(ce|ee)-e2e-junit-(\w+)-\d+$/.exec(artifact);
    if (!match) {
      continue;
    }
    const [, edition, project] = match;

    for (const report of fs.readdirSync(path.join(root, artifact))) {
      const domain = /^playwright-(.+)-\d+\.xml$/.exec(report)?.[1];
      if (!domain) {
        continue;
      }
      const xml = fs.readFileSync(path.join(root, artifact, report), 'utf8');
      // <testcase name="..." classname="<file relative to the domain>" time="<seconds>">
      for (const [, attributes] of xml.matchAll(/<testcase\b([^>]*)>/g)) {
        const file = /classname="([^"]*)"/.exec(attributes)?.[1];
        const time = Number(/time="([^"]*)"/.exec(attributes)?.[1] ?? 0);
        if (!file) {
          continue;
        }
        const key = `${domain}/${file}`;
        totals[edition] ??= {};
        totals[edition][project] ??= {};
        totals[edition][project][key] = (totals[edition][project][key] ?? 0) + time;
      }
    }
  }

  return totals;
};

const main = (roots) => {
  if (roots.length === 0) {
    console.error('Usage: node tests/scripts/e2e-shard-weights.js <junit dir> [<junit dir> ...]');
    process.exit(1);
  }

  const runs = roots.map(readReports);
  const weights = {};

  for (const run of runs) {
    for (const [edition, projects] of Object.entries(run)) {
      for (const [project, files] of Object.entries(projects)) {
        for (const [file, seconds] of Object.entries(files)) {
          weights[edition] ??= {};
          weights[edition][project] ??= {};
          weights[edition][project][file] = (weights[edition][project][file] ?? 0) + seconds;
        }
      }
    }
  }

  // Average over the runs, round to whole seconds and sort keys so diffs stay readable.
  const sorted = {};
  for (const edition of Object.keys(weights).sort()) {
    sorted[edition] = {};
    for (const project of Object.keys(weights[edition]).sort()) {
      sorted[edition][project] = {};
      for (const file of Object.keys(weights[edition][project]).sort()) {
        sorted[edition][project][file] = Math.max(
          1,
          Math.round(weights[edition][project][file] / runs.length)
        );
      }
    }
  }

  fs.writeFileSync(OUTPUT, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), OUTPUT)}`);
};

main(process.argv.slice(2));
