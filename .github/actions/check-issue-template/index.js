'use strict';

const core = require('@actions/core');
const github = require('@actions/github');

async function main() {
  try {
    const issueBody = github.context.payload.issue.body;
    const issueNumber = github.context.payload.issue.number;

    // Define the required checkboxes
    const requiredCheckboxes = [
      {
        id: 'duplicateCheck',
        text: 'I have checked the existing issues for duplicates.',
        patterns: [
          /- \[x\]\s*I have checked the existing \[issues\]\([^)]+\) for duplicates\./i,
          /- \[x\]\s*I have checked the existing \[issues\]\([^)]+\) for duplicates/i,
          /- \[x\]\s*I have checked.*\[issues\].*duplicates/i,
          /\[x\].*I have checked.*\[issues\].*duplicates/i,
          /- \[x\]\s*I have checked the existing issues for duplicates\./i,
          /- \[x\]\s*I have checked the existing issues for duplicates/i,
          /- \[x\]\s*I have checked.*duplicates/i,
          /\[x\].*I have checked.*duplicates/i,
        ],
      },
      {
        id: 'codeOfConduct',
        text: "I agree to follow this project's Code of Conduct.",
        patterns: [
          /- \[x\]\s*I agree to follow this project's \[Code of Conduct\]\([^)]+\)\./i,
          /- \[x\]\s*I agree to follow this project's \[Code of Conduct\]\([^)]+\)/i,
          /- \[x\]\s*I agree.*\[Code of Conduct\].*\./i,
          /\[x\].*I agree.*\[Code of Conduct\].*\./i,
          /- \[x\]\s*I agree to follow this project's Code of Conduct\./i,
          /- \[x\]\s*I agree to follow this project's Code of Conduct/i,
          /- \[x\]\s*I agree.*Code of Conduct/i,
          /\[x\].*I agree.*Code of Conduct/i,
          /- \[x\]\s*I agree to follow.*Code of Conduct/i,
        ],
      },
    ];

    // Define required version fields
    const requiredVersionFields = [
      {
        id: 'nodeVersion',
        label: 'Node Version',
        pattern: /### Node Version[\s\S]*?###/i,
      },
      {
        id: 'pmVersion',
        label: 'NPM/Yarn/PNPM Version',
        pattern: /### NPM\/Yarn\/PNPM Version[\s\S]*?###/i,
      },
      {
        id: 'strapiVersion',
        label: 'Strapi Version',
        pattern: /### Strapi Version[\s\S]*?###/i,
      },
    ];

    const missingItems = [];

    // Check each required checkbox
    for (const checkbox of requiredCheckboxes) {
      let found = false;

      // Check if any of the patterns match
      for (const pattern of checkbox.patterns) {
        if (pattern.test(issueBody)) {
          found = true;
          break;
        }
      }

      if (!found) {
        missingItems.push(checkbox.text);
      }
    }

    // Check each required version field
    for (const field of requiredVersionFields) {
      const match = issueBody.match(field.pattern);
      if (!match) {
        missingItems.push(field.label);
        continue;
      }

      // Extract the content between the header and next section
      let content = match[0];
      // Remove the header line
      content = content.replace(/^### .*?\n/i, '');
      // Remove the next section header if present
      content = content.replace(/\n### .*$/i, '');
      // Remove the last section header if it's the end
      content = content.replace(/\n### .*$/i, '');

      // Clean up the content
      content = content.trim();

      // Check if content is empty or just placeholder text
      if (
        !content ||
        content === 'No response' ||
        content === 'N/A' ||
        content === 'None' ||
        content.length < 3
      ) {
        missingItems.push(field.label);
      }
    }

    // If required items are missing, add the label and comment
    if (missingItems.length > 0) {
      const token = process.env.GITHUB_TOKEN;
      const octokit = github.getOctokit(token);

      /**
       * Add the "flag: invalid template" label
       *
       * NOTE:
       * The `issues_handleLabel.yml` workflow will subsequently comment on and close the issue
       */
      await octokit.rest.issues.addLabels({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: issueNumber,
        labels: ['flag: invalid template'],
      });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

if (require.main === module) {
  main();
} else {
  module.exports = main;
}
