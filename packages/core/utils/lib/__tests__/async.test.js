'use strict';

const { pipeAsync, mapAsync, reduceAsync } = require('../async');

describe('Async utils', () => {
  describe('pipeAsync', () => {
    test('Should pipe several functions', async () => {
      const circleAreaPipe = [(n) => n * n, (n) => Promise.resolve(n * Math.PI), Math.round];

      const circleAreaFunc = pipeAsync(...circleAreaPipe);
      const result = await circleAreaFunc(50);

      expect(result).toEqual(7854);
    });
  });
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
    test('Should throw an error 2', async () => {
      const numberPromiseArray = [Promise.reject(new Error('input')), Promise.resolve(2)];

      const mapFunc = mapAsync(numberPromiseArray);

      await expect(async () => {
        await mapFunc(() => true);
      }).rejects.toThrow('input');
    });
    test('Should resolve elements two at a time', async () => {
      const numberPromiseArray = [1, 2, 3];
      const getPromiseDelayed = (speed = 0) =>
        new Promise((resolve) => {
          setTimeout(resolve, speed);
        });
      const opOrder = [];

      const mapFunc = mapAsync(numberPromiseArray, { concurrency: 2 });
      const result = await mapFunc(async (value, index) => {
        if (index === 0) {
          await getPromiseDelayed(20);
        }
        opOrder.push(index);
        return value;
      });

      expect(result).toEqual([1, 2, 3]);
      expect(opOrder).toEqual([1, 0, 2]);
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
    test('Should throw an error 2', async () => {
      const numberPromiseArray = [Promise.reject(new Error('input')), Promise.resolve(2)];

      const reduceFunc = reduceAsync(numberPromiseArray);

      await expect(async () => {
        await reduceFunc(() => true);
      }).rejects.toThrow('input');
    });
  });
});
