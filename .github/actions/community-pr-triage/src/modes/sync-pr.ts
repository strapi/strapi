import * as core from '@actions/core';
import * as github from '../lib/github.js';
import * as linear from '../lib/linear.js';
import * as analyzer from '../lib/analyzer.js';
import type { ActionInputs, PRAnalysis } from '../lib/types.js';

export async function syncPR(
  prNumber: number,
  triggerLabel: string | null,
  inputs: ActionInputs
): Promise<void> {
  const pr = await github.fetchPR(prNumber);
  const files = await github.fetchPRFiles(prNumber);
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

  // Check CPR first, then CMS — avoids creating a duplicate if already picked up
  const cprTicket = await linear.findTicketByPRNumber(inputs.cprTeamId, prNumber);
  const cmsTicket = cprTicket
    ? null
    : await linear.findTicketByPRNumber(inputs.cmsTeamId, prNumber);
  const existing = cprTicket ?? cmsTicket;
  const labelMap = await linear.resolveTeamLabels(inputs.cprTeamId, inputs.labelMap);

  if (!existing) {
    const ticket = await linear.createTicket(
      pr,
      analysis,
      inputs.cprTeamId,
      inputs.projectId,
      labelMap,
      inputs.triageStateId
    );
    analysis.linearTicketId = ticket.identifier;

    await github.postComment(
      prNumber,
      `This PR has been added to our community triage board as **${ticket.identifier}**.`
    );
    await github.appendToPRBody(prNumber, `Fixes ${ticket.identifier}`);
  } else {
    analysis.linearTicketId = existing.identifier;
    analysis.linearTicketDbId = existing.id;
    if (cprTicket) {
      await linear.updateTicket(existing.id, pr, analysis, labelMap, inputs.cprTeamId);
    } else {
      await linear.updateTicketMetadata(existing.id, pr, analysis);
    }
  }
}
