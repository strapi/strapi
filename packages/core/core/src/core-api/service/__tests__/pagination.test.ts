import _ from 'lodash';
import { getPaginationInfo } from '../pagination';

const maxLimit = 50;
const defaultLimit = 20;

describe('Pagination service', () => {
  describe('With maxLimit set globally', () => {
    beforeAll(() => {
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
    });

    test('Uses default limit', () => {
      const pagination = undefined;
      const paginationInfo = getPaginationInfo({ pagination });

      expect(paginationInfo).toEqual({
        start: 0,
        limit: defaultLimit,
      });
    });

    describe('Paged pagination', () => {
      test('Uses specified pageSize', () => {
        const pagination = { pageSize: 5 };
        const paginationInfo = getPaginationInfo({ pagination });

        expect(paginationInfo).toEqual({
          start: 0,
          limit: pagination.pageSize,
        });
      });

      test('Uses maxLimit as pageSize', () => {
        const pagination = { pageSize: 999 };
        const paginationInfo = getPaginationInfo({ pagination });

        expect(paginationInfo).toEqual({
          start: 0,
          limit: maxLimit,
        });
      });

      test('Uses 1 as pageSize', () => {
        const pagination = { pageSize: 0 };
        const paginationInfo = getPaginationInfo({ pagination });

        expect(paginationInfo).toEqual({
          start: 0,
          limit: 1,
        });
      });

      test('Uses 1 as pageSize', () => {
        const pagination = { pageSize: -1 };
        const paginationInfo = getPaginationInfo({ pagination });

        expect(paginationInfo).toEqual({
          start: 0,
          limit: 1,
        });
      });

      test('Uses 1 as pageSize', () => {
        const pagination = { pageSize: -2 };
        const paginationInfo = getPaginationInfo({ pagination });

        expect(paginationInfo).toEqual({
          start: 0,
          limit: 1,
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

  // Setting global strapi api conf

  describe('With maxLimit undefined', () => {
    beforeAll(() => {
      global.strapi = {
        config: {
          get(path, defaultValue) {
            return _.get(this, path, defaultValue);
          },
          api: {
            rest: {
              defaultLimit,
              maxLimit: undefined,
            },
          },
        },
      };
    });

    test('Uses default limit', () => {
      const pagination = {};
      const paginationInfo = getPaginationInfo({ pagination });

      expect(paginationInfo).toEqual({
        start: 0,
        limit: defaultLimit,
      });
    });

    describe('Paged pagination', () => {
      test('Uses specified pageSize', () => {
        const pagination = { pageSize: 5 };
        const paginationInfo = getPaginationInfo({ pagination });

        expect(paginationInfo).toEqual({
          start: 0,
          limit: pagination.pageSize,
        });
      });

      test('Uses specified pageSize', () => {
        const pagination = { pageSize: 999 };
        const paginationInfo = getPaginationInfo({ pagination });

        expect(paginationInfo).toEqual({
          start: 0,
          limit: pagination.pageSize,
        });
      });

      test('Uses 1 as pageSize', () => {
        const pagination = { pageSize: 0 };
        const paginationInfo = getPaginationInfo({ pagination });

        expect(paginationInfo).toEqual({
          start: 0,
          limit: 1,
        });
      });

      test('Uses 1 as pageSize', () => {
        const pagination = { pageSize: -1 };
        const paginationInfo = getPaginationInfo({ pagination });

        expect(paginationInfo).toEqual({
          start: 0,
          limit: 1,
        });
      });

      test('Uses 1 as pageSize', () => {
        const pagination = { pageSize: -2 };
        const paginationInfo = getPaginationInfo({ pagination });

        expect(paginationInfo).toEqual({
          start: 0,
          limit: 1,
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

      test('Uses specified limit', () => {
        const pagination = { limit: 999 };
        const paginationInfo = getPaginationInfo({ pagination });

        expect(paginationInfo).toEqual({
          start: 0,
          limit: pagination.limit,
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

      test('Uses -1 as limit', () => {
        const pagination = { limit: -1 };
        const paginationInfo = getPaginationInfo({ pagination });

        expect(paginationInfo).toEqual({
          start: 0,
          limit: -1,
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
});
