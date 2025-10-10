import { createCoreStore } from '../core-store';

const data = {
  key: 'testKey',
  value: 'testValue',
};

const queryRes = {
  id: 1,
  key: 'testKey',
  value: 'testValue',
  type: 'string',
  environment: null,
  tag: null,
};

const where = {
  key: 'plugin_testName_testKey',
  environment: 'test',
  tag: null,
};

describe('Core Store', () => {
  test('Set key in empty store', async () => {
    const fakeEmptyDBQuery = {
      findOne: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => Promise.resolve(queryRes)),
      create: jest.fn(() => Promise.resolve(queryRes)),
      delete: jest.fn(() => Promise.resolve()),
    };

    const fakeEmptyDB = {
      query: jest.fn(() => fakeEmptyDBQuery),
    };

    const emptyTestStore = createCoreStore({
      db: fakeEmptyDB,
    });

    const store = emptyTestStore({
      environment: 'test',
      type: 'plugin',
      name: 'testName',
    });

    await store.set(data);

    expect(fakeEmptyDB.query).toHaveBeenCalledTimes(2);
    expect(fakeEmptyDBQuery.findOne).toHaveBeenCalledWith({ where });
    expect(fakeEmptyDBQuery.create).toHaveBeenCalledWith({
      data: { ...where, value: JSON.stringify('testValue'), type: 'string' },
    });
  });

  test('Set key in not empty store', async () => {
    const fakeNotEmptyDBQuery = {
      findOne: jest.fn(() => Promise.resolve(queryRes)),
      update: jest.fn(() => Promise.resolve(queryRes)),
      create: jest.fn(() => Promise.resolve(queryRes)),
      delete: jest.fn(() => Promise.resolve()),
    };

    const fakeNotEmptyDB = {
      query: jest.fn(() => fakeNotEmptyDBQuery),
    };

    const notEmptyTestStore = createCoreStore({
      db: fakeNotEmptyDB,
    });

    const store = notEmptyTestStore({
      environment: 'test',
      type: 'plugin',
      name: 'testName',
    });

    await store.set(data);

    expect(fakeNotEmptyDB.query).toHaveBeenCalledTimes(2);
    expect(fakeNotEmptyDBQuery.findOne).toHaveBeenCalledWith({ where });
    expect(fakeNotEmptyDBQuery.update).toHaveBeenCalledWith({
      where: { id: queryRes.id },
      data: {
        type: 'string',
        value: JSON.stringify('testValue'),
      },
    });
  });

  test('Delete key from empty store', async () => {
    const fakeEmptyDBQuery = {
      findOne: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => Promise.resolve(queryRes)),
      create: jest.fn(() => Promise.resolve(queryRes)),
      delete: jest.fn(() => Promise.resolve()),
    };

    const fakeEmptyDB = {
      query: jest.fn(() => fakeEmptyDBQuery),
    };

    const emptyTestStore = createCoreStore({
      db: fakeEmptyDB,
    });

    const store = emptyTestStore({
      environment: 'test',
      type: 'plugin',
      name: 'testName',
    });

    await store.delete(data);

    expect(fakeEmptyDB.query).toHaveBeenCalledTimes(1);
    expect(fakeEmptyDBQuery.delete).toHaveBeenCalledWith({ where });
  });

  test('Delete key from not empty store', async () => {
    const fakeNotEmptyDBQuery = {
      findOne: jest.fn(() => Promise.resolve(queryRes)),
      update: jest.fn(() => Promise.resolve(queryRes)),
      create: jest.fn(() => Promise.resolve(queryRes)),
      delete: jest.fn(() => Promise.resolve()),
    };

    const fakeNotEmptyDB = {
      query: jest.fn(() => fakeNotEmptyDBQuery),
    };

    const notEmptyTestStore = createCoreStore({
      db: fakeNotEmptyDB,
    });

    const store = notEmptyTestStore({
      environment: 'test',
      type: 'plugin',
      name: 'testName',
    });

    const rest = await store.delete(data);

    expect(fakeNotEmptyDB.query).toHaveBeenCalledTimes(1);
    expect(fakeNotEmptyDBQuery.delete).toHaveBeenCalledWith({ where });
    expect(rest).toEqual(undefined);
  });
});
