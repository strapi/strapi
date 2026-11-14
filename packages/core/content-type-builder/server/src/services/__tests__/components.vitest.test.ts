import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createComponent, deleteComponent, editComponent } from '../components';

const builder = vi.hoisted(() => ({
  createNewComponentUIDMap: vi.fn(() => ({})),
  createComponent: vi.fn((component) => component),
  editComponent: vi.fn((component) => component),
  deleteComponent: vi.fn((uid) => ({ uid })),
  // `writeFiles` resolves false when a file failed to write and the files were rolled back
  writeFiles: vi.fn(),
}));

vi.mock('../schema-builder', () => ({ default: vi.fn(() => builder) }));

const component = {
  category: 'default',
  displayName: 'Hero',
  attributes: {},
};

describe('Content Type Builder - Components service - editComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (global as any).strapi = {
      eventHub: { emit: vi.fn() },
      log: { error: vi.fn(), warn: vi.fn() },
    };
  });

  it('emits component.update once the files are written', async () => {
    builder.writeFiles.mockResolvedValueOnce(true);

    await expect(editComponent('default.hero', { component: component as any })).resolves.toEqual(
      expect.objectContaining({ uid: 'default.hero' })
    );

    expect(strapi.eventHub.emit).toHaveBeenCalledWith('component.update', expect.anything());
  });

  it('rejects, and emits no event, when the files were rolled back', async () => {
    builder.writeFiles.mockResolvedValueOnce(false);

    await expect(editComponent('default.hero', { component: component as any })).rejects.toThrow(
      'Invalid schema edition'
    );

    expect(strapi.eventHub.emit).not.toHaveBeenCalled();
  });
});

describe('Content Type Builder - Components service - createComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (global as any).strapi = {
      eventHub: { emit: vi.fn() },
      log: { error: vi.fn(), warn: vi.fn() },
    };
  });

  it('emits component.create once the files are written', async () => {
    builder.writeFiles.mockResolvedValueOnce(true);

    await expect(createComponent({ component })).resolves.toEqual(
      expect.objectContaining({ displayName: 'Hero' })
    );

    expect(strapi.eventHub.emit).toHaveBeenCalledWith('component.create', expect.anything());
  });

  it('rejects, and emits no event, when the files were rolled back', async () => {
    builder.writeFiles.mockResolvedValueOnce(false);

    await expect(createComponent({ component })).rejects.toThrow('Invalid schema edition');

    expect(strapi.eventHub.emit).not.toHaveBeenCalled();
  });
});

describe('Content Type Builder - Components service - deleteComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (global as any).strapi = {
      eventHub: { emit: vi.fn() },
      log: { error: vi.fn(), warn: vi.fn() },
    };
  });

  it('emits component.delete once the files are written', async () => {
    builder.writeFiles.mockResolvedValueOnce(true);

    await expect(deleteComponent('default.hero')).resolves.toEqual({ uid: 'default.hero' });

    expect(strapi.eventHub.emit).toHaveBeenCalledWith('component.delete', expect.anything());
  });

  it('rejects, and emits no event, when the files were rolled back', async () => {
    builder.writeFiles.mockResolvedValueOnce(false);

    await expect(deleteComponent('default.hero')).rejects.toThrow('Invalid schema edition');

    expect(strapi.eventHub.emit).not.toHaveBeenCalled();
  });
});
