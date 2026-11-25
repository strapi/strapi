import * as core from '@actions/core';
import * as github from '../lib/github.js';
import * as linear from '../lib/linear.js';
import * as analyzer from '../lib/analyzer.js';
import type { ActionInputs, PRAnalysis } from '../lib/types.js';

export async function syncAll(inputs: ActionInputs): Promise<void> {
  const internalAuthors = await github.fetchInternalAuthors('strapi');
  const prs = await github.fetchOpenCommunityPRs(internalAuthors);
  core.info(`Found ${prs.length} open community PRs to sync`);

  // Bulk-fetch all tickets for both teams — replaces N×2 per-PR API calls with ~4 total
  const [cprTickets, cmsTickets, labelMap] = await Promise.all([
    linear.fetchAllTicketsByPRNumber(inputs.cprTeamId),
    linear.fetchAllTicketsByPRNumber(inputs.cmsTeamId),
    linear.resolveTeamLabels(inputs.cprTeamId, inputs.labelMap),
  ]);
  core.info(`Loaded ${cprTickets.size} CPR tickets, ${cmsTickets.size} CMS tickets`);

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < prs.length; i += 10) {
    const batch = prs.slice(i, i + 10);
    await Promise.all(
      batch.map(async (pr) => {
        try {
          const hasSourceLabel = pr.labels.some((l) => l.startsWith('source: '));
          const files = hasSourceLabel ? [] : await github.fetchPRFiles(pr.number);
          pr.files = files;
          const analysis: PRAnalysis = {
            pr,
            isQuickWin: analyzer.isQuickWin(pr),
            area: analyzer.detectArea(pr.labels, files),
            isStale: analyzer.isStale(pr),
            daysSinceUpdate: analyzer.daysSince(pr.updatedAt),
            linearTicketId: null,
            linearTicketDbId: null,
          };

          const cprTicket = cprTickets.get(pr.number) ?? null;
          const cmsTicket = cmsTickets.get(pr.number) ?? null;

          if (cprTicket) {
            analysis.linearTicketId = cprTicket.identifier;
            analysis.linearTicketDbId = cprTicket.id;
            await linear.updateTicket(cprTicket.id, pr, analysis, labelMap, inputs.cprTeamId);
            updated++;
          } else if (cmsTicket) {
            core.info(`PR #${pr.number} already in CMS as ${cmsTicket.identifier}, skipping`);
          } else {
            const ticket = await linear.createTicket(
              pr,
              analysis,
              inputs.cprTeamId,
              inputs.projectId,
              labelMap,
              inputs.triageStateId
            );
            try {
              await github.postComment(
                pr.number,
                `This PR has been added to our community triage board as **${ticket.identifier}**.`
              );
              await github.appendToPRBody(pr.number, `Fixes ${ticket.identifier}`);
            } catch (err) {
              core.warning(`PR #${pr.number}: could not update GitHub (no write access?) — ${err}`);
            }
            created++;
            core.info(`Created ${ticket.identifier} for PR #${pr.number}`);
          }
        } catch (err) {
          failed++;
          core.warning(`PR #${pr.number}: sync failed — ${err}`);
        }
      })
    );
    if (i + 10 < prs.length) await new Promise((r) => setTimeout(r, 1000));
  }

  core.info(`Sync complete: ${created} created, ${updated} updated, ${failed} failed`);
}
