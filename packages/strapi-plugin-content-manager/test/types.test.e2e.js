const { registerAndLogin } = require('../../../test/helpers/auth');
const createModelsUtils = require('../../../test/helpers/models');
const { createAuthRequest } = require('../../../test/helpers/request');

let modelsUtils;
let rq;

function createModelWithType(name, type, opts = {}) {
  return modelsUtils.createModels([
    {
      connection: 'default',
      name,
      attributes: [
        {
          name: 'field',
          params: {
            type,
            ...opts,
          },
        },
      ],
    },
  ]);
}

function deleteModel(name) {
  return modelsUtils.deleteModels([name]);
}

describe('Types', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });
  }, 60000);

  describe('Test type string', () => {
    beforeAll(async () => {
      await createModelWithType('withstring', 'string');
    }, 60000);

    afterAll(async () => {
      await deleteModel('withstring');
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
      await createModelWithType('withtext', 'text');
    }, 60000);

    afterAll(async () => {
      await deleteModel('withtext');
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
    beforeAll(async () => {
      await createModelWithType('withrichtext', 'richtext');
    }, 60000);

    afterAll(async () => {
      await deleteModel('withrichtext');
    }, 60000);

    test('Creates an entry with JSON', async () => {
      const res = await rq.post('/content-manager/explorer/withrichtext', {
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
      const res = await rq.post('/content-manager/explorer/withrichtext', {
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
      const res = await rq.get('/content-manager/explorer/withrichtext');

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
      const res = await rq.post('/content-manager/explorer/withrichtext', {
        body: { field: 'Some \ntext' },
      });

      const updateRes = await rq.put(
        `/content-manager/explorer/withrichtext/${res.body.id}`,
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
      const res = await rq.post('/content-manager/explorer/withrichtext', {
        formData: {
          data: JSON.stringify({ field: 'Some string' }),
        },
      });

      const updateRes = await rq.put(
        `/content-manager/explorer/withrichtext/${res.body.id}`,
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

  describe('Test type date', () => {
    beforeAll(async () => {
      await createModelWithType('withdate', 'date');
    }, 60000);

    afterAll(async () => {
      await deleteModel('withdate');
    }, 60000);

    test('Create entry with valid value JSON', async () => {
      const now = new Date();

      const res = await rq.post('/content-manager/explorer/withdate', {
        body: {
          field: now,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: now.toISOString(),
      });
    });

    test('Create entry with valid value FormData', async () => {
      const now = new Date();

      const res = await rq.post('/content-manager/explorer/withdate', {
        formData: {
          data: JSON.stringify({ field: now }),
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: now.toISOString(),
      });
    });

    test('Create entry with timestamp value should be converted to ISO', async () => {
      const now = new Date();

      const res = await rq.post('/content-manager/explorer/withdate', {
        body: {
          field: now.getTime(),
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: now.toISOString(),
      });
    });

    test('Throws on invalid date format', async () => {
      const now = new Date();

      const res = await rq.post('/content-manager/explorer/withdate', {
        body: {
          field: `${now.getTime()}`,
        },
      });

      expect(res.statusCode).toBe(400);
    });

    test('Reading entry, returns correct value', async () => {
      const res = await rq.get('/content-manager/explorer/withdate');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach(entry => {
        expect(new Date(entry.field).toISOString()).toBe(entry.field);
      });
    });

    test('Updating entry sets the right value and format JSON', async () => {
      const now = new Date();

      const res = await rq.post('/content-manager/explorer/withdate', {
        body: {
          field: now.getTime(),
        },
      });

      const newDate = new Date();
      const updateRes = await rq.put(
        `/content-manager/explorer/withdate/${res.body.id}`,
        {
          body: {
            field: newDate,
          },
        }
      );

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body).toMatchObject({
        id: res.body.id,
        field: newDate.toISOString(),
      });
    });
  });

  describe('Test type enumeration', () => {
    beforeAll(async () => {
      await createModelWithType('withenumeration', 'enumeration', {
        enum: ['one', 'two'],
      });
    }, 60000);

    afterAll(async () => {
      await deleteModel('withenumeration');
    }, 60000);

    test('Create entry value enumeration input JSON', async () => {
      const res = await rq.post('/content-manager/explorer/withenumeration', {
        body: {
          field: 'one',
        },
      });

      expect(res.statusCode).toBe(200); // should return 201
      expect(res.body).toMatchObject({
        field: 'one',
      });
    });

    test('Create entry value enumeration input Formdata', async () => {
      const res = await rq.post('/content-manager/explorer/withenumeration', {
        formData: {
          data: JSON.stringify({ field: 'two' }),
        },
      });

      expect(res.statusCode).toBe(200); // should return 201
      expect(res.body).toMatchObject({
        field: 'two',
      });
    });

    test('Reading entry, returns correct value', async () => {
      const res = await rq.get('/content-manager/explorer/withenumeration');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach(entry => {
        expect(['one', 'two'].includes(entry.field)).toBe(true);
      });
    });

    test('Updating entry sets the right value and format', async () => {
      const res = await rq.post('/content-manager/explorer/withenumeration', {
        body: {
          field: 'two',
        },
      });

      const updateRes = await rq.put(
        `/content-manager/explorer/withenumeration/${res.body.id}`,
        {
          body: {
            field: 'one',
          },
        }
      );

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body).toMatchObject({
        id: res.body.id,
        field: 'one',
      });
    });

    /*
     * Waiting validation of input to work
     */
    test.todo(
      'Throws an error when the enumeration value is not in the options'
    );
  });

  describe('Test type integer', () => {
    beforeAll(async () => {
      await createModelWithType('withinteger', 'integer');
    }, 60000);

    afterAll(async () => {
      await deleteModel('withinteger');
    }, 60000);

    test('Create entry with value input JSON', async () => {
      const res = await rq.post('/content-manager/explorer/withinteger', {
        body: {
          field: 123456,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: 123456,
      });
    });

    test('Create entry with value input Fromdata', async () => {
      const res = await rq.post('/content-manager/explorer/withinteger', {
        formData: {
          data: JSON.stringify({ field: 123456 }),
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: 123456,
      });
    });

    // I don't think it will work everywhere ...
    test('Create entry with a string should cast the value', async () => {
      const res = await rq.post('/content-manager/explorer/withinteger', {
        body: {
          field: '123456',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: 123456,
      });
    });

    test('Reading entry, returns correct value', async () => {
      const res = await rq.get('/content-manager/explorer/withinteger');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach(entry => {
        expect(Number.isInteger(entry.field)).toBe(true);
      });
    });

    test('Updating entry sets the right value and format', async () => {
      const res = await rq.post('/content-manager/explorer/withinteger', {
        body: {
          field: 123,
        },
      });

      const updatedRes = await rq.put(
        `/content-manager/explorer/withinteger/${res.body.id}`,
        {
          body: {
            field: 543,
          },
        }
      );

      expect(updatedRes.statusCode).toBe(200);
      expect(updatedRes.body).toMatchObject({
        id: res.body.id,
        field: 543,
      });
    });
  });

  describe('Test type biginteger', () => {
    beforeAll(async () => {
      await createModelWithType('withbiginteger', 'biginteger');
    }, 60000);

    afterAll(async () => {
      await deleteModel('withbiginteger');
    }, 60000);

    test('Create entry with value input JSON', async () => {
      const inputValue = '1223372036854775807';
      const res = await rq.post('/content-manager/explorer/withbiginteger', {
        body: {
          field: inputValue,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: inputValue,
      });
    });

    test('Create entry with value input Formdata', async () => {
      const inputValue = '1223372036854775807';
      const res = await rq.post('/content-manager/explorer/withbiginteger', {
        formData: {
          data: JSON.stringify({ field: inputValue }),
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: inputValue,
      });
    });

    test('Create entry with integer should return a string', async () => {
      const inputValue = 1821;
      const res = await rq.post('/content-manager/explorer/withbiginteger', {
        body: {
          field: inputValue,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: `${inputValue}`,
      });
    });

    test('Reading entry, returns correct value', async () => {
      const res = await rq.get('/content-manager/explorer/withbiginteger');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach(entry => {
        expect(entry.field).toEqual(expect.any(String));
      });
    });

    test('Updating entry sets the right value and format', async () => {
      const inputValue = '1223372036854775807';
      const res = await rq.post('/content-manager/explorer/withbiginteger', {
        body: {
          field: inputValue,
        },
      });

      const newVal = '9882823782712112';
      const updateRes = await rq.put(
        `/content-manager/explorer/withbiginteger/${res.body.id}`,
        {
          body: {
            field: newVal,
          },
        }
      );

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body).toMatchObject({
        id: res.body.id,
        field: newVal,
      });
    });
  });

  describe('Test type decimal', () => {
    beforeAll(async () => {
      await createModelWithType('withdecimal', 'decimal');
    }, 60000);

    afterAll(async () => {
      await deleteModel('withdecimal');
    }, 60000);

    test('Create entry with value input JSON', async () => {
      const inputValue = 12.31;
      const res = await rq.post('/content-manager/explorer/withdecimal', {
        body: {
          field: inputValue,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: inputValue,
      });
    });

    test('Create entry with value input Formdata', async () => {
      const inputValue = 23.1;
      const res = await rq.post('/content-manager/explorer/withdecimal', {
        formData: {
          data: JSON.stringify({ field: inputValue }),
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: inputValue,
      });
    });

    test('Create entry with integer should convert to decimal', async () => {
      const inputValue = 1821;
      const res = await rq.post('/content-manager/explorer/withdecimal', {
        body: {
          field: inputValue,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: 1821.0,
      });
    });

    test('Reading entry, returns correct value', async () => {
      const res = await rq.get('/content-manager/explorer/withdecimal');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach(entry => {
        expect(entry.field).toEqual(expect.any(Number));
      });
    });

    test('Updating entry sets the right value and format', async () => {
      const res = await rq.post('/content-manager/explorer/withdecimal', {
        body: {
          field: 11.2,
        },
      });

      const updateRes = await rq.put(
        `/content-manager/explorer/withdecimal/${res.body.id}`,
        {
          body: {
            field: 14,
          },
        }
      );

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body).toMatchObject({
        id: res.body.id,
        field: 14.0,
      });
    });
  });

  describe('Test type float', () => {
    beforeAll(async () => {
      await createModelWithType('withfloat', 'float');
    }, 60000);

    afterAll(async () => {
      await deleteModel('withfloat');
    }, 60000);

    test('Create entry with value input JSON', async () => {
      const inputValue = 12.31;
      const res = await rq.post('/content-manager/explorer/withfloat', {
        body: {
          field: inputValue,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: inputValue,
      });
    });

    test('Create entry with value input Formdata', async () => {
      const inputValue = 23.1;
      const res = await rq.post('/content-manager/explorer/withfloat', {
        formData: {
          data: JSON.stringify({ field: inputValue }),
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: inputValue,
      });
    });

    test('Create entry with integer should convert to float', async () => {
      const inputValue = 1821;
      const res = await rq.post('/content-manager/explorer/withfloat', {
        body: {
          field: inputValue,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        field: 1821.0,
      });
    });

    test('Reading entry, returns correct value', async () => {
      const res = await rq.get('/content-manager/explorer/withfloat');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach(entry => {
        expect(entry.field).toEqual(expect.any(Number));
      });
    });

    test('Updating entry sets the right value and format', async () => {
      const res = await rq.post('/content-manager/explorer/withfloat', {
        body: {
          field: 11.2,
        },
      });

      const updateRes = await rq.put(
        `/content-manager/explorer/withfloat/${res.body.id}`,
        {
          body: {
            field: 14,
          },
        }
      );

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body).toMatchObject({
        id: res.body.id,
        field: 14.0,
      });
    });
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
