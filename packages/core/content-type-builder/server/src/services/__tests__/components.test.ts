import path from 'path';
import fs from 'fs';
import { cloneDeep } from 'lodash';

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
      await editComponent('default.hero', { component: component as any });
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
