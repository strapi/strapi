'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { releaseAfterSuccessfulDestroy } = require('./release-after-destroy');

const deferred = () => {
  /** @type {(value?: unknown) => void} */
  let resolve = () => undefined;
  /** @type {(error: Error) => void} */
  let reject = () => undefined;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe('releaseAfterSuccessfulDestroy', () => {
  it('releases the container after destroy succeeds', async () => {
    const calls = [];
    const instance = {
      destroy() {
        calls.push('destroy');
        return Promise.resolve('ok');
      },
      release() {
        calls.push('release');
      },
    };

    releaseAfterSuccessfulDestroy(instance);

    await assert.doesNotReject(async () => {
      const value = await instance.destroy();
      assert.equal(value, 'ok');
    });
    assert.deepEqual(calls, ['destroy', 'release']);
  });

  it('leaves the container in place when destroy fails, then releases after a retry', async () => {
    let fail = true;
    const calls = [];
    const instance = {
      destroy() {
        calls.push('destroy');
        if (fail) {
          return Promise.reject(new Error('db closed badly'));
        }
        return Promise.resolve();
      },
      release() {
        calls.push('release');
      },
    };

    releaseAfterSuccessfulDestroy(instance);

    await assert.rejects(instance.destroy(), /db closed badly/);
    assert.deepEqual(calls, ['destroy']);

    fail = false;
    await instance.destroy();
    assert.deepEqual(calls, ['destroy', 'destroy', 'release']);
  });

  it('releases once when a second destroy shares the shutdown in progress', async () => {
    const gate = deferred();
    let calls = 0;
    let releases = 0;
    /** @type {Promise<unknown> | undefined} */
    let inFlight;
    const instance = {
      destroy() {
        calls += 1;
        inFlight ??= gate.promise;
        return inFlight;
      },
      release() {
        releases += 1;
      },
    };

    releaseAfterSuccessfulDestroy(instance);

    const first = instance.destroy();
    const second = instance.destroy();
    assert.equal(calls, 2);

    gate.resolve('ok');
    assert.equal(await first, 'ok');
    assert.equal(await second, 'ok');
    assert.equal(releases, 1);
  });
});
