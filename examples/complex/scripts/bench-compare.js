#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Compare two or more benchmark result sets (produced by bench.js run)
 * and emit a markdown report to stdout + file, and a self-contained HTML
 * report to file.
 *
 * Usage:
 *   node bench-compare.js <label1> <label2> [<label3> ...]
 *
 * Labels are matched against filenames in `results/`:
 *   results/<db>-<label>-<timestamp>.json
 *
 * First label is the baseline, subsequent labels are candidates.
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const RESULTS_DIR = path.join(COMPLEX_DIR, 'results');

// ─── argument parsing ────────────────────────────────────────────────────────

const labels = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (labels.length < 2) {
  console.error(
    'Usage: node bench-compare.js <baseline-label> <candidate-label> [<candidate-label-2> ...]'
  );
  console.error('At least two labels are required (baseline + 1 candidate).');
  process.exit(1);
}
const baselineLabel = labels[0];
const candidateLabels = labels.slice(1);

// ─── result loading ──────────────────────────────────────────────────────────

if (!fs.existsSync(RESULTS_DIR)) {
  console.error(`No results/ directory found at ${RESULTS_DIR}`);
  process.exit(1);
}

/**
 * Find the most recent result file for each (label, db) pair.
 * Returns { [label]: { [db]: result } }.
 */
function loadResults(wantedLabels) {
  const byLabel = {};
  for (const label of wantedLabels) byLabel[label] = {};

  const allFiles = fs
    .readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort(); // lexicographic = chronological given ISO timestamps in filenames

  for (const file of allFiles) {
    // Parse `<db>-<label>-<timestamp>.json` — but label can contain hyphens so
    // we anchor on db prefix and timestamp suffix.
    const m = file.match(/^(postgres|mysql|mariadb|sqlite)-(.+)-(\d{4}-\d{2}-\d{2}T.+)\.json$/);
    if (!m) continue;
    const [, db, label] = m;
    if (!byLabel[label]) continue;
    try {
      const contents = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8'));
      // Later (newer) files overwrite earlier — we want the most recent per (label, db).
      byLabel[label][db] = { ...contents, __file: file };
    } catch (err) {
      console.error(`[bench-compare] failed to parse ${file}: ${err.message}`);
    }
  }

  for (const label of wantedLabels) {
    const dbs = Object.keys(byLabel[label]);
    if (dbs.length === 0) {
      console.error(`[bench-compare] no results found for label "${label}"`);
      process.exit(1);
    }
  }

  return byLabel;
}

const results = loadResults(labels);

// ─── pairing + delta computation ─────────────────────────────────────────────

const REGRESSION_THRESHOLD_PCT = 5;

