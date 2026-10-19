export type McpToolRegistrationPlan =
  | { mode: 'none' }
  | { mode: 'call'; names: ReadonlySet<string> }
  | { mode: 'list' }
  | { mode: 'all' };

type MessageClass =
  { kind: 'none' } | { kind: 'list' } | { kind: 'call'; name: string } | { kind: 'invalid' };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const classifyMessage = (message: unknown): MessageClass => {
  if (!isRecord(message)) {
    return { kind: 'invalid' };
  }

  const { method } = message;
  if (typeof method !== 'string' || method.length === 0) {
    return { kind: 'invalid' };
  }

  const hasId = Object.prototype.hasOwnProperty.call(message, 'id');
  if (!hasId) {
    if (method === 'tools/list' || method === 'tools/call') {
      return { kind: 'invalid' };
    }

    return { kind: 'none' };
  }

  const { id } = message;
  if (id === null || (typeof id !== 'string' && typeof id !== 'number')) {
    return { kind: 'invalid' };
  }

  if (method === 'initialize' || method === 'ping' || method.startsWith('notifications/')) {
    return { kind: 'none' };
  }

  if (method === 'tools/list') {
    return { kind: 'list' };
  }

  if (method === 'tools/call') {
    const params = message.params;
    const name = isRecord(params) ? params.name : undefined;
    if (typeof name !== 'string' || name.length === 0) {
      return { kind: 'invalid' };
    }

    return { kind: 'call', name };
  }

  return { kind: 'none' };
};

const planFromMessages = (messages: readonly MessageClass[]): McpToolRegistrationPlan => {
  if (messages.length === 0 || messages.some((message) => message.kind === 'invalid')) {
    return { mode: 'none' };
  }

  const calls = messages.filter(
    (message): message is { kind: 'call'; name: string } => message.kind === 'call'
  );
  const lists = messages.some((message) => message.kind === 'list');

  if (lists && calls.length > 0) {
    return { mode: 'none' };
  }

  if (lists) {
    return { mode: 'list' };
  }

  if (calls.length > 0) {
    return { mode: 'call', names: new Set(calls.map((message) => message.name)) };
  }

  return { mode: 'none' };
};

/**
 * Decide which tool schemas a single authenticated POST may register.
 * Unclassifiable bodies, including mixed `tools/list` and `tools/call` batches,
 * register nothing.
 */
export const classifyMcpToolRegistration = (body: unknown): McpToolRegistrationPlan => {
  if (Array.isArray(body)) {
    return planFromMessages(body.map((message) => classifyMessage(message)));
  }

  return planFromMessages([classifyMessage(body)]);
};
