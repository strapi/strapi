import * as core from '@actions/core';
import * as github from '../lib/github.js';
import * as linear from '../lib/linear.js';
import * as analyzer from '../lib/analyzer.js';
import * as notion from '../lib/notion.js';
import type { ActionInputs, PRAnalysis, WeeklyStats } from '../lib/types.js';

export async function notionReport(inputs: ActionInputs): Promise<void> {
  if (!inputs.notionDatabaseId)
    throw new Error('notion-database-id is required for notion-report mode');

  const internalAuthors = await github.fetchInternalAuthors('strapi');
  const prs = await github.fetchOpenCommunityPRs(internalAuthors);

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

  const stats: WeeklyStats = {
    totalOpen: analyses.length,
    newThisWeek: analyses.filter((a) => analyzer.isNewThisWeek(a.pr)),
    pickedUpByCMS: cmsPickups,
    stalePRs: analyses.filter((a) => a.isStale),
    quickWins: analyses.filter((a) => a.isQuickWin).slice(0, 5),
  };

  await notion.createReportPage(inputs.notionDatabaseId, stats, analyses, new Date().toISOString());
}
