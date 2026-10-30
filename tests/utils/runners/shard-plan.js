'use strict';

/**
 * Split e2e spec files across CI shards, and across the test apps (lanes) of a shard, by
 * measured duration instead of by file count.
 *
 * Playwright's own `--shard` splits each domain's files by count, so the files that restart
 * Strapi most (content-type-builder) all land in shard 1, which ends up about 30% longer than
 * the others. Here every (domain, file) pair is one unit, weighted with its duration from
 * `tests/e2e/shard-weights.json`, and the units are packed into `shardTotal * lanes` bins,
 * heaviest first, each into the bin where it ends soonest. Every shard computes the same plan
 * from the same file, so no file runs twice or not at all.
 */

/**
 * Seconds a lane spends on each domain it runs, outside the tests: starting Strapi for the
 * domain (about 12 s in CI) and stopping it (about 6 s). A lane with five domains spends a
 * minute and a half on this, so the plan counts it.
 */
const DOMAIN_RUN_SECONDS = 20;

const parseShard = (value) => {
  const match = /^(\d+)\/(\d+)$/.exec(String(value ?? ''));
  if (!match) {
    return null;
  }
  const index = Number(match[1]);
  const total = Number(match[2]);
  return index >= 1 && index <= total ? { index, total } : null;
};

/**
 * Pull `--shard` and `--project` out of the arguments forwarded to Playwright. The sharded run
 * replaces `--shard` with an explicit file list, so it is returned separately.
 */
const extractShardArgs = (args) => {
  let shard = null;
  let project = null;
  const rest = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = String(args[i]);
    const [flag, inline] = arg.split(/=(.*)/s);

    if (flag === '--shard') {
      shard = parseShard(inline ?? args[(i += 1)]);
      continue;
    }
    if (flag === '--project') {
      project = inline ?? args[i + 1];
    }
    rest.push(arg);
  }

  return { shard, project, rest };
};

const median = (values) => {
  if (values.length === 0) {
    return 1;
  }
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/**
 * @param {object} options
 * @param {Record<string, number>} options.weights seconds per `<domain>/<file relative to the domain>`
 * @param {{ domain: string, file: string }[]} options.units every spec file of the selected domains
 * @param {{ index: number, total: number }} options.shard this job's shard, 1-based
 * @param {number} options.lanes test apps running side by side in the job
 * @returns {{ domain: string, files: string[], weight: number }[][]} one list of domain runs per lane
 */
const planShard = ({ weights, units, shard, lanes }) => {
  const known = units.map((u) => weights[`${u.domain}/${u.file}`]).filter((w) => w !== undefined);
  // A spec without a measurement yet (a new file) counts as a typical one.
  const fallback = median(known);

  const weighted = units
    .map((u) => ({ ...u, weight: weights[`${u.domain}/${u.file}`] ?? fallback }))
    // Heaviest first; ties broken by path so every shard sorts identically.
    .sort(
      (a, b) =>
        b.weight - a.weight || `${a.domain}/${a.file}`.localeCompare(`${b.domain}/${b.file}`)
    );

  const binCount = shard.total * lanes;
  const bins = Array.from({ length: binCount }, () => ({
    load: 0,
    domains: new Set(),
    units: [],
  }));

  // A unit costs its weight, plus a domain start when the bin doesn't run its domain yet.
  const loadWith = (bin, unit) =>
    bin.load + unit.weight + (bin.domains.has(unit.domain) ? 0 : DOMAIN_RUN_SECONDS);

  for (const unit of weighted) {
    let target = 0;
    for (let b = 1; b < binCount; b += 1) {
      if (loadWith(bins[b], unit) < loadWith(bins[target], unit)) {
        target = b;
      }
    }
    bins[target].load = loadWith(bins[target], unit);
    bins[target].domains.add(unit.domain);
    bins[target].units.push(unit);
  }

  // Bins are dealt to shards round-robin, so shard i gets bins i-1, i-1+total, ...
  const laneBins = bins.filter((_, b) => b % shard.total === shard.index - 1);

  return laneBins.map((bin) => {
    const byDomain = new Map();
    for (const unit of bin.units) {
      const run = byDomain.get(unit.domain) ?? { domain: unit.domain, files: [], weight: 0 };
      run.files.push(unit.file);
      run.weight += unit.weight;
      byDomain.set(unit.domain, run);
    }
    return [...byDomain.values()]
      .map((run) => ({ ...run, files: run.files.sort() }))
      .sort((a, b) => b.weight - a.weight || a.domain.localeCompare(b.domain));
  });
};

module.exports = { DOMAIN_RUN_SECONDS, extractShardArgs, parseShard, planShard };
