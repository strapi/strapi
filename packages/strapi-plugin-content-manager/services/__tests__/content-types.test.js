const { getConfiguration, setConfiguration, deleteConfiguration } = require('../content-types');

const storeUtils = require('../utils/store');

describe('Content Type Configuration', () => {
  test('getConfiguration calls store with right key', async () => {
    const uid = 'test-uid';
    const spyFn = jest.spyOn(storeUtils, 'getModelConfiguration').mockImplementation(() => {});

    await getConfiguration(uid);

    expect(spyFn).toHaveBeenCalled();
    expect(spyFn.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "content_types::test-uid",
          ],
        ]
      `);

    spyFn.mockRestore();
  });

  test('setConfiguration calls store with right params', async () => {
    const uid = 'test-uid';
    const spyFn = jest.spyOn(storeUtils, 'setModelConfiguration').mockImplementation(() => {});

    await setConfiguration(uid, {
      settings: {},
      layouts: {},
      metadatas: {},
    });

    expect(spyFn).toHaveBeenCalled();
    expect(spyFn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "content_types::test-uid",
          Object {
            "layouts": Object {},
            "metadatas": Object {},
            "settings": Object {},
            "uid": "test-uid",
          },
        ],
      ]
    `);

    spyFn.mockRestore();
  });

  test('deleteConfiguration calls store with right params', async () => {
    const uid = 'test-uid';
    const spyFn = jest.spyOn(storeUtils, 'deleteKey').mockImplementation(() => {});

    await deleteConfiguration(uid);

    expect(spyFn).toHaveBeenCalled();
    expect(spyFn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "content_types::test-uid",
        ],
      ]
    `);

    spyFn.mockRestore();
  });
});
