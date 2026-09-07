type MigrationLogEvent = {
  event: unknown;
  name: unknown;
  durationSeconds?: unknown;
};

export const transformLogMessage = (level: string, message: unknown) => {
  if (typeof message === 'string') {
    return { level, message };
  }

  if (typeof message === 'object' && message !== null) {
    if ('event' in message && 'name' in message) {
      const { event, name, durationSeconds } = message as MigrationLogEvent;
      let text = `[internal migration]: ${event} ${name}`;

      if (typeof durationSeconds === 'number' && Number.isFinite(durationSeconds)) {
        text += ` (${durationSeconds.toFixed(3)}s)`;
      }

      return {
        level,
        message: text,
        timestamp: Date.now(),
      };
    }
  }

  // NOTE: the message typing are too loose so in practice we should never arrive here.
  return '';
};
