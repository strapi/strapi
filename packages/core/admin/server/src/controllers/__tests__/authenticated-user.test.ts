// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages

jest.mock('../../utils', () => ({
  getService: jest.fn(() => {
    return {};
  }),
}));

describe('Authenticated User Controller', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV }; // fresh copy for each test

    // Reset global fetch
    delete (global as any).fetch;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV; // fully restore after suite
  });
});
