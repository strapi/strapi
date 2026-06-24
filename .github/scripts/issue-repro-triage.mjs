#!/usr/bin/env node
'use strict';

/**
 * Deterministic triage for AI issue reproduction.
 * Reads gh issue JSON, sanitizes template fields, applies skip rules, writes artifacts.
 *
 * Usage: node issue-repro-triage.mjs <issue-json-path>
 * Outputs (under RUNNER_TEMP):
 *   - issue-context.json  sanitized fields for repro / LLM triage
 *   - triage-result.json  { decision, reason, filter, suggestion, risk_flags }
 */

import fs from 'node:fs';
import path from 'node:path';

const MAX_FIELD = 8000;

const TEMPLATE_SECTIONS = [
  'Node Version',
  'Package Manager',
  'Package Manager Version',
  'Strapi Version',
  'Operating System',
  'Database',
  'Javascript or Typescript',
  'Reproduction URL',
  'Bug Description',
  'Steps to Reproduce',
  'Expected Behavior',
  'Logs',
  'Code Snippets',
  'Media',
  'Additional information',
];

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /\bsystem\s+prompt\b/i,
  /\b(you are now|act as|new instruction)\b/i,
  /\b(post|print|echo|output|reveal|dump)\s+(the\s+)?(api\s+key|env|token|secret|password|credential)/i,
  /\bcurl\s+https?:\/\/(?!localhost|127\.0\.0\.1)/i,
  /\bexfiltrat/i,
  /\bghp_[a-zA-Z0-9]{20,}/,
  /\bsk-ant-/i,
];

const ADMIN_UI_PATTERNS =
  /\b(content manager|content-manager|admin panel|admin ui|administrator panel|media library|click(?:ing)?(?:\s+on)?|in the browser|browser console|screenshot|visual(?:ly)?|design system|settings page|left menu|sidebar ui)\b/i;

const API_REPRO_PATTERNS =
  /\b(curl|rest api|graphql|\/api\/|fetch\(|http request|endpoint|postman|axios|got\(|supertest|status code|401|403|404|500)\b/i;

function sanitize(text) {
  if (!text) {
    return '';
  }

  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .slice(0, MAX_FIELD);
}

function parseSections(body) {
  const sections = {};
  const parts = body.split(/^### /m);

  for (const part of parts.slice(1)) {
    const newline = part.indexOf('\n');
    if (newline === -1) {
      continue;
    }

    const key = part.slice(0, newline).trim();
    const value = part.slice(newline + 1).trim();
    sections[key] = sanitize(value);
  }

  return sections;
}

function isEmpty(value) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '' || normalized === 'n/a' || normalized === 'none' || normalized === '-';
}

function hasSuspiciousContent(...texts) {
  const flags = [];

  for (const text of texts) {
    if (!text) {
      continue;
    }

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        flags.push(`pattern:${pattern.source.slice(0, 40)}`);
      }
    }

    if (/[\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069]/.test(text)) {
      flags.push('invisible-characters');
    }

    if (/<!--/.test(text)) {
      flags.push('html-comment');
    }
  }

  return [...new Set(flags)];
}

function normalizeCloud(value) {
  return (value || '').trim().toLowerCase();
}

function skipResult(filter, reason, suggestion, riskFlags = []) {
  return {
    decision: 'skip',
    filter,
    reason,
    suggestion,
    risk_flags: riskFlags,
  };
}

function approveResult(riskFlags = []) {
  return {
    decision: 'approve',
    filter: 'deterministic-pass',
    reason: 'Passed deterministic triage filters.',
    suggestion: '',
    risk_flags: riskFlags,
  };
}

function writeGithubOutput(result) {
  const outputPath = process.env.GITHUB_OUTPUT;

  if (!outputPath) {
    return;
  }

  const lines = [
    `decision=${result.decision}`,
    `filter=${result.filter}`,
    `reason=${result.reason.replace(/\n/g, ' ')}`,
  ];

  fs.appendFileSync(outputPath, `${lines.join('\n')}\n`);
}

