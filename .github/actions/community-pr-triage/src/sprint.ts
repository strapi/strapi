import type { ScoredPR } from './types.js';

export function selectSprintPRs(scoredPRs: ScoredPR[], count = 10): ScoredPR[] {
  const selected: ScoredPR[] = [];
  const used = new Set<number>();

  const pick = (prs: ScoredPR[], n: number) => {
    for (const pr of prs) {
      if (selected.length >= count || n <= 0) break;
      if (used.has(pr.pr.number)) continue;
      selected.push(pr);
      used.add(pr.pr.number);
      n--;
    }
  };

  const sorted = [...scoredPRs].sort((a, b) => b.value.total - a.value.total);

  // 1. Urgent/high priority (4-5 slots)
  pick(
    sorted.filter((p) => p.priority === 'urgent' || p.priority === 'high'),
    5
  );
  // 2. Quick wins (3-4 slots)
  pick(
    sorted.filter((p) => p.isQuickWin),
    4
  );
  // 3. Enhancements/features (1-2 slots)
  pick(
    sorted.filter((p) => p.prType === 'enhancement' || p.prType === 'feature'),
    2
  );
  // Fill remaining
  if (selected.length < count) pick(sorted, count - selected.length);

  return selected;
}

export function groupByArea(prs: ScoredPR[]): Map<string, ScoredPR[]> {
  const grouped = new Map<string, ScoredPR[]>();
  for (const pr of prs) {
    if (!grouped.has(pr.area)) grouped.set(pr.area, []);
    grouped.get(pr.area)!.push(pr);
  }
  return grouped;
}

export function formatSprintUpdate(
  sprintPRs: ScoredPR[],
  totalPRs: number,
  linearUrls: Map<number, string> = new Map()
): string {
  const grouped = groupByArea(sprintPRs);
  for (const prs of grouped.values()) prs.sort((a, b) => b.value.total - a.value.total);

  const urgent = sprintPRs.filter((p) => p.priority === 'urgent' || p.priority === 'high').length;
  const quickWins = sprintPRs.filter((p) => p.isQuickWin).length;
  const features = sprintPRs.filter(
    (p) => p.prType === 'enhancement' || p.prType === 'feature'
  ).length;

  let md = `### Sprint Recommendation\n\n`;
  md += `Selected **${sprintPRs.length}** PRs from **${totalPRs}** open community PRs.\n`;
  md += `**Mix:** ${urgent} urgent/high · ${quickWins} quick wins · ${features} enhancements/features\n\n`;

  const sortedAreas = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [area, prs] of sortedAreas) {
    md += `### ${area}\n\n`;
    for (const pr of prs) {
      const loc = pr.pr.additions + pr.pr.deletions;
      const sizeLabel = loc < 50 ? 'S' : loc < 300 ? 'M' : loc < 1000 ? 'L' : 'XL';
      const tags: string[] = [];
      if (pr.priority === 'urgent') tags.push('🔴 urgent');
      else if (pr.priority === 'high') tags.push('🟠 high');
      if (pr.isQuickWin) tags.push('⚡ quick win');
      const ciIcon =
        pr.pr.ciStatus === 'passing' ? '✅' : pr.pr.ciStatus === 'failing' ? '❌' : '⏳';
      const linearUrl = linearUrls.get(pr.pr.number);
      const ticketRef = linearUrl ? ` · ${linearUrl}` : '';

      md += `- [**#${pr.pr.number}**](https://github.com/strapi/strapi/pull/${pr.pr.number}) ${pr.pr.title}\n`;
      md += `  ${pr.prType} · ${sizeLabel} (${loc} LOC) · ${ciIcon} CI · value ${pr.value.total}`;
      if (tags.length > 0) md += ` · ${tags.join(' · ')}`;
      md += `${ticketRef}\n`;
    }
    md += '\n';
  }

  return md;
}