function pctChange(baseline, candidate) {
  if (baseline === 0) return null;
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
  const abs = Math.abs(ms);
  return `${sign}${fmtMs(abs)}`;
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

// ─── markdown report ─────────────────────────────────────────────────────────

function renderSetupMd(result) {
  if (!result) return '_(no data)_';
  const src = result.strapiSource || 'unknown';
  const ver = result.strapiVersion || '?';
  const sha = result.strapiGitSha ? ` @ ${result.strapiGitSha.slice(0, 10)}` : '';
  const branch = result.strapiGitBranch ? ` (branch \`${result.strapiGitBranch}\`)` : '';
  return `Strapi ${ver}${sha}${branch} [source: ${src}]`;
}

function renderEnvMd(result) {
  const e = result?.env;
  if (!e) return '_(no env info)_';
  return `Node ${e.nodeVersion} · ${e.platform}/${e.arch} · ${e.cpuModel} (${e.cpuCount} cores) · ${Math.round(
    e.totalMemMB / 1024
  )} GB · ${e.dbEngine}${e.dbVersion ? ` ${e.dbVersion}` : ''} (${e.dbHostType})`;
}

function buildDbTable(db, baseline, candidates) {
  // Union of migration names across all result sets for this DB.
  const allMigrationNames = new Set();
  if (baseline?.migrations) baseline.migrations.forEach((m) => allMigrationNames.add(m.name));
  for (const cand of candidates) {
    cand?.migrations?.forEach((m) => allMigrationNames.add(m.name));
  }

  const rows = [];
  for (const name of allMigrationNames) {
    const b = baseline?.migrations?.find((m) => m.name === name)?.durationMs ?? null;
    const cs = candidates.map(
      (cand) => cand?.migrations?.find((m) => m.name === name)?.durationMs ?? null
    );
    rows.push({ name, baseline: b, candidates: cs });
  }

  return rows;
}

function renderMarkdown(results) {
  const allDbs = new Set();
  for (const label of labels) {
    Object.keys(results[label] || {}).forEach((db) => allDbs.add(db));
  }

  const baseline = results[baselineLabel];
  const candidates = candidateLabels.map((l) => results[l]);

  // Pick a representative run for the "setup" block (any DB). Prefer postgres.
  const representativeDbs = ['postgres', 'mysql', 'mariadb', 'sqlite'];
  const pickRep = (r) => {
    if (!r) return null;
    for (const d of representativeDbs) if (r[d]) return r[d];
    return r[Object.keys(r)[0]];
  };
  const baselineRep = pickRep(baseline);
  const candRep = candidates.map(pickRep);

  let out = '';
  out += `## Migration benchmark: ${baselineLabel} vs ${candidateLabels.join(' vs ')}\n\n`;

  // Test setup block
  out += `### Test setup\n\n`;
  out += `- **Baseline (${baselineLabel}):** ${renderSetupMd(baselineRep)}\n`;
  candidateLabels.forEach((label, i) => {
    out += `- **Candidate (${label}):** ${renderSetupMd(candRep[i])}\n`;
  });
  if (baselineRep) {
    out += `- **Env:** ${renderEnvMd(baselineRep)}\n`;
  }
  const cfg = baselineRep?.config;
  if (cfg) {
    out += `- **Config:** multiplier=${cfg.multiplier}, seed=${cfg.seedMode}, hook=${cfg.hookMode}\n`;
  }
  out += `\n`;

  // Per-DB detail table
  for (const db of allDbs) {
    const b = baseline?.[db];
    const cs = candidates.map((c) => c?.[db]);
    if (!b && cs.every((c) => !c)) continue;

    const rows = buildDbTable(db, b, cs);

    out += `### ${db}\n\n`;
    if (!b) {
      out += `_No baseline result._\n\n`;
      continue;
    }
    const rowCountTotal = Object.values(b.rowCount || {}).reduce(
      (a, n) => (typeof n === 'number' ? a + n : a),
      0
    );
    out += `Row count: ~${rowCountTotal.toLocaleString()}\n\n`;

    const headerCells = ['Migration', 'Baseline'];
    candidateLabels.forEach((label) => {
      headerCells.push(label, 'Δ', '% change');
    });

    out += `| ${headerCells.join(' | ')} |\n`;
    out += `| ${headerCells.map((_, i) => (i === 0 ? ':---' : '---:')).join(' | ')} |\n`;

    const regressionLines = [];

    for (const row of rows) {
      const cells = [row.name, fmtMs(row.baseline)];
      for (let i = 0; i < candidateLabels.length; i += 1) {
        const c = row.candidates[i];
        const delta = c != null && row.baseline != null ? c - row.baseline : null;
        const pct = c != null && row.baseline != null ? pctChange(row.baseline, c) : null;
        cells.push(fmtMs(c), fmtDelta(delta), fmtPct(pct));
        if (pct != null && pct > REGRESSION_THRESHOLD_PCT) {
          regressionLines.push(
            `  - \`${row.name}\` regressed by ${fmtPct(pct)} (${candidateLabels[i]})`
          );
        }
      }
      out += `| ${cells.join(' | ')} |\n`;
    }

    // Total row
    const btotal = b.totalDurationMs;
    const cTotals = cs.map((c) => c?.totalDurationMs);
    const totalCells = ['**Total**', `**${fmtMs(btotal)}**`];
    for (let i = 0; i < candidateLabels.length; i += 1) {
      const c = cTotals[i];
      const delta = c != null && btotal != null ? c - btotal : null;
      const pct = c != null && btotal != null ? pctChange(btotal, c) : null;
      totalCells.push(`**${fmtMs(c)}**`, `**${fmtDelta(delta)}**`, `**${fmtPct(pct)}**`);
    }
    out += `| ${totalCells.join(' | ')} |\n`;

    // Speedup summary for first candidate
    if (btotal && cTotals[0]) {
      out += `\n**Speedup (${candidateLabels[0]} vs ${baselineLabel}):** ${fmtSpeedup(btotal, cTotals[0])}\n`;
    }

    if (regressionLines.length > 0) {
      out += `\n⚠️ Regressions detected (>${REGRESSION_THRESHOLD_PCT}%):\n${regressionLines.join('\n')}\n`;
    }

    out += `\n`;
  }

  // Cross-DB summary
  if (allDbs.size > 1) {
    out += `### Per-DB summary\n\n`;
    const sumHeader = ['DB', `Baseline (${baselineLabel}) total`];
    candidateLabels.forEach((l) => sumHeader.push(`${l} total`, 'speedup'));
    out += `| ${sumHeader.join(' | ')} |\n`;
    out += `| ${sumHeader.map((_, i) => (i === 0 ? ':---' : '---:')).join(' | ')} |\n`;
    for (const db of allDbs) {
      const b = results[baselineLabel]?.[db]?.totalDurationMs;
      const cells = [db, fmtMs(b)];
      for (const label of candidateLabels) {
        const c = results[label]?.[db]?.totalDurationMs;
        cells.push(fmtMs(c), fmtSpeedup(b, c));
      }
      out += `| ${cells.join(' | ')} |\n`;
    }
    out += `\n`;
  }

  return out;
}

// ─── HTML report ─────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSvgBarChart(rows, candidateLabels) {
  if (rows.length === 0) return '';

  // Layout constants
  const barHeight = 16;
  const barGap = 2;
  const rowGap = 10;
  const leftPad = 8;
  const rightPad = 80; // reserved for value labels ("857 ms" etc)

  // Compute label column width from the longest migration name. Monospace
  // char width ≈ 7.2px at 12px size; leave 16px padding. Round to keep
  // the resulting viewBox dimensions integer-friendly.
  const charWidth = 7.2;
  const longestName = rows.reduce((a, r) => Math.max(a, r.name.length), 0);
  const labelColWidth = Math.round(Math.min(Math.max(longestName * charWidth + 16, 180), 420));

  const seriesCount = 1 + candidateLabels.length;
  const rowHeight = (barHeight + barGap) * seriesCount + rowGap;
  const chartHeight = rows.length * rowHeight + rowGap;

  // Width sized so bars have at least 320px of drawing area
  const barAreaWidth = 320;
  const width = leftPad + labelColWidth + barAreaWidth + rightPad;

  const maxDuration = Math.max(
    ...rows.flatMap((r) => [r.baseline ?? 0, ...(r.candidates || []).map((c) => c ?? 0)]),
    1
  );
  const scale = (v) => (v == null ? 0 : (v / maxDuration) * barAreaWidth);

  const seriesColors = [
    'var(--baseline-color)',
    'var(--candidate-1-color)',
    'var(--candidate-2-color)',
    'var(--candidate-3-color)',
  ];

  // Inline font-family (CSS variables don't always cascade into SVG text
  // across renderers — safer to hardcode the family).
  const textStyle = 'font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const textStyleMuted = `${textStyle}; fill: var(--muted)`;
  const textStyleFg = `${textStyle}; fill: var(--text)`;

  let svg = `<svg viewBox="0 0 ${width} ${chartHeight}" width="100%" role="img" aria-label="Per-migration duration bars" style="max-width: ${width}px">`;

  rows.forEach((row, rowIdx) => {
    const yBase = rowIdx * rowHeight + rowGap / 2;
    const series = [row.baseline, ...(row.candidates || [])];
    const nameYCenter = yBase + (seriesCount * (barHeight + barGap)) / 2 - barGap / 2;

    // Vertically-centered migration name in the label column
    svg += `<text x="${leftPad}" y="${nameYCenter}" dominant-baseline="middle" style="${textStyleFg}">${escapeHtml(row.name)}</text>`;

    series.forEach((value, i) => {
      const y = yBase + i * (barHeight + barGap);
      const textY = y + barHeight / 2;
      const color = seriesColors[i] || 'var(--baseline-color)';
      const barX = leftPad + labelColWidth;

      if (value != null) {
        const w = scale(value);
        const title = `${i === 0 ? 'baseline' : candidateLabels[i - 1]}: ${fmtMs(value)}`;
        svg += `<rect x="${barX}" y="${y}" width="${w.toFixed(1)}" height="${barHeight}" fill="${color}" rx="2"><title>${escapeHtml(title)}</title></rect>`;
        svg += `<text x="${(barX + w + 4).toFixed(1)}" y="${textY}" dominant-baseline="middle" style="${textStyleMuted}">${fmtMs(value)}</text>`;
      } else {
        svg += `<text x="${barX}" y="${textY}" dominant-baseline="middle" style="${textStyleMuted}">—</text>`;
      }
    });
  });

  svg += `</svg>`;
  return svg;
}

