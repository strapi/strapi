const { registerAndLogin } = require('../../../test/helpers/auth');
const createModelsUtils = require('../../../test/helpers/models');
const { createAuthRequest } = require('../../../test/helpers/request');

const models = {
  withString: {
    attributes: [
      {
        name: 'field',
        params: {
          type: 'string',
        },
      },
    ],
    connection: 'default',
    name: 'withString',
  },
  withText: {
    attributes: [
      {
        name: 'field',
        params: {
          type: 'text',
        },
      },
    ],
    connection: 'default',
    name: 'withText',
  },
};

let modelsUtils;
let rq;

describe('Types', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });
  }, 60000);

  describe('Test type string', () => {
    beforeAll(async () => {
      await modelsUtils.createModels([models.withString]);
    }, 60000);

    afterAll(async () => {
      await modelsUtils.deleteModels(['withString']);
    }, 60000);

    test('Creates an entry with JSON', async () => {
      const res = await rq.post('/content-manager/explorer/withstring', {
        body: {
          field: 'Some string',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: 'Some string',
      });
    });

    test('Creates an entry with formData', async () => {
      const res = await rq.post('/content-manager/explorer/withstring', {
        formData: {
          data: JSON.stringify({ field: '"Some string"' }),
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: '"Some string"',
      });
    });

    test('Reading entry, returns correct value', async () => {
      const res = await rq.get('/content-manager/explorer/withstring');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
          }),
        ])
      );
    });

    test('Updating entry with JSON sets the right value and format', async () => {
      const res = await rq.post('/content-manager/explorer/withstring', {
        body: { field: 'Some string' },
      });

      const updateRes = await rq.put(
        `/content-manager/explorer/withstring/${res.body.id}`,
        {
          body: { field: 'Updated string' },
        }
      );
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body).toMatchObject({
        id: res.body.id,
        field: 'Updated string',
      });
    });

    test('Updating entry with Formdata sets the right value and format', async () => {
      const res = await rq.post('/content-manager/explorer/withstring', {
        formData: {
          data: JSON.stringify({ field: 'Some string' }),
        },
      });

      const updateRes = await rq.put(
        `/content-manager/explorer/withstring/${res.body.id}`,
        {
          formData: {
            data: JSON.stringify({ field: 'Updated string' }),
          },
        }
      );
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body).toMatchObject({
        id: res.body.id,
        field: 'Updated string',
      });
    });
  });

  describe('Test type text', () => {
    beforeAll(async () => {
      await modelsUtils.createModels([models.withText]);
    }, 60000);

    afterAll(async () => {
      await modelsUtils.deleteModels(['withText']);
    }, 60000);

    test('Creates an entry with JSON', async () => {
      const res = await rq.post('/content-manager/explorer/withtext', {
        body: {
          field: 'Some\ntext',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: 'Some\ntext',
      });
    });

    test('Creates an entry with formData', async () => {
      const res = await rq.post('/content-manager/explorer/withtext', {
        formData: {
          data: JSON.stringify({ field: '"Some \ntext"' }),
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: '"Some \ntext"',
      });
    });

    test('Reading entry, returns correct value', async () => {
      const res = await rq.get('/content-manager/explorer/withtext');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
          }),
        ])
      );
    });

    test('Updating entry with JSON sets the right value and format', async () => {
      const res = await rq.post('/content-manager/explorer/withtext', {
        body: { field: 'Some \ntext' },
      });

      const updateRes = await rq.put(
        `/content-manager/explorer/withtext/${res.body.id}`,
        {
          body: { field: 'Updated \nstring' },
        }
      );
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body).toMatchObject({
        id: res.body.id,
        field: 'Updated \nstring',
      });
    });

    test('Updating entry with Formdata sets the right value and format', async () => {
      const res = await rq.post('/content-manager/explorer/withtext', {
        formData: {
          data: JSON.stringify({ field: 'Some string' }),
        },
      });

      const updateRes = await rq.put(
        `/content-manager/explorer/withtext/${res.body.id}`,
        {
          formData: {
            data: JSON.stringify({ field: 'Updated \nstring' }),
          },
        }
      );
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body).toMatchObject({
        id: res.body.id,
        field: 'Updated \nstring',
      });
    });
  });

  describe('Test type richtext', () => {
    test.todo('Create entry with value input');

    test.todo('Reading entry, returns correct value');

    test.todo('Updating entry sets the right value and format');
  });

  describe('Test type date', () => {
    test.todo('Create entry with valid value');

    test.todo('Reading entry, returns correct value');

    test.todo('Updating entry sets the right value and format');
  });

  describe('Test type enumeration', () => {
    test.todo('Create entry value enumeration input');

    test.todo('Reading entry, returns correct value');

    test.todo('Updating entry sets the right value and format');
  });

  describe('Test type integer', () => {
    test.todo('Create entry with value input');

    test.todo('Reading entry, returns correct value');

    test.todo('Updating entry sets the right value and format');
  });

  describe('Test type biginteger', () => {
    test.todo('Create entry with value input');

    test.todo('Reading entry, returns correct value');

    test.todo('Updating entry sets the right value and format');
  });

  describe('Test type decimal', () => {
    test.todo('Create entry with value input');

    test.todo('Reading entry, returns correct value');

    test.todo('Updating entry sets the right value and format');
  });

  describe('Test type float', () => {
    test.todo('Create entry with valid value');

    test.todo('Reading entry, returns correct value');

    test.todo('Updating entry sets the right value and format');
  });

  describe('Test type json', () => {
    test.todo('Create entry with valid value');

    test.todo('Reading entry, returns correct value');

    test.todo('Updating entry sets the right value and format');
  });

  describe('Test type boolean', () => {
    test.todo('Create entry with value input');

    test.todo('Reading entry, returns correct value');

    test.todo('Updating entry sets the right value and format');
  });

  describe('Test type password', () => {
    test.todo('Create entry with value input');

    test.todo('Reading entry, returns correct value');

    test.todo('Updating entry sets the right value and format');
  });

  describe('Test type email', () => {
    test.todo('Create entry with valid value');

    test.todo('Reading entry, returns correct value');

    test.todo('Updating entry sets the right value and format');
  });

  describe('Test type group', () => {
    test.todo('Create entry with valid value');

    test.todo('Reading entry, returns correct value');

    test.todo('Updating entry sets the right value and format');
  });
});
