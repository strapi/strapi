import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ScoredPR, PriorityTier } from './types.js';

type GroupedPRs = Record<PriorityTier, ScoredPR[]>;

export function groupByPriority(prs: ScoredPR[]): GroupedPRs {
  const groups: GroupedPRs = { urgent: [], high: [], normal: [], low: [] };
  for (const pr of prs) {
    groups[pr.priority].push(pr);
  }
  for (const tier of Object.keys(groups) as PriorityTier[]) {
    groups[tier].sort((a, b) => b.value.total - a.value.total);
  }
  return groups;
}

function sizeLabel(loc: number): string {
  if (loc < 50) return 'S';
  if (loc < 300) return 'M';
  if (loc < 1000) return 'L';
  return 'XL';
}

function formatPR(pr: ScoredPR): string {
  const loc = pr.pr.additions + pr.pr.deletions;
  const size = sizeLabel(loc);
  const qw = pr.isQuickWin ? ' | quick-win' : '';
  const header = `  #${pr.pr.number} [${pr.prType} | ${pr.area} | ${size}${qw}] ${pr.pr.title}`;

  const details: string[] = [];
  if (pr.linkedIssues.length > 0) {
    const issueRefs = pr.linkedIssues
      .map((li) => `#${li.issue.number} (${li.issue.thumbsUp} thumbs-up)`)
      .join(', ');
    details.push(`refs ${issueRefs}`);
  }
  details.push(`CI: ${pr.pr.ciStatus}`);
  const ageDays = Math.floor((Date.now() - new Date(pr.pr.createdAt).getTime()) / 86400000);
  details.push(`${ageDays}d old`);
  details.push(`Value: ${pr.value.total}`);

  return `${header}\n    ${details.join(' | ')}`;
}

export function formatStats(prs: ScoredPR[]): string {
  const quickWins = prs.filter((p) => p.isQuickWin).length;
  const stale = prs.filter((p) => {
    const age = (Date.now() - new Date(p.pr.createdAt).getTime()) / 86400000;
    return age > 60;
  }).length;
  return `Stats: ${prs.length} community PRs | ${quickWins} quick win${quickWins !== 1 ? 's' : ''} | ${stale} stale (>60d)`;
}

const TIER_HEADERS: Record<PriorityTier, string> = {
  urgent: 'URGENT',
  high: 'HIGH',
  normal: 'NORMAL',
  low: 'LOW',
};

export function printReport(prs: ScoredPR[]): void {
  const grouped = groupByPriority(prs);

  console.log('\n' + '='.repeat(70));
  console.log('  COMMUNITY PR TRIAGE REPORT');
  console.log('='.repeat(70) + '\n');

  for (const tier of ['urgent', 'high', 'normal', 'low'] as PriorityTier[]) {
    const items = grouped[tier];
    console.log(`${TIER_HEADERS[tier]} (${items.length} PRs)`);
    if (items.length === 0) {
      console.log('  (none)\n');
      continue;
    }
    for (const pr of items) {
      console.log(formatPR(pr));
    }
    console.log();
  }

  const quickWins = prs
    .filter((p) => p.isQuickWin)
    .sort((a, b) => a.pr.additions + a.pr.deletions - (b.pr.additions + b.pr.deletions));
  console.log(`QUICK WINS (${quickWins.length} PRs)`);
  if (quickWins.length === 0) {
    console.log('  (none)\n');
  } else {
    for (const pr of quickWins) {
      const loc = pr.pr.additions + pr.pr.deletions;
      console.log(`  #${pr.pr.number} [${pr.prType} | ${pr.area} | ${loc} LOC] ${pr.pr.title}`);
    }
    console.log();
  }

  console.log(formatStats(prs));
  console.log();
}

function mdPrRow(pr: ScoredPR): string {
  const loc = pr.pr.additions + pr.pr.deletions;
  const size = sizeLabel(loc);
  const qw = pr.isQuickWin ? ' :zap:' : '';
  const ci =
    pr.pr.ciStatus === 'passing'
      ? ':white_check_mark:'
      : pr.pr.ciStatus === 'failing'
        ? ':x:'
        : ':hourglass:';
  const ageDays = Math.floor((Date.now() - new Date(pr.pr.createdAt).getTime()) / 86400000);
  const issueRefs = pr.linkedIssues.map((li) => `#${li.issue.number}`).join(', ');

  return `| [#${pr.pr.number}](https://github.com/strapi/strapi/pull/${pr.pr.number}) | ${pr.pr.title} | ${pr.pr.author} | ${pr.prType} | ${pr.area} | ${size} | ${ci} | ${ageDays}d | ${pr.value.total} | ${issueRefs}${qw} |`;
}

export function generateMarkdownReport(prs: ScoredPR[], outputPath: string): string {
  const grouped = groupByPriority(prs);
  const date = new Date().toISOString().split('T')[0];
  const quickWins = prs.filter((p) => p.isQuickWin).length;
  const stale = prs.filter((p) => {
    const age = (Date.now() - new Date(p.pr.createdAt).getTime()) / 86400000;
    return age > 60;
  }).length;
  const passing = prs.filter((p) => p.pr.ciStatus === 'passing').length;
  const failing = prs.filter((p) => p.pr.ciStatus === 'failing').length;

  let md = `# Community PR Triage Report\n\n`;
  md += `**Date:** ${date}  \n`;
  md += `**Total PRs:** ${prs.length} | **Quick Wins:** ${quickWins} | **Stale (>60d):** ${stale}  \n`;
  md += `**CI:** ${passing} passing, ${failing} failing, ${prs.length - passing - failing} pending\n\n`;

  md += `---\n\n`;

  for (const tier of ['urgent', 'high', 'normal', 'low'] as PriorityTier[]) {
    const items = grouped[tier];
    const emoji =
      tier === 'urgent'
        ? ':red_circle:'
        : tier === 'high'
          ? ':orange_circle:'
          : tier === 'normal'
            ? ':large_blue_circle:'
            : ':white_circle:';
    md += `## ${emoji} ${tier.toUpperCase()} (${items.length} PRs)\n\n`;

    if (items.length === 0) {
      md += `_None_\n\n`;
      continue;
    }

    md += `| PR | Title | Author | Type | Area | Size | CI | Age | Value | Refs |\n`;
    md += `|----|-------|--------|------|------|------|----|-----|-------|------|\n`;
    for (const pr of items) {
      md += mdPrRow(pr) + '\n';
    }
    md += '\n';
  }

  md += `## :zap: Quick Wins\n\n`;
  const qwPRs = prs
    .filter((p) => p.isQuickWin)
    .sort((a, b) => a.pr.additions + a.pr.deletions - (b.pr.additions + b.pr.deletions));
  if (qwPRs.length === 0) {
    md += `_None_\n`;
  } else {
    md += `| PR | Title | Author | Area | LOC | Value |\n`;
    md += `|----|-------|--------|------|-----|-------|\n`;
    for (const pr of qwPRs) {
      const loc = pr.pr.additions + pr.pr.deletions;
      md += `| [#${pr.pr.number}](https://github.com/strapi/strapi/pull/${pr.pr.number}) | ${pr.pr.title} | ${pr.pr.author} | ${pr.area} | ${loc} | ${pr.value.total} |\n`;
    }
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, md);
  return outputPath;
}
