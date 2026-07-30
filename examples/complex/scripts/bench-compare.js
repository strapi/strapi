#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Compare benchmark result sets across multipliers and databases.
 *
 * Usage:
 *   node bench-compare.js --baseline <label> --candidate <label>
 *   node bench-compare.js <baseline-label> <candidate-label>     # legacy positional form
 *
 * Result files are loaded from `results/*.json` and indexed by:
 *   { label, multiplier, dbEngine }
 * taken from fields inside each JSON (not the filename), so the same
 * canonical baseline/candidate label can span any number of (multiplier, db)
 * combinations. Missing cells are rendered as "—" rather than errors.
 *
 * Produces:
 *   - Markdown report: stdout + results/compare-<timestamp>.md
 *   - Self-contained HTML: results/compare-<timestamp>.html
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const RESULTS_DIR = path.join(COMPLEX_DIR, 'results');

// ─── argument parsing ────────────────────────────────────────────────────────

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next != null && !next.startsWith('--')) {
          flags[a.slice(2)] = next;
          i += 1;
        } else {
          flags[a.slice(2)] = true;
        }
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

const { flags, positional } = parseArgs(process.argv.slice(2));
const baselineLabel = flags.baseline ?? positional[0];
const candidateLabel = flags.candidate ?? positional[1];

if (!baselineLabel || !candidateLabel) {
  console.error('Usage: node bench-compare.js --baseline <label> --candidate <label>');
  console.error('       node bench-compare.js <baseline-label> <candidate-label>');
  process.exit(1);
}

if (!fs.existsSync(RESULTS_DIR)) {
  console.error(`No results/ directory found at ${RESULTS_DIR}`);
  process.exit(1);
}

// ─── result loading ──────────────────────────────────────────────────────────

/**
 * Strip a trailing `-m<N>` suffix from labels so older results (e.g.,
 * "baseline-develop-m100") can be matched against canonical labels
 * ("baseline-develop"). Leaves labels without the suffix untouched.
 */
function normalizeLabel(raw) {
  if (typeof raw !== 'string') return raw;
  return raw.replace(/-m\d+$/, '');
}

/**
 * Load every result into a flat list, keeping only the most recent per
 * (normalized-label, multiplier, dbEngine) triple.
 */
function loadResults() {
  const files = fs
    .readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort(); // lexicographic on ISO timestamps = chronological

  const byKey = new Map();
  for (const file of files) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8'));
    } catch (err) {
      console.error(`[bench-compare] skipping unparseable ${file}: ${err.message}`);
      continue;
    }
    const db = data?.env?.dbEngine;
    const multiplier = data?.config?.multiplier;
    const label = normalizeLabel(data?.label);
    if (!db || multiplier == null || !label) continue;
    byKey.set(`${label}::${multiplier}::${db}`, { ...data, __file: file });
  }
  return byKey;
}

const results = loadResults();

/**
 * Return the result for (label, multiplier, db) or undefined.
 */
function getResult(label, multiplier, db) {
  return results.get(`${label}::${multiplier}::${db}`);
}

/**
 * Collect every multiplier and dbEngine seen across baseline + candidate.
 */
function collectAxes() {
  const multipliers = new Set();
  const dbs = new Set();
  for (const key of results.keys()) {
    const [label, mult, db] = key.split('::');
    if (label === baselineLabel || label === candidateLabel) {
      multipliers.add(Number(mult));
      dbs.add(db);
    }
  }
  return {
    multipliers: [...multipliers].sort((a, b) => a - b),
    dbs: [...dbs].sort(),
  };
}

const { multipliers, dbs } = collectAxes();

if (multipliers.length === 0) {
  console.error(
    `[bench-compare] no results found for labels "${baselineLabel}" or "${candidateLabel}". Have you run bench:run yet?`
  );
  console.error('Available label/multiplier/db combos:');
  for (const key of [...results.keys()].sort()) console.error(`  ${key}`);
  process.exit(1);
}

// ─── formatting helpers ──────────────────────────────────────────────────────

const REGRESSION_THRESHOLD_PCT = 5;

function pctChange(baseline, candidate) {
  if (baseline === 0 || baseline == null || candidate == null) return null;
  return ((candidate - baseline) / baseline) * 100;
}