function renderSetupHtml(result) {
  if (!result) return '<em>(no data)</em>';
  return escapeHtml(renderSetupMd(result));
}

function renderHtml(results) {
  const allDbs = new Set();
  for (const label of labels) {
    Object.keys(results[label] || {}).forEach((db) => allDbs.add(db));
  }

  const baseline = results[baselineLabel];
  const candidates = candidateLabels.map((l) => results[l]);

  const representativeDbs = ['postgres', 'mysql', 'mariadb', 'sqlite'];
  const pickRep = (r) => {
    if (!r) return null;
    for (const d of representativeDbs) if (r[d]) return r[d];
    return r[Object.keys(r)[0]];
  };
  const baselineRep = pickRep(baseline);
  const candRep = candidates.map(pickRep);

  // One-line verdict (use first candidate on postgres if present, else first available DB)
  const verdictDb = allDbs.has('postgres') ? 'postgres' : allDbs.values().next().value;
  const verdictBaseline = baseline?.[verdictDb]?.totalDurationMs;
  const verdictCandidate = candidates[0]?.[verdictDb]?.totalDurationMs;
  let verdict = '';
  if (verdictBaseline && verdictCandidate) {
    const ratio = verdictBaseline / verdictCandidate;
    if (ratio > 1.05) {
      verdict = `⚡ ${ratio.toFixed(2)}× faster on ${verdictDb}`;
    } else if (ratio < 0.95) {
      verdict = `⚠ ${(1 / ratio).toFixed(2)}× slower on ${verdictDb}`;
    } else {
      verdict = `≈ no change on ${verdictDb}`;
    }
  }

  const dbSections = [];
  for (const db of allDbs) {
    const b = baseline?.[db];
    const cs = candidates.map((c) => c?.[db]);
    if (!b && cs.every((c) => !c)) continue;
    const rows = buildDbTable(db, b, cs);

    const rowCountTotal = b
      ? Object.values(b.rowCount || {}).reduce((a, n) => (typeof n === 'number' ? a + n : a), 0)
      : 0;

    const tableHeaderCells = ['Migration', 'Baseline'];
    candidateLabels.forEach((l) => tableHeaderCells.push(escapeHtml(l), 'Δ', '% change'));

    const tableRows = rows
      .map((row) => {
        const cells = [
          `<td>${escapeHtml(row.name)}</td>`,
          `<td class="num">${fmtMs(row.baseline)}</td>`,
        ];
        row.candidates.forEach((c) => {
          const delta = c != null && row.baseline != null ? c - row.baseline : null;
          const pct = c != null && row.baseline != null ? pctChange(row.baseline, c) : null;
          const pctClass =
            pct == null
              ? ''
              : pct > REGRESSION_THRESHOLD_PCT
                ? 'regression'
                : pct < -REGRESSION_THRESHOLD_PCT
                  ? 'improvement'
                  : '';
          cells.push(
            `<td class="num">${fmtMs(c)}</td>`,
            `<td class="num">${fmtDelta(delta)}</td>`,
            `<td class="num ${pctClass}">${fmtPct(pct)}</td>`
          );
        });
        return `<tr>${cells.join('')}</tr>`;
      })
      .join('\n');

    // Total row
    const btotal = b?.totalDurationMs;
    const cTotals = cs.map((c) => c?.totalDurationMs);
    const totalCells = [`<th>Total</th>`, `<th class="num">${fmtMs(btotal)}</th>`];
    cTotals.forEach((c) => {
      const delta = c != null && btotal != null ? c - btotal : null;
      const pct = c != null && btotal != null ? pctChange(btotal, c) : null;
      const pctClass =
        pct == null
          ? ''
          : pct > REGRESSION_THRESHOLD_PCT
            ? 'regression'
            : pct < -REGRESSION_THRESHOLD_PCT
              ? 'improvement'
              : '';
      totalCells.push(
        `<th class="num">${fmtMs(c)}</th>`,
        `<th class="num">${fmtDelta(delta)}</th>`,
        `<th class="num ${pctClass}">${fmtPct(pct)}</th>`
      );
    });

    const speedupLine =
      btotal && cTotals[0]
        ? `<p class="speedup">Speedup (${escapeHtml(candidateLabels[0])} vs ${escapeHtml(baselineLabel)}): <strong>${fmtSpeedup(btotal, cTotals[0])}</strong></p>`
        : '';

    const svg = renderSvgBarChart(rows, candidateLabels);

    dbSections.push(`
      <section class="db-card">
        <h2>${escapeHtml(db)}</h2>
        <p class="meta">Row count: ~${rowCountTotal.toLocaleString()}</p>
        ${speedupLine}
        <div class="chart-wrap">${svg}</div>
        <table class="sortable">
          <thead><tr>${tableHeaderCells.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody>
            ${tableRows}
            <tr class="total-row">${totalCells.join('')}</tr>
          </tbody>
        </table>
      </section>
    `);
  }

  // Cross-DB summary
  let crossDbSection = '';
  if (allDbs.size > 1) {
    const sumHeader = ['DB', `Baseline (${escapeHtml(baselineLabel)}) total`];
    candidateLabels.forEach((l) => sumHeader.push(`${escapeHtml(l)} total`, 'speedup'));
    const rows = [];
    for (const db of allDbs) {
      const b = results[baselineLabel]?.[db]?.totalDurationMs;
      const cells = [escapeHtml(db), fmtMs(b)];
      for (const label of candidateLabels) {
        const c = results[label]?.[db]?.totalDurationMs;
        cells.push(fmtMs(c), fmtSpeedup(b, c));
      }
      rows.push(
        `<tr>${cells.map((c, i) => `<td class="${i === 0 ? '' : 'num'}">${c}</td>`).join('')}</tr>`
      );
    }
    crossDbSection = `
      <section class="cross-db">
        <h2>Per-DB summary</h2>
        <table>
          <thead><tr>${sumHeader.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </section>
    `;
  }

  const rawDataBlocks = labels
    .map((label) => {
      const byDb = results[label] || {};
      const blocks = Object.entries(byDb)
        .map(
          ([db, r]) =>
            `<details><summary>${escapeHtml(label)} / ${escapeHtml(db)}</summary><pre>${escapeHtml(
              JSON.stringify(r, null, 2)
            )}</pre></details>`
        )
        .join('');
      return blocks;
    })
    .join('');

  const cssVars = `
    --baseline-color: #888;
    --candidate-1-color: #2563eb;
    --candidate-2-color: #0891b2;
    --candidate-3-color: #9333ea;
    --regression-bg: #fee2e2;
    --regression-fg: #991b1b;
    --improvement-bg: #dcfce7;
    --improvement-fg: #166534;
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Migration benchmark: ${escapeHtml(baselineLabel)} vs ${escapeHtml(candidateLabels.join(', '))}</title>
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
      --candidate-2-color: #22d3ee;
      --candidate-3-color: #c084fc;
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
    max-width: 1100px;
    margin: 2rem auto;
    padding: 0 1rem;
  }
  h1 { margin-top: 0; }
  h2 { border-bottom: 1px solid var(--border); padding-bottom: 0.25rem; }
  .verdict { font-size: 1.2rem; padding: 0.5rem 0.75rem; background: var(--card-bg); border-radius: 6px; border: 1px solid var(--border); }
  .setup dt { font-weight: 600; color: var(--muted); margin-top: 0.5rem; }
  .setup dd { margin-left: 0; }
  .db-card, .cross-db { margin: 2rem 0; padding: 1rem; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; }
  table { border-collapse: collapse; width: 100%; margin-top: 0.5rem; }
  th, td { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); text-align: left; }
  th { cursor: pointer; user-select: none; }
  th:hover { background: rgba(127,127,127,0.1); }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; font-family: var(--mono-font); }
  tr.total-row th, tr.total-row td { border-top: 2px solid var(--border); font-weight: 600; }
  td.regression, th.regression { background: var(--regression-bg); color: var(--regression-fg); }
  td.improvement, th.improvement { background: var(--improvement-bg); color: var(--improvement-fg); }
  .speedup { font-size: 1.05rem; margin: 0.5rem 0; }
  .chart-wrap { overflow-x: auto; padding: 0.5rem 0; }
  details { margin: 0.5rem 0; }
  details summary { cursor: pointer; padding: 0.25rem 0; color: var(--muted); }
  details pre { background: var(--card-bg); padding: 0.75rem; border-radius: 4px; overflow-x: auto; font-family: var(--mono-font); font-size: 0.85rem; }
  footer { margin-top: 3rem; color: var(--muted); font-size: 0.85rem; border-top: 1px solid var(--border); padding-top: 1rem; }
</style>
</head>
<body>
  <h1>Migration benchmark</h1>
  <p class="verdict">${escapeHtml(verdict || 'No verdict available')}</p>

  <section class="setup">
    <h2>Test setup</h2>
    <dl>
      <dt>Baseline (${escapeHtml(baselineLabel)})</dt>
      <dd>${renderSetupHtml(baselineRep)}</dd>
      ${candidateLabels
        .map(
          (l, i) => `
        <dt>Candidate (${escapeHtml(l)})</dt>
        <dd>${renderSetupHtml(candRep[i])}</dd>
      `
        )
        .join('')}
      ${
        baselineRep?.env
          ? `
        <dt>Environment</dt>
        <dd>${escapeHtml(renderEnvMd(baselineRep))}</dd>
      `
          : ''
      }
      ${
        baselineRep?.config
          ? `
        <dt>Config</dt>
        <dd>multiplier=${baselineRep.config.multiplier}, seed=${baselineRep.config.seedMode}, hook=${baselineRep.config.hookMode}</dd>
      `
          : ''
      }
    </dl>
  </section>

  ${dbSections.join('')}

  ${crossDbSection}

  <section>
    <h2>Raw result JSONs</h2>
    ${rawDataBlocks}
  </section>

  <footer>
    Generated ${new Date().toISOString()} · bench-compare.js · Strapi migration benchmark harness
  </footer>

  <script>
    // Minimal sortable-table helper (no deps).
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

const markdown = renderMarkdown(results);
const html = renderHtml(results);

// Write files
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const mdPath = path.join(RESULTS_DIR, `compare-${stamp}.md`);
const htmlPath = path.join(RESULTS_DIR, `compare-${stamp}.html`);
fs.writeFileSync(mdPath, markdown, 'utf8');
fs.writeFileSync(htmlPath, html, 'utf8');

// Print markdown to stdout for clipboard / PR commenting
process.stdout.write(markdown);

console.error(`\n[bench-compare] markdown: ${path.relative(COMPLEX_DIR, mdPath)}`);
console.error(`[bench-compare] html:     ${path.relative(COMPLEX_DIR, htmlPath)}`);
