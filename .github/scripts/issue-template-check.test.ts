import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  INVALID_TEMPLATE_LABEL,
  assertGithubToken,
  buildInvalidTemplateComment,
  getCheckedBoxLines,
  getInvalidTemplateLabelAppliedAt,
  isPlaceholderContent,
  parseIssueSections,
  planInvalidTemplateProcessing,
  resolveInvalidTemplateAction,
  validateIssueTemplate,
} from './issue-template-check.ts';

const VALID_ISSUE_BODY = `### Node Version

22

### Package Manager

yarn

### Package Manager Version

yarn@1.22.22

### Strapi Version

5.50.1

### Operating System

Strapi Cloud

### Database

Strapi Cloud

### Javascript or Typescript

Typescript

### Reproduction URL

_No response_

### Bug Description

Locally this appears to be working fine, on Cloud we are seeing issues when opening a content item.

### Steps to Reproduce

We are unable to reproduce locally at all, only on our Cloud hosted instance.

### Expected Behavior

No error, and content item opens

### Logs

\`\`\`shell
Browser error
\`\`\`

### Confirmation Checklist

- [x] I have checked the existing [issues](https://github.com/strapi/strapi/issues) for duplicates.
- [x] I agree to follow this project's [Code of Conduct](https://github.com/strapi/strapi/blob/develop/CODE_OF_CONDUCT.md).`;

