import * as core from '@actions/core';
import * as github from '@actions/github';

import { buildInvalidTemplateComment, validateIssueTemplate } from './issue-template-check.ts';

async function run() {
  const issue = github.context.payload.issue;

  if (!issue) {
    core.info('No issue in context; skipping');
    return;
  }

  const octokit = github.getOctokit(process.env.GITHUB_TOKEN!);
  const { owner, repo } = github.context.repo;
  const issueBody = issue.body || '';
  const issueNumber = issue.number;
  const { valid, missingItems } = validateIssueTemplate(issueBody);

  if (!valid) {
    core.info(`Missing required items: ${missingItems.join(', ')}`);

    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels: ['flag: invalid template'],
    });

    const comment = buildInvalidTemplateComment(
      issue.user?.login ?? 'user',
      owner,
      repo,
      missingItems
    );

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: comment,
    });

    core.info(`Added "flag: invalid template" label and comment on issue #${issueNumber}`);
    return;
  }

  core.info(`Issue #${issueNumber} follows the bug report template`);
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
