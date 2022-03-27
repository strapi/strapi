'use strict';

const { withDefaultPagination } = require('../pagination');

const defaultLimit = 20;
const defaults = {
  offset: { limit: defaultLimit },
  page: { pageSize: defaultLimit },
};

describe('Pagination util', () => {
  describe('With maxLimit set', () => {
    const maxLimit = 50;

    test('Uses default limit', () => {
      const pagination = {};
      const defaultPagination = withDefaultPagination(pagination, { defaults, maxLimit });

      expect(defaultPagination).toEqual({
        start: 0,
        limit: defaultLimit,
      });
    });

    describe('Paged pagination', () => {
      test('Uses specified pageSize', () => {
        const pagination = { pageSize: 5 };
        const defaultPagination = withDefaultPagination(pagination, { defaults, maxLimit });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: pagination.pageSize,
        });
      });

      test('Uses maxLimit as pageSize', () => {
        const pagination = { pageSize: 999 };
        const defaultPagination = withDefaultPagination(pagination, { defaults, maxLimit });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: maxLimit,
        });
      });

      test('Uses 1 as pageSize', () => {
        const pagination = { pageSize: 0 };
        const defaultPagination = withDefaultPagination(pagination, { defaults, maxLimit });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: 1,
        });
      });

      test('Uses 1 as pageSize', () => {
        const pagination = { pageSize: -1 };
        const defaultPagination = withDefaultPagination(pagination, { defaults, maxLimit });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: 1,
        });
      });

      test('Uses 1 as pageSize', () => {
        const pagination = { pageSize: -2 };
        const defaultPagination = withDefaultPagination(pagination, { defaults, maxLimit });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: 1,
        });
      });
    });

    describe('Offset pagination', () => {
      test('Uses specified limit', () => {
        const pagination = { limit: 5 };
        const defaultPagination = withDefaultPagination(pagination, { defaults, maxLimit });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: pagination.limit,
        });
      });

      test('Uses maxLimit as limit', () => {
        const pagination = { limit: 999 };
        const defaultPagination = withDefaultPagination(pagination, { defaults, maxLimit });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: maxLimit,
        });
      });

      test('Uses 1 as limit', () => {
        const pagination = { limit: 0 };
        const defaultPagination = withDefaultPagination(pagination, { defaults, maxLimit });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: 1,
        });
      });

      test('Uses maxLimit as limit', () => {
        const pagination = { limit: -1 };
        const defaultPagination = withDefaultPagination(pagination, { defaults, maxLimit });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: maxLimit,
        });
      });

      test('Uses 1 as limit', () => {
        const pagination = { limit: -2 };
        const defaultPagination = withDefaultPagination(pagination, { defaults, maxLimit });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: 1,
        });
      });
    });
  });

  describe('With maxLimit undefined', () => {
    test('Uses default limit', () => {
      const pagination = {};
      const defaultPagination = withDefaultPagination(pagination, { defaults });

      expect(defaultPagination).toEqual({
        start: 0,
        limit: defaultLimit,
      });
    });

    describe('Paged pagination', () => {
      test('Uses specified pageSize', () => {
        const pagination = { pageSize: 5 };
        const defaultPagination = withDefaultPagination(pagination, { defaults });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: pagination.pageSize,
        });
      });

      test('Uses specified pageSize', () => {
        const pagination = { pageSize: 999 };
        const defaultPagination = withDefaultPagination(pagination, { defaults });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: pagination.pageSize,
        });
      });

      test('Uses 1 as pageSize', () => {
        const pagination = { pageSize: 0 };
        const defaultPagination = withDefaultPagination(pagination, { defaults });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: 1,
        });
      });

      test('Uses 1 as pageSize', () => {
        const pagination = { pageSize: -1 };
        const defaultPagination = withDefaultPagination(pagination, { defaults });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: 1,
        });
      });

      test('Uses 1 as pageSize', () => {
        const pagination = { pageSize: -2 };
        const defaultPagination = withDefaultPagination(pagination, { defaults });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: 1,
        });
      });
    });

    describe('Offset pagination', () => {
      test('Uses specified limit', () => {
        const pagination = { limit: 5 };
        const defaultPagination = withDefaultPagination(pagination, { defaults });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: pagination.limit,
        });
      });

      test('Uses a specified limit', () => {
        const pagination = { limit: 999 };
        const defaultPagination = withDefaultPagination(pagination, { defaults });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: 999,
        });
      });

      test('Uses 1 as limit', () => {
        const pagination = { limit: 0 };
        const defaultPagination = withDefaultPagination(pagination, { defaults });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: 1,
        });
      });

      test('Uses -1 as limit', () => {
        const pagination = { limit: -1 };
        const defaultPagination = withDefaultPagination(pagination, { defaults });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: -1,
        });
      });

      test('Uses 1 as limit', () => {
        const pagination = { limit: -2 };
        const defaultPagination = withDefaultPagination(pagination, { defaults });

        expect(defaultPagination).toEqual({
          start: 0,
          limit: 1,
        });
      });
    });
  });
});
