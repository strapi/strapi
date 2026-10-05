import { appendFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

import type { RepositoryCoords } from './types.ts';

/**
 * The slice of the GitHub Actions runtime protocol this action uses.
 *
 * `@actions/core` is not a dependency, because a dependency would force this action to ship a
 * committed bundle. The protocol itself is a documented, stable contract over environment variables
 * and workflow commands:
 * https://docs.github.com/en/actions/reference/workflow-commands-for-github-actions
 */

/** Environment access, injected so every function here is testable without touching the process. */
export type ActionsEnv = {
  read: (name: string) => string | undefined;
  append: (path: string, content: string) => void;
  log: (line: string) => void;
};

// Coverage skip: the one binding to the real process. Every consumer is tested against a stub env.
/* node:coverage disable */
export function createActionsEnv(): ActionsEnv {
  return {
    read: (name) => process.env[name],
    append: (path, content) => appendFileSync(path, content, 'utf8'),
    log: (line) => process.stdout.write(`${line}\n`),
  };
}
/* node:coverage enable */

/** Turns an input name into the environment variable the runner sets for it. */
export function inputVariable(name: string): string {
  return `INPUT_${name.replace(/ /gu, '_').toUpperCase()}`;
}

/**
 * Escapes a value for a workflow command.
 *
 * An unescaped newline would end the command early and let the rest of the message be interpreted
 * as workflow output.
 */
export function escapeData(value: string): string {
  return value.replace(/%/gu, '%25').replace(/\r/gu, '%0D').replace(/\n/gu, '%0A');
}

export function getInput(env: ActionsEnv, name: string, options?: { required?: boolean }): string {
  const value = (env.read(inputVariable(name)) ?? '').trim();

  if (options?.required === true && value === '') {
    throw new Error(`Input required and not supplied: ${name}`);
  }

  return value;
}

const TRUE_VALUES = new Set(['true', 'True', 'TRUE']);
const FALSE_VALUES = new Set(['false', 'False', 'FALSE']);

/**
 * Reads a boolean input under the YAML 1.2 core schema, exactly as the runner does.
 *
 * Anything else is rejected rather than coerced: a typo in a workflow must not silently arm a run
 * that was meant to be a rehearsal.
 */
export function getBooleanInput(env: ActionsEnv, name: string): boolean {
  const value = getInput(env, name, { required: true });

  if (TRUE_VALUES.has(value) === true) {
    return true;
  }

  if (FALSE_VALUES.has(value) === true) {
    return false;
  }

  throw new Error(
    `Input does not meet YAML 1.2 "Core Schema" specification: ${name}. ` +
      'Support boolean input list: `true | True | TRUE | false | False | FALSE`'
  );
}

/**
 * Writes a step output.
 *
 * The heredoc form is used for every value, not only multi-line ones, so a value containing `=` or
 * a newline can never be misread as another output.
 */
export function setOutput(
  env: ActionsEnv,
  name: string,
  value: string,
  newDelimiter: () => string = () => `ghadelimiter_${randomUUID()}`
): void {
  const target = env.read('GITHUB_OUTPUT');

  if (target === undefined || target === '') {
    // Coverage skip: the pre-2022 fallback. Every supported runner sets GITHUB_OUTPUT.
    /* node:coverage disable */
    env.log(`::set-output name=${name}::${escapeData(value)}`);

    return;
    /* node:coverage enable */
  }

  const delimiter = newDelimiter();

  if (name.includes(delimiter) === true || value.includes(delimiter) === true) {
    throw new Error(`The output ${name} contains its own delimiter and cannot be written.`);
  }

  env.append(target, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

export function info(env: ActionsEnv, message: string): void {
  env.log(message);
}

export function warning(env: ActionsEnv, message: string): void {
  env.log(`::warning::${escapeData(message)}`);
}

/**
 * Reports a failure to the runner.
 *
 * The exit code is set rather than thrown, so anything already queued for stdout still flushes.
 */
export function setFailed(env: ActionsEnv, message: string): void {
  env.log(`::error::${escapeData(message)}`);
  process.exitCode = 1;
}

/**
 * Appends Markdown to the job summary.
 *
 * @returns `false` when the runner exposes no summary file, so the caller can warn instead of
 * failing a run over a report it could not publish.
 */
export function appendSummary(env: ActionsEnv, markdown: string): boolean {
  const target = env.read('GITHUB_STEP_SUMMARY');

  if (target === undefined || target === '') {
    return false;
  }

  env.append(target, `${markdown}\n`);

  return true;
}

/** Reads the `owner/repo` the workflow is running against. */
export function repositoryCoords(env: ActionsEnv): RepositoryCoords {
  const value = env.read('GITHUB_REPOSITORY') ?? '';
  const [owner, repo] = value.split('/');

  if (owner === undefined || owner === '' || repo === undefined || repo === '') {
    throw new Error(`GITHUB_REPOSITORY is not an "owner/repo" pair (got "${value}").`);
  }

  return { owner, repo };
}
