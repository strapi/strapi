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
  const issue = github.context.payload.issue;

  if (!issue) {
    core.info('No issue in context; skipping');
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  assertGithubToken(token);
  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  const issueBody = issue.body || '';
  const issueNumber = issue.number;
  const action = github.context.payload.action ?? 'opened';
  const labels = (issue.labels ?? []).map((label) =>
    typeof label === 'string' ? label : label.name
  );
  const hasInvalidTemplateLabel = labels.includes(INVALID_TEMPLATE_LABEL);
  const { valid, missingItems } = validateIssueTemplate(issueBody);

  if (!valid) {
    if (action === 'opened' || !hasInvalidTemplateLabel) {
      core.info(`Missing required items: ${missingItems.join(', ')}`);

      if (!hasInvalidTemplateLabel) {
        await octokit.rest.issues.addLabels({
          owner,
          repo,
          issue_number: issueNumber,
          labels: [INVALID_TEMPLATE_LABEL],
        });
      }

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

      core.info(`Flagged issue #${issueNumber} as invalid template`);
      return;
    }

    core.info(`Issue #${issueNumber} is still invalid; grace period continues`);
    return;
  }

  if (hasInvalidTemplateLabel) {
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

  core.info(`Issue #${issueNumber} follows the bug report template`);
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
