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

/** Required sections from .github/ISSUE_TEMPLATE/BUG_REPORT.yml. */
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

/** Common alternate spellings beyond case differences. */
const SECTION_HEADER_ALIASES: Record<string, (typeof REQUIRED_SECTIONS)[number]> = {
  'js or ts': 'Javascript or Typescript',
  'javascript/typescript': 'Javascript or Typescript',
};

const REQUIRED_SECTION_LOOKUP = new Map<string, (typeof REQUIRED_SECTIONS)[number]>(
  REQUIRED_SECTIONS.map((title) => [normalizeHeader(title), title])
);

for (const [alias, canonical] of Object.entries(SECTION_HEADER_ALIASES)) {
  REQUIRED_SECTION_LOOKUP.set(normalizeHeader(alias), canonical);
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

export function canonicalSectionTitle(header: string): string {
  return REQUIRED_SECTION_LOOKUP.get(normalizeHeader(header)) ?? header.trim();
}

export function isRequiredSectionTitle(header: string): boolean {
  return REQUIRED_SECTION_LOOKUP.has(normalizeHeader(header));
}

const REQUIRED_CHECKBOXES = [
  {
    id: 'duplicateCheck',
    label: 'Duplicate issues checkbox',
    keywordGroups: [[/check/i, /duplicate/i]],
  },
  {
    id: 'codeOfConduct',
    label: 'Code of Conduct checkbox',
    keywordGroups: [[/code of conduct/i], [/contributing guidelines/i]],
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
    if (currentHeader === null) {
      return;
    }

    const key = canonicalSectionTitle(currentHeader);
    const next = currentContent.join('\n').trim();
    const existing = sections.get(key);

    if (existing) {
      sections.set(key, `${existing}\n\n${next}`.trim());
      return;
    }

    sections.set(key, next);
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
    .map((line) => canonicalSectionTitle(line.slice(4)));
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

export function getCheckedBoxLines(body: string): string[] {
  return body.split('\n').filter((line) => /\[x\]/i.test(line) && !/^\s*```/.test(line));
}

function hasCheckedRequiredCheckbox(
  body: string,
  keywordGroups: readonly (readonly RegExp[])[]
): boolean {
  const checkedBoxLines = getCheckedBoxLines(body);

  return checkedBoxLines.some((line) =>
    keywordGroups.some((group) => group.every((keyword) => keyword.test(line)))
  );
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

  for (const title of REQUIRED_SECTIONS) {
    const content = sections.get(title);

    if (content === undefined) {
      missingItems.push(`Section: ${title}`);
      continue;
    }

    if (isPlaceholderContent(content)) {
      missingItems.push(`Section: ${title}`);
    }
  }

  for (const checkbox of REQUIRED_CHECKBOXES) {
    if (!hasCheckedRequiredCheckbox(trimmedBody, checkbox.keywordGroups)) {
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
