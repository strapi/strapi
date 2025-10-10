import path from 'node:path';
import process from 'node:process';
import { readFile, remove, stat } from 'fs-extra';
import * as strapiGenerators from '../../index';

describe('Content Type Generator', () => {
  const outputDirectory = path.join(__dirname, 'output');

  beforeAll(() => {
    const spy = jest.spyOn(process, 'cwd');
    spy.mockReturnValue(outputDirectory);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  afterEach(async () => {
    await remove(outputDirectory);
  });

  test('it generates the schema', async () => {
    await strapiGenerators.generate(
      'content-type',
      {
        displayName: 'testContentType',
        singularName: 'testContentType',
        pluralName: 'testContentTypes',
        kind: 'singleType',
        id: 'testContentType',
        destination: 'new',
        bootstrapApi: false,
        attributes: [],
      },
      { dir: outputDirectory, plopFile: 'plopfile.ts' }
    );

    const generatedSchemaPath = path.join(
      outputDirectory,
      'src/api/testContentType',
      'content-types/testContentType/schema.json'
    );

    expect((await stat(generatedSchemaPath)).isFile()).toBeTruthy();

    const fileContent = await readFile(generatedSchemaPath, 'utf-8');

    expect(fileContent).not.toBeNull();

    const schema = JSON.parse(fileContent.toString());

    expect(schema).toStrictEqual({
      kind: 'singleType',
      collectionName: 'test_content_types',
      info: {
        singularName: 'testContentType',
        pluralName: 'testContentTypes',
        displayName: 'testContentType',
      },
      options: {
        comment: '',
      },
      attributes: {},
    });
  }, 30000);

  test('it scaffolds a new API', async () => {
    await strapiGenerators.generate(
      'content-type',
      {
        displayName: 'testContentType',
        singularName: 'testContentType',
        pluralName: 'testContentTypes',
        kind: 'singleType',
        id: 'testContentType',
        destination: 'new',
        bootstrapApi: true,
        attributes: [],
      },
      { dir: outputDirectory, plopFile: 'plopfile.ts' }
    );
    const generatedApiPath = path.join(outputDirectory, 'src/api/testContentType');

    expect((await stat(generatedApiPath)).isDirectory()).toBeTruthy();
    expect(
      (await stat(path.join(generatedApiPath, 'controllers/testContentType.js'))).isFile()
    ).toBeTruthy();
    expect(
      (await stat(path.join(generatedApiPath, 'services/testContentType.js'))).isFile()
    ).toBeTruthy();
    expect(
      (await stat(path.join(generatedApiPath, 'routes/testContentType.js'))).isFile()
    ).toBeTruthy();

    const controller = await readFile(
      path.join(generatedApiPath, 'controllers/testContentType.js')
    );
    const router = await readFile(path.join(generatedApiPath, 'routes/testContentType.js'));
    const service = await readFile(path.join(generatedApiPath, 'services/testContentType.js'));

    expect(controller.toString()).toMatchInlineSnapshot(`
      "'use strict';

      /**
       * testContentType controller
       */

      const { createCoreController } = require('@strapi/strapi').factories;

      module.exports = createCoreController('api::testContentType.testContentType');
      "
    `);
    expect(router.toString()).toMatchInlineSnapshot(`
      "'use strict';

      /**
       * testContentType router
       */

      const { createCoreRouter } = require('@strapi/strapi').factories;

      module.exports = createCoreRouter('api::testContentType.testContentType');
      "
    `);
    expect(service.toString()).toMatchInlineSnapshot(`
      "'use strict';

      /**
       * testContentType service
       */

      const { createCoreService } = require('@strapi/strapi').factories;

      module.exports = createCoreService('api::testContentType.testContentType');
      "
    `);
  });

  test('it generates the schema, then adds the attributes', async () => {
    await strapiGenerators.generate(
      'content-type',
      {
        displayName: 'testContentType',
        singularName: 'testContentType',
        pluralName: 'testContentTypes',
        kind: 'singleType',
        id: 'testContentType',
        destination: 'new',
        bootstrapApi: false,
        attributes: [
          {
            attributeName: 'name',
            attributeType: 'string',
          },
          {
            attributeName: 'email',
            attributeType: 'string',
          },
        ],
      },
      { dir: outputDirectory, plopFile: 'plopfile.ts' }
    );

    const generatedSchemaPath = path.join(
      outputDirectory,
      'src/api/testContentType',
      'content-types/testContentType/schema.json'
    );

    expect((await stat(generatedSchemaPath)).isFile()).toBeTruthy();

    const fileContent = await readFile(generatedSchemaPath, 'utf-8');

    expect(fileContent).not.toBeNull();

    const schema = JSON.parse(fileContent.toString());

    expect(schema.attributes).toStrictEqual({
      email: { type: 'string' },
      name: { type: 'string' },
    });
  });
});
