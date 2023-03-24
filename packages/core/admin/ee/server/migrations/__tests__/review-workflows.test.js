'use strict';

const { disableOnContentTypes } = require('../review-workflows');

describe('disableOnContentTypes', () => {
  test('correctly identifies the content types that have had review workflows disabled', async () => {
    const delSpy = jest.fn();
    const whereInSpy = jest.fn(() => ({ del: delSpy }));

    global.strapi = {
      db: {
        connection: () => ({ whereIn: whereInSpy }),
      },
    };

    const baseOptions = { options: { reviewWorkflows: false } };
    const contentTypes = Object.fromEntries([
      ['U1', baseOptions],
      ['U2', baseOptions],
      ['U3', baseOptions],
    ]);
    const oldContentTypes = Object.fromEntries([
      ['U1', { options: { reviewWorkflows: true } }],
      ['U2', baseOptions],
      ['U3', { options: { reviewWorkflows: true } }],
      ['U4', { options: { reviewWorkflows: true } }],
    ]);

    await disableOnContentTypes({ oldContentTypes, contentTypes });

    expect(whereInSpy).toHaveBeenCalledTimes(1);
    expect(whereInSpy).toHaveBeenCalledWith('related_type', ['U1', 'U3']);
    expect(delSpy).toHaveBeenCalledTimes(1);
  });
});