function fmtMs(ms) {
  if (ms == null || Number.isNaN(ms)) return '—';
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`;
  return `${(ms / 60000).toFixed(2)} min`;
}

function fmtDelta(ms) {
  if (ms == null || Number.isNaN(ms)) return '—';
  const sign = ms > 0 ? '+' : ms < 0 ? '−' : '';
  return `${sign}${fmtMs(Math.abs(ms))}`;
}

function fmtPct(pct) {
  if (pct == null || Number.isNaN(pct)) return '—';
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

function fmtSpeedup(baseline, candidate) {
  if (!baseline || !candidate) return '—';
  const ratio = baseline / candidate;
  if (ratio >= 1) return `${ratio.toFixed(2)}×`;
  return `${(1 / ratio).toFixed(2)}× slower`;
}

function pctClass(pct) {
  if (pct == null) return '';
  if (pct > REGRESSION_THRESHOLD_PCT) return 'regression';
  if (pct < -REGRESSION_THRESHOLD_PCT) return 'improvement';
  return '';
}

// ─── per-cell detail ─────────────────────────────────────────────────────────

function pairedMigrationRows(baseline, candidate) {
  const names = new Set();
  (baseline?.migrations ?? []).forEach((m) => names.add(m.name));
  (candidate?.migrations ?? []).forEach((m) => names.add(m.name));
  return [...names].map((name) => ({
    name,
    baseline: baseline?.migrations?.find((m) => m.name === name)?.durationMs ?? null,
    candidate: candidate?.migrations?.find((m) => m.name === name)?.durationMs ?? null,
  }));
}

// ─── representative pick (for setup block) ───────────────────────────────────

function pickRepresentative(label) {
  for (const mult of multipliers) {
    for (const db of dbs) {
      const r = getResult(label, mult, db);
      if (r) return r;
    }
  }
  return null;
}

const baselineRep = pickRepresentative(baselineLabel);
const candidateRep = pickRepresentative(candidateLabel);

function renderSetupInline(result) {
  if (!result) return '_(no data)_';
  const src = result.strapiSource || 'unknown';
  const ver = result.strapiVersion || '?';
  const sha = result.strapiGitSha ? ` @ ${result.strapiGitSha.slice(0, 10)}` : '';
  const branch = result.strapiGitBranch ? ` (branch \`${result.strapiGitBranch}\`)` : '';
  return `Strapi ${ver}${sha}${branch} [source: ${src}]`;
}

function renderEnvInline(result) {
  const e = result?.env;
  if (!e) return '_(no env info)_';
  return `Node ${e.nodeVersion} · ${e.platform}/${e.arch} · ${e.cpuModel} (${e.cpuCount} cores) · ${Math.round(
    e.totalMemMB / 1024
  )} GB`;
}

// ─── markdown rendering ──────────────────────────────────────────────────────

function renderMarkdown() {
  let out = '';
  out += `## Migration benchmark: ${baselineLabel} vs ${candidateLabel}\n\n`;

  // Test setup
  out += `### Test setup\n\n`;
  out += `- **Baseline (${baselineLabel}):** ${renderSetupInline(baselineRep)}\n`;
  out += `- **Candidate (${candidateLabel}):** ${renderSetupInline(candidateRep)}\n`;
  if (baselineRep) {
    out += `- **Host env:** ${renderEnvInline(baselineRep)}\n`;
  }
  const cfg = baselineRep?.config;
  if (cfg) {
    out += `- **Config (representative):** seed=${cfg.seedMode}, hook=${cfg.hookMode}\n`;
  }
  out += `\n`;

  // Cross-multiplier × cross-DB summary table
  out += `### Speedup matrix (total migration time)\n\n`;
  out += `Rows: multipliers · Columns: databases. Each cell shows ${'`baseline → candidate (% change)`'}.\n\n`;
  const header = ['multiplier', ...dbs];
  out += `| ${header.join(' | ')} |\n`;
  out += `| ${header.map((_, i) => (i === 0 ? ':---' : '---:')).join(' | ')} |\n`;
  for (const mult of multipliers) {
    const cells = [`**m=${mult}**`];
    for (const db of dbs) {
      const b = getResult(baselineLabel, mult, db);
      const c = getResult(candidateLabel, mult, db);
      if (!b || !c) {
        cells.push('—');
        continue;
      }
      const bt = b.totalDurationMs;
      const ct = c.totalDurationMs;
      const pct = pctChange(bt, ct);
      cells.push(`${fmtMs(bt)} → ${fmtMs(ct)} (${fmtPct(pct)})`);
    }
    out += `| ${cells.join(' | ')} |\n`;
  }
  out += `\n`;

  // Data-availability matrix (baseline/candidate presence)
  out += `### Data points captured\n\n`;
  const availHeader = ['multiplier', ...dbs];
  out += `| ${availHeader.join(' | ')} |\n`;
  out += `| ${availHeader.map((_, i) => (i === 0 ? ':---' : ':---:')).join(' | ')} |\n`;
  for (const mult of multipliers) {
    const cells = [`m=${mult}`];
    for (const db of dbs) {
      const b = getResult(baselineLabel, mult, db);
      const c = getResult(candidateLabel, mult, db);
      const hasB = b ? '✓' : ' ';
      const hasC = c ? '✓' : ' ';
      cells.push(`base:${hasB} pr:${hasC}`);
    }
    out += `| ${cells.join(' | ')} |\n`;
  }
  out += `\n`;

  // Per-cell detailed breakdowns
  out += `### Per-migration detail\n\n`;
  for (const mult of multipliers) {
    for (const db of dbs) {
      const b = getResult(baselineLabel, mult, db);
      const c = getResult(candidateLabel, mult, db);
      if (!b || !c) continue;

      out += `#### ${db} @ m=${mult}\n\n`;
      const rowCountTotal = Object.values(b.rowCount || {}).reduce(
        (a, n) => (typeof n === 'number' ? a + n : a),
        0
      );
      out += `Row count (baseline, after migration): ~${rowCountTotal.toLocaleString()}\n\n`;

      const rows = pairedMigrationRows(b, c);
      out += `| Migration | Baseline | Candidate | Δ | % change |\n`;
      out += `| :--- | ---: | ---: | ---: | ---: |\n`;

      const regressionLines = [];
      for (const row of rows) {
        const delta =
          row.candidate != null && row.baseline != null ? row.candidate - row.baseline : null;
        const pct = pctChange(row.baseline, row.candidate);
        out += `| ${row.name} | ${fmtMs(row.baseline)} | ${fmtMs(row.candidate)} | ${fmtDelta(delta)} | ${fmtPct(pct)} |\n`;
        if (pct != null && pct > REGRESSION_THRESHOLD_PCT) {
          regressionLines.push(`  - \`${row.name}\` regressed by ${fmtPct(pct)}`);
        }
      }

      const totalDelta = c.totalDurationMs - b.totalDurationMs;
      const totalPct = pctChange(b.totalDurationMs, c.totalDurationMs);
      out += `| **Total** | **${fmtMs(b.totalDurationMs)}** | **${fmtMs(c.totalDurationMs)}** | **${fmtDelta(totalDelta)}** | **${fmtPct(totalPct)}** |\n`;
      out += `\n**Speedup:** ${fmtSpeedup(b.totalDurationMs, c.totalDurationMs)}\n`;

      if (regressionLines.length) {
        out += `\n⚠️ Per-migration regressions (>${REGRESSION_THRESHOLD_PCT}%):\n${regressionLines.join('\n')}\n`;
      }
      out += `\n`;
    }
  }

  return out;
}

// ─── HTML rendering ──────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSvgBarChart(rows) {
  if (rows.length === 0) return '';

  const barHeight = 16;
  const barGap = 2;
  const rowGap = 10;
  const leftPad = 8;
  const rightPad = 80;

  const charWidth = 7.2;
  const longestName = rows.reduce((a, r) => Math.max(a, r.name.length), 0);
  const labelColWidth = Math.round(Math.min(Math.max(longestName * charWidth + 16, 180), 420));

  const seriesCount = 2; // baseline + candidate
  const rowHeight = (barHeight + barGap) * seriesCount + rowGap;
  const chartHeight = rows.length * rowHeight + rowGap;
  const barAreaWidth = 320;
  const width = leftPad + labelColWidth + barAreaWidth + rightPad;

  const maxDuration = Math.max(...rows.flatMap((r) => [r.baseline ?? 0, r.candidate ?? 0]), 1);
  const scale = (v) => (v == null ? 0 : (v / maxDuration) * barAreaWidth);

  const textStyle = 'font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const textStyleMuted = `${textStyle}; fill: var(--muted)`;
  const textStyleFg = `${textStyle}; fill: var(--text)`;

  let svg = `<svg viewBox="0 0 ${width} ${chartHeight}" width="100%" role="img" aria-label="Per-migration duration bars" style="max-width: ${width}px">`;

  rows.forEach((row, rowIdx) => {
    const yBase = rowIdx * rowHeight + rowGap / 2;
    const series = [
      { value: row.baseline, color: 'var(--baseline-color)', title: 'baseline' },
      { value: row.candidate, color: 'var(--candidate-1-color)', title: 'candidate' },
    ];
    const nameYCenter = yBase + (seriesCount * (barHeight + barGap)) / 2 - barGap / 2;

    svg += `<text x="${leftPad}" y="${nameYCenter}" dominant-baseline="middle" style="${textStyleFg}">${escapeHtml(row.name)}</text>`;

    series.forEach((s, i) => {
      const y = yBase + i * (barHeight + barGap);
      const textY = y + barHeight / 2;
      const barX = leftPad + labelColWidth;
      if (s.value != null) {
        const w = scale(s.value);
        const title = `${s.title}: ${fmtMs(s.value)}`;
        svg += `<rect x="${barX}" y="${y}" width="${w.toFixed(1)}" height="${barHeight}" fill="${s.color}" rx="2"><title>${escapeHtml(title)}</title></rect>`;
        svg += `<text x="${(barX + w + 4).toFixed(1)}" y="${textY}" dominant-baseline="middle" style="${textStyleMuted}">${fmtMs(s.value)}</text>`;
      } else {
        svg += `<text x="${barX}" y="${textY}" dominant-baseline="middle" style="${textStyleMuted}">—</text>`;
      }
    });
  });

  svg += `</svg>`;
  return svg;
}

