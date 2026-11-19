import { generateSharedExtensionDefinition, emitDefinitions, timer } from '../../generators/utils';

const makeDefinition = (uid, name) => ({
  uid,
  definition: { name: { escapedText: name } },
});

describe('generateSharedExtensionDefinition', () => {
  test('emits ambient module aug with TS-6-compliant `namespace` keyword (not legacy `module`)', () => {
    const node = generateSharedExtensionDefinition('ContentTypeSchemas', [
      makeDefinition('api::foo.foo', 'ApiFooFoo'),
    ]);

    const output = emitDefinitions([node]);

    expect(output).toContain("declare module '@strapi/strapi'");
    expect(output).toContain('export namespace Public');
    expect(output).not.toMatch(/export\s+module\s+Public\b/);
    expect(output).toContain("'api::foo.foo': ApiFooFoo");
  });

  test('emits empty namespace block when no definitions provided', () => {
    const node = generateSharedExtensionDefinition('ContentTypeSchemas', []);

    const output = emitDefinitions([node]);

    expect(output).toContain('export namespace Public');
    expect(output).not.toMatch(/export\s+module\s+Public\b/);
    expect(output).not.toContain('ContentTypeSchemas');
  });

  test('passes through registry name to interface declaration', () => {
    const node = generateSharedExtensionDefinition('ComponentSchemas', [
      makeDefinition('default.bar', 'DefaultBar'),
    ]);

    const output = emitDefinitions([node]);

    expect(output).toContain('export interface ComponentSchemas');
  });
});

describe('timer', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00.000Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('duration before end() is the elapsed time so far, not NaN', () => {
    const t = timer().start();

    expect(t.duration).toBe(0);

    jest.advanceTimersByTime(1500);

    expect(t.duration).toBe(1.5);
  });

  test('duration after end() is frozen at the end time', () => {
    const t = timer().start();

    jest.advanceTimersByTime(2000);
    t.end();
    jest.advanceTimersByTime(5000);

    expect(t.duration).toBe(2);
  });
});
