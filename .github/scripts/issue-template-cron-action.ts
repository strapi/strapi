import * as core from '@actions/core';
import * as github from '@actions/github';

import { assertGithubToken, processInvalidTemplateIssues } from './issue-template-check.ts';

async function run() {
  const token = process.env.GITHUB_TOKEN;
  assertGithubToken(token);
  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;

  const { relabeled, closed, skipped } = await processInvalidTemplateIssues({
    github: octokit,
    owner,
    repo,
    log: (message) => core.info(message),
  });

  core.info(
    `Invalid template sweep: ${relabeled} label(s) removed, ${closed} issue(s) closed, ${skipped} skipped (grace period)`
  );
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