describe('issue-template-check', () => {
  it('accepts issue #26951 (short Node version "22")', () => {
    const result = validateIssueTemplate(VALID_ISSUE_BODY);
    assert.equal(result.valid, true, result.missingItems.join(', '));
    assert.deepEqual(result.missingItems, []);
  });

  it('accepts short Node and package manager versions', () => {
    const body = VALID_ISSUE_BODY.replace('22', '20').replace('yarn@1.22.22', '1');

    const result = validateIssueTemplate(body);
    assert.equal(result.valid, true, result.missingItems.join(', '));
  });

  it('accepts semver-like package manager versions', () => {
    for (const version of ['1.22.22', '1.22']) {
      const body = VALID_ISSUE_BODY.replace('yarn@1.22.22', version);
      const result = validateIssueTemplate(body);

      assert.equal(result.valid, true, `${version}: ${result.missingItems.join(', ')}`);
    }
  });

  it('rejects issues without template section headers', () => {
    const result = validateIssueTemplate('Just a stack trace with no sections');

    assert.equal(result.valid, false);
    assert.match(result.missingItems[0], /template/i);
  });

  it('rejects unfilled required sections (_No response_)', () => {
    const body = VALID_ISSUE_BODY.replace('5.50.1', '_No response_');

    const result = validateIssueTemplate(body);
    assert.equal(result.valid, false);
    assert.ok(result.missingItems.some((item) => item.includes('Strapi Version')));
  });

  it('allows intentional NA or N/A in required fields', () => {
    const body = VALID_ISSUE_BODY.replace('5.50.1', 'N/A');

    const result = validateIssueTemplate(body);
    assert.equal(result.valid, true, result.missingItems.join(', '));

    const naBody = VALID_ISSUE_BODY.replace('yarn@1.22.22', 'NA');
    assert.equal(validateIssueTemplate(naBody).valid, true);
  });

  it('accepts sections regardless of order and header casing', () => {
    const body = VALID_ISSUE_BODY.replaceAll('### Node Version', '### NODE VERSION')
      .replace('### Javascript or Typescript', '### JavaScript or TypeScript')
      .replace(
        '### Expected Behavior\n\nNo error, and content item opens\n\n### Logs',
        '### Logs\n\n```shell\nBrowser error\n```\n\n### Expected Behavior\n\nNo error, and content item opens'
      );

    const result = validateIssueTemplate(body);
    assert.equal(result.valid, true, result.missingItems.join(', '));
  });

  it('accepts asterisk-style checked boxes', () => {
    const body = VALID_ISSUE_BODY.replace(
      '- [x] I have checked the existing [issues](https://github.com/strapi/strapi/issues) for duplicates.',
      '* [X] I have checked the existing issues for duplicates.'
    );

    const result = validateIssueTemplate(body);
    assert.equal(result.valid, true, result.missingItems.join(', '));
  });

  it('accepts paraphrased confirmation checkboxes (issue #26813)', () => {
    const body = `${VALID_ISSUE_BODY.replace(
      `### Confirmation Checklist

- [x] I have checked the existing [issues](https://github.com/strapi/strapi/issues) for duplicates.
- [x] I agree to follow this project's [Code of Conduct](https://github.com/strapi/strapi/blob/develop/CODE_OF_CONDUCT.md).`,
      `### Checklist

- [x] I have checked the existing issues and this is not a duplicate.
- [x] I have read the contributing guidelines and Code of Conduct.`
    )}`;

    const result = validateIssueTemplate(body);
    assert.equal(result.valid, true, result.missingItems.join(', '));
  });

  it('rejects unchecked confirmation checkboxes', () => {
    const body = VALID_ISSUE_BODY.replace('[x]', '[ ]');

    const result = validateIssueTemplate(body);
    assert.equal(result.valid, false);
    assert.ok(result.missingItems.some((item) => item.includes('checkbox')));
  });

  it('allows optional sections to use _No response_', () => {
    const sections = parseIssueSections(VALID_ISSUE_BODY);

    assert.equal(sections.get('Reproduction URL'), '_No response_');
    assert.equal(isPlaceholderContent('_No response_'), true);
    assert.equal(validateIssueTemplate(VALID_ISSUE_BODY).valid, true);
  });

  it('builds a comment that lists missing items', () => {
    const comment = buildInvalidTemplateComment('user', 'strapi', 'strapi', [
      'Section: Node Version',
      'Duplicate issues checkbox',
    ]);

    assert.match(comment, /@user/);
    assert.match(comment, /Section: Node Version/);
    assert.match(comment, /Duplicate issues checkbox/);
    assert.match(comment, /BUG_REPORT\.yml/);
    assert.match(comment, /1 day/);
  });

  it('removes label when an issue becomes valid before grace period ends', () => {
    const now = new Date('2026-07-09T12:00:00Z');
    const labelAppliedAt = new Date('2026-07-08T12:00:00Z');

    assert.equal(resolveInvalidTemplateAction(true, labelAppliedAt, now), 'remove_label');
  });

  it('skips closing while grace period is active', () => {
    const now = new Date('2026-07-09T12:00:00Z');
    const labelAppliedAt = new Date('2026-07-09T06:00:00Z');

    assert.equal(resolveInvalidTemplateAction(false, labelAppliedAt, now), 'skip');
  });

  it('closes issues that stay invalid beyond the grace period', () => {
    const now = new Date('2026-07-09T12:00:00Z');
    const labelAppliedAt = new Date('2026-06-20T12:00:00Z');

    assert.equal(resolveInvalidTemplateAction(false, labelAppliedAt, now), 'close');
  });

  it('plans label removal when a flagged issue is fixed', () => {
    const plans = planInvalidTemplateProcessing({
      issues: [
        {
          number: 123,
          body: VALID_ISSUE_BODY,
          label_applied_at: '2026-07-01T00:00:00Z',
        },
      ],
      now: new Date('2026-07-09T00:00:00Z'),
    });

    assert.deepEqual(plans, [{ number: 123, action: 'remove_label' }]);
  });

  it('ignores ### headers and [x] checkboxes inside fenced code blocks', () => {
    const body = `${VALID_ISSUE_BODY}

\`\`\`markdown
### Fake Section
- [x] I have checked the existing issues for duplicates.
- [x] I agree to follow this project's Code of Conduct.
\`\`\``;

    const result = validateIssueTemplate(body);
    assert.equal(result.valid, true, result.missingItems.join(', '));
    assert.deepEqual(getCheckedBoxLines(body), [
      '- [x] I have checked the existing [issues](https://github.com/strapi/strapi/issues) for duplicates.',
      "- [x] I agree to follow this project's [Code of Conduct](https://github.com/strapi/strapi/blob/develop/CODE_OF_CONDUCT.md).",
    ]);
  });

  it('uses the last duplicate section instead of merging content', () => {
    const body = VALID_ISSUE_BODY.replace(
      '### Strapi Version\n\n5.50.1',
      '### Strapi Version\n\n_No response_\n\n### Strapi Version\n\n5.50.1'
    );

    const sections = parseIssueSections(body);
    assert.equal(sections.get('Strapi Version'), '5.50.1');

    const result = validateIssueTemplate(body);
    assert.equal(result.valid, true, result.missingItems.join(', '));
  });

  it('rejects issues that only satisfy checkboxes via fenced-code bypass', () => {
    const body = `### Node Version

22

### Package Manager

yarn

### Package Manager Version

1

### Strapi Version

5.50.1

### Operating System

Strapi Cloud

### Database

Strapi Cloud

### Javascript or Typescript

Typescript

### Reproduction URL

_No response_

### Bug Description

Something broke

### Steps to Reproduce

Do the thing

### Expected Behavior

It works

### Logs

_No response_

### Confirmation Checklist

- [ ] I have checked the existing issues for duplicates.
- [ ] I agree to follow this project's Code of Conduct.

\`\`\`markdown
- [x] I have checked the existing issues for duplicates.
- [x] I agree to follow this project's Code of Conduct.
\`\`\``;

    const result = validateIssueTemplate(body);
    assert.equal(result.valid, false);
    assert.ok(result.missingItems.some((item) => item.includes('checkbox')));
  });

  it('throws when GITHUB_TOKEN is missing', () => {
    assert.throws(() => assertGithubToken(undefined), /token or opts\.auth is required/i);
    assert.doesNotThrow(() => assertGithubToken('ghs_test'));
  });

  it('reads label-applied time from per-issue events, not repo-wide events', async () => {
    const issueOneLabelAt = '2026-07-01T10:00:00Z';
    const issueTwoLabelAt = '2026-07-08T15:00:00Z';
    const listEventsCalls: number[] = [];

    const github = {
      rest: {
        issues: {
          listEvents: async ({
            issue_number,
          }: {
            owner: string;
            repo: string;
            issue_number: number;
            per_page: number;
          }) => {
            listEventsCalls.push(issue_number);

            const eventsByIssue: Record<
              number,
              Array<{ event: string; label?: { name: string }; created_at: string }>
            > = {
              1: [
                {
                  event: 'labeled',
                  label: { name: INVALID_TEMPLATE_LABEL },
                  created_at: issueOneLabelAt,
                },
              ],
              2: [
                {
                  event: 'labeled',
                  label: { name: INVALID_TEMPLATE_LABEL },
                  created_at: issueTwoLabelAt,
                },
              ],
            };

            return { data: eventsByIssue[issue_number] ?? [] };
          },
        },
      },
      paginate: {
        iterator(method: typeof github.rest.issues.listEvents, params: { issue_number: number }) {
          return (async function* () {
            yield { data: (await method(params)).data };
          })();
        },
      },
    };

    const issueOneAppliedAt = await getInvalidTemplateLabelAppliedAt(
      github as never,
      'strapi',
      'strapi',
      1
    );
    const issueTwoAppliedAt = await getInvalidTemplateLabelAppliedAt(
      github as never,
      'strapi',
      'strapi',
      2
    );

    assert.deepEqual(listEventsCalls, [1, 2]);
    assert.equal(issueOneAppliedAt?.getTime(), new Date(issueOneLabelAt).getTime());
    assert.equal(issueTwoAppliedAt?.getTime(), new Date(issueTwoLabelAt).getTime());
  });

  it('returns the latest label-applied time when the label was re-applied', async () => {
    const firstLabelAt = '2026-07-01T10:00:00Z';
    const secondLabelAt = '2026-07-05T12:00:00Z';

    const github = {
      rest: {
        issues: {
          listEvents: async () => ({
            data: [
              {
                event: 'labeled',
                label: { name: INVALID_TEMPLATE_LABEL },
                created_at: firstLabelAt,
              },
              {
                event: 'labeled',
                label: { name: 'status: needs triage' },
                created_at: '2026-07-03T12:00:00Z',
              },
              {
                event: 'labeled',
                label: { name: INVALID_TEMPLATE_LABEL },
                created_at: secondLabelAt,
              },
            ],
          }),
        },
      },
      paginate: {
        iterator(method: typeof github.rest.issues.listEvents, params: Record<string, unknown>) {
          return (async function* () {
            yield { data: (await method(params)).data };
          })();
        },
      },
    };

    const appliedAt = await getInvalidTemplateLabelAppliedAt(
      github as never,
      'strapi',
      'strapi',
      99
    );

    assert.equal(appliedAt?.getTime(), new Date(secondLabelAt).getTime());
  });
});
