'use strict';

const _ = require('lodash');

const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;

describe('Role CRUD End to End', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);
  }, 60000);

  test('Can get the existing permissions', async () => {
    let res = await rq({
      url: '/admin/permissions',
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);

    // Data is sorted to avoid error with snapshot when the data is not in the same order
    const sortedData = _.cloneDeep(res.body.data);
    Object.keys(sortedData.sections).forEach(sectionName => {
      sortedData.sections[sectionName] = _.sortBy(sortedData.sections[sectionName], ['action']);
    });
    sortedData.conditions = sortedData.conditions.sort();
    expect(sortedData).toMatchSnapshot();
  });
});
