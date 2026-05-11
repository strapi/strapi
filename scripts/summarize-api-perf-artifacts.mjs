#!/usr/bin/env node
/**
 * Merge Strapi v1 performance NDJSON batches (one JSON object per line) from CI download dirs
 * and write a compact markdown summary for dashboards / PR inspection.
 *
 * Usage: node scripts/summarize-api-perf-artifacts.mjs <inputDir> [--out path/to/summary.md]
 */

import fs from 'node:fs/promises';
import path from 'node:path';

async function collectNdjsonFiles(rootDir) {
  const out = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        stack.push(full);
      } else if (ent.isFile() && (ent.name.endsWith('.ndjson') || ent.name.endsWith('.jsonl'))) {
        out.push(full);
      }
    }
  }

  return out.sort();
}

function parseNdjsonLines(content) {
  const batches = [];
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    try {
      batches.push(JSON.parse(trimmed));
    } catch {
      batches.push({ parseError: true, line: trimmed.slice(0, 200) });
    }
  }
  return batches;
}

function aggregateBatches(batches) {
  let slowQueryCount = 0;
  let requestCount = 0;
  let slowRequestCount = 0;
  let maxP95 = 0;
  let maxP99 = 0;
  let batchesOk = 0;

  for (const b of batches) {
    if (!b || b.parseError || typeof b.summary !== 'object' || !b.summary) {
      continue;
    }
    batchesOk += 1;
    const s = b.summary;
    slowQueryCount += Number(s.slowQueryCount) || 0;
    requestCount += Number(s.requestCount) || 0;
    slowRequestCount += Number(s.slowRequestCount) || 0;
    maxP95 = Math.max(maxP95, Number(s.p95Ms) || 0);
    maxP99 = Math.max(maxP99, Number(s.p99Ms) || 0);
  }

  return { slowQueryCount, requestCount, slowRequestCount, maxP95, maxP99, batchesOk };
}

async function main() {
  const argv = process.argv.slice(2);
  const inputDir = argv[0];
  const outIdx = argv.indexOf('--out');
  const outFile = outIdx >= 0 ? argv[outIdx + 1] : 'api-perf-summary.md';

  if (!inputDir) {
    console.error(
      'Usage: node scripts/summarize-api-perf-artifacts.mjs <inputDir> [--out summary.md]'
    );
    process.exit(2);
  }

  const files = await collectNdjsonFiles(path.resolve(inputDir));
  if (files.length === 0) {
    const body =
      '# API performance artifacts summary\n\nNo `.ndjson` / `.jsonl` files found under the input directory.\n';
    await fs.writeFile(path.resolve(outFile), body, 'utf8');
    console.log(`Wrote ${outFile} (empty)`);
    return;
  }

  const rows = [];
  let grand = {
    slowQueryCount: 0,
    requestCount: 0,
    slowRequestCount: 0,
    maxP95: 0,
    maxP99: 0,
    batchesOk: 0,
  };

  for (const file of files) {
    const rel = path.relative(process.cwd(), file);
    const content = await fs.readFile(file, 'utf8');
    const batches = parseNdjsonLines(content);
    const agg = aggregateBatches(batches);
    grand.slowQueryCount += agg.slowQueryCount;
    grand.requestCount += agg.requestCount;
    grand.slowRequestCount += agg.slowRequestCount;
    grand.maxP95 = Math.max(grand.maxP95, agg.maxP95);
    grand.maxP99 = Math.max(grand.maxP99, agg.maxP99);
    grand.batchesOk += agg.batchesOk;
    rows.push({ file: rel, batches: batches.length, ...agg });
  }

  const lines = [
    '# API performance artifacts summary',
    '',
    'Aggregated from Strapi **v1** NDJSON performance batches (`schemaVersion` 1) collected during `yarn test:api` with `--perf-artifacts`.',
    '',
    '## Totals (all files)',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| NDJSON files | ${files.length} |`,
    `| Parsed batches (valid envelopes) | ${grand.batchesOk} |`,
    `| Slow / error DB events (sum of batch counts) | ${grand.slowQueryCount} |`,
    `| Request summaries (sum) | ${grand.requestCount} |`,
    `| Slow requests (sum) | ${grand.slowRequestCount} |`,
    `| Max batch p95 (ms) | ${grand.maxP95} |`,
    `| Max batch p99 (ms) | ${grand.maxP99} |`,
    '',
    '## Per file',
    '',
    '| File | Lines (non-empty) | Batches OK | Slow DB events | Requests | Slow reqs | max p95 (ms) |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];

  for (const r of rows) {
    lines.push(
      `| ${r.file} | ${r.batches} | ${r.batchesOk} | ${r.slowQueryCount} | ${r.requestCount} | ${r.slowRequestCount} | ${r.maxP95} |`
    );
  }

  lines.push('', '_This job is informational (spec 05 phase 1); it does not gate merges._', '');

  const body = `${lines.join('\n')}\n`;
  await fs.writeFile(path.resolve(outFile), body, 'utf8');
  console.log(`Wrote ${path.resolve(outFile)} (${files.length} source files)`);
}

await main();
