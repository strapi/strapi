import * as core from '@actions/core';
import * as github from '@actions/github';

import {
  INVALID_TEMPLATE_LABEL,
  assertGithubToken,
  buildInvalidTemplateComment,
  buildInvalidTemplateFixedComment,
  validateIssueTemplate,
} from './issue-template-check.ts';

async function run() {
  const label = github.context.payload.label;

  if (!label || label.name !== INVALID_TEMPLATE_LABEL) {
    core.info('Not invalid template label; skipping');
    return;
  }

  const issue = github.context.payload.issue;

  if (!issue) {
    core.info('No issue in context; skipping');
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  assertGithubToken(token);
  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  const issueNumber = issue.number;
  const login = issue.user?.login ?? 'user';
  const body = issue.body || '';
  const labelAddedBy = github.context.payload.sender?.login ?? '';
  const { valid, missingItems } = validateIssueTemplate(body);

  if (valid) {
    try {
      await octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number: issueNumber,
        name: INVALID_TEMPLATE_LABEL,
      });
    } catch {
      // Label may have been removed concurrently — not fatal
    }

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: buildInvalidTemplateFixedComment(),
    });

    core.info(`Removed invalid template label from issue #${issueNumber}`);
    return;
  }

  if (labelAddedBy === 'github-actions[bot]') {
    core.info('Invalid template label added by template checker; grace comment already posted');
    return;
  }

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body: buildInvalidTemplateComment(login, owner, repo, missingItems),
  });

  core.info(`Posted invalid template grace comment on issue #${issueNumber}`);
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
