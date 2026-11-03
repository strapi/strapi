import { determineAgent } from '@vercel/detect-agent';
import ciInfo from 'ci-info';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { detectInvocation } from '../invocation';
import { isTelemetryDisabled } from '../usage';

vi.mock('@vercel/detect-agent', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vercel/detect-agent')>()),
  determineAgent: vi.fn(),
}));
vi.mock('ci-info', () => ({ default: { isCI: false } }));

const mockedDetermineAgent = determineAgent as unknown as Mock;
const mockedCiInfo = ciInfo as { isCI: boolean };

const setTty = (stream: NodeJS.ReadStream | NodeJS.WriteStream, value: boolean | undefined) => {
  Object.defineProperty(stream, 'isTTY', { value, configurable: true });
};

describe('detectInvocation', () => {
  const originalEnv = process.env;
  const originalStdinTty = process.stdin.isTTY;
  const originalStdoutTty = process.stdout.isTTY;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.STRAPI_AGENT;
    mockedDetermineAgent.mockReset();
    mockedDetermineAgent.mockResolvedValue({ isAgent: false, agent: undefined });
    mockedCiInfo.isCI = false;
    setTty(process.stdin, true);
    setTty(process.stdout, true);
  });

  afterEach(() => {
    process.env = originalEnv;
    setTty(process.stdin, originalStdinTty);
    setTty(process.stdout, originalStdoutTty);
  });

  it('returns human when there is a terminal and no other signal', async () => {
    await expect(detectInvocation()).resolves.toEqual({ invocation: 'human', agentName: null });
  });

  it('returns unknown when there is no terminal and no other signal', async () => {
    setTty(process.stdout, undefined);

    await expect(detectInvocation()).resolves.toEqual({ invocation: 'unknown', agentName: null });
  });

  it('returns agent with the detected name', async () => {
    mockedDetermineAgent.mockResolvedValue({ isAgent: true, agent: { name: 'cursor' } });

    await expect(detectInvocation()).resolves.toEqual({
      invocation: 'agent',
      agentName: 'cursor',
    });
  });

  it('renames claude to claude-code', async () => {
    mockedDetermineAgent.mockResolvedValue({ isAgent: true, agent: { name: 'claude' } });

    await expect(detectInvocation()).resolves.toEqual({
      invocation: 'agent',
      agentName: 'claude-code',
    });
  });

  it.each(['claude-code_2-1-301_agent', 'claude-code/2.1.301', 'Claude-Code@2'])(
    'ignores the version in the AI_AGENT value %s',
    async (name) => {
      mockedDetermineAgent.mockResolvedValue({ isAgent: true, agent: { name } });

      await expect(detectInvocation()).resolves.toEqual({
        invocation: 'agent',
        agentName: 'claude-code',
      });
    }
  );

  it('never sends an agent name that is not in the fixed list', async () => {
    mockedDetermineAgent.mockResolvedValue({ isAgent: true, agent: { name: 'my-private-bot' } });

    await expect(detectInvocation()).resolves.toEqual({ invocation: 'agent', agentName: 'other' });
  });

  it('returns ci when CI is detected and no agent is', async () => {
    mockedCiInfo.isCI = true;

    await expect(detectInvocation()).resolves.toEqual({ invocation: 'ci', agentName: null });
  });

  it('returns agent when both an agent and CI are detected', async () => {
    mockedCiInfo.isCI = true;
    mockedDetermineAgent.mockResolvedValue({ isAgent: true, agent: { name: 'codex' } });

    await expect(detectInvocation()).resolves.toEqual({ invocation: 'agent', agentName: 'codex' });
  });

  it('reads STRAPI_AGENT as an explicit opt-in', async () => {
    process.env.STRAPI_AGENT = 'Gemini';

    await expect(detectInvocation()).resolves.toEqual({ invocation: 'agent', agentName: 'gemini' });
    expect(mockedDetermineAgent).not.toHaveBeenCalled();
  });

  it('lets the --agent flag win over STRAPI_AGENT', async () => {
    process.env.STRAPI_AGENT = 'gemini';

    await expect(detectInvocation({ agentFlag: 'codex' })).resolves.toEqual({
      invocation: 'agent',
      agentName: 'codex',
    });
  });

  it('maps a bare STRAPI_AGENT=1 to other', async () => {
    process.env.STRAPI_AGENT = '1';

    await expect(detectInvocation()).resolves.toEqual({ invocation: 'agent', agentName: 'other' });
  });

  it('ignores an empty STRAPI_AGENT', async () => {
    process.env.STRAPI_AGENT = '  ';

    await expect(detectInvocation()).resolves.toEqual({ invocation: 'human', agentName: null });
  });

  it('falls back to the other signals when agent detection throws', async () => {
    mockedDetermineAgent.mockRejectedValue(new Error('boom'));

    await expect(detectInvocation()).resolves.toEqual({ invocation: 'human', agentName: null });
  });
});

describe('isTelemetryDisabled', () => {
  const originalValue = process.env.STRAPI_TELEMETRY_DISABLED;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.STRAPI_TELEMETRY_DISABLED;
    } else {
      process.env.STRAPI_TELEMETRY_DISABLED = originalValue;
    }
  });

  it.each(['1', 'true', 'TRUE'])('is true for %s', (value) => {
    process.env.STRAPI_TELEMETRY_DISABLED = value;

    expect(isTelemetryDisabled()).toBe(true);
  });

  it.each(['', '0', 'false', 'no'])('is false for "%s"', (value) => {
    process.env.STRAPI_TELEMETRY_DISABLED = value;

    expect(isTelemetryDisabled()).toBe(false);
  });

  it('is false when the variable is not set', () => {
    delete process.env.STRAPI_TELEMETRY_DISABLED;

    expect(isTelemetryDisabled()).toBe(false);
  });
});