function renderCellDetailHtml(mult, db, baseline, candidate) {
  const rows = pairedMigrationRows(baseline, candidate);
  const rowCountTotal = Object.values(baseline.rowCount || {}).reduce(
    (a, n) => (typeof n === 'number' ? a + n : a),
    0
  );

  const tableRows = rows
    .map((row) => {
      const delta =
        row.candidate != null && row.baseline != null ? row.candidate - row.baseline : null;
      const pct = pctChange(row.baseline, row.candidate);
      return `<tr>
        <td>${escapeHtml(row.name)}</td>
        <td class="num">${fmtMs(row.baseline)}</td>
        <td class="num">${fmtMs(row.candidate)}</td>
        <td class="num">${fmtDelta(delta)}</td>
        <td class="num ${pctClass(pct)}">${fmtPct(pct)}</td>
      </tr>`;
    })
    .join('');

  const totalDelta = candidate.totalDurationMs - baseline.totalDurationMs;
  const totalPct = pctChange(baseline.totalDurationMs, candidate.totalDurationMs);

  const svg = renderSvgBarChart(rows);

  return `
    <details class="cell-detail">
      <summary><strong>${escapeHtml(db)} @ m=${mult}</strong> — ${fmtMs(baseline.totalDurationMs)} → ${fmtMs(candidate.totalDurationMs)} (<span class="${pctClass(totalPct)}">${fmtPct(totalPct)}</span>), speedup ${fmtSpeedup(baseline.totalDurationMs, candidate.totalDurationMs)} · ~${rowCountTotal.toLocaleString()} rows</summary>
      <div class="cell-body">
        <div class="chart-wrap">${svg}</div>
        <table class="sortable">
          <thead>
            <tr>
              <th>Migration</th>
              <th class="num">Baseline</th>
              <th class="num">Candidate</th>
              <th class="num">Δ</th>
              <th class="num">% change</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="total-row">
              <th>Total</th>
              <th class="num">${fmtMs(baseline.totalDurationMs)}</th>
              <th class="num">${fmtMs(candidate.totalDurationMs)}</th>
              <th class="num">${fmtDelta(totalDelta)}</th>
              <th class="num ${pctClass(totalPct)}">${fmtPct(totalPct)}</th>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  `;
}

