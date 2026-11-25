import * as core from '@actions/core';
import * as github from './lib/github.js';
import * as linear from './lib/linear.js';
import * as notion from './lib/notion.js';
import { syncPR } from './modes/sync-pr.js';
import { syncAll } from './modes/sync-all.js';
import { weeklyReport } from './modes/weekly-report.js';
import { notionReport } from './modes/notion-report.js';
import type { ActionInputs } from './lib/types.js';

function parseLabels(raw: string): Map<string, string> | null {
  if (!raw) return null;
  try {
    return new Map(Object.entries(JSON.parse(raw) as Record<string, string>));
  } catch {
    return null;
  }
}

function loadInputs(): ActionInputs {
  return {
    githubToken: core.getInput('github-token', { required: true }),
    linearApiKey: core.getInput('linear-api-key', { required: true }),
    cprTeamId: core.getInput('linear-cpr-team-id', { required: true }),
    cmsTeamId: core.getInput('linear-cms-team-id', { required: true }),
    projectId: core.getInput('linear-project-id', { required: true }),
    triageViewUrl: core.getInput('linear-triage-view-url') || '',
    postToNotion: core.getInput('post-to-notion') === 'true',
    notionApiKey: core.getInput('notion-api-key') || null,
    notionDatabaseId: core.getInput('notion-database-id') || null,
    labelMap: parseLabels(core.getInput('linear-labels')),
    triageStateId: core.getInput('linear-triage-state-id') || null,
  };
}

async function run(): Promise<void> {
  const mode = core.getInput('mode', { required: true });
  const inputs = loadInputs();

  // Initialize clients
  github.initGitHub(inputs.githubToken);
  linear.initLinear(inputs.linearApiKey);
  if (inputs.postToNotion || mode === 'notion-report') {
    if (!inputs.notionApiKey) throw new Error('notion-api-key is required for Notion report');
    notion.initNotion(inputs.notionApiKey);
  }

  switch (mode) {
    case 'sync-pr': {
      const prNumber = parseInt(core.getInput('pr-number', { required: true }), 10);
      if (isNaN(prNumber)) throw new Error('pr-number must be a valid integer');
      const triggerLabel = core.getInput('trigger-label') || null;
      await syncPR(prNumber, triggerLabel, inputs);
      break;
    }
    case 'sync-all':
      await syncAll(inputs);
      break;
    case 'linear-weekly-report':
      await weeklyReport(inputs);
      break;
    case 'notion-report':
      await notionReport(inputs);
      break;
    default:
      core.setFailed(`Unknown mode: ${mode}`);
  }
}

run().catch((err) => core.setFailed(err instanceof Error ? err.message : String(err)));
