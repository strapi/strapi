import type { Struct } from '@strapi/types';

import { createComponent, deleteComponent, editComponent } from '../components';
import { collectUnhandledRejections } from './unhandled-rejections';

const builder = {
  createNewComponentUIDMap: jest.fn(() => ({})),
  createComponent: jest.fn((component) => component),
  editComponent: jest.fn((component) => component),
  deleteComponent: jest.fn((uid) => ({ uid })),
  writeFiles: jest.fn().mockResolvedValue(true),
};

jest.mock('../schema-builder', () => jest.fn(() => builder));

const component = {
  category: 'default',
  displayName: 'Hero',
  attributes: {},
};

describe('Content Type Builder - Components service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.strapi = {
      eventHub: { emit: jest.fn() },
      log: { error: jest.fn() },
    } as any;
  });

  it('logs a failing event listener instead of leaving an unhandled rejection', async () => {
    // A user listener that throws makes the event hub emit reject
    jest.mocked(strapi.eventHub.emit).mockRejectedValue(new Error('listener failed'));

    const rejections = await collectUnhandledRejections(async () => {
      await createComponent({ component });
      await editComponent('default.hero', { component });
      await deleteComponent('default.hero');
    });

    expect(rejections).toEqual([]);
    expect(strapi.eventHub.emit).toHaveBeenCalledTimes(3);
    expect(strapi.log.error).toHaveBeenCalledWith(
      'A component.create listener failed: listener failed'
    );
    expect(strapi.log.error).toHaveBeenCalledWith(
      'A component.update listener failed: listener failed'
    );
    expect(strapi.log.error).toHaveBeenCalledWith(
      'A component.delete listener failed: listener failed'
    );
  });

  it('edits a component from the admin payload', async () => {
    // The body the admin sends to PUT /content-type-builder/components/:uid
    // (see tests/api/core/content-type-builder/components.test.api.js)
    const payload = {
      component: {
        category: 'default',
        displayName: 'Some Component',
        icon: 'calendar',
        pluginOptions: { pluginName: { option: true } },
        attributes: {
          title: { type: 'string', pluginOptions: { pluginName: { option: true } } },
          pic: { type: 'media' },
        },
      },
      components: [
        { uid: 'default.existing', category: 'default', displayName: 'Existing', attributes: {} },
        { tmpUID: 'default.new', category: 'default', displayName: 'New', attributes: {} },
      ],
    } satisfies Parameters<typeof editComponent>[1];

    await editComponent('default.some-component', payload);

    expect(builder.editComponent).toHaveBeenCalledWith({
      uid: 'default.some-component',
      ...payload.component,
    });
    expect(builder.editComponent).toHaveBeenCalledWith(payload.components[0]);
    expect(builder.createComponent).toHaveBeenCalledWith(payload.components[1]);
  });

  it('does not type a loaded component schema as an edit payload', async () => {
    const loadedSchema = {
      modelType: 'component',
      uid: 'default.hero',
      modelName: 'hero',
      globalId: 'ComponentDefaultHero',
      category: 'default',
      info: { displayName: 'Hero' },
      attributes: {},
    } as Struct.ComponentSchema;

    // @ts-expect-error the loaded schema keeps displayName under info, the payload does not
    await editComponent('default.hero', { component: loadedSchema });
  });
});
