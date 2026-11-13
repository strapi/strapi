import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fse from 'fs-extra';
import type { Core } from '@strapi/types';

import componentsRegistry from '../../registries/components';
import loadComponents from '../components';

const schema = (name: string) => ({
  collectionName: `components_default_${name}s`,
  info: { displayName: name },
  attributes: { title: { type: 'string' } },
});

let dir: string;

const write = async (relativePath: string, content: string | object) => {
  const file = path.join(dir, relativePath);
  await fse.ensureFile(file);

  if (typeof content === 'string') {
    await fse.writeFile(file, content);
  } else {
    await fse.writeJSON(file, content);
  }
};

const createStrapi = () => {
  const registry = componentsRegistry();

  const strapi = {
    dirs: { dist: { components: dir }, app: { components: dir } },
    get: vi.fn((name: string) => {
      if (name === 'components') {
        return registry;
      }

      throw new Error(`Unexpected registry: ${name}`);
    }),
    log: { warn: vi.fn() },
    stopWithError: vi.fn(),
  };

  return { strapi: strapi as unknown as Core.Strapi, registry, mocks: strapi };
};

describe('loadComponents', () => {
  beforeEach(async () => {
    dir = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-components-loader-'));
  });

  afterEach(async () => {
    await fse.remove(dir);
  });

  it('registers a component without a lifecycles file with empty lifecycles', async () => {
    await write('default/card.json', schema('card'));
    const { strapi, registry } = createStrapi();

    await loadComponents(strapi);

    const component = registry.get('default.card') as any;
    expect(component.uid).toBe('default.card');
    expect(component.modelType).toBe('component');
    expect(component.lifecycles).toEqual({});
  });

  it('attaches the lifecycles module declared next to the schema', async () => {
    await write('default/card.json', schema('card'));
    await write(
      'default/card.lifecycles.js',
      `module.exports = {
        beforeCreate(event) { event.params.data.title = 'hooked'; },
        afterUpdate() {},
      };`
    );
    const { strapi, registry, mocks } = createStrapi();

    await loadComponents(strapi);

    const component = registry.get('default.card') as any;
    expect(typeof component.lifecycles.beforeCreate).toBe('function');
    expect(typeof component.lifecycles.afterUpdate).toBe('function');

    const event = { params: { data: { title: 'raw' } } };
    component.lifecycles.beforeCreate(event);
    expect(event.params.data.title).toBe('hooked');

    // the raw schema used by the content-type builder must not carry the hooks
    expect(component.__schema__.lifecycles).toBeUndefined();
    // the lifecycles file must never be mistaken for a component schema
    expect(mocks.stopWithError).not.toHaveBeenCalled();
    expect(registry.keys()).toEqual(['default.card']);
  });

  it('supports a lifecycles module compiled from TypeScript (default export)', async () => {
    await write('default/card.json', schema('card'));
    await write(
      'default/card.lifecycles.js',
      `Object.defineProperty(exports, '__esModule', { value: true });
       exports.default = { afterCreate() {} };`
    );
    const { strapi, registry } = createStrapi();

    await loadComponents(strapi);

    const component = registry.get('default.card') as any;
    expect(typeof component.lifecycles.afterCreate).toBe('function');
    expect(component.lifecycles.__esModule).toBeUndefined();
  });

  it('only attaches lifecycles to the component with the same name', async () => {
    await write('default/card.json', schema('card'));
    await write('default/badge.json', schema('badge'));
    await write('shared/card.json', schema('card'));
    await write('default/card.lifecycles.js', `module.exports = { beforeCreate() {} };`);
    const { strapi, registry } = createStrapi();

    await loadComponents(strapi);

    expect(typeof (registry.get('default.card') as any).lifecycles.beforeCreate).toBe('function');
    expect((registry.get('default.badge') as any).lifecycles).toEqual({});
    expect((registry.get('shared.card') as any).lifecycles).toEqual({});
  });

  it('throws when the lifecycles module declares an unknown hook', async () => {
    await write('default/card.json', schema('card'));
    await write('default/card.lifecycles.js', `module.exports = { beforeSave() {} };`);
    const { strapi } = createStrapi();

    await expect(loadComponents(strapi)).rejects.toThrow(
      'Component lifecycles are invalid for default.card.'
    );
  });

  it('throws when a hook is not a function', async () => {
    await write('default/card.json', schema('card'));
    await write('default/card.lifecycles.js', `module.exports = { beforeCreate: 'nope' };`);
    const { strapi } = createStrapi();

    await expect(loadComponents(strapi)).rejects.toThrow(
      'Component lifecycles are invalid for default.card.'
    );
  });

  it('warns and ignores a lifecycles file that has no matching schema', async () => {
    await write('default/card.json', schema('card'));
    await write('default/ghost.lifecycles.js', `module.exports = { beforeCreate() {} };`);
    const { strapi, registry, mocks } = createStrapi();

    await loadComponents(strapi);

    expect(registry.keys()).toEqual(['default.card']);
    expect(mocks.stopWithError).not.toHaveBeenCalled();
    expect(mocks.log.warn).toHaveBeenCalledTimes(1);
    expect(mocks.log.warn.mock.calls[0][0]).toContain(
      'no schema found for component "default.ghost"'
    );
    expect(mocks.log.warn.mock.calls[0][0]).toContain(
      path.join(dir, 'default', 'ghost.lifecycles.js')
    );
  });

  it('still stops when a schema has no collectionName', async () => {
    await write('default/card.json', { info: { displayName: 'card' }, attributes: {} });
    const { strapi, mocks } = createStrapi();

    await loadComponents(strapi);

    expect(mocks.stopWithError).toHaveBeenCalledWith(
      expect.stringContaining('Component card is missing a "collectionName" property.')
    );
  });

  it('does nothing when the components directory does not exist', async () => {
    await fse.remove(dir);
    const { strapi, registry } = createStrapi();

    await loadComponents(strapi);

    expect(registry.keys()).toEqual([]);
  });
});
