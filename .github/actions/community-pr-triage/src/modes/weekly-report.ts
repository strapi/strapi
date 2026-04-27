import * as core from '@actions/core';
import * as github from '../lib/github.js';
import * as linear from '../lib/linear.js';
import * as analyzer from '../lib/analyzer.js';
import * as notion from '../lib/notion.js';
import type { ActionInputs, PRAnalysis, WeeklyStats } from '../lib/types.js';

function buildLinearUpdateBody(stats: WeeklyStats, viewUrl: string): string {
  const date = new Date().toISOString().slice(0, 10);

  const prLine = (a: (typeof stats.quickWins)[number], extra?: string) => {
    const ticket = a.linearTicketId
      ? ` · [${a.linearTicketId}](https://linear.app/strapi/issue/${a.linearTicketId})`
      : '';
    const suffix = extra ? ` — ${extra}` : '';
    return `- [#${a.pr.number}](${a.pr.url}) (${a.area ?? 'unknown'})${ticket}${suffix}`;
  };

  const quickWinLines = stats.quickWins
    .map((a) => prLine(a, `${a.pr.additions + a.pr.deletions} LOC`))
    .join('\n');
  const newThisWeekLines = stats.newThisWeek.map((a) => prLine(a)).join('\n');

  return [
    `📊 Weekly Community PR Report — ${date}`,
    '',
    `📁 Total open PRs: ${stats.totalOpen}`,
    `🆕 New this week: ${stats.newThisWeek.length}`,
    `🚀 Picked up by CMS: ${stats.pickedUpByCMS.length}`,
    `🕰 Stale (>30d no activity): ${stats.stalePRs.length}`,
    '',
    '🆕 New this week:',
    newThisWeekLines || '- None this week',
    '',
    '⚡ Quick wins:',
    quickWinLines || '- None this week',
    '',
    viewUrl ? `→ [View all PRs in triage](${viewUrl})` : '',
  ]
    .filter((line) => line !== undefined)
    .join('\n')
    .trim();
}

export async function weeklyReport(inputs: ActionInputs): Promise<void> {
  const internalAuthors = await github.fetchInternalAuthors('strapi');
  const prs = await github.fetchOpenCommunityPRs(internalAuthors);

  // Bulk-fetch all tickets for both teams — replaces N×2 per-PR API calls with ~4 total
  const [cprTickets, cmsTickets] = await Promise.all([
    linear.fetchAllTicketsByPRNumber(inputs.cprTeamId),
    linear.fetchAllTicketsByPRNumber(inputs.cmsTeamId),
  ]);
  core.info(`Loaded ${cprTickets.size} CPR tickets, ${cmsTickets.size} CMS tickets`);

  const analyses: PRAnalysis[] = [];
  for (let i = 0; i < prs.length; i += 10) {
    const batch = prs.slice(i, i + 10);
    const batchAnalyses = await Promise.all(
      batch.map(async (pr) => {
        try {
          // Skip file fetch when a source label is present — detectArea doesn't need files
          const hasSourceLabel = pr.labels.some((l) => l.startsWith('source: '));
          const files = hasSourceLabel ? [] : await github.fetchPRFiles(pr.number);
          pr.files = files;
          const ticket = cprTickets.get(pr.number) ?? cmsTickets.get(pr.number) ?? null;
          return {
            pr,
            isQuickWin: analyzer.isQuickWin(pr),
            area: analyzer.detectArea(pr.labels, files),
            isStale: analyzer.isStale(pr),
            daysSinceUpdate: analyzer.daysSince(pr.updatedAt),
            linearTicketId: ticket?.identifier ?? null,
            linearTicketDbId: ticket?.id ?? null,
          } satisfies PRAnalysis;
        } catch (err) {
          core.warning(`PR #${pr.number}: skipping due to error — ${err}`);
          return null;
        }
      })
    );
    analyses.push(...(batchAnalyses.filter(Boolean) as PRAnalysis[]));
    if (i + 10 < prs.length) await new Promise((r) => setTimeout(r, 1000));
  }

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const cmsPickups = await linear.fetchCMSPickups(inputs.cmsTeamId, since);

  const quickWinCandidates = analyses.filter((a) => a.isQuickWin);
  const ciResults = await Promise.all(
    quickWinCandidates.map(async (a) => {
      try {
        return await github.fetchCIStatus(a.pr.headSha);
      } catch {
        return false;
      }
    })
  );
  const quickWins = quickWinCandidates.filter((_, i) => ciResults[i]).slice(0, 5);

  const stats: WeeklyStats = {
    totalOpen: analyses.length,
    newThisWeek: analyses.filter((a) => analyzer.isNewThisWeek(a.pr)),
    pickedUpByCMS: cmsPickups,
    stalePRs: analyses.filter((a) => a.isStale),
    quickWins,
  };

  // Refresh labels on CPR-owned tickets only (CMS tickets use a different team context)
  const labelMap = await linear.resolveTeamLabels(inputs.cprTeamId, inputs.labelMap);
  await Promise.all(
    analyses
      .filter((a) => a.linearTicketDbId !== null && a.linearTicketId?.startsWith('CPR-'))
      .map(async (a) => {
        try {
          await linear.updateTicketLabels(a.linearTicketDbId!, a, labelMap, inputs.cprTeamId);
        } catch (err) {
          core.warning(`Failed to update labels for ${a.linearTicketId}: ${err}`);
        }
      })
  );

  const body = buildLinearUpdateBody(stats, inputs.triageViewUrl);
  await linear.postProjectUpdate(inputs.projectId, body);

  if (inputs.postToNotion && inputs.notionDatabaseId) {
    await notion.createReportPage(
      inputs.notionDatabaseId,
      stats,
      analyses,
      new Date().toISOString()
    );
  }
}
