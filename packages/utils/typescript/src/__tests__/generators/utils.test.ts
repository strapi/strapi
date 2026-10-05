import { generateSharedExtensionDefinition, emitDefinitions } from '../../generators/utils';

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

  test('emits a global Strapi.Registries augmentation with strict types', () => {
    const node = generateSharedExtensionDefinition(
      'ContentTypeSchemas',
      [makeDefinition('api::foo.foo', 'ApiFooFoo')],
      { strict: true }
    );

    const output = emitDefinitions([node]);

    expect(output).toMatch(
      /^declare global {\s*namespace Strapi {\s*namespace Registries {\s*interface ContentTypeSchemas {/
    );
    expect(output).toContain("'api::foo.foo': ApiFooFoo");
    expect(output).not.toContain('@strapi/strapi');
    expect(output).not.toContain('Public');
    expect(output).not.toContain('export');
  });

  test('emits an empty Registries namespace with strict types and no definitions', () => {
    const node = generateSharedExtensionDefinition('ComponentSchemas', [], { strict: true });

    const output = emitDefinitions([node]);

    expect(output).toMatch(/namespace Registries {\s*}/);
    expect(output).not.toContain('ComponentSchemas');
  });

  test('keeps the Public augmentation when strict is false', () => {
    const definitions = [makeDefinition('default.bar', 'DefaultBar')];

    expect(
      emitDefinitions([
        generateSharedExtensionDefinition('ComponentSchemas', definitions, { strict: false }),
      ])
    ).toBe(emitDefinitions([generateSharedExtensionDefinition('ComponentSchemas', definitions)]));
  });
});
