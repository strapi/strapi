'use strict';

const { registerAndLogin } = require('../../../../test/helpers/auth');
const createModelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let modelsUtils;
let rq;

describe('Test type biginteger', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });

    await modelsUtils.createContentTypeWithType('withbiginteger', 'biginteger');
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteContentType('withbiginteger');
  }, 60000);

  test('Create entry with value input JSON', async () => {
    const inputValue = '1223372036854775';
    const res = await rq.post(
      '/content-manager/explorer/application::withbiginteger.withbiginteger',
      {
        body: {
          field: inputValue,
        },
      }
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: inputValue,
    });
  });

  test('Create entry with value input Formdata', async () => {
    const inputValue = '1223372036854775';
    const res = await rq.post(
      '/content-manager/explorer/application::withbiginteger.withbiginteger',
      {
        formData: {
          data: JSON.stringify({ field: inputValue }),
        },
      }
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: inputValue,
    });
  });

  test('Create entry with integer should return a string', async () => {
    const inputValue = 1821;
    const res = await rq.post(
      '/content-manager/explorer/application::withbiginteger.withbiginteger',
      {
        body: {
          field: inputValue,
        },
      }
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: `${inputValue}`,
    });
  });

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get(
      '/content-manager/explorer/application::withbiginteger.withbiginteger'
    );

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach(entry => {
      expect(entry.field).toEqual(expect.any(String));
    });
  });

  test('Updating entry sets the right value and format', async () => {
    const inputValue = '1223372036854775';
    const res = await rq.post(
      '/content-manager/explorer/application::withbiginteger.withbiginteger',
      {
        body: {
          field: inputValue,
        },
      }
    );

    const newVal = '9882823782712112';
    const updateRes = await rq.put(
      `/content-manager/explorer/application::withbiginteger.withbiginteger/${res.body.id}`,
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
