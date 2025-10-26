// Test setup file for audit logs tests

// Mock console.log to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock setImmediate for testing async operations
global.setImmediate = jest.fn((fn) => fn());

// Mock process.env
process.env.NODE_ENV = 'test';

// Global test utilities
global.createMockStrapi = () => ({
  entityService: {
    create: jest.fn(),
    findOne: jest.fn(),
    findMany: jest.fn(),
    findPage: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  log: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  server: {
    use: jest.fn(),
  },
  config: {
    get: jest.fn(),
  },
});

global.createMockContext = (overrides = {}) => ({
  query: {},
  params: {},
  request: {
    body: {},
  },
  body: {},
  status: 200,
  state: {},
  get: jest.fn(),
  send: jest.fn(),
  badRequest: jest.fn(),
  notFound: jest.fn(),
  internalServerError: jest.fn(),
  ...overrides,
});

global.createMockNext = () => jest.fn();

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
