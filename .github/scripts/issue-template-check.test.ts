import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildInvalidTemplateComment,
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
});
