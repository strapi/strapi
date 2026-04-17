import { Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { filter, map, collect } from '../stream';

describe('stream utils', () => {
  describe('filter', () => {
    test('propagates backpressure: source pauses when downstream is slow', async () => {
      const itemCount = 20;
      const data = Array.from({ length: itemCount }, (_, i) => ({ id: i }));
      let sourcePaused = false;

      const source = Readable.from(data, { objectMode: true });
      const originalPause = source.pause.bind(source);
      source.pause = function () {
        sourcePaused = true;
        return originalPause();
      };

      const slowConsumer = new Writable({
        objectMode: true,
        highWaterMark: 1,
        write(chunk, _encoding, callback) {
          setTimeout(callback, 5);
        },
      });

      const filtered = filter<{ id: number }>((x) => x.id % 2 === 0);
      await pipeline(source, filtered, slowConsumer);

      expect(sourcePaused).toBe(true);
    });

    test('does not retain references to discarded chunks', async () => {
      const data = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const collected: Array<{ id: number }> = [];

      const source = Readable.from(data, { objectMode: true });
      const filtered = filter<{ id: number }>((x) => x.id % 2 === 0);
      const writer = new Writable({
        objectMode: true,
        write(chunk, _encoding, callback) {
          collected.push(chunk);
          callback();
        },
      });

      await pipeline(source, filtered, writer);
      expect(collected).toHaveLength(50);
      expect(collected.map((x) => x.id)).toEqual(
        data.filter((_, i) => i % 2 === 0).map((x) => x.id)
      );
    });

    test('stream is destroyed after pipeline completes', async () => {
      const source = Readable.from([1, 2, 3], { objectMode: true });
      const filtered = filter<number>(() => true);
      const dest = new Writable({
        objectMode: true,
        write(chunk, _enc, cb) {
          cb();
        },
      });
      await pipeline(source, filtered, dest);
      expect(source.destroyed).toBe(true);
      expect(filtered.destroyed).toBe(true);
      expect(dest.destroyed).toBe(true);
    });
  });

  describe('map', () => {
    test('propagates backpressure: source pauses when downstream is slow', async () => {
      const itemCount = 20;
      const data = Array.from({ length: itemCount }, (_, i) => i);
      let sourcePaused = false;

      const source = Readable.from(data, { objectMode: true });
      const originalPause = source.pause.bind(source);
      source.pause = function () {
        sourcePaused = true;
        return originalPause();
      };

      const slowConsumer = new Writable({
        objectMode: true,
        highWaterMark: 1,
        write(_chunk, _encoding, callback) {
          setTimeout(callback, 5);
        },
      });

      const mapped = map<number, number>((x) => x * 2);
      await pipeline(source, mapped, slowConsumer);

      expect(sourcePaused).toBe(true);
    });

    test('does not retain references to all chunks', async () => {
      const data = Array.from({ length: 100 }, (_, i) => i);
      const collected: number[] = [];

      const source = Readable.from(data, { objectMode: true });
      const mapped = map<number, number>((x) => x + 1);
      const writer = new Writable({
        objectMode: true,
        write(chunk, _encoding, callback) {
          collected.push(chunk);
          callback();
        },
      });

      await pipeline(source, mapped, writer);
      expect(collected).toHaveLength(100);
      expect(collected).toEqual(data.map((x) => x + 1));
    });

    test('stream is destroyed after pipeline completes', async () => {
      const source = Readable.from([1, 2, 3], { objectMode: true });
      const mapped = map<number, number>((x) => x);
      const dest = new Writable({
        objectMode: true,
        write(chunk, _enc, cb) {
          cb();
        },
      });
      await pipeline(source, mapped, dest);
      expect(source.destroyed).toBe(true);
      expect(mapped.destroyed).toBe(true);
      expect(dest.destroyed).toBe(true);
    });
  });

  describe('collect', () => {
    test('destroys stream when options.destroy is true (default)', async () => {
      const source = Readable.from([1, 2, 3], { objectMode: true });
      const result = await collect<number>(source);
      expect(result).toEqual([1, 2, 3]);
      expect(source.destroyed).toBe(true);
    });

    test('with destroy false still resolves with correct data', async () => {
      const source = Readable.from([1, 2, 3], { objectMode: true });
      const result = await collect<number>(source, { destroy: false });
      expect(result).toEqual([1, 2, 3]);
      source.removeAllListeners();
    });

    test('resolves on close with chunks received so far', async () => {
      const source = new Readable({
        objectMode: true,
        read() {
          this.push(1);
          this.push(2);
          this.destroy();
        },
      });
      const result = await collect<number>(source);
      expect(result).toEqual([1, 2]);
    });

    test('rejects on stream error', async () => {
      const source = new Readable({
        objectMode: true,
        read() {
          this.destroy(new Error('test error'));
        },
      });
      await expect(collect(source)).rejects.toThrow('test error');
    });
  });
});
