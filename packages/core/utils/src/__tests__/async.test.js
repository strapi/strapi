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
      const numberPromiseArray = [1, 2, 3, 4, 5, 6];
      const getPromiseDelayed = (speed = 0) =>
        new Promise((resolve) => {
          setTimeout(resolve, speed);
        });
      let maxOperations = 0;
      let operationsCounter = 0;

      const mapFunc = mapAsync(numberPromiseArray);
      const result = await mapFunc(
        async (value) => {
          operationsCounter += 1;
          if (operationsCounter > maxOperations) {
            maxOperations = operationsCounter;
          }
          await getPromiseDelayed(20);
          operationsCounter -= 1;
          return value;
        },
        { concurrency: 2 }
      );

      expect(result).toEqual([1, 2, 3, 4, 5, 6]);
      expect(maxOperations).toEqual(2);
    });
  });
  describe('reduceAsync', () => {
    test('Should return an incremented number', async () => {
      const numberPromiseArray = [Promise.resolve(1), Promise.resolve(2)];

      const reduceFunc = reduceAsync(numberPromiseArray);
      const result = await reduceFunc(
        (previousValue, currentValue) => previousValue + currentValue,
        10
      );

      expect(result).toEqual(13);
    });
    test('Should work without initial value', async () => {
      const numberPromiseArray = [Promise.resolve(1), Promise.resolve(2)];

      const reduceFunc = reduceAsync(numberPromiseArray);
      const result = await reduceFunc(
        (previousValue, currentValue) => (previousValue || 10) + currentValue
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
    test('Should throw an error with proper message when the provided callback throws an error', async () => {
      const numberPromiseArray = [Promise.resolve(1), Promise.resolve(2)];

      const reduceFunc = reduceAsync(numberPromiseArray);

      await expect(async () => {
        await reduceFunc(() => {
          throw new Error('test');
        });
      }).rejects.toThrow('test');
    });
    test('Should throw an error with proper message when the input array contains a rejected Promise', async () => {
      const numberPromiseArray = [Promise.reject(new Error('input')), Promise.resolve(2)];

      const reduceFunc = reduceAsync(numberPromiseArray);

      await expect(async () => {
        await reduceFunc(() => true, null);
      }).rejects.toThrow('input');
    });
  });
});
