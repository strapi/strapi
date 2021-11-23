'use strict';

const _ = require('lodash');
const { getPaginationInfo } = require('../pagination');

const maxLimit = 50;
const defaultLimit = 20;

// init global strapi
global.strapi = {
  config: {
    get(path, defaultValue) {
      return _.get(this, path, defaultValue);
    },
    api: {
      rest: {
        defaultLimit,
        maxLimit,
      },
    },
  },
};

describe('Pagination service', () => {
  test('Uses default limit', () => {
    const pagination = {};
    const paginationInfo = getPaginationInfo({ pagination });

    expect(paginationInfo).toEqual({
      page: 1,
      pageSize: defaultLimit,
    });
  });

  describe('Paged pagination', () => {
    test('Uses specified pageSize', () => {
      const pagination = { pageSize: 5 };
      const paginationInfo = getPaginationInfo({ pagination });

      expect(paginationInfo).toEqual({
        page: 1,
        pageSize: pagination.pageSize,
      });
    });

    test('Uses maxLimit as pageSize', () => {
      const pagination = { pageSize: 999 };
      const paginationInfo = getPaginationInfo({ pagination });

      expect(paginationInfo).toEqual({
        page: 1,
        pageSize: maxLimit,
      });
    });

    test('Uses 1 as pageSize', () => {
      const pagination = { pageSize: 0 };
      const paginationInfo = getPaginationInfo({ pagination });

      expect(paginationInfo).toEqual({
        page: 1,
        pageSize: 1,
      });
    });

    test('Uses 1 as pageSize', () => {
      const pagination = { pageSize: -1 };
      const paginationInfo = getPaginationInfo({ pagination });

      expect(paginationInfo).toEqual({
        page: 1,
        pageSize: 1,
      });
    });

    test('Uses 1 as pageSize', () => {
      const pagination = { pageSize: -2 };
      const paginationInfo = getPaginationInfo({ pagination });

      expect(paginationInfo).toEqual({
        page: 1,
        pageSize: 1,
      });
    });
  });

  describe('Offset pagination', () => {
    test('Uses specified limit', () => {
      const pagination = { limit: 5 };
      const paginationInfo = getPaginationInfo({ pagination });

      expect(paginationInfo).toEqual({
        start: 0,
        limit: pagination.limit,
      });
    });

    test('Uses maxLimit as limit', () => {
      const pagination = { limit: 999 };
      const paginationInfo = getPaginationInfo({ pagination });

      expect(paginationInfo).toEqual({
        start: 0,
        limit: maxLimit,
      });
    });

    test('Uses 1 as limit', () => {
      const pagination = { limit: 0 };
      const paginationInfo = getPaginationInfo({ pagination });

      expect(paginationInfo).toEqual({
        start: 0,
        limit: 1,
      });
    });

    test('Uses maxLimit as limit', () => {
      const pagination = { limit: -1 };
      const paginationInfo = getPaginationInfo({ pagination });

      expect(paginationInfo).toEqual({
        start: 0,
        limit: maxLimit,
      });
    });

    test('Uses 1 as limit', () => {
      const pagination = { limit: -2 };
      const paginationInfo = getPaginationInfo({ pagination });

      expect(paginationInfo).toEqual({
        start: 0,
        limit: 1,
      });
    });
  });
});