function renderHtml() {
  // Summary matrix cells
  const matrixRows = multipliers
    .map((mult) => {
      const cells = [`<th>m=${mult}</th>`];
      for (const db of dbs) {
        const b = getResult(baselineLabel, mult, db);
        const c = getResult(candidateLabel, mult, db);
        if (!b || !c) {
          cells.push('<td class="num muted">—</td>');
          continue;
        }
        const pct = pctChange(b.totalDurationMs, c.totalDurationMs);
        cells.push(
          `<td class="num ${pctClass(pct)}" title="${escapeHtml(`${fmtMs(b.totalDurationMs)} → ${fmtMs(c.totalDurationMs)}`)}">${fmtMs(b.totalDurationMs)} → ${fmtMs(c.totalDurationMs)}<br><span class="delta">${fmtPct(pct)} · ${fmtSpeedup(b.totalDurationMs, c.totalDurationMs)}</span></td>`
        );
      }
      return `<tr>${cells.join('')}</tr>`;
    })
    .join('');

  const headerCells = ['<th>multiplier</th>', ...dbs.map((db) => `<th>${escapeHtml(db)}</th>`)];

  // Per-cell details
  const details = [];
  for (const mult of multipliers) {
    for (const db of dbs) {
      const b = getResult(baselineLabel, mult, db);
      const c = getResult(candidateLabel, mult, db);
      if (b && c) details.push(renderCellDetailHtml(mult, db, b, c));
    }
  }

  // Verdict (use postgres at the largest multiplier if available)
  const verdictDb = dbs.includes('postgres') ? 'postgres' : dbs[0];
  const verdictMult = multipliers[multipliers.length - 1];
  const vB = getResult(baselineLabel, verdictMult, verdictDb);
  const vC = getResult(candidateLabel, verdictMult, verdictDb);
  let verdict = 'No data to summarize';
  if (vB && vC) {
    const ratio = vB.totalDurationMs / vC.totalDurationMs;
    if (ratio > 1.05) {
      verdict = `⚡ ${ratio.toFixed(2)}× faster on ${verdictDb} @ m=${verdictMult}`;
    } else if (ratio < 0.95) {
      verdict = `⚠ ${(1 / ratio).toFixed(2)}× slower on ${verdictDb} @ m=${verdictMult}`;
    } else {
      verdict = `≈ no change on ${verdictDb} @ m=${verdictMult}`;
    }
  }

  const cssVars = `
    --baseline-color: #888;
    --candidate-1-color: #2563eb;
    --regression-bg: #fee2e2;
    --regression-fg: #991b1b;
    --improvement-bg: #dcfce7;
    --improvement-fg: #166534;
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Migration benchmark: ${escapeHtml(baselineLabel)} vs ${escapeHtml(candidateLabel)}</title>
<style>
  :root {
    --bg: #ffffff;
    --text: #111827;
    --muted: #6b7280;
    --border: #e5e7eb;
    --card-bg: #f9fafb;
    --mono-font: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    ${cssVars}
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0a0a0a;
      --text: #e5e7eb;
      --muted: #9ca3af;
      --border: #374151;
      --card-bg: #111827;
      --baseline-color: #6b7280;
      --candidate-1-color: #60a5fa;
      --regression-bg: #450a0a;
      --regression-fg: #fca5a5;
      --improvement-bg: #052e16;
      --improvement-fg: #86efac;
    }
  }
  html, body { background: var(--bg); color: var(--text); margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.5;
    max-width: 1200px;
    margin: 2rem auto;
    padding: 0 1rem;
  }
  h1 { margin-top: 0; }
  h2 { border-bottom: 1px solid var(--border); padding-bottom: 0.25rem; margin-top: 2rem; }
  .verdict { font-size: 1.2rem; padding: 0.5rem 0.75rem; background: var(--card-bg); border-radius: 6px; border: 1px solid var(--border); }
  .setup dt { font-weight: 600; color: var(--muted); margin-top: 0.5rem; }
  .setup dd { margin-left: 0; }
  table { border-collapse: collapse; width: 100%; margin-top: 0.5rem; }
  th, td { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
  th { user-select: none; }
  table.sortable th { cursor: pointer; }
  table.sortable th:hover { background: rgba(127,127,127,0.1); }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; font-family: var(--mono-font); white-space: nowrap; }
  td.num .delta { display: block; font-size: 0.85em; color: var(--muted); }
  tr.total-row th, tr.total-row td { border-top: 2px solid var(--border); font-weight: 600; }
  td.regression, th.regression { background: var(--regression-bg); color: var(--regression-fg); }
  td.improvement, th.improvement { background: var(--improvement-bg); color: var(--improvement-fg); }
  td.muted { color: var(--muted); }
  .cell-detail { margin: 0.5rem 0; background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; padding: 0.5rem 0.75rem; }
  .cell-detail summary { cursor: pointer; padding: 0.25rem 0; }
  .cell-detail .cell-body { padding-top: 0.5rem; }
  .chart-wrap { overflow-x: auto; padding: 0.5rem 0; }
  footer { margin-top: 3rem; color: var(--muted); font-size: 0.85rem; border-top: 1px solid var(--border); padding-top: 1rem; }
</style>
</head>
<body>
  <h1>Migration benchmark: ${escapeHtml(baselineLabel)} vs ${escapeHtml(candidateLabel)}</h1>
  <p class="verdict">${escapeHtml(verdict)}</p>

  <section class="setup">
    <h2>Test setup</h2>
    <dl>
      <dt>Baseline (${escapeHtml(baselineLabel)})</dt>
      <dd>${escapeHtml(renderSetupInline(baselineRep))}</dd>
      <dt>Candidate (${escapeHtml(candidateLabel)})</dt>
      <dd>${escapeHtml(renderSetupInline(candidateRep))}</dd>
      ${baselineRep?.env ? `<dt>Host env</dt><dd>${escapeHtml(renderEnvInline(baselineRep))}</dd>` : ''}
      ${baselineRep?.config ? `<dt>Config (representative)</dt><dd>seed=${escapeHtml(baselineRep.config.seedMode || '?')}, hook=${escapeHtml(baselineRep.config.hookMode || '?')}</dd>` : ''}
    </dl>
  </section>

  <section>
    <h2>Speedup matrix</h2>
    <p>Rows: multipliers · Columns: databases. Each cell shows <code>baseline → candidate</code> with Δ% and speedup. Empty cells mean no data for that combination yet.</p>
    <table>
      <thead><tr>${headerCells.join('')}</tr></thead>
      <tbody>${matrixRows}</tbody>
    </table>
  </section>

  <section>
    <h2>Per-migration detail</h2>
    <p>Click a row to expand per-migration breakdown for that (database, multiplier) pair.</p>
    ${details.join('')}
  </section>

  <footer>
    Generated ${new Date().toISOString()} · bench-compare.js · Strapi migration benchmark harness
  </footer>

  <script>
    document.querySelectorAll('table.sortable').forEach((table) => {
      const headers = table.querySelectorAll('th');
      headers.forEach((th, colIdx) => {
        th.addEventListener('click', () => {
          const tbody = table.tBodies[0];
          const rows = Array.from(tbody.querySelectorAll('tr:not(.total-row)'));
          const dir = th.dataset.sortDir === 'asc' ? 'desc' : 'asc';
          headers.forEach((h) => delete h.dataset.sortDir);
          th.dataset.sortDir = dir;
          rows.sort((a, b) => {
            const av = a.children[colIdx]?.innerText.trim() || '';
            const bv = b.children[colIdx]?.innerText.trim() || '';
            const an = parseFloat(av.replace(/[^0-9.\\-]/g, ''));
            const bn = parseFloat(bv.replace(/[^0-9.\\-]/g, ''));
            let cmp;
            if (!isNaN(an) && !isNaN(bn)) cmp = an - bn;
            else cmp = av.localeCompare(bv);
            return dir === 'asc' ? cmp : -cmp;
          });
          const totalRow = tbody.querySelector('tr.total-row');
          rows.forEach((r) => tbody.appendChild(r));
          if (totalRow) tbody.appendChild(totalRow);
        });
      });
    });
  </script>
</body>
</html>`;
}

// ─── emit ────────────────────────────────────────────────────────────────────

const markdown = renderMarkdown();
const html = renderHtml();

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const mdPath = path.join(RESULTS_DIR, `compare-${stamp}.md`);
const htmlPath = path.join(RESULTS_DIR, `compare-${stamp}.html`);
fs.writeFileSync(mdPath, markdown, 'utf8');
fs.writeFileSync(htmlPath, html, 'utf8');

process.stdout.write(markdown);

console.error(`\n[bench-compare] markdown: ${path.relative(COMPLEX_DIR, mdPath)}`);
console.error(`[bench-compare] html:     ${path.relative(COMPLEX_DIR, htmlPath)}`);
