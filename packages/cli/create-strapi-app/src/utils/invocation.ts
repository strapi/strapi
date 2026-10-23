import { determineAgent, KNOWN_AGENTS } from '@vercel/detect-agent';
import ciInfo from 'ci-info';

export type Invocation = 'agent' | 'ci' | 'human' | 'unknown';

export interface InvocationInfo {
  invocation: Invocation;
  /** Name from a fixed list, `other` for an unlisted agent, `null` when no agent is involved. */
  agentName: string | null;
}

const KNOWN_AGENT_NAMES = new Set<string>(Object.values(KNOWN_AGENTS));

// Never send free text from the environment: map every value to a fixed list so the property stays
// low-cardinality and cannot carry anything the user typed.
// `AI_AGENT` can carry a version or a suffix (Claude Code sets `claude-code_2-1-301_agent`), so only
// the first segment is read.
const normalizeAgentName = (raw: string) => {
  const [name = ''] = raw
    .trim()
    .toLowerCase()
    .split(/[_/@:\s]/);

  if (name === 'claude' || name === 'claude-code') {
    return 'claude-code';
  }

  return KNOWN_AGENT_NAMES.has(name) ? name : 'other';
};

const getExplicitAgent = (agentFlag?: string) => {
  // `--agent` wins over `STRAPI_AGENT`. An empty value does not count as an opt-in.
  const value = (agentFlag ?? process.env.STRAPI_AGENT ?? '').trim();

  return value === '' ? null : normalizeAgentName(value);
};

const getDetectedAgent = async () => {
  try {
    const result = await determineAgent();

    return result.isAgent ? normalizeAgentName(result.agent?.name ?? '') : null;
  } catch {
    return null;
  }
};

/**
 * Tells how create-strapi-app was started. Signals, strongest first:
 * 1. `--agent <name>` or `STRAPI_AGENT`: the caller says it is an agent.
 * 2. Environment markers that coding agents set (via `@vercel/detect-agent`).
 * 3. CI (via `ci-info`), so CI runs are not counted as agents.
 * 4. A terminal on stdin and stdout means `human`. Anything else is `unknown`, because a missing
 *    terminal alone does not prove an agent.
 */
export async function detectInvocation({
  agentFlag,
}: { agentFlag?: string } = {}): Promise<InvocationInfo> {
  const agentName = getExplicitAgent(agentFlag) ?? (await getDetectedAgent());

  if (agentName !== null) {
    return { invocation: 'agent', agentName };
  }

  if (ciInfo.isCI) {
    return { invocation: 'ci', agentName: null };
  }

  const hasTerminal = process.stdin.isTTY === true && process.stdout.isTTY === true;

  return { invocation: hasTerminal ? 'human' : 'unknown', agentName: null };
}
