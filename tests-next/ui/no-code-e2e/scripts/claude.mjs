// @ts-check
/**
 * Runs Claude Code headless (`claude -p`) for one task and returns its structured answer and cost.
 *
 * - `--safe-mode`: no CLAUDE.md, skills, hooks or plugins, but the built-in tools. The prompts
 *   carry the context the task needs, so the agent doesn't pay for the whole repo guide on every
 *   turn. (`--bare` would also drop the Write, Glob and Grep tools.)
 * - `--permission-mode dontAsk` with `--allowedTools`: any tool call outside the list is denied.
 *   File edits are limited to the task's paths; Bash only runs `run-spec.mjs`.
 * - `--json-schema`: the final answer is validated JSON (`structured_output`).
 *
 * The binary is `claude`, or NO_CODE_E2E_CLAUDE_BIN. Auth: ANTHROPIC_API_KEY.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './lib.mjs';

export const RUN_SPEC = 'node tests-next/ui/no-code-e2e/scripts/run-spec.mjs';

/** Tool rules for an agent that edits `paths` and runs specs. */
export const editingTools = (/** @type {string[]} */ paths) => [
  'Read',
  'Glob',
  'Grep',
  ...paths.flatMap((glob) => [`Edit(${glob})`, `Write(${glob})`]),
  `Bash(${RUN_SPEC}:*)`,
];

export const readOnlyTools = () => ['Read', 'Glob', 'Grep'];

/** Reads a prompt template from `prompts/` and fills its `{{name}}` placeholders. */
export const prompt = (
  /** @type {string} */ name,
  /** @type {Record<string, string>} */ values = {}
) => {
  const template = readFileSync(
    path.join(REPO_ROOT, 'tests-next/ui/no-code-e2e/prompts', name),
    'utf8'
  );
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Prompt ${name}: no value for {{${key}}}`);
    return values[key];
  });
};

/**
 * @typedef {object} ClaudeResult
 * @property {boolean} ok The run ended normally (not on max turns, budget or an API error).
 * @property {Record<string, unknown> | null} answer The structured answer.
 * @property {string} text The last message, as text.
 * @property {number} costUsd
 * @property {number} turns
 * @property {string} stop `subtype` of Claude Code's result, or the error.
 * @property {string[]} denials Tool calls the permission rules denied.
 */

/**
 * @param {object} options
 * @param {string} options.prompt
 * @param {string} options.model An alias (`haiku`, `sonnet`, `opus`) or a model id.
 * @param {number} options.maxTurns
 * @param {number} options.maxBudgetUsd
 * @param {string[]} options.allowedTools
 * @param {object} options.schema JSON Schema of the answer.
 * @returns {Promise<ClaudeResult>}
 */
export const runClaude = async ({
  prompt: text,
  model,
  maxTurns,
  maxBudgetUsd,
  allowedTools,
  schema,
}) => {
  const args = [
    '-p',
    '--safe-mode',
    '--output-format',
    'json',
    '--no-session-persistence',
    '--model',
    model,
    '--max-turns',
    String(maxTurns),
    '--max-budget-usd',
    String(maxBudgetUsd),
    '--permission-mode',
    'dontAsk',
    '--tools',
    'Read,Glob,Grep,Edit,Write,Bash',
    '--allowedTools',
    ...allowedTools,
    '--json-schema',
    JSON.stringify(schema),
  ];

  const { code, stdout, stderr } = await new Promise((resolve) => {
    let out = '';
    let err = '';
    const child = spawn(process.env.NO_CODE_E2E_CLAUDE_BIN || 'claude', args, {
      cwd: REPO_ROOT,
      env: process.env,
    });
    child.stdout.on('data', (chunk) => {
      out += chunk;
    });
    child.stderr.on('data', (chunk) => {
      err += chunk;
    });
    child.on('error', (error) => resolve({ code: 1, stdout: '', stderr: String(error) }));
    child.on('close', (exit) => resolve({ code: exit ?? 1, stdout: out, stderr: err }));
    child.stdin.end(text);
  });

  /** @type {Record<string, any>} */
  let result;
  try {
    result = JSON.parse(stdout.trim().split('\n').pop() ?? '');
  } catch {
    return {
      ok: false,
      answer: null,
      text: `${stdout}\n${stderr}`.trim().slice(-2000),
      costUsd: 0,
      turns: 0,
      stop: `exit ${code}`,
      denials: [],
    };
  }

  return {
    ok: !result.is_error && result.subtype === 'success',
    answer: result.structured_output ?? parseJsonBlock(String(result.result ?? '')),
    text: String(result.result ?? ''),
    costUsd: Number(result.total_cost_usd ?? 0),
    turns: Number(result.num_turns ?? 0),
    stop: String(result.subtype ?? result.terminal_reason ?? 'unknown'),
    denials: (result.permission_denials ?? []).map(
      (/** @type {{ tool_name?: string, tool_input?: unknown }} */ denial) =>
        `${denial.tool_name} ${JSON.stringify(denial.tool_input).slice(0, 200)}`
    ),
  };
};

/** Fallback when no structured output came back: the last JSON object of the message. */
const parseJsonBlock = (/** @type {string} */ text) => {
  const candidates = text.match(/\{[\s\S]*\}/g) ?? [];
  for (const candidate of candidates.reverse()) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Not JSON: try the previous one.
    }
  }
  return null;
};