function main() {
  const issuePath = process.argv[2];
  const outDir = process.env.RUNNER_TEMP || '/tmp';

  if (!issuePath) {
    console.error('Usage: node issue-repro-triage.mjs <issue-json-path>');
    process.exit(1);
  }

  const issue = JSON.parse(fs.readFileSync(issuePath, 'utf8'));
  const sections = parseSections(issue.body || '');
  const title = sanitize(issue.title || '');

  const context = {
    title,
    author: issue.author?.login || 'unknown',
    labels: (issue.labels || []).map((label) => label.name),
    fields: Object.fromEntries(
      TEMPLATE_SECTIONS.filter((name) => sections[name]).map((name) => [name, sections[name]])
    ),
  };

  const os = sections['Operating System'] || '';
  const database = sections['Database'] || '';
  const reproductionUrl = sections['Reproduction URL'] || '';
  const steps = sections['Steps to Reproduce'] || '';
  const description = sections['Bug Description'] || '';
  const expected = sections['Expected Behavior'] || '';
  const strapiVersion = sections['Strapi Version'] || '';
  const nodeVersion = sections['Node Version'] || '';
  const combinedReproText = [
    title,
    description,
    steps,
    expected,
    sections['Additional information'] || '',
  ].join('\n');

  const rawBody = issue.body || '';
  const riskFlags = hasSuspiciousContent(rawBody, title, description, steps, expected);

  if (riskFlags.length > 0) {
    const result = skipResult(
      'suspicious-content',
      'Issue content matched suspicious patterns (possible prompt injection or unsafe instructions).',
      'A maintainer should review the issue body manually before re-adding `needs-ai-reproduction`.',
      riskFlags
    );
    writeOutputs(outDir, context, result);
    return;
  }

  if (
    normalizeCloud(os).includes('strapi cloud') ||
    normalizeCloud(database).includes('strapi cloud')
  ) {
    const result = skipResult(
      'strapi-cloud',
      'Report targets Strapi Cloud — local CE/SQLite repro cannot validate this environment.',
      'Provide REST/API or curl steps reproducible on a local Strapi 5 app, or attach Cloud request/response logs for manual triage.'
    );
    writeOutputs(outDir, context, result);
    return;
  }

  const dbNorm = normalizeCloud(database);
  if (dbNorm && !dbNorm.includes('sqlite') && dbNorm !== 'other') {
    const result = skipResult(
      'non-sqlite-database',
      `Report uses ${database.trim()} — automated repro is SQLite-only in v1.`,
      'Add equivalent repro steps for SQLite, or wait until Postgres/MySQL service containers are supported.'
    );
    writeOutputs(outDir, context, result);
    return;
  }

  if (!isEmpty(reproductionUrl)) {
    const result = skipResult(
      'reproduction-url',
      'Report references an external reproduction repository — cloning external repos is not supported in v1.',
      'Summarize the minimal API/CLI steps inline, or reproduce locally and paste curl commands and responses.'
    );
    writeOutputs(outDir, context, result);
    return;
  }

  const requiredMissing = [
    'Bug Description',
    'Steps to Reproduce',
    'Expected Behavior',
    'Strapi Version',
    'Node Version',
  ].filter((name) => isEmpty(sections[name]));

  if (requiredMissing.length > 0) {
    const result = skipResult(
      'incomplete-template',
      `Bug report is missing required template sections: ${requiredMissing.join(', ')}.`,
      'Ask the reporter to complete the bug report template before AI reproduction.'
    );
    writeOutputs(outDir, context, result);
    return;
  }

  const versionNorm = strapiVersion.trim().toLowerCase();
  if (versionNorm === 'latest' || versionNorm === 'unknown') {
    const result = skipResult(
      'invalid-strapi-version',
      'Reporter Strapi version is not specific enough for triage.',
      'Request an exact Strapi version (not "Latest").'
    );
    writeOutputs(outDir, context, result);
    return;
  }

  if (ADMIN_UI_PATTERNS.test(combinedReproText) && !API_REPRO_PATTERNS.test(combinedReproText)) {
    const result = skipResult(
      'admin-ui',
      'Report appears to require admin UI interaction — automated repro is API/CLI-only in v1.',
      'Add equivalent API, GraphQL, or curl steps that reproduce the bug without the admin panel.'
    );
    writeOutputs(outDir, context, result);
    return;
  }

  const result = approveResult(riskFlags);
  writeOutputs(outDir, context, result);
}

function writeOutputs(outDir, context, result) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'issue-context.json'), JSON.stringify(context, null, 2));
  fs.writeFileSync(path.join(outDir, 'triage-result.json'), JSON.stringify(result, null, 2));
  writeGithubOutput(result);

  console.log(JSON.stringify(result, null, 2));

  if (result.decision === 'skip') {
    process.exit(0);
  }
}

main();
