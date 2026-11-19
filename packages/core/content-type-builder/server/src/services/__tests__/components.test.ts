import path from 'path';
import fs from 'fs';
import { cloneDeep } from 'lodash';
import type { Struct } from '@strapi/types';

import { createComponent, deleteComponent, editComponent, formatComponent } from '../components';
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

  it('edits a component from the payload modifyComponent and PUT /components/:uid pass', async () => {
    // The payload the modifyComponent API test helper (packages/utils/api-tests/models.js)
    // and PUT /content-type-builder/components/:uid pass to editComponent.
    // modifyComponent only sends `component`; the nested `components` list comes from the route body.
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

// The component schema files of the getstarted example app, the way `strapi.components` holds them.
const componentsDir = path.resolve(
  __dirname,
  '../../../../../../../examples/getstarted/src/components'
);

/** Mirrors `@strapi/core`'s components loader: the raw schema file plus the fields it adds. */
const loadComponent = (category: string, file: string) => {
  const schema = JSON.parse(fs.readFileSync(path.join(componentsDir, category, file), 'utf8'));
  const modelName = path.basename(file, '.json');
  const uid = `${category}.${modelName}`;

  return Object.assign(schema, {
    __filename__: file,
    __schema__: cloneDeep(schema),
    uid,
    category,
    modelType: 'component',
    modelName,
    globalId: schema.globalId,
  });
};

const loadedComponents = fs.readdirSync(componentsDir).flatMap((category) =>
  fs
    .readdirSync(path.join(componentsDir, category))
    .filter((file) => file.endsWith('.json'))
    .map((file) => loadComponent(category, file))
);

describe('Content Type Builder - formatComponent', () => {
  it('reads components that have no `connection` key', () => {
    expect(loadedComponents.length).toBeGreaterThan(0);

    for (const component of loadedComponents) {
      expect(component).not.toHaveProperty('connection');
      expect(formatComponent(component).schema.connection).toBeUndefined();
    }
  });

  it('passes a `connection` key set by the schema file through as is', () => {
    const component = { ...loadComponent('default', 'apple.json'), connection: 'default' };

    expect(formatComponent(component).schema.connection).toBe('default');
  });
});
