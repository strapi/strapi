/**
 * Validates GitHub bug reports against BUG_REPORT.yml structure.
 *
 * Uses section headers (### Title) rather than brittle per-field regex so
 * short but valid values (e.g. Node "20", yarn version "1") are accepted.
 */

/**
 * Values GitHub issue forms insert when a field is left empty — not intentional answers.
 * We do not reject NA/N/A, "-", etc.; content quality is for humans to triage.
 */
const EMPTY_FIELD_MARKERS = new Set(['', 'no response']);

/** Required sections from .github/ISSUE_TEMPLATE/BUG_REPORT.yml (in template order). */
export const REQUIRED_SECTIONS = [
  'Node Version',
  'Package Manager',
  'Package Manager Version',
  'Strapi Version',
  'Operating System',
  'Database',
  'Javascript or Typescript',
  'Bug Description',
  'Steps to Reproduce',
  'Expected Behavior',
] as const;

const REQUIRED_CHECKBOXES = [
  {
    id: 'duplicateCheck',
    label: 'Duplicate issues checkbox',
    keywords: [/check/i, /duplicate/i],
  },
  {
    id: 'codeOfConduct',
    label: 'Code of Conduct checkbox',
    keywords: [/code of conduct/i],
  },
] as const;

export interface TemplateValidationResult {
  valid: boolean;
  missingItems: string[];
}

export function parseIssueSections(body: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = body.split('\n');
  let currentHeader: string | null = null;
  let currentContent: string[] = [];

  const flush = () => {
    if (currentHeader !== null) {
      sections.set(currentHeader, currentContent.join('\n').trim());
    }
  };

  for (const line of lines) {
    if (line.startsWith('### ')) {
      flush();
      currentHeader = line.slice(4).trim();
      currentContent = [];
      continue;
    }

    if (currentHeader !== null) {
      currentContent.push(line);
    }
  }

  flush();
  return sections;
}

export function getSectionHeadersInOrder(body: string): string[] {
  return body
    .split('\n')
    .filter((line) => line.startsWith('### '))
    .map((line) => line.slice(4).trim());
}

export function normalizeSectionContent(content: string): string {
  return content.replace(/[_*`]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function isPlaceholderContent(content: string): boolean {
  if (!content.trim()) {
    return true;
  }

  const normalized = normalizeSectionContent(content);
  return EMPTY_FIELD_MARKERS.has(normalized);
}

export function hasRequiredSectionsInOrder(body: string): boolean {
  const headers = getSectionHeadersInOrder(body);
  let lastIndex = -1;

  for (const required of REQUIRED_SECTIONS) {
    const index = headers.indexOf(required);

    if (index === -1) {
      return false;
    }

    if (index < lastIndex) {
      return false;
    }

    lastIndex = index;
  }

  return true;
}

export function getCheckedBoxLines(body: string): string[] {
  return body.match(/-\s*\[x\][^\n]*/gi) ?? [];
}

function hasCheckedRequiredCheckbox(body: string, keywords: readonly RegExp[]): boolean {
  const checkedBoxLines = getCheckedBoxLines(body);

  return checkedBoxLines.some((line) => keywords.every((keyword) => keyword.test(line)));
}

export function validateIssueTemplate(body: string): TemplateValidationResult {
  const missingItems: string[] = [];
  const trimmedBody = body.trim();

  if (!trimmedBody) {
    return { valid: false, missingItems: ['Issue body'] };
  }

  const sections = parseIssueSections(trimmedBody);

  if (sections.size === 0) {
    return { valid: false, missingItems: ['Issue template (expected ### section headers)'] };
  }

  const headers = getSectionHeadersInOrder(trimmedBody);

  for (const title of REQUIRED_SECTIONS) {
    if (!headers.includes(title)) {
      missingItems.push(`Section: ${title}`);
    }
  }

  const hasAllRequiredHeaders = REQUIRED_SECTIONS.every((title) => headers.includes(title));

  if (hasAllRequiredHeaders && !hasRequiredSectionsInOrder(trimmedBody)) {
    missingItems.push('Required sections appear out of template order');
  }

  for (const title of REQUIRED_SECTIONS) {
    const content = sections.get(title);

    if (!content || isPlaceholderContent(content)) {
      const label = `Section: ${title}`;
      if (!missingItems.includes(label)) {
        missingItems.push(label);
      }
    }
  }

  for (const checkbox of REQUIRED_CHECKBOXES) {
    if (!hasCheckedRequiredCheckbox(trimmedBody, checkbox.keywords)) {
      missingItems.push(checkbox.label);
    }
  }

  return {
    valid: missingItems.length === 0,
    missingItems,
  };
}

export function buildInvalidTemplateComment(
  login: string,
  owner: string,
  repo: string,
  missingItems: string[]
) {
  const missingList = missingItems.map((item) => `- ${item}`).join('\n');

  return (
    '> This is a templated message\n\n' +
    `Hello @${login},\n\n` +
    'We ask that you please follow the issue template.\n' +
    'A proper issue submission lets us better understand the origin of your bug and therefore help you. You can see the template guidelines for bug reports [here](.github/ISSUE_TEMPLATE/BUG_REPORT.yml).\n\n' +
    'The following required items appear to be missing or incomplete:\n' +
    `${missingList}\n\n` +
    'Please update this issue to include the missing information, or create a new issue and completely fill out the issue template [here](https://github.com/' +
    `${owner}/${repo}/issues/new?template=BUG_REPORT.yml).\n\n` +
    'Thank you.'
  );
}
