import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fse from 'fs-extra';

import createBuilder from '../index';

vi.mock('fs-extra', () => ({
  default: {
    ensureFile: vi.fn(() => Promise.resolve()),
    writeJSON: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    readdir: vi.fn(() => Promise.resolve([])),
  },
}));

const COMPONENTS_DIR = '/app/src/components';
const EXTENSIONS_DIR = '/app/src/extensions';

const createComponent = (category: string, name: string) => {
  const schema = {
    collectionName: `components_${category}_${name}s`,
    info: { displayName: name, icon: 'star' },
    options: {},
    attributes: { title: { type: 'string' } },
  };

  return {
    ...schema,
    __schema__: schema,
    __filename__: `${name}.json`,
    uid: `${category}.${name}`,
    category,
    modelName: name,
  };
};

describe('createBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).strapi = {
      dirs: {
        app: { components: COMPONENTS_DIR, extensions: EXTENSIONS_DIR, api: '/app/src/api' },
      },
      components: {
        'default.admin': createComponent('default', 'admin'),
      },
      contentTypes: {
        'admin::user': {
          modelName: 'user',
          plugin: 'admin',
          uid: 'admin::user',
          info: { singularName: 'user' },
          __schema__: { info: { singularName: 'user' }, options: {}, attributes: {} },
        },
      },
    };
  });

  it('writes the file of an existing component named "admin"', async () => {
    const builder = createBuilder();

    builder.editComponent({
      uid: 'default.admin',
      category: 'default',
      displayName: 'Admin Banner',
      icon: 'star',
      attributes: { title: { type: 'string' } },
    });

    await expect(builder.writeFiles()).resolves.toBe(true);

    expect(fse.writeJSON).toHaveBeenCalledWith(
      path.join(COMPONENTS_DIR, 'default', 'admin.json'),
      expect.objectContaining({ info: expect.objectContaining({ displayName: 'Admin Banner' }) }),
      expect.anything()
    );
  });

  it('keeps the content types of the admin plugin not writable', () => {
    const builder = createBuilder();

    expect(builder.contentTypes.get('admin::user').writable).toBe(false);
  });
});
