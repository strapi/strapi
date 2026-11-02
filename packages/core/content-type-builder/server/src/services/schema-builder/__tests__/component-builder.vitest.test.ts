import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fse from 'fs-extra';

import createSchemaHandler from '../schema-handler';
import createComponentBuilder from '../component-builder';

vi.mock('fs-extra', () => ({
  default: {
    ensureFile: vi.fn(() => Promise.resolve()),
    writeJSON: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    readdir: vi.fn(() => Promise.resolve([])),
  },
}));

const COMPONENTS_DIR = '/app/src/components';
// The schema handler is typed for content types; components share it.
const HERO_UID = 'default.hero' as Parameters<typeof createSchemaHandler>[0]['uid'];

const createBuilder = () => {
  const hero = createSchemaHandler({
    uid: HERO_UID,
    category: 'default',
    dir: path.join(COMPONENTS_DIR, 'default'),
    filename: 'hero.json',
    schema: {
      collectionName: 'components_default_heroes',
      info: { displayName: 'Hero', icon: 'star' },
      options: {},
      attributes: { title: { type: 'string' } },
    } as any,
  });

  return {
    hero,
    builder: {
      components: new Map([[HERO_UID, hero]]),
      contentTypes: new Map(),
      convertAttributes: (attributes: unknown) => attributes,
      ...createComponentBuilder(),
    },
  };
};

describe('component-builder editComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).strapi = { dirs: { app: { components: COMPONENTS_DIR } } };
  });

  it('keeps the uid, file and collection name when only the display name changes', async () => {
    const { builder, hero } = createBuilder();

    builder.editComponent({
      uid: 'default.hero',
      category: 'default',
      displayName: 'Hero Banner',
      icon: 'star',
      attributes: { title: { type: 'string' } },
    });

    expect(hero.uid).toBe('default.hero');
    expect(hero.schema.collectionName).toBe('components_default_heroes');
    expect(hero.schema.info.displayName).toBe('Hero Banner');

    await hero.flush();

    expect(fse.writeJSON).toHaveBeenCalledWith(
      path.join(COMPONENTS_DIR, 'default', 'hero.json'),
      expect.objectContaining({ collectionName: 'components_default_heroes' }),
      expect.anything()
    );
    expect(fse.remove).not.toHaveBeenCalled();
  });
});
