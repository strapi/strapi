'use strict';

const { mapAsync, reduceAsync } = require('../async');

describe('Async utils', () => {
  describe('mapAsync', () => {
    test('Should return a simple array of numbers', async () => {
      const numberPromiseArray = [Promise.resolve(1), Promise.resolve(2)];

      const mapFunc = mapAsync(numberPromiseArray);
      const result = await mapFunc((number) => number + 1);

      expect(result).toEqual([2, 3]);
    });
    test('Should work with mix of promises and values', async () => {
      const numberMixArray = [1, Promise.resolve(2)];

      const mapFunc = mapAsync(numberMixArray);
      const result = await mapFunc((number) => number + 1);

      expect(result).toEqual([2, 3]);
    });
    test('Should throw an error', async () => {
      const numberPromiseArray = [Promise.resolve(1), Promise.resolve(2)];

      const mapFunc = mapAsync(numberPromiseArray);

      await expect(async () => {
        await mapFunc(() => {
          throw new Error('test');
        });
      }).rejects.toThrow('test');
    });
  });
  describe('reduceAsync', () => {
    test('Should return a incremented number', async () => {
      const numberPromiseArray = [Promise.resolve(1), Promise.resolve(2)];

      const reduceFunc = reduceAsync(numberPromiseArray);
      const result = await reduceFunc(
        (previousValue, currentValue) => previousValue + currentValue,
        10
      );

      expect(result).toEqual(13);
    });
    test('Should work with mix of promises and values', async () => {
      const numberMixArray = [1, Promise.resolve(2)];

      const reduceFunc = reduceAsync(numberMixArray);
      const result = await reduceFunc(
        (previousValue, currentValue) => previousValue + currentValue,
        10
      );

      expect(result).toEqual(13);
    });
    test('Should throw an error', async () => {
      const numberPromiseArray = [Promise.resolve(1), Promise.resolve(2)];

      const reduceFunc = reduceAsync(numberPromiseArray);

      await expect(async () => {
        await reduceFunc(() => {
          throw new Error('test');
        });
      }).rejects.toThrow('test');
    });
  });
});
