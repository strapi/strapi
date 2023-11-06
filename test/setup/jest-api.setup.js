'use strict';

const isoDateRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;

jest.setTimeout(60000);

jest.mock('@strapi/provider-audit-logs-local', () => {
  return {
    register: jest.fn().mockResolvedValue({
      saveEvent: jest.fn(),
      findMany: jest.fn(),
      deleteExpiredEvents: jest.fn(),
      findOne: jest.fn(),
    }),
  };
});

expect.extend({
  stringOrNull(received) {
    const pass = typeof received === 'string' || received === null;
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be null or a string`,
      pass,
    };
  },
  toBeISODate(received) {
    const pass = isoDateRegex.test(received) && new Date(received).toISOString() === received;
    return {
      pass,
      message: () => `Expected ${received} ${pass ? 'not ' : ''}to be a valid ISO date string`,
    };
  },
});
