import { describe, it, expect, vi, beforeEach } from 'vitest';

import { editCategory } from '../component-categories';
import { renameComponentUIDs } from '../schema-builder/rename-component-uids';

vi.mock('fs-extra', () => ({
  default: {
    ensureFile: vi.fn(() => Promise.resolve()),
    writeJSON: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    readdir: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('../schema-builder/rename-component-uids', () => ({
  renameComponentUIDs: vi.fn(() => Promise.resolve()),
}));

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

describe('component-categories editCategory', () => {
  const db = { metadata: new Map() };

  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).strapi = {
      dirs: { app: { components: '/app/src/components', extensions: '/app/src/extensions' } },
      components: {
        'default.card': createComponent('default', 'card'),
        'default.wrapper': createComponent('default', 'wrapper'),
        'blocks.other': createComponent('blocks', 'other'),
      },
      contentTypes: {},
      db,
    };
  });

  it('rewrites the join rows of every component of the renamed category', async () => {
    await expect(editCategory('default', { name: 'sections2' })).resolves.toBe('sections2');

    expect(renameComponentUIDs).toHaveBeenCalledTimes(1);
    expect(renameComponentUIDs).toHaveBeenCalledWith(
      db,
      [
        { oldUID: 'default.card', newUID: 'sections2.card' },
        { oldUID: 'default.wrapper', newUID: 'sections2.wrapper' },
      ],
      { beforeCommit: undefined }
    );
  });

  it('does not touch the database when the name does not change', async () => {
    await expect(editCategory('default', { name: 'default' })).resolves.toBeUndefined();

    expect(renameComponentUIDs).not.toHaveBeenCalled();
  });
});
